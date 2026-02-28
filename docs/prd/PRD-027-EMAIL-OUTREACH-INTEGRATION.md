# PRD-027: Email Outreach Integration

**Status:** Ready for ACD  
**Priority:** P1  
**Depends on:** PRD-022 (Discovery), PRD-024 (Outreach), PRD-028 (Entity Resolution), `crm_contacts`

---

## Overview

Email is added as a first-class outreach channel alongside DM. After entity resolution surfaces a prospect's email address, the Email Outreach Agent runs a 3-touch sequence (Day 0, Day 4, Day 8) coordinated with the DM sequence so the same prospect is never contacted on both channels simultaneously. Email is the preferred channel for LinkedIn-sourced B2B contacts and any prospect where DM bounces or gets no reply.

---

## Goals

1. Discover email addresses for CRM contacts via LinkedIn, website scraping, and Hunter.io/Apollo patterns
2. Send personalized 3-touch email sequences using Claude-generated copy
3. Track opens and clicks (via Resend webhooks)
4. Coordinate with DM outreach — one active channel at a time per contact
5. Route email replies to human with conversation context (same as DM reply flow)
6. Respect CAN-SPAM / GDPR: honor unsubscribe, never re-email opted-out contacts

---

## Architecture

```
EmailDiscoveryAgent
    ├── LinkedInEmailExtractor    → parse email from LinkedIn profile if public
    ├── WebsiteEmailExtractor     → scrape contact's personal website/bio link
    ├── PatternGuesser            → {first}@{domain}.com, {first}.{last}@{domain}.com
    ├── PerplexityVerifier        → confirm email via Perplexity search (PRD-028 tool)
    └── EmailVerifier             → SMTP verify (check MX record, validate format)

EmailSequenceAgent
    ├── ContextBuilder            → same as DM ContextBuilder (contact brief)
    ├── EmailGenerator            → Claude generates subject + body per touch
    ├── EmailValidator            → length, no-spam-words, CTA check
    ├── EmailSender               → Resend API (POST /emails)
    ├── SequenceTracker           → acq_email_sequences table
    └── ReplyDetector             → Resend webhook OR IMAP polling

EmailCoordinator
    ├── ChannelGate               → only one active channel (DM or email) per contact
    ├── CrossChannelTracker       → if DM replied, pause email sequence
    └── UnsubscribeHandler        → honor opt-outs, never re-send
```

---

## Data Model

### `acq_email_sequences`
```sql
CREATE TABLE acq_email_sequences (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      uuid REFERENCES crm_contacts(id),
  service_slug    text NOT NULL,
  touch_number    integer NOT NULL,       -- 1, 2, 3
  subject         text,
  body_text       text,
  body_html       text,
  from_email      text,
  to_email        text NOT NULL,
  scheduled_at    timestamptz,
  sent_at         timestamptz,
  opened_at       timestamptz,
  clicked_at      timestamptz,
  resend_id       text,                   -- Resend message ID
  status          text DEFAULT 'pending', -- pending|sent|opened|clicked|replied|bounced|unsubscribed|failed
  created_at      timestamptz DEFAULT now()
);
```

### `acq_email_discoveries`
```sql
CREATE TABLE acq_email_discoveries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      uuid REFERENCES crm_contacts(id),
  email           text NOT NULL,
  source          text NOT NULL,     -- 'linkedin','website','pattern','perplexity','manual'
  confidence      numeric(3,2),      -- 0.0 to 1.0
  verified        boolean DEFAULT false,
  mx_valid        boolean,
  discovered_at   timestamptz DEFAULT now()
);
```

### `acq_email_unsubscribes`
```sql
CREATE TABLE acq_email_unsubscribes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text NOT NULL UNIQUE,
  contact_id      uuid REFERENCES crm_contacts(id),
  reason          text,
  unsubscribed_at timestamptz DEFAULT now()
);
```

### Changes to `crm_contacts`
```sql
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS email_source text;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS active_channel text DEFAULT 'dm'; -- 'dm'|'email'|'none'
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS email_opted_out boolean DEFAULT false;
```

---

## Email Generation Prompts (Claude)

### Touch 1 — First Email
```
Write a cold email to {name} ({title} at {company if known}).

Contact context: {contact_brief}
Service offered: {service_description}

Requirements:
- Subject line: specific, curiosity-driven, max 8 words, no ALL CAPS
- Body: 4-6 sentences total
- Opens with ONE specific reference to their work/content
- Delivers value or insight before any ask
- Soft CTA: a yes/no question, not "let's hop on a call"
- PS line: one sentence, different angle or social proof
- No: "I hope this email finds you", "reaching out", "quick call", "synergy"
```

### Touch 2 — Day 4 Follow-up
```
Write a follow-up email. They haven't replied to the first email.
First email subject was: {subject_1}
Use a completely different angle. Lead with a specific result or case study.
2-3 sentences only. End with yes/no question.
```

### Touch 3 — Day 8 Final
```
Final follow-up email. This is the last message.
1-2 sentences. Close the loop gracefully. Leave the door open.
Subject: "Re: {subject_1}"
```

---

## Email Sending — Resend API

```python
import httpx

async def send_email(to: str, subject: str, html: str, text: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            json={
                "from": FROM_EMAIL,   # e.g. "Isaiah <outreach@yourdomain.com>"
                "to": [to],
                "subject": subject,
                "html": html,
                "text": text,
            }
        )
        return r.json()   # {"id": "resend_message_id"}
```

---

## Channel Coordination Rules

```python
CHANNEL_RULES = {
    # If contact has email: prefer email for LinkedIn B2B contacts
    "linkedin": "email",
    # If no email or email bounces: use DM
    "twitter": "dm",
    "instagram": "dm",
    "tiktok": "dm",
    # LinkedIn contacts without email: use LinkedIn DM
    "linkedin_no_email": "dm",
}

# Cross-channel: if DM reply detected while email sequence running → pause email
# if email reply detected while DM pending → cancel DM queue
```

---

## API Design

### `POST /api/acquisition/email/discover`
Discover email for a contact.
```json
{ "contact_id": "uuid", "sources": ["linkedin", "website", "pattern"] }
```
Returns: `{ email, confidence, source, verified }`

### `POST /api/acquisition/email/send`
Send pending email sequences.
```json
{ "limit": 10, "dry_run": false }
```

### `POST /api/acquisition/email/webhooks/resend`
Inbound Resend webhook (opened, clicked, bounced, complained).

### `GET /api/acquisition/email/status`
Email pipeline status: pending, sent today, open rate, reply rate, bounce rate.

---

## Features

See `feature_list_acquisition_email_entity.json` → category `email` (AAG-121 to AAG-160)

---

## Implementation Notes

- **Resend API key:** `RESEND_API_KEY` env var. Free tier: 3,000 emails/month.
- **From domain:** Must be a verified domain in Resend. Use a subdomain for deliverability (e.g., `outreach@yourdomain.com`)
- **IMAP reply detection:** Poll inbox every 4h via `imaplib` if Resend doesn't surface replies. Check `In-Reply-To` header matching `resend_id`
- **Spam word blacklist:** validate body against list of 50+ spam trigger words before send
- **Daily cap:** max 30 emails/day (conservative for deliverability). Store in `acq_daily_caps` as action='email'
- **Bounce handling:** on bounce, set `crm_contacts.email_verified=false`, move channel back to `dm`
- **CAN-SPAM compliance:** include physical address in footer, unsubscribe link in every email, honor opt-outs within 10 business days (we honor immediately)
