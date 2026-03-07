# PRD: Reply-to-CRM Bridge

## Goal

845 contacts touched across IG/TW/TT/LI/Gmail — zero replies recorded in Supabase. The `dm-followup-engine` runs but doesn't write back to CRM. This daemon scans all DM inboxes for inbound replies, detects new messages from known contacts, updates `crm_contacts` (replies_received, last_inbound_at, pipeline_stage='replied'), and generates a Claude-written `next_action` for each new reply. Closes the most critical revenue leak in the system.

## Working Directory

/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard

## Key Context

- Safari services: IG-DM :3100, TW-DM :3003, TT-DM :3102, LI :3105
- CRM: Supabase `crm_contacts` table (project ivhfuhxorppptyuofbgq)
- Key columns: `replies_received` (int), `last_inbound_at` (timestamptz), `last_outbound_at`, `pipeline_stage`, `next_action` (text), `next_action_at`, `ai_summary`, `username`, `platform`
- ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY from actp-worker/.env
- CRMLITE_API_KEY from actp-worker/.env
- State file: `harness/reply-bridge-state.json` — tracks last scan cursor per platform
- Existing `dm-followup-engine.js` reads followup queues — do NOT modify it
- Auth for Safari services: `Authorization: Bearer test-token` (INSTAGRAM_API_TOKEN default)

## Output Files

- `harness/reply-crm-bridge.js` — main daemon
- `harness/launch-reply-crm-bridge.sh` — start/stop/status/scan-now

---

## Features

### Feature 1: Supabase migration — reply_events table
**Acceptance Criteria:**
- [ ] Creates `reply_events` table:
  ```sql
  CREATE TABLE IF NOT EXISTS reply_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id uuid REFERENCES crm_contacts(id),
    platform text NOT NULL,
    username text NOT NULL,
    message_text text,
    detected_at timestamptz DEFAULT now(),
    next_action_generated text,
    processed boolean DEFAULT false
  );
  CREATE INDEX IF NOT EXISTS idx_reply_events_contact ON reply_events(contact_id, detected_at DESC);
  ```
- [ ] Applied via `mcp__supabase__apply_migration`

### Feature 2: Inbox scanner — per platform
**Acceptance Criteria:**
- [ ] For each platform (instagram, twitter, tiktok, linkedin):
  - GET conversations from respective service (IG: `GET /api/conversations`, TW: `GET /api/twitter/conversations`, TT: `GET /api/tiktok/conversations`, LI: `GET http://localhost:3105/api/linkedin/conversations`)
  - Filter conversations that have `unread: true` OR `last_message_at > last_scan_cursor[platform]`
  - For each such conversation: fetch messages, find inbound messages (from them, not from us)
- [ ] Include `Authorization: Bearer test-token` on all requests
- [ ] Handles service down gracefully — skips platform, logs warning, continues others
- [ ] Updates `reply-bridge-state.json.lastScan[platform]` after each successful scan

### Feature 3: Contact matcher
**Acceptance Criteria:**
- [ ] For each detected inbound message: look up sender in `crm_contacts` by `username = sender_handle AND platform = platform`
- [ ] Also checks `instagram_handle`, `twitter_handle`, `tiktok_handle`, `linkedin_url` cross-platform fields
- [ ] If contact found: proceeds to update CRM
- [ ] If contact NOT found: logs "unknown sender {handle} on {platform} — skipping"
- [ ] Deduplicates: skips if `reply_events` already has entry for this contact + message within last 1h

### Feature 4: CRM updater
**Acceptance Criteria:**
- [ ] On matched reply:
  - `UPDATE crm_contacts SET replies_received = replies_received + 1, last_inbound_at = now(), pipeline_stage = 'replied', updated_at = now() WHERE id = contact_id`
  - If `pipeline_stage` was already 'replied' or further: do NOT downgrade — only upgrade
  - Insert row into `reply_events`
- [ ] Also POSTs to CRMLite: `POST /api/actions { action: 'replied', platform, contact: { username, display_name }, message: message_text }`
- [ ] CRMLite failure is non-fatal
- [ ] Sends Telegram alert: `💬 Reply detected! {display_name} on {platform}: "{message_preview_50chars}"`

### Feature 5: Claude next_action generator
**Acceptance Criteria:**
- [ ] For each newly detected reply: calls Claude Haiku with:
  - Contact context: display_name, headline, ai_summary, platform, message_text
  - System: "You are a B2B sales assistant for an AI automation consultant targeting software founders ($500K-$5M ARR). Generate a specific, actionable next step (1-2 sentences) to advance this conversation toward a discovery call or proposal."
  - Returns one sentence: the exact next action to take
- [ ] Writes result to `crm_contacts.next_action` and `crm_contacts.next_action_at = now() + interval '2 hours'`
- [ ] Also writes to `reply_events.next_action_generated`
- [ ] Falls back to: `"Reply to {name}'s message on {platform} within 2 hours — acknowledge their interest and ask about their current automation setup."` if Claude fails

### Feature 6: Daemon loop + launch script
**Acceptance Criteria:**
- [ ] Runs every 15 minutes (env `REPLY_SCAN_INTERVAL_MINUTES=15`)
- [ ] CLI: `--once` (single scan), `--dry-run` (detect but don't write CRM), `--scan-now` (alias --once)
- [ ] Logs to `harness/logs/reply-crm-bridge.log`
- [ ] `launch-reply-crm-bridge.sh`: start/stop/status/scan-now/dry-run/logs
- [ ] Registered in `watchdog-queue.sh`
- [ ] On startup Telegram: `🔍 Reply bridge started — scanning IG/TW/TT/LI every 15min`

### Feature 7: Integration test
**Acceptance Criteria:**
- [ ] `--dry-run` test: runs scan, detects any conversations, logs without writing CRM
- [ ] Contact matcher test: verifies known `username` matches contact in Supabase
- [ ] Dedup test: running twice in 1 hour doesn't double-count same reply
- [ ] CRM update test: after scan with `--once`, any detected reply has `replies_received > 0` in Supabase
- [ ] All tests print PASS/FAIL

## Do NOT do
- Do not modify `dm-followup-engine.js`
- Do not send outbound messages — only read and update CRM
- Do not downgrade pipeline_stage (e.g., 'qualified' → 'replied')
- Do not create duplicate reply_events within 1h window
