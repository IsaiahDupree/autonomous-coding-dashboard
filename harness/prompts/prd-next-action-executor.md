# PRD: Next-Action Executor

## Goal

The CRM has AI-written `next_action` instructions on warm contacts (10 overdue on LinkedIn alone) but nothing executes them. This daemon reads `crm_contacts` where `next_action IS NOT NULL AND next_action_at <= now()`, classifies the action type, and executes it via the appropriate Safari service. It is the bridge between CRM intelligence and actual outreach.

## Working Directory

/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard

## Key Context

- Supabase `crm_contacts`: `next_action` (text), `next_action_at` (timestamptz), `platform`, `username`, `linkedin_url`, `instagram_handle`, `twitter_handle`, `pipeline_stage`, `offer_readiness`
- Safari services: LI :3105, IG :3100, TW :3003, TT :3102
- Auth: `Authorization: Bearer test-token`
- Daily limits: max 10 actions/day total (conservative — these are warm leads)
- ANTHROPIC_API_KEY, SUPABASE keys from actp-worker/.env
- Action execution state: `harness/next-action-state.json`

## Output Files

- `harness/next-action-executor.js`
- `harness/launch-next-action-executor.sh`

---

## Features

### Feature 1: Overdue action fetcher
**Acceptance Criteria:**
- [ ] Queries Supabase:
  ```sql
  SELECT * FROM crm_contacts
  WHERE next_action IS NOT NULL
    AND next_action_at <= now()
    AND pipeline_stage IN ('first_touch', 'replied', 'interested')
  ORDER BY offer_readiness DESC, next_action_at ASC
  LIMIT 20
  ```
- [ ] Loads `harness/next-action-state.json` for today's `actionsExecuted` count
- [ ] Resets count if date differs from today
- [ ] Enforces daily cap: `MAX_DAILY_ACTIONS=10` (env)
- [ ] Logs: `📋 Found N overdue actions, X slots remaining today`

### Feature 2: Action classifier
**Acceptance Criteria:**
- [ ] For each contact's `next_action` text, calls Claude Haiku to classify:
  - System: "Classify this CRM next_action into one of: send_linkedin_message, send_instagram_dm, send_twitter_dm, send_offer, book_call, research_only, skip. Return JSON: { type, message_hint }"
  - Input: `{ next_action, platform, display_name, pipeline_stage, offer_readiness }`
- [ ] Falls back to keyword matching if Claude unavailable:
  - Contains "LinkedIn" or `platform=linkedin` → `send_linkedin_message`
  - Contains "Instagram" or `platform=instagram` → `send_instagram_dm`
  - Contains "offer" or `offer_readiness >= 20` → `send_offer`
  - Contains "research" → `research_only`
  - Default → `send_linkedin_message` if linkedin_url set, else `skip`
- [ ] Skips contacts classified as `skip` or `research_only` (logs reason)

### Feature 3: Message generator
**Acceptance Criteria:**
- [ ] For actions requiring a message: calls Claude Haiku to write it:
  - System: "You are an AI automation consultant. Write a SHORT (2-3 sentence) personalized follow-up message based on the next_action instruction. Be direct, warm, no fluff. Never mention AI writing this."
  - Input: `{ next_action, display_name, headline, ai_summary, platform }`
  - Output: the exact message text to send
- [ ] Message is < 300 chars for Twitter/Instagram, < 600 chars for LinkedIn
- [ ] Falls back to a template using `next_action` text directly if Claude fails

### Feature 4: Action executor — per platform
**Acceptance Criteria:**
- [ ] `send_linkedin_message`: POST `http://localhost:3105/api/linkedin/messages/send` `{ profileUrl: linkedin_url, message }`
- [ ] `send_instagram_dm`: POST `http://localhost:3100/api/messages/send-to` `{ username: instagram_handle, text: message }`
- [ ] `send_twitter_dm`: POST `http://localhost:3003/api/twitter/messages/send-to` `{ username: twitter_handle, text: message }`
- [ ] `send_offer`: generates offer message using offer template (AI Automation Audit $2,500), sends via appropriate platform, sets `last_offer_sent='AI Automation Audit + Build'`, `last_offer_at=now()`
- [ ] On success: logs `✅ Action executed for {display_name} on {platform}`
- [ ] On failure: logs error, does NOT mark as executed (retry next cycle)
- [ ] 30–60s random delay between actions

### Feature 5: CRM update after execution
**Acceptance Criteria:**
- [ ] On successful action:
  - `UPDATE crm_contacts SET next_action = NULL, next_action_at = NULL, last_outbound_at = now(), messages_sent = messages_sent + 1, updated_at = now() WHERE id = contact_id`
  - If action was `send_offer`: also set `pipeline_stage = 'proposal_sent'`
  - Else if `pipeline_stage = 'replied'`: advance to `pipeline_stage = 'interested'`
- [ ] Inserts into `safari_command_queue` for audit: `{ platform, action: 'next_action_executed', params: { contact_id, action_type, message }, status: 'completed' }`
- [ ] Sends Telegram: `✅ Next action executed: {display_name} ({platform}) — {action_type}`
- [ ] Increments `actionsExecuted` in state file

### Feature 6: Daemon loop + launch script
**Acceptance Criteria:**
- [ ] Runs every 2 hours (env `NEXT_ACTION_INTERVAL_HOURS=2`)
- [ ] Only runs 09:00–18:00 (business hours)
- [ ] CLI: `--once`, `--dry-run` (classify + generate message but don't send), `--list` (show all overdue actions without executing)
- [ ] Logs to `harness/logs/next-action-executor.log`
- [ ] `launch-next-action-executor.sh`: start/stop/status/list/dry-run/logs
- [ ] Registered in `watchdog-queue.sh`

### Feature 7: Integration test
**Acceptance Criteria:**
- [ ] `--list` test: queries Supabase, prints overdue contacts with action classification
- [ ] `--dry-run` test: classifies actions and generates messages without sending
- [ ] Daily limit test: stops after MAX_DAILY_ACTIONS
- [ ] CRM update test: after `--once` with a real overdue contact, `next_action` field cleared in Supabase
- [ ] All tests print PASS/FAIL

## Do NOT do
- Do not send to contacts with `pipeline_stage IN ('closed_won', 'closed_lost', 'do_not_contact')`
- Do not exceed MAX_DAILY_ACTIONS
- Do not send outside business hours
- Do not modify pipeline_stage backward (no downgrades)
