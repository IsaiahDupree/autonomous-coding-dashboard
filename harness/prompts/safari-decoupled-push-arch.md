# Safari Decoupled Push Architecture — ACD Harness Prompt

## AUTONOMOUS MODE
You are operating autonomously. Do NOT ask what to work on.
Read the feature_list.json, find the first feature where "passes": false, implement it, mark it passing, then move to the next.

## Project Context

Decouple Safari browser automation from cloud-sync data collection across two phases:

**Phase A — Safari Profile Separation:**
All 9 Safari automation services must only claim/open tabs in a dedicated "Automation" Safari profile. The user's personal profile is never touched by any automation code.

**Phase B — Push Model (NO quiet hours — 24/7):**
Each Safari automation service gains an internal cron that self-polls on its own schedule 24/7 and writes results directly to Supabase `safari_platform_cache`. Cloud-sync pollers are rewritten to read from the cache table ONLY — they NEVER call Safari services directly. There are NO quiet hours restrictions. The crons run continuously.

**Phase C — Cloud-Local Cron Management:**
A unified cron management system where the cloud can schedule, enable/disable, and monitor all local automation crons. Local `cron-manager.js` reads job definitions from Supabase `automation_cron_jobs` table and executes them. Telegram bot gets `/cron` command. Dashboard gets a Cron tab.

## Working Directories

- Safari Automation: `/Users/isaiahdupree/Documents/Software/Safari Automation/`
- ACD Harness: `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/`
- Cloud-sync: `/Users/isaiahdupree/Documents/Software/Safari Automation/packages/cloud-sync/`
- LinkedIn automation: `/Users/isaiahdupree/Documents/Software/Safari Automation/packages/linkedin-automation/`
- Supabase project: `ivhfuhxorppptyuofbgq`

## Key Existing Files

- `harness/safari-tab-coordinator.js` — tab claim registry, port 3000
- `harness/cloud-bridge.js` — Supabase Realtime relay, port 3300
- `harness/telegram-bot.js` — Telegram command interface
- `packages/cloud-sync/src/sync-engine.ts` — main poll orchestrator
- `packages/cloud-sync/src/pollers/*.ts` — per-platform pollers
- `packages/cloud-sync/src/supabase.ts` — CloudSupabase DB client
- `packages/cloud-sync/src/cache-writer.ts` — writePlatformCache helper (ALREADY EXISTS)
- `/tmp/safari-tab-claims.json` — live claim state

## Safari Profile Architecture (Phase A)

### How Safari Profiles Work
Safari 17+ profiles appear as separate windows. Each profile has a unique internal ID. AppleScript can target a specific window by checking its URL or profile assignment.

### Implementation
1. Add `SAFARI_AUTOMATION_WINDOW` env var (default: window index 1 = the automation window).
2. Update `safari-tab-coordinator.js`:
   - Add `profileWindowIndex` config (env: `SAFARI_AUTOMATION_WINDOW`, default 1)
   - `openTab()` must only open tabs in that window
   - `claimTab()` must reject claims from other windows unless explicitly overridden
   - Add `GET /api/tabs/profile` endpoint returning configured automation window
3. Update `safari-tab-coordinator.js` startup to verify the automation window exists via AppleScript.
4. Add `harness/safari-profile-setup.sh` — AppleScript one-liner to verify profile window is open.

## Push Model Architecture (Phase B) — NO QUIET HOURS

### IMPORTANT: No Quiet Hours
- SelfPollCron runs 24/7 on a fixed interval (every 5 minutes by default)
- NO `isQuietHours()` check — crons fire regardless of time of day
- Cloud-sync pollers read from `safari_platform_cache` ONLY — no direct Safari service calls ever
- On cache miss, pollers return [] — they do NOT fall back to calling Safari directly
- Fresh data comes from the SelfPollCron running in the background continuously

### SelfPollCron Pattern (24/7, NO quiet hours check)

```typescript
// Internal cron — runs 24/7, writes fresh data to safari_platform_cache
class SelfPollCron {
  // NO isQuietHours() — always runs
  async tick(): Promise<void> {
    try {
      const data = await this.fetchLocalData(); // call own service endpoints
      await writePlatformCache(platform, dataType, data);
    } catch (e) {
      console.error('[SelfPollCron] tick error:', e);
    }
  }
  start(intervalMs = 300_000): void {
    setInterval(() => this.tick(), intervalMs);
    this.tick(); // run immediately on startup
  }
}
```

Add `SelfPollCron` to:
- `packages/linkedin-automation/src/self-poll-cron.ts`
- `packages/threads-comments/src/self-poll-cron.ts`
- `packages/tiktok-comments/src/self-poll-cron.ts`
- `packages/instagram-dm/src/self-poll-cron.ts` (port 3100)
- `packages/twitter-dm/src/self-poll-cron.ts` (port 3003)

Each service's `server.ts` starts SelfPollCron on startup. Add `POST /api/self-poll/trigger` for manual runs.

### Cloud-Sync Reads from Cache ONLY

Rewrite each poller in `packages/cloud-sync/src/pollers/` to:
1. Call `db.getPlatformCache(platform, dataType)`
2. Return cached data if non-null (regardless of time of day)
3. Return `[]` on cache miss — do NOT call the Safari service directly
4. Log a warning on cache miss so it's visible in monitoring

The Safari service's SelfPollCron is responsible for keeping the cache fresh. Cloud-sync is purely a Supabase reader.

### Cache Writer (already exists)
`packages/cloud-sync/src/cache-writer.ts` — `writePlatformCache(platform, dataType, payload, ttlMs)`
TTLs: DMs=30min, notifications=30min, post_stats=6h, invitations=2h, comments=6h.

## Cloud-Local Cron Management (Phase C)

### Supabase Table: `automation_cron_jobs` (ALREADY EXISTS — seeded with 14 jobs)
```sql
-- Table already created. schedule column uses cron expressions (e.g. '*/5 * * * *')
-- or 'continuous' meaning always-on self-poll. NO 'quiet_hours' concept.
```

### Local: `harness/cron-manager.js` (ALREADY EXISTS on port 3302)
- Reads `automation_cron_jobs` from Supabase on startup and every 60s
- On each job tick: POSTs to the relevant Safari service's `/api/self-poll/trigger` endpoint — NO quiet hours check
- Writes result back to `automation_cron_jobs` (last_run_at, last_run_status, last_run_count)
- Remove any quiet-hours gate from existing implementation

### Cloud API Endpoints (ALREADY EXISTS in cloud-sync server.ts :3200)
```
GET  /api/cron/jobs              — list all cron jobs + status
PUT  /api/cron/jobs/:slug        — update schedule/enabled
POST /api/cron/jobs/:slug/trigger — trigger immediate run
```

### cloud-bridge.js Integration
Add Supabase Realtime subscription to `automation_cron_jobs` changes:
- `trigger_requested=true` on a job → POST to cron-manager :3302/api/cron/:slug/run-now
- `enabled` or `schedule` changes → POST /api/cron/reload to cron-manager

### Telegram Bot: /cron Command
```
/cron                    — list all jobs with status + last run
/cron enable linkedin-dms
/cron disable tiktok-stats
/cron run linkedin-dms   — trigger immediate run
```

### Dashboard: Cron Tab
New `/cron` route in `acd-live-dashboard` (localhost:3000) showing:
- All cron jobs in a table: slug, platform, schedule, enabled toggle, last_run, status badge, "Run Now" button
- Polls GET http://localhost:3200/api/cron/jobs every 10s
- Run Now → POST /api/cron/jobs/:slug/trigger
- Enable toggle → PUT /api/cron/jobs/:slug {enabled}
- Dark terminal theme matching rest of dashboard

## Implementation Order

1. ✅ Run migration SQL (both tables + seed data)
2. ✅ cache-writer.ts + CloudSupabase cache methods
3. ✅ cron-manager.js + cloud API + Telegram /cron + cloud-bridge Realtime
4. SelfPollCron for linkedin-automation (NO quiet hours, runs 24/7)
5. SelfPollCron for threads-comments (NO quiet hours)
6. SelfPollCron for tiktok-comments (NO quiet hours)
7. SelfPollCron for instagram-dm (NO quiet hours)
8. SelfPollCron for twitter-dm (NO quiet hours)
9. Rewrite cloud-sync pollers: read cache ONLY, never call Safari directly
10. Safari profile window enforcement (Phase A)
11. Dashboard Cron tab

## Tech Stack

- Node.js / TypeScript (existing)
- Supabase (existing: ivhfuhxorppptyuofbgq)
- Express (existing)
- Supabase Realtime (existing in cloud-bridge)
- Telegram Bot API (existing)
- No new dependencies required

## Coding Rules

- NO mock data, NO placeholder implementations, NO TODO stubs with fake returns
- NO quiet hours checks anywhere — SelfPollCron always runs on its schedule
- Cloud-sync pollers NEVER call Safari services directly — cache only
- All new tables must use real Supabase
- Every new endpoint must return real data
- All Safari services use /bin/zsh -l login shell
- Always commit and push after each feature passes
- Run /api/health or relevant endpoint to verify before marking feature passing
