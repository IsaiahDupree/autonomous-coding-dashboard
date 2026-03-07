# PRD: LinkedIn DM Auto-Sender

## Goal

Build a LinkedIn DM auto-sender daemon that reads the `linkedin-dm-queue.json` approved entries and sends connection requests + follow-up messages via the existing Safari LinkedIn service (port 3105). Currently 107 approved DMs sit unsent because there is no automated sender — only `dm-outreach-daemon.js` which handles IG/TW/TT but not LinkedIn. This closes that gap.

## Working Directory

/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard

## Key Context

- LinkedIn queue: `harness/linkedin-dm-queue.json` — top-level array, entries have `status` field
- Queue statuses: `pending_approval` → `approved` → `connection_requested` → `sent` → `replied`
- LinkedIn Safari service: port 3105, MCP tools available via `mcp__safari-linkedin__*`
- Key MCP tools: `linkedin_send_connection`, `linkedin_send_message`, `linkedin_is_ready`, `linkedin_claim_status`
- Daily limits: max 20 connection requests/day, max 30 messages/day (LinkedIn rate limits)
- Active hours: 8:00–19:00 local time
- Auth token: `LINKEDIN_AUTH_TOKEN` env var (default: `test-token-12345`)
- After sending: sync to CRMLite via POST to `https://crmlite-isaiahduprees-projects.vercel.app/api/actions`
- CRMLITE_API_KEY in `/Users/isaiahdupree/Documents/Software/actp-worker/.env`
- State file: `harness/linkedin-dm-state.json` (tracks daily counts + last run)
- Never auto-send — only process entries with `status === 'approved'`

## Output Files

- `harness/linkedin-dm-autosender.js` — daemon
- `harness/launch-linkedin-dm-autosender.sh` — start/stop/status/dry-run/send-approved

---

## Feature Specifications

### Feature 1: Queue Reader + Daily Limit Guard
**Acceptance Criteria:**
- [ ] Reads `harness/linkedin-dm-queue.json` (top-level array)
- [ ] Filters to entries where `status === 'approved'`
- [ ] Reads `harness/linkedin-dm-state.json` to get today's sent counts: `{ date, connectionsSent, messagesSent }`
- [ ] Resets counts if date differs from today
- [ ] Enforces daily limits: max 20 connections + max 30 messages per day (configurable via env `LI_DAILY_CONNECTIONS=20`, `LI_DAILY_MESSAGES=30`)
- [ ] Checks active hours: only runs 08:00–19:00 (env `LI_ACTIVE_HOURS_START=8`, `LI_ACTIVE_HOURS_END=19`)
- [ ] Logs how many approved entries found and how many slots remain today

### Feature 2: Connection Request Sender
**Acceptance Criteria:**
- [ ] For each approved entry that has no `connection_requested_at`: calls `mcp__safari-linkedin__linkedin_send_connection` via the LinkedIn service at port 3105 (POST /api/linkedin/connections/send with `{ profileUrl: entry.prospect.profileUrl, note: entry.message }`)
- [ ] On success: updates entry `status = 'connection_requested'`, sets `connection_requested_at = ISO timestamp`
- [ ] On failure (rate limit / not found / already connected): logs error, sets `status = 'failed'`, sets `error` field
- [ ] Increments `connectionsSent` in state file after each success
- [ ] Adds 10–20s random delay between requests
- [ ] Writes updated queue back to `harness/linkedin-dm-queue.json` after each send
- [ ] Stops sending connections when `connectionsSent >= LI_DAILY_CONNECTIONS`

### Feature 3: Follow-up Message Sender
**Acceptance Criteria:**
- [ ] For entries with `status === 'connection_requested'` and `connection_requested_at` older than 24h: attempts to send a follow-up DM via POST /api/linkedin/messages/send with `{ profileUrl, message: entry.followUpMessage || entry.message }`
- [ ] On success: updates `status = 'sent'`, sets `sent_at = ISO timestamp`
- [ ] On failure: logs warning, leaves status as `connection_requested` for retry next cycle
- [ ] Increments `messagesSent` in state file
- [ ] Adds 15–30s random delay between messages
- [ ] Stops sending when `messagesSent >= LI_DAILY_MESSAGES`

### Feature 4: CRMLite Sync
**Acceptance Criteria:**
- [ ] After each successful connection request: POST to CRMLite `/api/actions` with `{ action: 'first_touch', platform: 'linkedin', contact: { name: entry.prospect.name, profileUrl: entry.prospect.profileUrl, handle: entry.prospect.handle }, message: entry.message }`
- [ ] After each successful message send: POST to CRMLite with `{ action: 'dm_sent', platform: 'linkedin', ... }`
- [ ] Load CRMLITE_API_KEY from `/Users/isaiahdupree/Documents/Software/actp-worker/.env`
- [ ] CRMLite sync failure is non-fatal — log warning and continue
- [ ] Sets `entry.crm_synced = true` and `entry.crm_id` (from CRMLite response) in queue

### Feature 5: Telegram Notifications
**Acceptance Criteria:**
- [ ] On daemon start: sends `🔗 LinkedIn DM sender started — N approved in queue, X connections remaining today`
- [ ] After each successful connection request: sends `✅ LinkedIn connection sent → {name} ({handle})`
- [ ] After each successful message: sends `💬 LinkedIn DM sent → {name}`
- [ ] On daily limit reached: sends `📊 LinkedIn daily limit reached — {connectionsSent} connections, {messagesSent} messages sent today`
- [ ] On any hard failure: sends `⚠️ LinkedIn DM sender error: {error}`
- [ ] Reads TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID from env or actp-worker/.env
- [ ] Telegram failures are non-fatal

### Feature 6: Daemon Loop + State Persistence
**Acceptance Criteria:**
- [ ] Runs as a continuous daemon with configurable interval (env `LI_SEND_INTERVAL_MINUTES=30`, default 30min)
- [ ] Checks LinkedIn service health (`GET http://localhost:3105/health`) before each send cycle — skips cycle if not healthy
- [ ] Checks Safari tab claim status before sending — skips cycle if no tab claimed
- [ ] Writes `harness/linkedin-dm-state.json` after every state change
- [ ] Handles SIGTERM gracefully — finishes current send then exits
- [ ] CLI flags: `--once` (run one cycle and exit), `--dry-run` (log what would be sent, no actual sends), `--send-approved` (alias for --once)
- [ ] Logs to `harness/logs/linkedin-dm-autosender.log`

### Feature 7: Launch Script
**File:** `harness/launch-linkedin-dm-autosender.sh`

**Acceptance Criteria:**
- [ ] Subcommands: `start`, `stop`, `status`, `dry-run`, `send-approved` (run once), `logs`
- [ ] `status` shows: running/stopped, today's counts, queue depth (approved/total), next run time
- [ ] `send-approved` runs one cycle immediately in foreground
- [ ] Uses `/bin/zsh -l` login shell
- [ ] Registers in `harness/watchdog-queue.sh` as a managed daemon

### Feature 8: Integration Test
**Acceptance Criteria:**
- [ ] `--dry-run` test: runs with `--dry-run --once`, verifies logs show approved entries without actually calling port 3105
- [ ] Queue parse test: verifies `linkedin-dm-queue.json` loads correctly, counts approved entries
- [ ] State file test: verifies `linkedin-dm-state.json` correctly resets on new day
- [ ] Daily limit test: verifies daemon stops sending at LI_DAILY_CONNECTIONS limit
- [ ] Print PASS/FAIL per test

## Do NOT do
- Do not send to `pending_approval` entries — only `approved`
- Do not exceed daily limits
- Do not run outside active hours
- Do not break existing linkedin-daemon.js or linkedin-followup.js
- Do not open new Safari windows — use existing claimed tab on port 3105
