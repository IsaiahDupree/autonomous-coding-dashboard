# PRD-030: Prospect Funnel Scorer & Research Triggers

**Status:** Ready for ACD  
**Priority:** P1  
**Author:** Isaiah Dupree  
**Created:** 2026-03-01  
**Depends on:** `crm_contacts`, `crm_interactions`, `crm_conversations`, `actp_prospect_scores`, `actp_twitter_research`, Anthropic Claude API  
**Module:** `prospect_funnel_scorer.py`  
**Agent CLAUDE.md:** `actp-worker/.claude/agents/prospect/CLAUDE.md`

---

## Overview

The Prospect Funnel Scorer assigns every CRM contact a numeric score (0–100) and a funnel stage (awareness / consideration / decision) based on real engagement signals. When a contact's score exceeds 65 AND offer-readiness signals are present, it automatically triggers a Claude-generated research brief. This brief is stored in Supabase and surfaces in the daily sweep Telegram summary so outreach can be personalized at the right moment.

This is not marketing automation — it is relationship intelligence. The scorer distinguishes real humans from bots, surfaces high-ICP contacts who are approaching a buying signal, and ensures the outreach agent always has the highest-value targets pre-researched.

---

## Goals

1. Score all 500+ CRM contacts on a 6-hour cycle, write results to `actp_prospect_scores`
2. Classify each contact into awareness / consideration / decision funnel stage
3. Detect bot contacts and exclude them from scoring (email prefixes, known bot domains)
4. When score ≥ 65 + offer signal → auto-trigger Claude research brief
5. Surface top 10 prospects in Telegram daily summary with stage + score
6. Support ad-hoc re-scoring of a single contact via CLI or dispatch call

---

## Funnel Stage Definitions

| Stage | Score Range | Signals |
|-------|-------------|---------|
| **Awareness** | 0–30 | New contact, no engagement, no replies |
| **Consideration** | 31–64 | Replied to DM, liked multiple tweets, viewed content, email opened |
| **Decision** | 65–100 | Asked about pricing/offer, multiple touchpoints across 3+ days, responded to 2+ DMs, mentioned specific pain point |

---

## Scoring Signal Weights

| Signal | Weight | Source Table |
|--------|--------|-------------|
| DM reply from contact | +15 | `crm_conversations` |
| DM reply count (each) | +5 | `crm_conversations` |
| Twitter engagement (like/RT on our post) | +8 | `actp_twitter_research` |
| Email opened | +6 | `crm_interactions` type=email |
| Email replied | +12 | `crm_interactions` type=email_reply |
| ICP keyword in bio | +10 | `crm_contacts.bio` |
| Multiple platform presence | +5 | `actp_platform_associations` |
| Offer keyword in DM/email | +15 | `crm_conversations.last_message` |
| Days since last contact (decay) | −2/week | `crm_interactions.created_at` |
| ICP fit score from CRM | up to +10 | `crm_contacts.icp_score` |

---

## Research Triggers

When `score >= 65` AND any of:
- Contact mentioned "pricing", "cost", "budget", "work together", "services", "hire"
- 3+ DM exchanges in last 14 days
- Email reply in last 7 days
- ICP fit score > 80

→ Fire `_trigger_research_brief(contact_id)`:

```python
async def _trigger_research_brief(contact_id: str) -> dict:
    """Generate Claude research brief for high-value prospect."""
    # 1. Pull contact profile + all interactions + scores
    # 2. Build context: name, platforms, engagement history, ICP signals
    # 3. Claude prompt: "Generate a 3-sentence outreach brief for this prospect..."
    # 4. Store in actp_prospect_scores.research_data + research_done=True
    # 5. Log to actp_agent_tasks
```

---

## Data Model

### `actp_prospect_scores`
```sql
-- EXISTING TABLE — columns confirmed:
id              uuid PRIMARY KEY
contact_id      uuid REFERENCES crm_contacts(id) UNIQUE
funnel_stage    text  -- 'awareness' | 'consideration' | 'decision'
score           integer
score_breakdown jsonb  -- {dm_replies: 15, twitter_eng: 8, ...}
research_done   boolean DEFAULT false
research_data   jsonb  -- Claude-generated brief
research_at     timestamptz
next_touch_type text   -- 'dm' | 'email' | 'twitter'
next_touch_at   timestamptz
offer_readiness integer  -- 0–100
icp_fit         integer  -- 0–100
updated_at      timestamptz
created_at      timestamptz
```

---

## Bot Detection

Contacts matching any of the following are excluded from scoring:

```python
BOT_EMAIL_PREFIXES = ["noreply", "no-reply", "donotreply", "mailer-daemon", ...]
BOT_DOMAINS = ["linkedin.com", "adobe.com", "amazon.com", "instagram.com", ...]
BOT_DISPLAY_NAMES = ["LinkedIn", "Twitter", "Instagram", "Stripe", ...]
```

---

## CLI Interface

```bash
python3 prospect_funnel_scorer.py --score-all          # Score all contacts
python3 prospect_funnel_scorer.py --top 20             # Show top 20 prospects
python3 prospect_funnel_scorer.py --next-actions       # Contacts with next_touch_at today
python3 prospect_funnel_scorer.py --research-ready     # Contacts where research_done=False AND score>=65
python3 prospect_funnel_scorer.py --score <contact_id> # Re-score single contact
```

---

## Cron Schedule

```python
{
    "name": "prospect_funnel_score",
    "cron": "30 */6 * * *",  # Every 6h at :30
    "module": "prospect_funnel_scorer",
    "function": "score_all_contacts",
}
```

---

## Acceptance Criteria

- [ ] `--score-all` completes for 500 contacts in under 60 seconds
- [ ] Every contact upserted to `actp_prospect_scores` with valid `funnel_stage`
- [ ] Bot contacts excluded from all results (LinkedIn email, Amazon, etc.)
- [ ] Score ≥ 65 contacts trigger research brief if `research_done = False`
- [ ] Research brief stored in `research_data` as Claude-generated JSON
- [ ] `--top 10` outputs correct sorted list with name, stage, score, platform
- [ ] Telegram alert fires with top 3 decision-stage contacts after `--score-all`
- [ ] `actp_agent_tasks` row written with `domain=prospect`, `status=ok`, `duration_ms`
- [ ] Re-scoring same contact updates existing row, does not duplicate

---

## Multi-Stage Funnel Enhancements (ACD tasks)

| ID | Task | Priority |
|----|------|----------|
| PROS-001 | Perplexity research enrichment on trigger | P1 |
| PROS-002 | Add LinkedIn interaction signals via `li_prospect.py` | P1 |
| PROS-003 | Score decay: contacts with no signal in 30+ days drop by 20 points | P2 |
| PROS-004 | ICP keyword matcher: flag bio keywords "automation", "agency", "coach" | P1 |
| PROS-005 | Multi-touch attribution: score boost when signals span 3+ platforms | P2 |
| PROS-006 | Research brief email: auto-email brief to Isaiah when decision-stage contact found | P2 |
| PROS-007 | Offer proximity detector: map contact signals to nearest service offering | P1 |
| PROS-008 | Weekly funnel health report: stage distribution chart → Telegram | P3 |
