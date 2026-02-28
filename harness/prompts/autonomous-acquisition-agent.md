# Autonomous Acquisition Agent — ACD Harness Prompt

## Project Overview

Build a fully autonomous AI agent system that acquires clients/prospects for a service business without human involvement beyond initial configuration. The system moves contacts through a 7-stage pipeline: `new → qualified → warming → ready_for_dm → contacted → replied → call_booked`.

The system is implemented as a Python service integrated with existing Safari Automation DM/comment services and Supabase CRM tables.

## Tech Stack

- **Language:** Python 3.11+
- **Database:** Supabase (PostgreSQL) — project `ivhfuhxorppptyuofbgq`
- **AI:** Anthropic Claude (claude-3-haiku for bulk scoring/generation, claude-3-5-sonnet for final DM generation)
- **HTTP:** httpx (async), already used in crm_brain.py pattern
- **Scheduler:** APScheduler or cron_definitions.py pattern (actp-worker style)
- **Notifications:** Apple push via mcp0_notifications_send_notification, email via mcp0_mail_create_email

## Existing Integrations (DO NOT REBUILD)

- `crm_brain.py` — sync, score, generate, send pipeline (extend, don't replace)
- `safari_cloud_controller.py` — cloud → local Safari command queue
- Safari DM services: IG=3001, TW=3003, TT=3102, LI=3105
- Safari comment services: IG=3005, TW=3007, TT=3006, Threads=3004
- Market Research API: port 3106, `POST /api/research/{platform}/search`
- Supabase tables: `crm_contacts`, `crm_messages`, `crm_message_queue`, `crm_market_research`, `crm_creators`

## File Structure to Build

```
acquisition/
├── __init__.py
├── config.py                    # niche configs, ICP criteria, daily caps
├── discovery_agent.py           # PRD-022: prospect discovery
├── scoring_agent.py             # ICP scoring with Claude
├── warmup_agent.py              # PRD-023: comment warmup scheduling + execution
├── outreach_agent.py            # PRD-024: DM generation + sending
├── followup_agent.py            # PRD-024: reply detection + follow-up sequences
├── orchestrator.py              # PRD-025: DAG coordination, cron, state machine
├── reporting_agent.py           # PRD-026: weekly reports, analytics, insights
├── state_machine.py             # valid stage transitions
├── daily_caps.py                # per-platform send limits
├── notification_client.py       # human notification (push + email)
├── db/
│   ├── migrations/
│   │   └── 001_acquisition_tables.sql
│   └── queries.py               # all SQL queries as typed functions
└── api/
    ├── server.py                # FastAPI or Flask routes
    ├── routes/
    │   ├── discovery.py
    │   ├── warmup.py
    │   ├── outreach.py
    │   ├── orchestrator.py
    │   └── reports.py
    └── schemas.py               # Pydantic models
```

## Key Implementation Rules

1. **Always check daily caps before any send** — read `acq_daily_caps` table, abort if limit hit
2. **Always validate state transitions** via `state_machine.py` before any `UPDATE crm_contacts SET pipeline_stage`
3. **Write every outbound touch to `crm_messages`** — `is_outbound=True, sent_by_automation=True`
4. **Use existing `_save_outbound_to_supabase()` pattern** from `test_crm_e2e.py` as the write model
5. **Never re-outreach archived contacts** within 180 days — check `archived_at` before seeding
6. **All Claude calls must have a fallback** — if Claude fails, use template message, never skip
7. **Dry run mode on every agent** — `--dry-run` flag logs actions without executing

## Database Tables to Create

Run `acquisition/db/migrations/001_acquisition_tables.sql`:
- `acq_niche_configs` — niche targeting configs
- `acq_discovery_runs` — discovery run logs
- `acq_warmup_schedules` — per-contact warmup comment schedule
- `acq_warmup_configs` — warmup parameters per niche
- `acq_outreach_sequences` — per-contact DM sequence tracking
- `acq_human_notifications` — log of human handoff notifications
- `acq_daily_caps` — per-platform per-action daily limits
- `acq_weekly_reports` — weekly report storage
- `acq_message_variants` — A/B message variant tracking
- `acq_funnel_events` — every stage transition event log

## Feature List Reference

See `feature_list.json` alongside this file — 200 features across 5 PRDs, organized by category:
- `discovery` (AAG-001 to AAG-035): PRD-022
- `warmup` (AAG-036 to AAG-070): PRD-023
- `outreach` (AAG-071 to AAG-105): PRD-024
- `followup` (AAG-106 to AAG-120): PRD-024
- `orchestrator` (AAG-121 to AAG-160): PRD-025
- `reporting` (AAG-161 to AAG-200): PRD-026

## First Feature to Build

Start with the database migration (`AAG-001`) and `acquisition/db/queries.py` (`AAG-002`), then build `discovery_agent.py` (`AAG-003` through `AAG-015`). All subsequent agents depend on contacts existing in `crm_contacts`.
