# PRD-046 — Revenue Operations Agent

**Status:** Draft  
**Priority:** P1  
**Domain:** `revenue_ops`  
**Module:** `actp-worker/revenue_ops_agent.py`  
**Supabase Project:** ivhfuhxorppptyuofbgq  
**Related Tables:** crm_contacts, actp_prospect_scores, actp_email_sends, actp_engagement_log, actp_revenue_events

---

## Overview

The Revenue Operations Agent provides the top-level business intelligence layer: it tracks the pipeline from first contact to closed deal, measures conversion rates at every stage transition, forecasts monthly revenue based on pipeline velocity, monitors offer performance across platforms and niches, and delivers a daily P&L/pipeline summary to Telegram each morning. It is the "CEO dashboard" that answers: How much revenue is in the pipeline? Which offers are converting? What needs attention today?

---

## Goals

1. Track all revenue events (deals won, recurring revenue, upsells) in `actp_revenue_events`.
2. Compute stage-by-stage conversion rates and average time-in-stage.
3. Forecast monthly revenue using pipeline velocity × average deal value.
4. Track offer-level performance: which offers are getting the most traction per platform/niche.
5. Produce a daily pipeline health summary to Telegram each morning.
6. Alert on negative trends: reply rate dropping, pipeline stagnating, CAC increasing.
7. Measure ROI of each automation investment (hours saved × hourly rate vs revenue generated).
8. Maintain a weekly revenue report with actionable recommendations.

---

## Architecture

```
multi_agent_dispatch.py
  └─► revenue_ops_agent.py
        ├─► crm_contacts          (pipeline stages + conversion dates)
        ├─► actp_prospect_scores  (scores + funnel progression)
        ├─► actp_email_sends      (email conversion signals)
        ├─► actp_engagement_log   (engagement → conversion chain)
        ├─► actp_revenue_events   (closed deals + recurring)
        ├─► actp_ab_tests         (which posting method drives more pipeline)
        └─► Telegram (daily brief + weekly report + alerts)
```

---

## Offer Portfolio

| Offer | Avg Deal Value | Target Stage | Primary Platforms |
|-------|---------------|-------------|-------------------|
| `safari_automation` | $2,500 | decision | Twitter, LinkedIn |
| `creator_growth` | $1,500 | consideration | TikTok, Instagram |
| `ai_automation` | $3,500 | decision | Twitter, Threads |
| `personal_brand` | $997 | awareness | All |

---

## Supabase Tables

### `actp_revenue_events` (new)
```sql
CREATE TABLE actp_revenue_events (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id      UUID REFERENCES crm_contacts(id),
  event_type      TEXT NOT NULL,   -- deal_won | upsell | churn | recurring_payment
  offer_tag       TEXT,
  amount          NUMERIC(10,2),
  currency        TEXT DEFAULT 'USD',
  platform_source TEXT,           -- which platform sourced this contact
  niche_source    TEXT,           -- which niche the contact came from
  days_to_close   INTEGER,        -- days from first contact to close
  notes           TEXT,
  closed_at       TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON actp_revenue_events(closed_at DESC);
CREATE INDEX ON actp_revenue_events(offer_tag, closed_at);
```

### `actp_pipeline_snapshots` (new)
```sql
CREATE TABLE actp_pipeline_snapshots (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date   DATE NOT NULL UNIQUE,
  stage_counts    JSONB,   -- {cold:N, awareness:N, consideration:N, decision:N, call_booked:N}
  stage_values    JSONB,   -- estimated pipeline value per stage
  total_pipeline  NUMERIC(10,2),
  forecast_30d    NUMERIC(10,2),
  contacts_added  INTEGER DEFAULT 0,
  deals_closed    INTEGER DEFAULT 0,
  revenue_today   NUMERIC(10,2) DEFAULT 0,
  revenue_mtd     NUMERIC(10,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### `actp_offer_performance` (new)
```sql
CREATE TABLE actp_offer_performance (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_tag       TEXT NOT NULL,
  platform        TEXT NOT NULL,
  niche           TEXT,
  impressions     INTEGER DEFAULT 0,   -- content views tied to this offer
  engagements     INTEGER DEFAULT 0,
  dm_starts       INTEGER DEFAULT 0,
  pipeline_entries INTEGER DEFAULT 0,
  deals_closed    INTEGER DEFAULT 0,
  revenue_generated NUMERIC(10,2) DEFAULT 0,
  conversion_rate NUMERIC(5,4),
  period_start    DATE,
  period_end      DATE,
  UNIQUE(offer_tag, platform, niche, period_start)
);
```

---

## Pipeline Velocity Metrics

```python
PIPELINE_VELOCITY = {
    "stage_conversion": {
        "cold→awareness":       0.30,   # 30% of cold contacts become aware
        "awareness→consideration": 0.15, # 15% of aware contacts reply/engage
        "consideration→decision":  0.25, # 25% of considered become offer-ready
        "decision→call_booked":   0.40,  # 40% of decision contacts book a call
        "call_booked→closed":     0.35,  # 35% of calls close
    },
    "avg_days_in_stage": {
        "cold": 7, "awareness": 14, "consideration": 21, "decision": 10,
        "call_booked": 5
    }
}
```

Monthly forecast: `Σ (contacts_in_stage × conversion_to_close × avg_deal_value)`

---

## CLI Interface

```bash
python3 revenue_ops_agent.py --pipeline             # current pipeline value + stage breakdown
python3 revenue_ops_agent.py --forecast             # 30/60/90 day revenue forecast
python3 revenue_ops_agent.py --log-deal CONTACT_ID AMOUNT OFFER  # record a closed deal
python3 revenue_ops_agent.py --offer-performance    # ROI per offer per platform
python3 revenue_ops_agent.py --conversion-rates     # stage-by-stage conversion %
python3 revenue_ops_agent.py --daily-brief          # pipeline snapshot + Telegram
python3 revenue_ops_agent.py --weekly-report        # full revenue report + recommendations
python3 revenue_ops_agent.py --mtd                  # month-to-date revenue summary
python3 revenue_ops_agent.py --velocity             # pipeline velocity metrics
python3 revenue_ops_agent.py --top-sources          # top platforms/niches by revenue
python3 revenue_ops_agent.py --alert-check          # check for negative trend alerts
python3 revenue_ops_agent.py --status               # quick dashboard
```

### Dispatch Integration
```python
AGENTS["revenue_ops"] = {
    "pipeline":  ("revenue_ops_agent.py", ["--pipeline"]),
    "forecast":  ("revenue_ops_agent.py", ["--forecast"]),
    "brief":     ("revenue_ops_agent.py", ["--daily-brief"]),
    "report":    ("revenue_ops_agent.py", ["--weekly-report"]),
    "offers":    ("revenue_ops_agent.py", ["--offer-performance"]),
    "status":    ("revenue_ops_agent.py", ["--status"]),
}
```

---

## Daily Brief Format (Telegram)

```
💰 Revenue Ops Daily Brief — Mar 2, 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pipeline: $42,750 (18 contacts across 5 stages)
  • Decision: 2 contacts ($7,000 potential)
  • Call Booked: 1 contact ($3,500 potential)
  • Consideration: 11 contacts ($16,500 potential)

30-day Forecast: ~$12,250 (based on velocity)
MTD Revenue: $4,997
Deals Closed This Month: 2

Top Performing Offer: ai_automation (2.1% conversion, 3.5x ROI)
Best Source: Twitter → ai_automation niche

⚠️ Alert: Reply rate down 12% vs last week (8% → 7%)
Action: Review email subject lines + DM timing
```

---

## Cron Schedule

| Job | Schedule | Action |
|-----|----------|--------|
| `revenue_daily_brief` | Daily 7:30 AM | `--daily-brief` |
| `revenue_pipeline_snapshot` | Daily midnight | snapshot pipeline state |
| `revenue_weekly_report` | Mon 7 AM | `--weekly-report` |
| `revenue_alert_check` | Every 6h | `--alert-check` |
| `offer_performance_update` | Daily 5 AM | `--offer-performance` |

---

## Alert Triggers

| Trigger | Condition | Action |
|---------|-----------|--------|
| Reply rate drop | Week-over-week > 15% decline | Telegram warning |
| Pipeline stagnation | No stage transitions in 5 days | Telegram alert |
| High-value contact silent | Decision-stage contact, no touch in 3 days | Urgent alert |
| Deal closed | New `actp_revenue_events` row | Celebration alert 🎉 |
| Forecast drop | 30d forecast drops > 20% | Strategy alert |

---

## Acceptance Criteria

- [ ] `--pipeline` shows accurate stage breakdown with value estimates from Supabase
- [ ] `--forecast` computes 30/60/90 day projections using pipeline velocity formula
- [ ] `--log-deal` inserts to `actp_revenue_events` and updates forecast
- [ ] `--offer-performance` computes conversion rates per offer × platform
- [ ] `--daily-brief` sends correctly formatted Telegram with pipeline + MTD
- [ ] `--weekly-report` includes conversion rates, top sources, and actionable recommendations
- [ ] Alert fires when reply rate drops > 15% week-over-week
- [ ] Deal-closed alert fires immediately when `--log-deal` is called
- [ ] `multi_agent_dispatch.py --domain revenue_ops --task brief` runs cleanly

---

## ACD Enhancement Tasks

1. Implement `revenue_ops_agent.py` with all CLI flags
2. Create Supabase migrations for 3 new tables
3. Implement pipeline velocity computation using `crm_contacts` stage data
4. Implement 30/60/90 day forecast formula
5. Add offer-performance aggregation joining `actp_content_performance` + `actp_revenue_events`
6. Build alert detection for reply rate drop and pipeline stagnation
7. Send weekly report with Claude-generated recommendations
8. Add `--log-deal` as a quick revenue recording command
