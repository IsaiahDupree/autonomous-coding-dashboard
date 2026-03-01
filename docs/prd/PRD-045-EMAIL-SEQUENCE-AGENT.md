# PRD-045 — Email Sequence Agent

**Status:** Draft  
**Priority:** P1  
**Domain:** `email_seq`  
**Module:** `actp-worker/email_sequence_agent.py`  
**Supabase Project:** ivhfuhxorppptyuofbgq  
**Related Tables:** crm_contacts, crm_message_queue, actp_email_sequences, actp_email_sends

---

## Overview

The Email Sequence Agent manages the full email outreach lifecycle: crafting personalized cold/warm email sequences using Claude, scheduling sends at optimal times, tracking opens and clicks (via pixel/link tracking), managing unsubscribes, and adapting sequence steps based on engagement signals. Email is the highest-ROI channel for closing high-ticket deals (score ≥ 60) and is complementary to the DM-first warmup strategy from the Engagement Engine.

---

## Goals

1. Create and manage multi-step email sequences (3–7 steps) for prospects at `decision` or `call_booked` stages.
2. Generate Claude-personalized emails that reference the Research Brief, recent social posts, and specific pain points.
3. Schedule emails to send at optimal local times (9–11 AM recipient timezone, Tue–Thu).
4. Track open rates, click rates, and reply rates per sequence and per step.
5. Automatically advance or pause sequences based on engagement (reply = pause, no open after 3 days = skip step).
6. Integrate with `crm_message_queue` for unified outreach tracking.
7. Handle unsubscribes gracefully and update `crm_contacts.email_opt_out`.
8. Produce weekly email performance report via Telegram.

---

## Architecture

```
multi_agent_dispatch.py
  └─► email_sequence_agent.py
        ├─► actp_research_briefs   (personalization context)
        ├─► crm_contacts           (email, opt_out, stage)
        ├─► actp_email_sequences   (sequence definitions)
        ├─► actp_email_sends       (send history + tracking)
        ├─► Claude API             (email draft generation)
        ├─► Email send: SMTP / SendGrid / Resend (RESEND_API_KEY)
        └─► crm_message_queue      (unified outreach tracking)
```

---

## Sequence Templates

### 3-Step Cold Email Sequence (Awareness → Consideration)
| Step | Timing | Subject | Goal |
|------|--------|---------|------|
| Email 1 | Day 0 | "[Their niche] + a quick idea" | Open + click |
| Email 2 | Day 3 | "Saw you mention [specific thing]" | Reply |
| Email 3 | Day 7 | "Last note — [value prop]" | Convert or close |

### 5-Step Warm Sequence (After DM reply)
| Step | Timing | Subject | Goal |
|------|--------|---------|------|
| Email 1 | Day 0 | "Following up from [platform] DM" | Context bridge |
| Email 2 | Day 2 | "Here's the [resource] I mentioned" | Value delivery |
| Email 3 | Day 5 | "Quick question about [their challenge]" | Discovery |
| Email 4 | Day 9 | "[Case study] relevant to you" | Social proof |
| Email 5 | Day 14 | "15 min call?" | Conversion |

### 2-Step Close Sequence (Decision stage)
| Step | Timing | Subject | Goal |
|------|--------|---------|------|
| Email 1 | Day 0 | "Ready when you are, [Name]" | Soft close |
| Email 2 | Day 5 | "Closing the loop" | Final CTA |

---

## Supabase Tables

### `actp_email_sequences` (new)
```sql
CREATE TABLE actp_email_sequences (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name           TEXT NOT NULL,
  sequence_type  TEXT,   -- cold | warm | close | re_engage
  steps          JSONB,  -- [{step, delay_days, subject_template, body_template}]
  offer_tag      TEXT,
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now()
);
```

### `actp_email_enrollments` (new)
```sql
CREATE TABLE actp_email_enrollments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id      UUID REFERENCES crm_contacts(id),
  sequence_id     UUID REFERENCES actp_email_sequences(id),
  current_step    INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'active',  -- active | paused | completed | replied | unsubscribed
  enrolled_at     TIMESTAMPTZ DEFAULT now(),
  next_send_at    TIMESTAMPTZ,
  last_sent_at    TIMESTAMPTZ,
  UNIQUE(contact_id, sequence_id)
);
```

### `actp_email_sends` (new)
```sql
CREATE TABLE actp_email_sends (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id   UUID REFERENCES actp_email_enrollments(id),
  contact_id      UUID REFERENCES crm_contacts(id),
  step_number     INTEGER,
  subject         TEXT,
  body_text       TEXT,
  sent_at         TIMESTAMPTZ DEFAULT now(),
  opened_at       TIMESTAMPTZ,
  clicked_at      TIMESTAMPTZ,
  replied_at      TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  open_count      INTEGER DEFAULT 0,
  click_count     INTEGER DEFAULT 0,
  tracking_pixel_id TEXT UNIQUE,
  resend_message_id TEXT
);
CREATE INDEX ON actp_email_sends(contact_id, sent_at DESC);
```

---

## CLI Interface

```bash
python3 email_sequence_agent.py --enroll CONTACT_ID warm    # enroll in warm sequence
python3 email_sequence_agent.py --process                   # send all due emails today
python3 email_sequence_agent.py --status                    # enrollments + open/reply rates
python3 email_sequence_agent.py --due                       # show emails due to send now
python3 email_sequence_agent.py --draft CONTACT_ID STEP     # generate + preview draft
python3 email_sequence_agent.py --sequences                 # list all sequence templates
python3 email_sequence_agent.py --stats                     # open rates, reply rates, conversions
python3 email_sequence_agent.py --pause CONTACT_ID          # pause enrollments for contact
python3 email_sequence_agent.py --unsubscribe EMAIL         # opt out + mark contact
python3 email_sequence_agent.py --report                    # weekly email performance report
python3 email_sequence_agent.py --send-test EMAIL           # send test email to self
```

### Dispatch Integration
```python
AGENTS["email_seq"] = {
    "process":    ("email_sequence_agent.py", ["--process"]),
    "due":        ("email_sequence_agent.py", ["--due"]),
    "status":     ("email_sequence_agent.py", ["--status"]),
    "stats":      ("email_sequence_agent.py", ["--stats"]),
    "report":     ("email_sequence_agent.py", ["--report"]),
}
```

---

## Email Personalization Variables

```
{first_name}          — from crm_contacts.display_name
{their_niche}         — from actp_research_briefs.social_posts[0].topic
{recent_post_ref}     — reference to their most recent post
{pain_point}          — from offer_fit.pain_points[0]
{our_relevant_win}    — case study or result relevant to their niche
{outreach_angle}      — from actp_research_briefs.outreach_angle
{offer_name}          — e.g., "Safari Automation Suite"
```

---

## Cron Schedule

| Job | Schedule | Action |
|-----|----------|--------|
| `email_process_due` | Daily 9 AM | `--process` |
| `email_weekly_report` | Mon 8 AM | `--report` → Telegram |
| `email_check_replies` | Every 4h | check crm_messages for email replies |

---

## Telegram Alerts

```
📧 Email Report — Week of Mar 2
━━━━━━━━━━━━━━━━━━━━━━━━━
Sent: 24 | Opened: 14 (58%) | Clicked: 6 (25%) | Replied: 3 (12.5%)
Active enrollments: 18 (cold:8, warm:7, close:3)
Unsubscribes: 1
Best subject: "Saw you mention..." — 71% open rate

🎯 Reply received from: [Name]
Sequence: warm, step 3 → paused
Next: CRM brief queued for follow-up
```

---

## Acceptance Criteria

- [ ] `--enroll CONTACT_ID warm` creates enrollment row with `next_send_at` computed
- [ ] `--process` sends all `next_send_at <= now()` emails and advances step
- [ ] Emails are Claude-personalized with contact-specific variables filled in
- [ ] Replied contacts get sequence paused automatically
- [ ] `--stats` shows open/reply/conversion rates from Supabase data
- [ ] Unsubscribe link in every email updates `crm_contacts.email_opt_out`
- [ ] `--report` sends weekly Telegram with all key metrics
- [ ] `multi_agent_dispatch.py --domain email_seq --task process` runs cleanly

---

## ACD Enhancement Tasks

1. Implement `email_sequence_agent.py` with all CLI flags
2. Create Supabase migrations for 3 new tables
3. Implement Claude draft generation using research brief context
4. Integrate with Resend API for transactional email delivery
5. Add open tracking via pixel embedding and click tracking via redirect
6. Implement automatic sequence advancement on send + pause on reply
7. Add unsubscribe handler updating `crm_contacts.email_opt_out`
8. Send weekly Telegram performance report
