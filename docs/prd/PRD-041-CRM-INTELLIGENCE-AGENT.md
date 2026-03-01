# PRD-041 — CRM Intelligence Agent

**Status:** Draft  
**Priority:** P1  
**Domain:** `crm_intel`  
**Module:** `actp-worker/crm_intelligence_agent.py`  
**Supabase Project:** ivhfuhxorppptyuofbgq  
**Related Tables:** crm_contacts, crm_conversations, crm_messages, actp_prospect_scores, crm_message_queue

---

## Overview

The CRM Intelligence Agent upgrades the existing `prospect_funnel_scorer.py` into a full CRM intelligence layer. It tracks pipeline stage transitions, scores relationship depth using Claude, identifies warm leads across all platforms, triggers research when offer-readiness signals appear, generates AI-personalized message drafts for each prospect, and provides business-level pipeline reporting (contacts by stage, reply rates, conversion percentages).

---

## Goals

1. Score all 537+ CRM contacts by funnel stage (awareness → consideration → decision → closed) every 6 hours.
2. Detect stage transitions and trigger Telegram alerts when a contact moves to `decision` or `call_booked`.
3. Generate Claude-powered personalized outreach drafts based on relationship context and recent signals.
4. Track reply rates, response times, and conversation depth per contact.
5. Surface the top 10 highest-priority contacts for outreach each morning (Telegram daily brief).
6. Enrich contacts with LinkedIn headline, mutual connections, and platform-specific signals.
7. Trigger deep research via `research_intel_agent.py` when icp_fit ≥ 70 or score ≥ 65.
8. Provide pipeline reporting: contacts by stage, conversion rates, avg time-in-stage.

---

## Architecture

```
multi_agent_dispatch.py
  └─► crm_intelligence_agent.py
        ├─► prospect_funnel_scorer.py  (scoring engine)
        ├─► crm_brain.py --score       (AI relationship scoring)
        ├─► crm_brain.py --generate    (AI message drafts)
        ├─► Supabase reads: crm_contacts, crm_conversations, crm_messages
        ├─► Supabase writes: actp_prospect_scores, crm_message_queue, actp_crm_transitions
        └─► Telegram alerts (stage transitions, daily brief, high-value signals)
```

---

## Funnel Stage Definitions (Extended)

| Stage | Criteria | Score Range | Action |
|-------|----------|-------------|--------|
| `cold` | No interaction, unknown | 0–19 | Research only |
| `awareness` | 1+ platform post, ≥1 follow | 20–39 | Comment warmup |
| `consideration` | Replied or commented back | 40–59 | DM sequence |
| `decision` | Score ≥ 65, offer-readiness signal | 60–79 | Personal DM + research |
| `call_booked` | Meeting link sent or confirmed | 80–94 | Pre-call research brief |
| `closed_won` | Deal signed or payment received | 95–100 | Onboarding sequence |
| `closed_lost` | Ghosted after 3+ touches | — | Re-engagement in 90 days |

---

## Scoring Signal Weights (Enhanced)

| Signal | Weight |
|--------|--------|
| LinkedIn connection degree (1st) | +25 |
| Has replied to any DM | +20 |
| Has commented on our posts | +15 |
| Posted about our niche in last 7d | +12 |
| Followed us back | +10 |
| Email opened (via tracking) | +10 |
| Watched YouTube video (≥50%) | +8 |
| Visited website (GA signal) | +5 |
| Engagement with competitor content | −5 |
| Last seen > 60 days | −10 |
| Bot detection flags | −100 |

---

## Supabase Tables

### `actp_crm_transitions` (new)
```sql
CREATE TABLE actp_crm_transitions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id     UUID REFERENCES crm_contacts(id),
  from_stage     TEXT,
  to_stage       TEXT,
  trigger        TEXT,    -- score_increase | reply | dm_sent | manual
  score_at_transition INTEGER,
  created_at     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON actp_crm_transitions(contact_id, created_at DESC);
```

### `actp_crm_daily_brief` (new)
```sql
CREATE TABLE actp_crm_daily_brief (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brief_date     DATE NOT NULL UNIQUE,
  top_contacts   JSONB,   -- [{contact_id, name, stage, score, reason}]
  stage_counts   JSONB,   -- {awareness: 466, consideration: 12, decision: 1}
  transitions_today INTEGER DEFAULT 0,
  messages_sent_today INTEGER DEFAULT 0,
  replies_today  INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now()
);
```

---

## CLI Interface

```bash
python3 crm_intelligence_agent.py --score-all           # score all contacts
python3 crm_intelligence_agent.py --transitions         # show recent stage transitions
python3 crm_intelligence_agent.py --top 10              # top 10 priority contacts
python3 crm_intelligence_agent.py --pipeline            # pipeline stage breakdown
python3 crm_intelligence_agent.py --daily-brief         # generate + send Telegram daily brief
python3 crm_intelligence_agent.py --enrich CONTACT_ID   # enrich specific contact
python3 crm_intelligence_agent.py --generate-drafts     # generate AI message drafts for top contacts
python3 crm_intelligence_agent.py --reply-rates         # reply rates by platform and stage
python3 crm_intelligence_agent.py --research-ready      # contacts that need deep research
python3 crm_intelligence_agent.py --conversion-report   # stage-to-stage conversion rates
python3 crm_intelligence_agent.py --full                # score + transitions + brief + alerts
```

### Dispatch Integration
```python
AGENTS["crm_intel"] = {
    "score":    ("crm_intelligence_agent.py", ["--score-all"]),
    "brief":    ("crm_intelligence_agent.py", ["--daily-brief"]),
    "pipeline": ("crm_intelligence_agent.py", ["--pipeline"]),
    "top":      ("crm_intelligence_agent.py", ["--top", "10"]),
    "drafts":   ("crm_intelligence_agent.py", ["--generate-drafts"]),
    "full":     ("crm_intelligence_agent.py", ["--full"]),
}
```

---

## Research Trigger Logic

When a contact reaches any of these conditions, the agent queues a research task for `research_intel_agent.py`:

```python
RESEARCH_TRIGGERS = [
    lambda c: c["score"] >= 65,
    lambda c: c["funnel_stage"] == "decision",
    lambda c: c["icp_fit"] >= 70,
    lambda c: c["offer_readiness"] >= 60,
    lambda c: c.get("has_replied") and c["score"] >= 45,
]
```

Research brief is inserted into `actp_research_queue` with `contact_id`, `trigger_reason`, `priority`.

---

## Daily Brief Format (Telegram)

```
📊 CRM Daily Brief — Mar 2, 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pipeline: 1 Decision | 12 Consideration | 466 Awareness
Transitions today: 2 (1 → consideration, 1 → decision)
Messages sent: 8 | Replies: 3 (37.5% reply rate)

🔥 Top 3 for outreach today:
1. Julian Goldie (score 33, decision) — follow up on AI tools
2. [Name] (score 28, consideration) — first DM due
3. [Name] (score 25, consideration) — replied yesterday, follow up

Research queue: 2 contacts ready for deep research
```

---

## Cron Schedule

| Job | Schedule | Action |
|-----|----------|--------|
| `crm_score_all` | Every 6h at :30 | `--score-all` |
| `crm_daily_brief` | Daily 8 AM | `--daily-brief` |
| `crm_research_triggers` | Every 2h | `--research-ready` |
| `crm_transitions_check` | Every 1h | `--transitions` |

---

## Acceptance Criteria

- [ ] `--score-all` scores all contacts and writes to `actp_prospect_scores`
- [ ] `--transitions` lists contacts that changed stages in last 24h
- [ ] `--daily-brief` generates JSON + sends Telegram with correct counts
- [ ] `--generate-drafts` creates Claude-personalized messages in `crm_message_queue`
- [ ] Research trigger fires when score ≥ 65: inserts to `actp_research_queue`
- [ ] `--pipeline` shows accurate stage breakdown from Supabase
- [ ] `--reply-rates` computes per-platform reply rates from `crm_messages`
- [ ] `--conversion-report` shows time-in-stage and stage transition rates
- [ ] No bot contacts in scored output
- [ ] `multi_agent_dispatch.py --domain crm_intel --task brief` sends Telegram

---

## ACD Enhancement Tasks

1. Implement `crm_intelligence_agent.py` extending `prospect_funnel_scorer.py`
2. Create `actp_crm_transitions` and `actp_crm_daily_brief` tables
3. Add Claude-powered draft generation using contact context + recent messages
4. Implement `--reply-rates` aggregation from `crm_messages`
5. Add `--conversion-report` with avg time-in-stage per stage
6. Wire research trigger to `actp_research_queue` inserts
7. Add Telegram daily brief delivery
8. Add `--enrich` for per-contact LinkedIn enrichment via port 3105
