# PRD-037: Strategic DM/Email Outreach (CRM-Driven Timing Engine)

**Status:** Ready for ACD  
**Priority:** P1  
**Author:** Isaiah Dupree  
**Created:** 2026-03-01  
**Depends on:** `actp_prospect_scores`, `crm_contacts`, `crm_conversations`, `crm_interactions`, `crm_message_queue`, Safari DM services (ports 3100/3003/3102/3105), Anthropic Claude API  
**Module:** `strategic_outreach.py`  
**Agent CLAUDE.md:** `actp-worker/.claude/agents/outreach/CLAUDE.md`

---

## Overview

Sending DMs or emails at the wrong time, with the wrong message, or to the wrong person destroys relationships. This PRD defines a CRM-driven outreach timing engine that: reads prospect scores, determines which contacts are due for outreach today (based on cooldown rules and funnel stage), selects the best platform for each contact, generates personalized messages (Claude for decision-stage contacts, templates for awareness), and queues everything in `crm_message_queue` for the actual send.

The engine respects platform-specific optimal send windows, never double-contacts within cooldown periods, and prioritizes by funnel stage (decision first, then consideration, then awareness).

---

## Goals

1. Identify contacts due for outreach daily (respecting cooldown rules)
2. Select best outreach platform per contact based on conversation history + platform presence
3. Generate personalized messages using Claude for high-value contacts (score ≥ 50)
4. Queue messages in `crm_message_queue` with correct timing for batch send
5. Dequeue and send via Safari DM automation or Gmail API
6. Log all sends to `crm_interactions` and update `actp_prospect_scores.next_touch_at`

---

## Outreach Timing Rules

| Funnel Stage | Cooldown | Max/Week | Best Windows (UTC) |
|-------------|---------|---------|-------------------|
| Decision | 2 days | 3 | 13:00, 17:00 Mon–Fri |
| Consideration | 7 days | 1 | 13:00 Mon–Fri |
| Awareness | 14 days | 1 | 13:00 Mon–Wed |

**Cooldown check:**
```python
def _is_due(contact_id, stage, sb) -> bool:
    cooldown = {"decision": 2, "consideration": 7, "awareness": 14}[stage]
    # Check crm_interactions for last outreach within cooldown window
    # Check crm_message_queue for pending/sending messages
```

---

## Platform Selection Priority

```python
PLATFORM_PRIORITY = ["twitter", "instagram", "tiktok", "linkedin", "gmail"]

def _best_platform(contact, prospect_score, sb) -> str:
    # 1. next_touch_type from prospect_score if it maps to a platform
    # 2. Most recent conversation platform (crm_conversations)
    # 3. First platform found in crm_contacts.platform
    # 4. Default: twitter
```

---

## Message Generation

### Decision-Stage (score ≥ 50): Claude API
```python
DECISION_PROMPT = """
You are writing a personal outreach DM from Isaiah Dupree, an AI automation consultant.
Contact: {name} | Platform: {platform} | Score: {score}
Recent signals: {signals}
Research brief: {research_data}

Write a 2-3 sentence DM that:
- References something specific about their work or recent activity
- Mentions a pain point relevant to our {offer} offer without being salesy
- Ends with a soft question that invites conversation
- Sounds like a real person, not marketing copy
Max 280 characters for Twitter. No hashtags. No emojis unless natural.
"""
```

### Consideration-Stage: Templates
```python
CONSIDERATION_TEMPLATES = {
    "twitter": "Hey {name} — noticed you've been posting about {niche}. I've been building some tools around this. Would love to swap notes.",
    "linkedin": "Hi {name}, your recent work on {niche} caught my eye. I'm working on something related and think there could be a good conversation here.",
    "email": "Subject: {niche} — quick thought\n\nHey {name},\n\nSaw your work on {niche}. ...",
}
```

---

## Data Model

### `crm_message_queue`
```sql
-- EXISTING TABLE — real columns confirmed:
id             uuid PRIMARY KEY
contact_id     uuid REFERENCES crm_contacts(id)
platform       text NOT NULL
message_body   text NOT NULL      ← NOT 'message'
message_type   text               ← 'outreach' | 'follow_up' | 'value_add'
scheduled_for  timestamptz
status         text               ← 'pending' | 'sending' | 'sent' | 'failed'
ai_reasoning   text               ← funnel stage stored here
offer_name     text
priority       integer            ← 1=decision, 2=consideration, 3=awareness
created_at     timestamptz
sent_at        timestamptz
```

---

## Safari DM Service Ports

| Platform | Port | Method |
|----------|------|--------|
| Instagram | 3100 | Profile → Message button |
| Twitter | 3003 | Profile Message button → inbox compose fallback |
| TikTok | 3102 | Inbox search → profile fallback |
| LinkedIn | 3105 | Profile Message button |

---

## CLI Interface

```bash
python3 strategic_outreach.py --due                   # Show contacts due today
python3 strategic_outreach.py --build-queue           # Build message queue (no send)
python3 strategic_outreach.py --send --dry-run        # Preview what would be sent
python3 strategic_outreach.py --send                  # Send pending queue messages
python3 strategic_outreach.py --email-queue           # Show pending Gmail messages
python3 strategic_outreach.py --stats                 # Outreach stats last 30 days
```

Via dispatch:
```bash
python3 multi_agent_dispatch.py --domain outreach --task due
python3 multi_agent_dispatch.py --domain outreach --task build-queue
python3 multi_agent_dispatch.py --domain outreach --task send --params '{"dry_run":true}'
```

---

## Cron Schedule

```python
{
    "name": "outreach_queue_build",
    "cron": "0 6 * * *",   # 6AM daily — after agent sweep, before DM windows
    "module": "strategic_outreach",
    "function": "build_queue",
},
```

---

## Real Data Results

- **10 contacts due** as of 2026-03-01:
  - Julian Goldie → gmail (decision, score 33)
  - Mike Daniel → linkedin (awareness, score 21)
  - 8 × linkedin consideration-stage contacts
- **Optimal send window:** 13:00 UTC Mon–Fri

---

## Acceptance Criteria

- [ ] `--due` returns real contacts from `actp_prospect_scores` using `funnel_stage` column (not `stage`)
- [ ] Cooldown check reads both `crm_interactions` and `crm_message_queue` for pending messages
- [ ] `--build-queue` inserts to `crm_message_queue` using `message_body` (not `message`), `message_type`, `ai_reasoning`
- [ ] Decision-stage contacts get Claude-generated personalized messages
- [ ] Consideration-stage contacts get templated messages with niche substitution
- [ ] `--send` sends pending messages via Safari DM services and logs to `crm_interactions`
- [ ] Telegram daily summary: "📬 Outreach: 10 queued | 1 decision (Julian Goldie → email)"
- [ ] `actp_agent_tasks` logged with domain=outreach on every run
- [ ] `--dry-run` shows messages without sending or writing to queue

---

## ACD Enhancement Tasks

| ID | Task | Priority |
|----|------|----------|
| OUTR-001 | Gmail send integration via AppleScript or Gmail API | P1 |
| OUTR-002 | Follow-up sequencer: auto-queue follow-up if no reply in N days | P1 |
| OUTR-003 | Reply detection: poll `crm_conversations` for new replies, escalate in score | P1 |
| OUTR-004 | Multi-touch campaign: 3-step sequence (connect → value add → ask) | P2 |
| OUTR-005 | Send-time personalization: learn each contact's active hours from past interactions | P2 |
| OUTR-006 | A/B test message variants: test two templates, track reply rate | P2 |
| OUTR-007 | Unsubscribe/opt-out handling: flag contacts who ask not to be messaged | P1 |
