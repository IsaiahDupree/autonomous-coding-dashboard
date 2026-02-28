# PRD-025: Acquisition Orchestrator

**Status:** Ready for ACD  
**Priority:** P1  
**Depends on:** PRD-022, PRD-023, PRD-024, Workflow Engine (Vercel), safari_cloud_controller.py, `crm_contacts`

---

## Overview

The Orchestrator is the central coordinator for all acquisition agents. It defines the DAG workflow that moves a prospect from `new` → `archived` or `closed_won`, runs all cron schedules, manages the pipeline state machine, handles errors with retry/fallback, and exposes a single status dashboard endpoint. It wraps the existing Workflow Engine (PRD-001) with acquisition-specific step definitions.

---

## Goals

1. Define the full acquisition DAG as a Workflow Engine definition
2. Run all 5 acquisition cron jobs on schedule with no manual triggers
3. Enforce the state machine — contacts can only advance forward, never skip stages
4. Retry failed steps up to 3 times with exponential backoff
5. Surface a real-time pipeline health status via API
6. Respect daily caps across all agents (prevent over-sending)

---

## Architecture

```
AcquisitionOrchestrator
    ├── WorkflowDefinition     → 'autonomous-acquisition' DAG in actp_workflow_definitions
    ├── CronScheduler          → 7 daily cron jobs via cron_definitions.py
    ├── StateMachine           → enforces valid stage transitions in crm_contacts
    ├── DailyCapEnforcer       → reads acq_daily_caps, blocks sends when limit hit
    ├── RetryHandler           → exponential backoff: 5min → 15min → 1hr
    ├── HealthMonitor          → polls all agent services, reports status
    └── PipelineAPI            → GET /api/acquisition/status (full dashboard)
```

---

## Acquisition DAG Definition

```json
{
  "slug": "autonomous-acquisition",
  "name": "Autonomous Client Acquisition",
  "steps": [
    {
      "slug": "discover",
      "type": "local_task",
      "task_type": "acquisition_discovery",
      "inputs": { "niche_config_id": "{{niche_config_id}}" },
      "max_retries": 2
    },
    {
      "slug": "score",
      "type": "local_task",
      "task_type": "icp_scoring",
      "depends_on": ["discover"],
      "inputs": { "min_score": 65 },
      "max_retries": 3
    },
    {
      "slug": "warmup",
      "type": "local_task",
      "task_type": "engagement_warmup",
      "depends_on": ["score"],
      "condition": "score.qualified_count > 0",
      "max_retries": 2
    },
    {
      "slug": "outreach",
      "type": "local_task",
      "task_type": "dm_outreach",
      "depends_on": ["warmup"],
      "condition": "days_since(warmup.completed_at) >= 3",
      "max_retries": 2
    },
    {
      "slug": "sync-replies",
      "type": "local_task",
      "task_type": "inbox_sync",
      "depends_on": ["outreach"],
      "max_retries": 3
    },
    {
      "slug": "followup",
      "type": "local_task",
      "task_type": "followup_sequence",
      "depends_on": ["sync-replies"],
      "max_retries": 2
    },
    {
      "slug": "report",
      "type": "local_task",
      "task_type": "pipeline_report",
      "depends_on": ["followup"],
      "max_retries": 1
    }
  ]
}
```

---

## Cron Schedule

```python
ACQUISITION_CRONS = [
    CronJob(
        name="acquisition_discovery",
        schedule="0 6 * * *",        # 6AM daily
        task_type="acquisition_discovery",
        description="Discover new prospects across all active niche configs"
    ),
    CronJob(
        name="acquisition_scoring",
        schedule="0 7 * * *",        # 7AM daily
        task_type="icp_scoring",
        description="Score all new unscored contacts"
    ),
    CronJob(
        name="acquisition_warmup",
        schedule="0 8 * * *",        # 8AM daily
        task_type="engagement_warmup",
        description="Send pending warmup comments"
    ),
    CronJob(
        name="acquisition_outreach",
        schedule="0 9 * * *",        # 9AM daily
        task_type="dm_outreach",
        description="Send pending first DMs to ready_for_dm contacts"
    ),
    CronJob(
        name="acquisition_sync",
        schedule="0 */4 * * *",      # every 4 hours
        task_type="inbox_sync",
        description="Sync platform inboxes, detect new replies"
    ),
    CronJob(
        name="acquisition_followup",
        schedule="0 10 * * *",       # 10AM daily
        task_type="followup_sequence",
        description="Process follow-ups and archive non-responders"
    ),
    CronJob(
        name="acquisition_report",
        schedule="0 9 * * 1",        # Monday 9AM
        task_type="pipeline_report",
        description="Weekly pipeline performance report"
    ),
]
```

---

## State Machine (valid transitions only)

```python
VALID_TRANSITIONS = {
    "new":          ["qualified", "archived"],
    "qualified":    ["warming", "archived"],
    "warming":      ["ready_for_dm", "archived"],
    "ready_for_dm": ["contacted", "archived"],
    "contacted":    ["replied", "follow_up_1", "archived"],
    "follow_up_1":  ["replied", "follow_up_2", "archived"],
    "follow_up_2":  ["replied", "archived"],
    "replied":      ["call_booked", "archived"],
    "call_booked":  ["closed_won", "closed_lost"],
    "closed_won":   [],
    "closed_lost":  ["new"],   # re-enter pipeline after 90 days
    "archived":     ["new"],   # re-enter after 180 days
}
```

---

## Daily Caps Table

### `acq_daily_caps`
```sql
CREATE TABLE acq_daily_caps (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type     text NOT NULL,    -- 'dm','comment','connection','discovery'
  platform        text NOT NULL,
  daily_limit     integer NOT NULL,
  sent_today      integer DEFAULT 0,
  reset_at        timestamptz,      -- midnight UTC
  updated_at      timestamptz DEFAULT now()
);
```

---

## API Design

### `GET /api/acquisition/status`
Full pipeline dashboard.
```json
{
  "pipeline": {
    "new": 12, "qualified": 8, "warming": 5, "ready_for_dm": 3,
    "contacted": 15, "replied": 4, "call_booked": 1,
    "closed_won": 0, "archived": 45
  },
  "today": {
    "dms_sent": 8, "comments_sent": 12, "replies_received": 2,
    "caps": { "instagram_dm": "8/20", "twitter_dm": "8/50" }
  },
  "agents": {
    "discovery": "ok", "scoring": "ok", "warmup": "ok",
    "outreach": "ok", "followup": "ok"
  },
  "last_run": { "discovery": "2026-02-28T06:00:00Z", ... }
}
```

### `POST /api/acquisition/orchestrator/run`
Manually trigger a specific agent step.
```json
{ "step": "outreach", "dry_run": true }
```

### `POST /api/acquisition/orchestrator/pause`
Pause all acquisition activity (emergency stop).

### `POST /api/acquisition/orchestrator/resume`
Resume after pause.

---

## Features

See `feature_list.json` → category `orchestrator` (AAG-121 through AAG-160)
