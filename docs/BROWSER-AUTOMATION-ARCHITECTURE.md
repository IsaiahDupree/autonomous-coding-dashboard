# Autonomous Browser Automation Architecture

**Last updated:** 2026-03-05

This document covers the full cloud+local architecture for autonomous LinkedIn prospecting,
Safari browser automation, and the self-improving feedback loop.

---

## System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          CLOUD BRAIN                                     │
│                                                                          │
│  cloud-orchestrator.js (hourly)      Google Calendar (human planning)   │
│  - reads business-goals.json         - [safari:action] event tags        │
│  - calculates urgency gaps           - heartbeat_agent.py polls 30min    │
│  - reads actp_strategy_configs       - gcal_safari_bridge.py inserts     │
│  - books sessions with once_daily    - results written back to event     │
│            │                                      │                      │
└────────────┼──────────────────────────────────────┼──────────────────────┘
             │ writes rows                           │ inserts rows
             ▼                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    SUPABASE — Nervous System                             │
│                  ivhfuhxorppptyuofbgq.supabase.co                       │
│                                                                          │
│  actp_browser_sessions   safari_command_queue   actp_strategy_configs   │
│  crm_contacts            actp_orchestrator_events  actp_failure_events   │
│  gtm_tests/angles/events actp_ad_actions        actp_improvement_events  │
└──────────────────────────────┬──────────────────┬────────────────────────┘
                               │ 60s poll          │ 10s poll
             ┌─────────────────┘                   └──────────────┐
             ▼                                                     ▼
┌─────────────────────────────┐              ┌────────────────────────────┐
│  browser-session-daemon.js  │              │    cloud-bridge.js         │
│  - claims sessions          │              │    - fast command pipe      │
│  - routes to executors      │              │    - COMMAND_ALLOWLIST (18) │
│  - self-improvement (6h)    │              │    - rate limits persisted  │
└──────┬──────────────────────┘              └──────────┬─────────────────┘
       │                                               │
       ├─── Safari action ─────────────────────────────┘
       │         │
       │         ▼
       │   Tab claim (/tmp/safari-tab-claims.json, 60s TTL)
       │         │
       │         ▼
       │   Safari Services :3100–:3106
       │
       └─── LinkedIn/Chrome action
                 │
                 ▼
           Chrome CDP :9333
           LinkedIn scripts (6 total)
           File-locked queue: linkedin-dm-queue.json
```

---

## 1. Cloud Brain

### `harness/cloud-orchestrator.js` — Hourly Planner

Runs every hour. Reads goals, measures gaps, books sessions.

**Inputs:**
- `/Users/isaiahdupree/Documents/Software/business-goals.json` — revenue targets, ICP, content niches
- `actp_browser_sessions` — today's session count per action (once_daily guard)
- `actp_strategy_configs WHERE active=true` — AI-generated strategy adjustments

**Outputs:**
- New rows in `actp_browser_sessions` (status: `pending`)
- Telegram alert on booking or error

**Session templates (`GOAL_SESSION_TEMPLATES`):**

| Goal key | Actions booked |
|----------|---------------|
| `revenue` | `linkedin_prospects`, `linkedin_connection_send` (7/day), `linkedin_dm_send` (5/day), `upwork_proposals` |
| `linkedin` | `inbox_check`, `prospect_hunt`, `comment_harvest` |
| `content` | `post_schedule`, `story_publish` |

**once_daily guard** — before booking, checks if that action already has a row for today:
```js
const alreadyBooked = metrics.today_sessions_raw.some(s =>
  s.action === action && s.platform === platform
);
if (alreadyBooked) continue;
```

**Platform daily limits:**
- LinkedIn: 5 sessions/day
- Instagram: 6 sessions/day
- TikTok: 4 sessions/day

---

### Google Calendar — Human Planning Layer

User books events in Google Calendar with `[safari:action]` in title.

```
Flow:
User creates event: "[safari:instagram_dm] Send DMs to SaaS founders"
       ↓
heartbeat_agent.py polls Google Calendar every 30min
       ↓
gcal_safari_bridge.py parses [safari:xxx] tags
       ↓
INSERT into safari_command_queue (Supabase)
       ↓
cloud-bridge.js claims (10s poll) → routes to Safari service
       ↓
Result appended back to calendar event description
```

**Required env vars (not yet configured):**
```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
```

---

## 2. Supabase — Nervous System

**Project ID:** `ivhfuhxorppptyuofbgq`

| Table | Role | Key columns |
|-------|------|-------------|
| `actp_browser_sessions` | Session queue | `action`, `platform`, `status` (pending→claimed→done/failed), `priority`, `result` JSONB |
| `safari_command_queue` | Fast command pipe | `command`, `params`, `status`, `result` |
| `actp_strategy_configs` | Self-improvement store | `strategy_name`, `platform`, `active` (bool!), `params`, `performance`, `updated_at` |
| `actp_orchestrator_events` | Orchestrator run log | `event_type`, `payload`, `created_at` |
| `actp_improvement_events` | AI strategy decisions | `platform`, `changes`, `reasoning` |
| `actp_failure_events` | Failure history | `session_id`, `action`, `error`, `doctor_healed` |
| `crm_contacts` | Cross-platform CRM | synced to/from CRMLite |
| `actp_ad_actions` | AdLite queue | `action_type`, `platform`, `params`, `status`, `result` |
| `gtm_tests` | A/B angle tests | `thresholds` JSONB, `rotation_count`, `winner_angle_id` |
| `gtm_angles` | Per-angle perf | `impressions`, `ctr`, `spend_usd`, `status` |
| `gtm_events` | Rotation history | `event_type`: deployed/paused/winner_declared/budget_scaled |

**Critical:** `actp_strategy_configs` must have `active=true` — orchestrator filters by `.eq('active', true)`. Self-improvement writes were silently ignored until this was fixed.

---

## 3. Local Executors

### `harness/browser-session-daemon.js` — Session Executor

**Poll interval:** 60 seconds

**Execution flow:**
```
SELECT pending session (highest priority)
  ↓
UPDATE status = 'claimed'
  ↓
Route by action type:
  Safari action →
    derive port from endpoint URL (regex /:(\d+)\//)
    POST /api/session/ensure (tab claim) — THROWS on failure
    POST to Safari service endpoint
  LinkedIn/Chrome action →
    spawn subprocess: node harness/linkedin-chrome-search.js
    parse JSON from stdout
    reject on non-zero exit code
  ↓
UPDATE status = 'done', result = { ... }
  ↓
(every 6h) Self-improvement loop:
  aggregate last 24h session outcomes
  → Claude Haiku prompt → strategy adjustments
  → upsert actp_strategy_configs (active: true, platform, params)
```

**Preflight checks (on startup):**
- Supabase connectivity
- Telegram config (warns if missing — does not block)
- Chrome CDP at `http://localhost:9333/json` (warns if missing)

### `harness/cloud-bridge.js` — Fast Command Pipe

**Poll interval:** 10 seconds

**COMMAND_ALLOWLIST** (18 whitelisted actions — rejects all others):
```
instagram_dm, instagram_comment, instagram_story_view, instagram_inbox,
twitter_dm, twitter_comment, twitter_inbox,
tiktok_dm, tiktok_comment, tiktok_inbox,
linkedin_dm, linkedin_connection, linkedin_inbox,
threads_dm, threads_comment,
market_research, prospect_hunt, comment_harvest
```

**Rate limits** — persisted to `harness/cloud-bridge-state.json` (survive restarts):
```json
{
  "rateLimits": {
    "instagram_dm": { "count": 3, "window": "2026-03-05" }
  }
}
```

---

## 4. Safari Tab Claim System

Prevents concurrent Safari automation on same window:tab.

**Claims file:** `/tmp/safari-tab-claims.json`

```json
{
  "3100": {
    "windowId": 1,
    "tabIndex": 0,
    "claimedAt": "2026-03-05T10:00:00Z",
    "pid": 12345
  }
}
```

**How it works:**
1. `requireTabClaim` middleware runs on ALL automation routes (not just inbox_check)
2. Returns `409 Platform Busy` if tab already claimed
3. TTL: 60s — expired claims auto-release for next caller
4. If no LinkedIn tab found → AppleScript opens new Safari window
5. Claim released on request completion (or TTL expiry)

**Code location:**
`Safari Automation/packages/instagram-dm/src/automation/tab-coordinator.ts`

**Safari services and their ports:**

| Port | Service | Primary actions |
|------|---------|----------------|
| 3100 | Instagram DM | `send_dm`, `inbox_check`, `story_view` |
| 3003 | Twitter DM | `send_dm`, `inbox_check` |
| 3102 | TikTok DM | `send_dm`, `inbox_check` |
| 3105 | LinkedIn DM | `send_dm`, `connection_request`, `inbox_check` |
| 3005 | Instagram Comments | `post_comment`, `harvest_comments` |
| 3006 | TikTok Comments | `post_comment` |
| 3007 | Twitter Comments | `post_comment` |
| 3004 | Threads | `send_dm`, `post_comment` |
| 3106 | Market Research | `prospect_hunt`, `comment_harvest`, `keyword_search` |

---

## 5. Chrome CDP Stack — LinkedIn Automation

LinkedIn requires Chrome (Safari doesn't maintain LinkedIn sessions reliably).

**Debug port:** `http://localhost:9333`
**Profile dir:** `harness/.chrome-linkedin-profile/` (real Chrome session with cookies)
**Launch:** `bash harness/start-chrome-debug.sh start`
**CDP URL env:** `CHROME_CDP_URL` (default: `http://localhost:9333`)

### 6 LinkedIn Scripts

| Script | Purpose | Invocation |
|--------|---------|-----------|
| `linkedin-chrome-search.js` | Keyword search → ICP-scored prospects | `node ... --keywords "SaaS founder"` |
| `linkedin-post-scraper.js` | Top posts → commenter profiles | `node ... --keyword "AI automation" --max-posts 5` |
| `linkedin-connection-sender.js` | Send connection requests with note | `node ... --limit 7` |
| `linkedin-dm-sender.js` | Send DMs to approved queue items | `node ... --limit 5` |
| `linkedin-email-finder.js` | Extract email from contact info modal | `node ... --profile-url "..."` |
| `linkedin-engagement-daemon.js` | Post engagement prospecting (every 2h) | `node ... [--once] [--keyword "..."]` |

**LinkedIn daemon scripts (long-running):**

| Daemon | Interval | State file |
|--------|---------|-----------|
| `linkedin-daemon.js` | 30min | `linkedin-daemon-state.json` |
| `linkedin-engagement-daemon.js` | 2h | `linkedin-engagement-state.json` |
| `linkedin-followup-engine.js` | 4h | `linkedin-followup-state.json` |

### Concurrent Queue Safety

All scripts writing `linkedin-dm-queue.json` use two-layer protection:

**1. POSIX exclusive lock** (`{ flag: 'wx' }` — atomic create):
```js
const QUEUE_LOCK = QUEUE_FILE + '.lock';
function withQueueLock(fn) {
  // spin-wait up to 10s
  // stale PID detection (process.kill(pid, 0))
  fs.writeFileSync(QUEUE_LOCK, String(process.pid), { flag: 'wx' });
  try { return fn(); } finally { fs.unlinkSync(QUEUE_LOCK); }
}
```

**2. Atomic file write** (tmp + rename — no partial reads):
```js
function writeJson(fp, data) {
  const tmp = fp + '.tmp.' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, fp);  // atomic on POSIX
}
```

### LinkedIn Queue Lifecycle

```
pending_approval
    ↓ (user approves in dashboard)
approved
    ↓ (connection-sender)
connection_requested
    ↓ (dm-sender)
dm_sent
    ↓ (inbox_check detects reply)
replied
```

### CRMLite Stage Progression

```
first_touch → connection_requested → dm_sent → replied → value_sent → offer_sent
```

Auth: `x-api-key: $CRMLITE_API_KEY` from `actp-worker/.env`

### LinkedIn Rate Limits (persisted to state files)

| Script | Daily | Weekly | State file |
|--------|-------|--------|-----------|
| `linkedin-connection-sender.js` | 15 | 80 | `linkedin-connection-state.json` |
| `linkedin-dm-sender.js` | 5 | 25 | `linkedin-dm-state.json` |
| `linkedin-engagement-daemon.js` | tracked | tracked | `linkedin-engagement-state.json` (STATE_FILE.rateLimits) |

---

## 6. Self-Improvement Feedback Loop

```
Session completes → result written to actp_browser_sessions
                                    ↓
            (browser-session-daemon.js every 6h)
                                    ↓
    Aggregate: last 24h sessions by platform + action + outcome
                                    ↓
    Claude Haiku prompt:
      "Here are yesterday's automation outcomes.
       What strategies should we adjust for better results?"
                                    ↓
    Response → parse strategy updates
                                    ↓
    UPSERT actp_strategy_configs:
      { strategy_name, platform, active: true, params, performance, updated_at }
                                    ↓
            (cloud-orchestrator.js next cycle)
                                    ↓
    SELECT actp_strategy_configs WHERE active=true
                                    ↓
    Adjust: session weights, timing, message templates, keyword lists
                                    ↓
    Book next cycle with updated strategy
```

**Critical:** `active: true` must be in upsert — orchestrator filters by `.eq('active', true)`.

---

## 7. LinkedIn Hub Daemons — Launch Reference

```bash
# Unified start (starts daemon + engagement + followup engines)
bash harness/launch-linkedin-hub.sh start|stop|status|test

# Or individually:
bash harness/launch-linkedin-daemon.sh start|stop|status   # keyword search daemon
node harness/linkedin-engagement-daemon.js [--once]        # post engagement
node harness/linkedin-followup-engine.js [--once --dry-run] # follow-up sequences
node harness/linkedin-connection-sender.js --limit 7        # send connections
node harness/linkedin-dm-sender.js --limit 5               # send DMs
node harness/linkedin-email-finder.js --from-queue         # extract emails
```

---

## 8. Dashboard & Backend Routes

**URL:** `http://localhost:3434`
**Backend:** `backend/src/index.ts` (Hono)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/linkedin/status` | GET | All daemon states + queue counts + service health |
| `/api/linkedin/queue?type=` | GET | `discovery`, `engagement`, `followup` queue items |
| `/api/linkedin/queue/approve` | POST | `{ queueFile, id }` → mark approved |
| `/api/linkedin/queue/skip` | POST | `{ queueFile, id }` → mark skipped |
| `/api/linkedin/emails` | GET | Contacts with extracted emails |
| `/api/harness/topology` | GET | Full agent queue + topology |
| `/api/harness/telemetry/:slug` | GET | Last 200 events for an agent |
| `/api/harness/doctor/:slug` | POST | Manual doctor trigger `{ reason }` |
| `/api/harness/doctor-log` | GET | Last 50 doctor entries |
| `/api/harness/agents` | GET | Live agent progress (dashboard polling) |

---

## 9. Full Data Flow — LinkedIn Prospect Cycle

```
Hour 0: cloud-orchestrator.js
  → revenue gap detected (3 connections behind daily pace)
  → books: { action: 'linkedin_prospects', platform: 'linkedin', priority: 8 }

Hour 0 + 60s: browser-session-daemon.js
  → claims session
  → spawns: node linkedin-chrome-search.js --keywords "SaaS founder AI"
  → receives 20 prospect cards (JSON on stdout)
  → ICP scores (10-point rubric: role, company size, tech stack, engagement)
  → dedup against CRMLite (GET /api/contacts?linkedin_url=...)
  → upserts 12 new contacts → stage: first_touch
  → writes to linkedin-dm-queue.json (status: pending_approval)
  → updates Supabase session: status=done, result={ prospects: 12, dup_skipped: 8 }

Same hour: cloud-orchestrator.js
  → books: { action: 'linkedin_connection_send', limit: 7 }

User opens http://localhost:3434 → Queue tab → LinkedIn panel
  → Reviews 12 prospect cards with drafted connection notes
  → Approves 9, skips 3

Next hour: browser-session-daemon.js
  → claims linkedin_connection_send session
  → spawns: node linkedin-connection-sender.js --limit 7
  → sends 7 connection requests (personalized notes)
  → queue items: status → connection_requested
  → CRMLite PATCH: stage → connection_requested

Day 3: linkedin-followup-engine.js (every 4h)
  → GET CRMLite contacts: stage=connection_requested, last_touch ≥ 3 days ago
  → generates value DM via Claude Haiku (mentions their company/role)
  → appends to linkedin-followup-queue.json

Next daemon cycle: linkedin-dm-sender.js
  → sends value DMs to approved followup queue
  → CRMLite stage → value_sent

Day 10: followup-engine sees value_sent contacts ≥ 7 days
  → generates offer DM: "30-min AI Automation Audit for SaaS founders"
  → linkedin-dm-sender.js sends
  → CRMLite stage → offer_sent

Day 11: browser-session-daemon.js inbox_check
  → reply detected in LinkedIn inbox
  → CRMLite stage → replied
  → Telegram alert sent
  → Human books discovery call via Google Calendar
```

---

## 10. Startup Checklist

```bash
# 1. Chrome debug port (LinkedIn CDP)
bash harness/start-chrome-debug.sh start
# Verify: curl -s http://localhost:9333/json | head -5

# 2. Safari watchdog (all 9 services + auto-restart)
nohup /bin/zsh -l "/Users/isaiahdupree/Documents/Software/Safari Automation/watchdog-safari.sh" \
  >> /tmp/safari-watchdog.log 2>&1 &
# Verify: for port in 3100 3003 3102 3105 3005 3006 3007 3004 3106; do
#   curl -s --max-time 2 http://localhost:$port/health > /dev/null \
#     && echo "UP :$port" || echo "DOWN :$port"; done

# 3. Cloud orchestrator
nohup node harness/cloud-orchestrator.js >> harness/logs/cloud-orchestrator.log 2>&1 &
# Verify: tail -f harness/logs/cloud-orchestrator.log

# 4. Browser session daemon
nohup node harness/browser-session-daemon.js >> harness/logs/browser-session-daemon.log 2>&1 &
# Verify: tail -f harness/logs/browser-session-daemon.log

# 5. Cloud bridge
nohup node harness/cloud-bridge.js >> harness/logs/cloud-bridge.log 2>&1 &

# 6. LinkedIn hub
bash harness/launch-linkedin-hub.sh start
bash harness/launch-linkedin-hub.sh status

# 7. ACD dashboard
cd backend && npm run dev
# Open: http://localhost:3434
```

---

## 11. Key Env Vars

| Var | Source | Used by |
|-----|--------|---------|
| `CRMLITE_API_KEY` | `actp-worker/.env` | linkedin-daemon, connection-sender, dm-sender, followup-engine |
| `ANTHROPIC_API_KEY` | `~/.env` | browser-session-daemon (self-improvement), followup-engine (DM gen) |
| `TELEGRAM_BOT_TOKEN` | `~/.env` | cloud-orchestrator, browser-session-daemon |
| `TELEGRAM_CHAT_ID` | `~/.env` | cloud-orchestrator, browser-session-daemon |
| `SUPABASE_URL` | `~/.env` | all Supabase clients |
| `SUPABASE_SERVICE_KEY` | `~/.env` | all Supabase clients |
| `CHROME_CDP_URL` | env | all Chrome scripts (default: `http://localhost:9333`) |
| `GOOGLE_CLIENT_ID` | `~/.env` | gcal_safari_bridge.py (calendar integration) |
| `GOOGLE_CLIENT_SECRET` | `~/.env` | gcal_safari_bridge.py |
| `GOOGLE_REFRESH_TOKEN` | `~/.env` | gcal_safari_bridge.py |

---

## 12. Key File Paths

```
harness/
  cloud-orchestrator.js           # hourly planner
  browser-session-daemon.js       # 60s session executor
  cloud-bridge.js                 # 10s safari command pipe
  linkedin-daemon.js              # 30min keyword search daemon
  linkedin-chrome-search.js       # Chrome CDP search (subprocess)
  linkedin-post-scraper.js        # post engagement scraper
  linkedin-connection-sender.js   # connection request sender
  linkedin-dm-sender.js           # DM sender
  linkedin-email-finder.js        # email extractor
  linkedin-engagement-daemon.js   # post engagement daemon (2h)
  linkedin-followup-engine.js     # follow-up sequence daemon (4h)
  launch-linkedin-hub.sh          # unified start/stop/status
  launch-linkedin-daemon.sh       # daemon-specific launcher
  start-chrome-debug.sh           # Chrome CDP launcher
  .chrome-linkedin-profile/       # Chrome persistent profile (LinkedIn session)
  linkedin-dm-queue.json          # approval queue (POSIX-locked)
  linkedin-engagement-queue.json  # engagement prospects queue
  linkedin-followup-queue.json    # follow-up message queue
  linkedin-daemon-state.json      # daemon state + rate limits
  linkedin-connection-state.json  # connection sender rate limits
  cloud-bridge-state.json         # bridge state + persisted rate limits
  orchestrator-state.json         # orchestrator cycle state
  logs/                           # all daemon logs (.log files)

backend/src/index.ts              # Hono API (port 3434)
backend/index.html                # Dashboard UI
```
