# ACD Agent: acd-autonomous

## Problem
The ACTP ecosystem has all the right components (CRM, content, publishing, memory, orchestration) but they are triggered manually. Polsia.com runs 1,500+ companies 24/7 with no manual triggers. The gap is: (1) a 24/7 autonomous execution daemon with configurable cycle schedules, (2) parallel strategy generation so every major decision tests 3 variants before committing, and (3) a live activity stream (like polsia.com/live) showing exactly what agents are doing in real time.

## Fix
Implement 6 features in the autonomous-coding-dashboard project:

**Feature ACD-AUTO-001 — acd_run_cycle MCP tool**
Add to `harness/acd-mcp-server.js`:
- Tool name: `acd_run_cycle`
- Input schema: `{ cycle: enum('morning','twitter_feedback','evening','nightly','once'), dryRun: boolean }`
- Implementation: spawn child_process executing the matching cycle shell commands from `/tmp/actp-autonomous-daemon.sh`, capture output, append each step to activity log via `POST /api/activity-log`
- If `dryRun: true` — return what WOULD run without executing
- Return: `{ cycle, steps_run: string[], errors: string[], duration_ms: number, dry_run: boolean }`

**Feature ACD-AUTO-002 — acd_parallel_plan MCP tool**
Add to `harness/acd-mcp-server.js`:
- Tool name: `acd_parallel_plan`
- Input schema: `{ type: enum('upwork','dm','tweet','content','offer'), niche: string, context: object }`
- Implementation:
  1. Read `/Users/isaiahdupree/Documents/Software/business-goals.json` for ICP, offers, strategy_notes, proven_angles
  2. Build a prompt requesting 3 competing variants (see templates in skill file)
  3. Call Claude API (claude-haiku-4-5-20251001 for speed, or claude-opus-4-5 if type='offer')
  4. Parse response into `{ variants: [{label, summary, score}], winner, winner_reason }`
  5. Write decision event to `actp_memory_events` via Supabase REST (importance=6.0, event_type='decision')
  6. Return the structured result
- On error: return `{ error, fallback: 'use /parallel-plan skill manually' }`

**Feature ACD-AUTO-003 — POST/GET /api/activity-log route**
Add to the ACD Express server (check `server.js` or `index.js` in the project root):
- In-memory ring buffer: `const activityLog = []; const MAX_LOG = 200;`
- `POST /api/activity-log` — body: `{ agent, action, status, detail, timestamp }`
  - Appends to ring buffer, trims to MAX_LOG, broadcasts to SSE clients
  - Returns `{ ok: true, index: number }`
- `GET /api/activity-log` — returns `{ events: activityLog, count: activityLog.length }`
- Share ring buffer and SSE client set between this route and the SSE endpoint

**Feature ACD-AUTO-004 — GET /api/activity-stream SSE endpoint**
Add to the same server file:
- Maintain a Set of connected SSE response objects: `const sseClients = new Set()`
- `GET /api/activity-stream`:
  - Set headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
  - Add res to sseClients, remove on `req.on('close')`
  - Send `data: {"type":"connected","timestamp":"..."}\n\n` immediately
  - Send heartbeat `data: {"type":"ping"}\n\n` every 15s via setInterval
- When `POST /api/activity-log` receives a new event, broadcast to all sseClients:
  `client.write(\`data: ${JSON.stringify(event)}\n\n\`)`

**Feature ACD-AUTO-005 — Live tab in dashboard UI**
In `public/index.html` (or wherever the dashboard HTML lives), add a "Live" tab to the nav alongside existing tabs. In the corresponding JS (check `public/app.js` or similar):
- On tab activation: open `EventSource('/api/activity-stream')`
- On each message: prepend a row to `#live-feed` div:
  ```html
  <div class="live-row">
    <span class="ts">{timestamp}</span>
    <span class="agent agent-{agent}">{agent}</span>
    <span class="action">{action}</span>
    <span class="status status-{status}">{status}</span>
    <span class="detail">{detail}</span>
  </div>
  ```
- Keep max 100 rows, auto-scroll to bottom
- Show green pulsing "● LIVE" badge when EventSource.readyState === OPEN
- Show grey "○ Reconnecting..." when disconnected (EventSource auto-reconnects)
- Agent color pills: acd-memory=blue, acd-orchestration=purple, autonomous-daemon=green, twitter-feedback=orange, crm-brain=teal

**Feature ACD-AUTO-006 — Autonomous tab in dashboard UI**
Add "Autonomous" tab to nav. Content:
- **Cycle Schedule section**: read goals from `GET /api/goals`, render each cycle (morning/twitter_feedback/evening/nightly) with its time, a "Run Now" button (calls `acd_run_cycle` via `POST /api/mcp` with tool=acd_run_cycle), last run time + result from `/api/activity-log` filtered by agent='autonomous-daemon'
- **Enable/Disable toggle**: reads `autonomy_config.enabled` from goals, toggle calls `acd_update_goals` to flip the value, shows current state
- **Parallel Plan section**: dropdown for type (upwork/dm/tweet/content/offer), text input for niche, "Plan" button (calls `acd_parallel_plan` via `/api/mcp`). Results render as 3 variant cards side-by-side with score badges; winning card highlighted with gold border and "WINNER" badge.

## Rules
- Do NOT break existing features (tabs, MCP tools, agent logs view)
- All new routes use existing Express app — do not start a second server
- SSE clients must be cleaned up on disconnect to prevent memory leaks
- Ring buffer must never exceed MAX_LOG=200 entries
- acd_parallel_plan must handle Claude API errors gracefully (return fallback)
- dryRun mode in acd_run_cycle must not execute any shell commands
- Validate all features pass before marking complete
