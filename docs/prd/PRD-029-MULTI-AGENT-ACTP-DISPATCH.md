# PRD-029: Multi-Agent ACTP Dispatch Architecture

**Status:** Ready for ACD  
**Priority:** P0 — Foundation for all 9 domain agents  
**Author:** Isaiah Dupree  
**Created:** 2026-03-01  
**Depends on:** Supabase `ivhfuhxorppptyuofbgq`, actp-worker, service_registry.py

---

## Overview

The ACTP system has 9 distinct operational domains — prospect scoring, A/B testing, posting schedule optimization, content mix tracking, YouTube analytics, cross-platform trend detection, top creator research, strategic outreach, and Remotion content production. Each domain requires specialized logic, data pipelines, and Supabase writes.

This PRD defines the **Multi-Agent Dispatch Architecture**: a central Python orchestrator (`multi_agent_dispatch.py`) that routes tasks to the correct domain engine, logs every execution to Supabase, and can be invoked by Claude Code agents, crons, CLI, or HTTP.

The architecture follows a `domain.task` naming pattern (mirroring `service_registry.py`) and ensures every domain agent is independently testable, observable, and composable into daily sweeps.

---

## Goals

1. One Claude Code agent per domain — each with a `CLAUDE.md` defining its exact responsibilities, tools, and Supabase tables
2. Central dispatch via `multi_agent_dispatch.py` with `--domain` / `--task` CLI args
3. Every task execution logged to `actp_agent_tasks` (domain, task, status, duration_ms, result)
4. Daily sweep cron at 5 AM fires all 9 agents and sends Telegram summary
5. All 9 agents callable with real data, no mocks, no placeholders
6. ACD can autonomously pick up any domain and implement new tasks using the CLAUDE.md spec

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                    MULTI-AGENT DISPATCH LAYER                          │
│                                                                        │
│   multi_agent_dispatch.py                                              │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │  CLI / HTTP / Cron / Claude Code invocation                    │   │
│   │  --domain <agent> --task <task> --params <json>                │   │
│   └───────────────────────────┬────────────────────────────────────┘   │
│                               │                                        │
│              ┌────────────────▼────────────────┐                       │
│              │         Domain Router            │                       │
│              │  maps domain.task → Python fn    │                       │
│              └──┬──┬──┬──┬──┬──┬──┬──┬──┬──────┘                       │
│                 │  │  │  │  │  │  │  │  │                              │
└─────────────────┼──┼──┼──┼──┼──┼──┼──┼──┼──────────────────────────────┘
                  │  │  │  │  │  │  │  │  │
          ┌───────┘  │  │  │  │  │  │  │  └──────────┐
          ▼          ▼  │  ▼  │  ▼  │  ▼             ▼
       prospect    ab   │ sched│ mix │ yt  trends  outreach  remotion
       _funnel_  _post_ │_optim│_trk │_ing  _assoc  _engine  _producer
       scorer    tester │izer  │ker  │est   _engine
                        ▼      ▼
                    content  youtube
                    _mix     _mplite
                    _tracker _ingest
```

### The 9 Domain Agents

| # | Domain | Module | Key Task |
|---|--------|--------|----------|
| 1 | `prospect` | `prospect_funnel_scorer.py` | Score 500 CRM contacts, trigger research |
| 2 | `ab-tester` | `ab_post_tester.py` | A/B test Blotato vs Safari Twitter posts |
| 3 | `scheduler` | `growth_orchestrator.py` | Optimize posting windows via Thompson Sampling |
| 4 | `content-mix` | `growth_orchestrator.py` | Track niche performance, recommend content balance |
| 5 | `youtube` | `youtube_mplite_ingest.py` | Ingest YouTube stats → niche resonance matrix |
| 6 | `trends` | `platform_association_engine.py` | Detect cross-platform niche trends |
| 7 | `creators` | `growth_orchestrator.py` | Pull top creators/posts from Market Research API |
| 8 | `outreach` | `strategic_outreach.py` | CRM-driven DM/email timing + message generation |
| 9 | `remotion` | `remotion_content_producer.py` | Brief → render → distribute video content |

---

## Data Model

### `actp_agent_tasks`
```sql
CREATE TABLE actp_agent_tasks (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    domain       text NOT NULL,           -- 'prospect', 'trends', etc.
    task         text NOT NULL,           -- 'score-all', 'detect', etc.
    params       jsonb DEFAULT '{}',      -- input parameters
    status       text NOT NULL DEFAULT 'pending',  -- pending|running|ok|error
    result       jsonb DEFAULT '{}',      -- stdout, returncode, data
    duration_ms  integer,
    created_at   timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz
);
```

### `actp_cross_platform_trends`
```sql
CREATE TABLE actp_cross_platform_trends (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    niche            text NOT NULL UNIQUE,
    platforms        text[] NOT NULL,
    platform_count   integer DEFAULT 0,
    total_engagement numeric DEFAULT 0,
    avg_engagement   numeric DEFAULT 0,
    trend_strength   numeric DEFAULT 0,
    top_posts        jsonb DEFAULT '[]',
    detected_at      timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);
```

---

## CLI Interface

```bash
# List all agents and their tasks
python3 multi_agent_dispatch.py --list

# Run a single domain task
python3 multi_agent_dispatch.py --domain prospect --task score-all
python3 multi_agent_dispatch.py --domain trends --task detect
python3 multi_agent_dispatch.py --domain outreach --task due
python3 multi_agent_dispatch.py --domain outreach --task build-queue
python3 multi_agent_dispatch.py --domain youtube --task analyze
python3 multi_agent_dispatch.py --domain creators --task sync --params '{"platform":"twitter","niche":"ai_automation"}'

# Run full daily sweep (all 9 agents)
python3 multi_agent_dispatch.py --all

# Check recent task status from Supabase
python3 multi_agent_dispatch.py --status
```

---

## Daily Sweep Flow

```
5:00 AM UTC — multi_agent_daily_sweep cron fires
  ├── prospect.score-all       → score 500 contacts, flag research-ready
  ├── ab-tester.checkback      → pull 1h/4h/24h metrics for active tests
  ├── scheduler.optimize       → recompute best posting windows
  ├── content-mix.recommend    → generate content balance recommendation
  ├── youtube.analyze          → tag new videos with niche/offer/type
  ├── trends.detect            → cross-platform niche trend scoring
  ├── creators.sync            → refresh top creator data from research API
  ├── outreach.build-queue     → queue today's CRM outreach messages
  └── remotion.check-jobs      → poll render status, trigger distribute on complete

5:30 AM UTC — Telegram summary:
  "🤖 Daily Agent Sweep — 9/9 ✅
   • 3 research-ready prospects | Top: Julian Goldie (score 33)
   • A/B tests: 2 running, 1 winner declared (Blotato +34%)
   • Top trend: ai_automation × 3 platforms
   • 12 outreach messages queued
   • Remotion: 2 renders complete, 1 distributing"
```

---

## Acceptance Criteria

- [ ] `--list` prints all 9 agents with their tasks
- [ ] `--domain X --task Y` executes the correct module, logs to `actp_agent_tasks`
- [ ] `--all` runs all 9 agents sequentially and sends Telegram summary
- [ ] `--status` reads from `actp_agent_tasks` and prints the last 20 task results
- [ ] All Supabase writes succeed with real data (no mock returns)
- [ ] Agent task log persists domain, task, duration_ms, status, result JSON
- [ ] Telegram alert fires after `--all` with correct counts
- [ ] Each domain CLAUDE.md is co-located with its agent for ACD to read
- [ ] ACD can execute any domain task via `multi_agent_dispatch.py --domain X --task Y`

---

## Feature List Reference

See `actp-worker/multi-agent-features.json` — categories:
- `dispatch` (DISP-001 through DISP-010)
- `prospect` (PROS-001 through PROS-025)
- `ab-tester` (ABTS-001 through ABTS-020)
- `scheduler` (SCHD-001 through SCHD-015)
- `content-mix` (CMIX-001 through CMIX-020)
- `youtube` (YTUB-001 through YTUB-020)
- `trends` (TRND-001 through TRND-015)
- `creators` (CRTR-001 through CRTR-015)
- `outreach` (OUTR-001 through OUTR-025)
- `remotion` (REMO-001 through REMO-020)

---

## ACD Harness Prompt

See `harness/prompts/multi-agent-dispatch.md`
