# PRD: Email Follow-up Sequence

## Goal

110 Gmail contacts sit at `first_touch` with zero follow-up. These came from the inbox reply harvester and represent people who already engaged via email. Build a 3-email nurture sequence that runs against them via Gmail, tracks opens/replies in Supabase, and advances contacts through the pipeline when they respond.

## Working Directory

/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard

## Key Context

- Gmail contacts: `crm_contacts WHERE platform = 'gmail'` — 110 rows
- Gmail MCP or `agent-calendar-email` PRD already built (check `harness/agent-calendar-email-features.json`)
- Gmail sending: use existing Gmail API integration from `actp-worker` or Safari Gmail tab
- Check port availability: `agent-comms` or Gmail service
- ANTHROPIC_API_KEY, Gmail credentials from actp-worker/.env
- Supabase: `crm_contacts`, `crm_message_queue`
- Sequence state: `harness/email-sequence-state.json`
- Daily limit: max 15 emails/day (Gmail safe sending limit for cold outreach)
- DO NOT send to contacts who have `unsubscribed = true` or `do_not_do` containing 'no email'

## Output Files

- `harness/email-followup-sequence.js` — sequence daemon
- `harness/launch-email-followup.sh` — start/stop/status/send-now/dry-run

---

## Features

### Feature 1: Supabase migration — email_sequence_state table
**Acceptance Criteria:**
- [ ] Creates `email_sequence_state` table:
  ```sql
  CREATE TABLE IF NOT EXISTS email_sequence_state (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id uuid REFERENCES crm_contacts(id),
    email text NOT NULL,
    sequence_step int DEFAULT 0,
    last_sent_at timestamptz,
    next_send_at timestamptz,
    status text DEFAULT 'active', -- active, replied, unsubscribed, completed, bounced
    emails_sent int DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(contact_id)
  );
  CREATE INDEX IF NOT EXISTS idx_email_seq_next ON email_sequence_state(next_send_at, status);
  ```
- [ ] Applied via `mcp__supabase__apply_migration`

### Feature 2: Gmail contact loader + sequence initializer
**Acceptance Criteria:**
- [ ] Queries: `SELECT * FROM crm_contacts WHERE platform = 'gmail' AND email IS NOT NULL AND (do_not_do IS NULL OR do_not_do NOT ILIKE '%no email%')`
- [ ] For each contact not yet in `email_sequence_state`: inserts row with `sequence_step=0`, `next_send_at = now()` (immediate), `status='active'`
- [ ] Skips contacts already in sequence
- [ ] Logs: `Initialized N new Gmail contacts into email sequence`

### Feature 3: Email template engine — 3-step sequence
**Acceptance Criteria:**
- [ ] Defines 3 sequence steps:
  - **Step 1 (day 0)** — Value-first introduction:
    Subject: `Quick question about your AI automation stack, {first_name}`
    Theme: Ask about their current pain point with automation, share 1 specific insight. NO pitch.
  - **Step 2 (day 3)** — Social proof + relevance:
    Subject: `How [similar founder] cut 10hrs/week with AI agents`
    Theme: 1 concrete result story, 1 relevant insight from their profile, soft CTA (reply to this email).
  - **Step 3 (day 7)** — Direct offer:
    Subject: `Last thing from me — AI Automation Audit (free 30min)`
    Theme: Direct offer of free audit call, no pressure, clear value statement.
- [ ] Each template uses Claude Haiku to personalize: inserts `first_name`, references `headline`/`bio`/`what_theyre_building`
- [ ] Generates subject + body per contact, body < 200 words
- [ ] Falls back to base template if Claude fails

### Feature 4: Gmail sender
**Acceptance Criteria:**
- [ ] Checks if Gmail service is available: looks for `agent-comms` endpoint or Gmail API in actp-worker
- [ ] If Gmail API available (check `actp-worker/gmail_client.py` or similar): uses it to send
- [ ] If not available: writes emails to `harness/email-outbox/YYYY-MM-DD-{contact_id}.json` with `{ to, subject, body, contact_id, step }` for manual review (graceful degradation)
- [ ] After send (real or queued): records in `crm_message_queue`: `{ contact_id, platform:'gmail', direction:'outbound', content: subject, sent_at: now() }`
- [ ] Updates `email_sequence_state`: `emails_sent++`, `sequence_step++`, `last_sent_at=now()`, `next_send_at = now() + step_delay`
- [ ] Updates `crm_contacts.last_outbound_at = now()`
- [ ] Enforces 30s delay between sends
- [ ] Stops when daily limit reached (`EMAIL_DAILY_LIMIT=15`)

### Feature 5: Reply detector
**Acceptance Criteria:**
- [ ] Checks `crm_contacts WHERE platform='gmail' AND last_inbound_at > last_outbound_at` (reply bridge will populate this)
- [ ] Also checks `email_sequence_state` for contacts that replied (status != 'active')
- [ ] On detected reply: sets `email_sequence_state.status = 'replied'`, stops sequence for that contact
- [ ] Updates `crm_contacts.pipeline_stage = 'replied'`, `replies_received++`
- [ ] Triggers Claude next_action: same pattern as reply-crm-bridge Feature 5
- [ ] Sends Telegram: `📧 Gmail reply from {display_name}: "{preview}"`

### Feature 6: Sequence daemon + launch script
**Acceptance Criteria:**
- [ ] Runs every 4 hours (env `EMAIL_INTERVAL_HOURS=4`)
- [ ] Only runs 09:00–17:00
- [ ] CLI: `--once`, `--dry-run` (generate emails, don't send), `--status` (show sequence progress per contact), `--init` (initialize new contacts only)
- [ ] Logs to `harness/logs/email-followup-sequence.log`
- [ ] `launch-email-followup.sh`: start/stop/status/dry-run/send-now/logs
- [ ] Registered in `watchdog-queue.sh`
- [ ] Startup Telegram: `📧 Email sequence started — N contacts in sequence, N due to send today`

### Feature 7: Integration test
**Acceptance Criteria:**
- [ ] Gmail contact count test: queries Supabase, verifies 110 gmail contacts exist
- [ ] Sequence init test: `--init` correctly creates `email_sequence_state` rows for uninitialized contacts
- [ ] Template test: `--dry-run` generates step 1 email for 3 contacts, validates subject and body not empty
- [ ] Daily limit test: stops at EMAIL_DAILY_LIMIT
- [ ] All tests print PASS/FAIL

## Do NOT do
- Do not send to contacts with `do_not_do` containing 'no email'
- Do not send more than 3 emails per contact total
- Do not send outside 09:00–17:00
- Do not exceed EMAIL_DAILY_LIMIT=15 per day
- Do not send step 2 before 3 days after step 1
