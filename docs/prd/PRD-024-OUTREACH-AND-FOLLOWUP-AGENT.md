# PRD-024: Outreach & Follow-up Agent

**Status:** Ready for ACD  
**Priority:** P1  
**Depends on:** PRD-023 (Warmup), crm_brain.py, DM services (3001/3003/3102/3105), `crm_contacts`, `crm_messages`

---

## Overview

Once a contact completes warmup (`pipeline_stage = 'ready_for_dm'`), the Outreach Agent generates a personalized first DM using Claude — informed by their top posts, niche, and score reasoning — and sends it via the appropriate platform DM service. The Follow-up Agent then monitors for replies and executes a 2-touch follow-up sequence (Day 4, Day 7) for non-responders, then archives. All inbound replies trigger an immediate human notification and advance the contact to `replied`.

---

## Goals

1. Generate context-aware, non-spammy first DMs using Claude + contact data
2. Send via correct platform at safe rate limits (respect per-service daily caps)
3. Detect replies within 24h via inbox sync
4. Execute Day 4 and Day 7 follow-ups automatically for non-responders
5. Route `replied` contacts to human with full context (conversation, score, posts)
6. Persist every touch in `crm_messages` and `crm_message_queue`

---

## Architecture

```
OutreachAgent (trigger: pipeline_stage = 'ready_for_dm')
    ├── ContextBuilder      → crm_contacts + crm_market_research → contact brief
    ├── MessageGenerator    → Claude API, contact brief → personalized DM
    ├── MessageValidator    → length check, no-pitch guard, tone check
    ├── SendRouter          → platform → DM service port mapping
    ├── DMSender            → POST /api/messages/send-to (3001/3003/3102/3105)
    └── StageUpdater        → pipeline_stage = 'contacted', INSERT crm_messages

FollowUpAgent (cron: daily 10AM)
    ├── StaleContactFinder  → pipeline_stage = 'contacted', last_outbound > 3 days ago
    ├── ReplyDetector       → crm_brain.py --sync → check last_inbound_at
    │     ├── Reply found   → stage = 'replied', human notification
    │     └── No reply      → queue follow-up
    ├── FollowUpGenerator   → Claude, different angle from first DM
    └── ArchiveHandler      → after Day 7 no-reply → stage = 'archived'
```

---

## First DM Generation Prompt (Claude)

```
You are writing a personalized first DM to a prospect on {platform}.

Contact context:
- Name: {display_name}
- Platform: {platform} (@{handle})
- ICP Score: {score}/100  
- Score reasoning: {score_reasoning}
- Their top recent post: "{top_post_text}" ({top_post_likes} likes)
- Their niche: {niche}

Service being offered: {service_description}

Write a first DM that:
1. Opens with ONE specific reference to their content (shows you actually looked)
2. Delivers a genuine insight or observation in 1-2 sentences
3. Makes a soft, low-pressure ask — NOT a pitch, NOT a meeting request
   (e.g., "Would it be useful if I shared what I'm seeing work for accounts like yours?")
4. Feels like a peer, not a vendor
5. Max 4 sentences total. No emojis. No "I hope this finds you well."

DM:
```

---

## Follow-up Message Sequences

### Follow-up 1 (Day 4 — Different Angle)
```
Context: Same contact, no reply to first DM.
Write a 2-3 sentence follow-up. Use a completely different angle from the first message.
Focus on social proof or a specific result. End with a yes/no question.
```

### Follow-up 2 (Day 7 — Close the Loop)
```
Context: Final follow-up. No reply to previous 2 messages.
Write 1-2 sentences. Acknowledge this is the last message.
Leave the door open without being desperate.
Example: "Last message from me — if the timing ever changes, [reason to reach back out]."
```

---

## Data Model

### `acq_outreach_sequences`
```sql
CREATE TABLE acq_outreach_sequences (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      uuid REFERENCES crm_contacts(id),
  service_slug    text NOT NULL,
  touch_number    integer NOT NULL,    -- 1, 2, 3
  message_text    text,
  platform        text NOT NULL,
  scheduled_at    timestamptz,
  sent_at         timestamptz,
  message_id      uuid REFERENCES crm_messages(id),
  status          text DEFAULT 'pending',  -- pending|sent|failed|skipped
  skip_reason     text,
  created_at      timestamptz DEFAULT now()
);
```

### `acq_human_notifications`
```sql
CREATE TABLE acq_human_notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      uuid REFERENCES crm_contacts(id),
  trigger         text NOT NULL,    -- 'replied','call_interest','objection'
  summary         text,             -- AI-generated 2-sentence summary of convo
  context_url     text,             -- deep link to CRM contact view
  notified_via    text[],           -- ['email','slack','push']
  notified_at     timestamptz DEFAULT now(),
  actioned_at     timestamptz,
  created_at      timestamptz DEFAULT now()
);
```

---

## API Design

### `POST /api/acquisition/outreach/generate`
Generate DM for a single contact (preview before send).
```json
{ "contact_id": "uuid", "service_slug": "linkedin-lead-gen", "touch": 1 }
```
Returns: `{ message_text, platform, estimated_send_at }`

### `POST /api/acquisition/outreach/send`
Send pending outreach for a batch of contacts.
```json
{ "service_slug": "linkedin-lead-gen", "limit": 10, "dry_run": false }
```

### `POST /api/acquisition/followup/process`
Process follow-ups: sync inboxes, detect replies, send due follow-ups.
```json
{ "dry_run": false }
```
Returns: `{ replied: [], followup_sent: [], archived: [] }`

### `POST /api/acquisition/notify/human`
Send human notification for a replied contact.
```json
{ "contact_id": "uuid", "channel": "email" }
```

---

## Features

See `feature_list.json` → category `outreach` + `followup` (AAG-071 through AAG-120)

---

## Implementation Notes

- **Rate limits per platform (enforced by DM services):**
  - Instagram: ~20/day, ~5/hour → pull from `rateLimits` in response
  - Twitter: ~50/day
  - TikTok: ~30/day  
  - LinkedIn: ~50/day
- **Reply detection:** `crm_brain.py --sync` populates `crm_messages` with inbound; check `last_inbound_at > last_outbound_at`
- **Human notification:** Apple push (mcp0_notifications_send_notification) + email (mcp0_mail_create_email) with contact summary + Supabase deep link
- **Context builder:** read `crm_market_research` for contact's top 3 posts by engagement, `crm_score_history` for score reasoning
