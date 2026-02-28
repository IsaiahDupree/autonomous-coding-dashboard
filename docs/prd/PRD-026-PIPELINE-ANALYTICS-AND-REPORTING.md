# PRD-026: Pipeline Analytics & Reporting Agent

**Status:** Ready for ACD  
**Priority:** P2  
**Depends on:** PRD-022–025, `crm_contacts`, `crm_messages`, `acq_discovery_runs`, `acq_warmup_schedules`, `acq_outreach_sequences`

---

## Overview

The Reporting Agent generates weekly pipeline summaries, tracks conversion rates at every funnel stage, surfaces A/B insights on message variants, and delivers a human-readable briefing via email/push notification every Monday. It also maintains a running "what's working" knowledge base — feeding insights back into the ICP scoring criteria and message templates automatically.

---

## Goals

1. Weekly pipeline report delivered to human every Monday 9AM
2. Track conversion rates at every stage transition
3. A/B track message variants — which opening lines get higher reply rates
4. Identify top-performing niches, platforms, and message types
5. Auto-update ICP scoring weights based on which contacts converted
6. Feed learnings back into ContentLite message templates

---

## Architecture

```
ReportingAgent (cron: Monday 9AM)
    ├── PipelineStatsCollector  → aggregate crm_contacts by stage, transitions
    ├── ConversionCalculator    → stage-to-stage conversion rates
    ├── VariantTracker          → group crm_messages by message_template_id, compare reply rates
    ├── NichePerformanceRanker  → best niche × platform combinations
    ├── InsightGenerator        → Claude: summarize data → 3-5 actionable insights
    ├── ReportFormatter         → Markdown + HTML report template
    ├── DeliveryAgent           → email + Apple push notification
    └── KnowledgeUpdater        → update TACIT-KNOWLEDGE.md + ContentLite templates
```

---

## Report Structure (Weekly)

```
╔══════════════════════════════════════════════════════╗
║  ACQUISITION PIPELINE — Week of Feb 24–Mar 2, 2026   ║
╚══════════════════════════════════════════════════════╝

FUNNEL THIS WEEK
  Discovered:       47   (+12 vs last week)
  Qualified (≥65):  22   (47% qualify rate)
  Warmup sent:      31   (comments across 3 platforms)
  DMs sent:         18   
  Replies:           4   (22% reply rate)  ← beat 15% benchmark ✅
  Calls booked:      1
  Closed:            0

PIPELINE SNAPSHOT
  new: 12 | qualified: 8 | warming: 6 | ready_for_dm: 4
  contacted: 14 | replied: 4 | call_booked: 1

BEST PERFORMING
  Platform:    Twitter (29% reply rate)
  Niche:       AI copywriting tools (31% reply rate)
  Message:     Variant B — opens with their top post engagement stat

THIS WEEK'S INSIGHTS (Claude-generated)
  1. Contacts with score ≥80 reply at 3x the rate of 65-70 range — raise threshold to 72
  2. Tuesday DMs get 40% higher open rate than Friday — shift send window
  3. Comments on Twitter perform better than Instagram for this niche

RECOMMENDED ACTIONS
  → Raise ICP min_score from 65 → 72
  → Focus warmup on Twitter this week
  → Use Variant B as default for AI tools niche
```

---

## Data Model

### `acq_weekly_reports`
```sql
CREATE TABLE acq_weekly_reports (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start        date NOT NULL,
  week_end          date NOT NULL,
  discovered        integer DEFAULT 0,
  qualified         integer DEFAULT 0,
  warmup_sent       integer DEFAULT 0,
  dms_sent          integer DEFAULT 0,
  replies_received  integer DEFAULT 0,
  calls_booked      integer DEFAULT 0,
  closed_won        integer DEFAULT 0,
  qualify_rate      numeric(5,2),
  reply_rate        numeric(5,2),
  close_rate        numeric(5,2),
  top_platform      text,
  top_niche         text,
  insights          jsonb DEFAULT '[]',
  report_md         text,
  delivered_at      timestamptz,
  created_at        timestamptz DEFAULT now()
);
```

### `acq_message_variants`
```sql
CREATE TABLE acq_message_variants (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_name      text NOT NULL,       -- "Variant A - curiosity hook"
  service_slug      text NOT NULL,
  touch_number      integer NOT NULL,
  template_text     text NOT NULL,
  sends             integer DEFAULT 0,
  replies           integer DEFAULT 0,
  reply_rate        numeric(5,2),
  is_active         boolean DEFAULT true,
  created_at        timestamptz DEFAULT now()
);
```

### `acq_funnel_events`
```sql
CREATE TABLE acq_funnel_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id        uuid REFERENCES crm_contacts(id),
  from_stage        text NOT NULL,
  to_stage          text NOT NULL,
  triggered_by      text,              -- 'agent','human','timeout'
  metadata          jsonb DEFAULT '{}',
  occurred_at       timestamptz DEFAULT now()
);
```

---

## API Design

### `GET /api/acquisition/reports/latest`
Return the most recent weekly report.

### `GET /api/acquisition/reports`
List all weekly reports with summary stats.

### `POST /api/acquisition/reports/generate`
Generate a report for a given date range.
```json
{ "week_start": "2026-02-24", "deliver": true }
```

### `GET /api/acquisition/analytics/conversion`
Conversion rates by stage.
```json
{
  "new_to_qualified": 0.47,
  "qualified_to_contacted": 0.82,
  "contacted_to_replied": 0.22,
  "replied_to_closed": 0.0
}
```

### `GET /api/acquisition/analytics/variants`
A/B performance by message variant.

### `POST /api/acquisition/analytics/apply-insights`
Auto-apply recommended actions from latest report.
```json
{ "raise_min_score": true, "update_templates": true }
```

---

## Features

See `feature_list.json` → category `reporting` (AAG-161 through AAG-200)
