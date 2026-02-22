# PRD-001: ACTP Workflow Engine

## Status: Draft
## Author: Isaiah Dupree
## Created: 2026-02-22
## Priority: P0 — Foundation for all ACTP automation

---

## 1. Problem Statement

The ACTP has 10 cloud services and a local worker daemon, but **no stateful workflow orchestrator** that chains multi-step operations into reliable, resumable pipelines. Today each service operates independently — crons fire on timers, the worker polls in fixed loops. There is no system that says:

> "Research completed → now generate content from those blueprints → now render video → now review with AI → now publish"

Each step is a standalone cron or poll. If step 3 fails, there's no automatic retry or state tracking. If the local machine is offline when step 4 needs it, nobody notices until a human checks. The system cannot express conditional logic ("only publish if AI review scores > 0.7") or branching ("if video, route to Remotion; if image, route to ContentLite").

**We need a workflow engine** that turns the 10-step loop into executable, observable, failure-tolerant pipeline definitions.

---

## 2. Solution Overview

A **Workflow Engine** service that:
- Defines workflows as JSON DAGs (directed acyclic graphs) of steps
- Persists workflow execution state in Supabase
- Routes steps to the correct executor (cloud service API or local worker task)
- Handles retries, timeouts, conditional branching, and failure escalation
- Provides observability via ACTPDash (current step, duration, errors)

The engine runs as a **cloud service** (Vercel serverless + Supabase). It does NOT execute tasks itself — it dispatches them to existing services and the local worker via the established pull-based communication pattern.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────┐
│                  WORKFLOW ENGINE                      │
│                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Definitions │  │  Executions  │  │  Scheduler  │ │
│  │  (templates) │  │  (instances) │  │  (triggers) │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬─────┘ │
│         │                 │                  │        │
│         └────────┬────────┘                  │        │
│                  ▼                           │        │
│         ┌──────────────┐                     │        │
│         │   Step       │◄────────────────────┘        │
│         │   Router     │                              │
│         └──┬───┬───┬───┘                              │
│            │   │   │                                  │
└────────────┼───┼───┼──────────────────────────────────┘
             │   │   │
     ┌───────┘   │   └───────┐
     ▼           ▼           ▼
  Cloud API   Supabase DB   Worker Task Queue
  (HTTP POST) (row insert)  (actp_workflow_tasks)
```

### Key Concepts

- **Workflow Definition**: A named JSON template describing a sequence of steps, their dependencies, and routing
- **Workflow Execution**: A running instance of a definition, with state persisted per-step
- **Step**: A single unit of work routed to a specific executor
- **Step Router**: Determines whether a step runs on cloud (HTTP call) or local (task queue row)
- **Trigger**: What starts a workflow (cron schedule, webhook event, manual, or another workflow completing)

---

## 4. Data Model

### `actp_workflow_definitions`
```sql
CREATE TABLE actp_workflow_definitions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,          -- e.g. 'research-to-publish'
  name          TEXT NOT NULL,
  description   TEXT,
  version       INT DEFAULT 1,
  steps         JSONB NOT NULL,                -- DAG of steps (see schema below)
  trigger_config JSONB,                        -- cron, webhook, manual, chain
  timeout_minutes INT DEFAULT 120,
  max_retries   INT DEFAULT 3,
  enabled       BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

### `actp_workflow_executions`
```sql
CREATE TABLE actp_workflow_executions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id   UUID REFERENCES actp_workflow_definitions(id),
  definition_slug TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
    -- pending | running | succeeded | failed | cancelled | timed_out
  trigger_type    TEXT NOT NULL,                -- cron | webhook | manual | chain
  trigger_data    JSONB,                        -- input data from trigger
  context         JSONB DEFAULT '{}',           -- shared state across steps
  current_step    TEXT,                         -- slug of active step
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  error           TEXT,
  campaign_id     UUID,                         -- optional link to actp_campaigns
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### `actp_workflow_steps`
```sql
CREATE TABLE actp_workflow_steps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id    UUID REFERENCES actp_workflow_executions(id) ON DELETE CASCADE,
  step_slug       TEXT NOT NULL,
  step_index      INT NOT NULL,
  executor        TEXT NOT NULL,                -- cloud_api | local_task | db_query | ai_review
  executor_config JSONB NOT NULL,               -- service URL, task type, etc.
  status          TEXT NOT NULL DEFAULT 'pending',
    -- pending | waiting_dependency | dispatched | running | succeeded | failed | skipped
  depends_on      TEXT[],                       -- step slugs this depends on
  input_data      JSONB,                        -- data passed to this step
  output_data     JSONB,                        -- result from executor
  condition       JSONB,                        -- optional: skip unless condition met
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  retry_count     INT DEFAULT 0,
  max_retries     INT DEFAULT 3,
  timeout_minutes INT DEFAULT 30,
  error           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(execution_id, step_slug)
);
```

### `actp_workflow_tasks`
```sql
-- Task queue for local worker (pull-based, same pattern as actp_gen_jobs)
CREATE TABLE actp_workflow_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id    UUID REFERENCES actp_workflow_executions(id),
  step_id         UUID REFERENCES actp_workflow_steps(id),
  task_type       TEXT NOT NULL,
    -- safari_research | remotion_render | safari_upload | blotato_upload
  status          TEXT NOT NULL DEFAULT 'pending',
    -- pending | claimed | running | succeeded | failed | timed_out
  input_data      JSONB NOT NULL,
  output_data     JSONB,
  claimed_by      TEXT,                         -- worker_id
  claimed_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  timeout_minutes INT DEFAULT 30,
  error           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Index for worker polling
CREATE INDEX idx_workflow_tasks_pending
  ON actp_workflow_tasks (task_type, status, created_at)
  WHERE status = 'pending';
```

---

## 5. Step Definition Schema

Each step in a workflow definition:

```json
{
  "slug": "research-competitors",
  "name": "Collect Competitor Content",
  "executor": "local_task",
  "executor_config": {
    "task_type": "safari_research",
    "params": {
      "research_type": "competitor_content",
      "platforms": ["tiktok", "instagram"],
      "max_items": 50
    }
  },
  "depends_on": [],
  "condition": null,
  "timeout_minutes": 30,
  "max_retries": 2,
  "output_mapping": {
    "context.research_data": "$.output_data.items",
    "context.blueprint_count": "$.output_data.blueprint_count"
  }
}
```

### Executor Types

| Executor | Runs On | Dispatch Method | Completion Signal |
|----------|---------|-----------------|-------------------|
| `cloud_api` | Vercel service | HTTP POST to service endpoint | HTTP response |
| `local_task` | actp-worker | Insert row in `actp_workflow_tasks` | Worker updates row status |
| `db_query` | Supabase | Direct SQL/RPC call | Immediate |
| `ai_review` | Cloud (OpenAI/Anthropic) | HTTP POST to AI service | HTTP response |
| `conditional` | Engine itself | Evaluate condition expression | Immediate |
| `delay` | Engine itself | Schedule future evaluation | Timer |

---

## 6. Workflow Execution Lifecycle

```
1. TRIGGER fires (cron/webhook/manual/chain)
     │
2. Engine creates execution + step rows from definition
     │
3. Engine evaluates step DAG, finds steps with no unmet dependencies
     │
4. For each ready step:
     ├── cloud_api  → HTTP POST to service, await response
     ├── local_task → INSERT into actp_workflow_tasks (worker polls)
     ├── db_query   → Execute Supabase RPC
     ├── ai_review  → Call AI API with content + rubric
     ├── conditional → Evaluate expression against context
     └── delay      → Set timer, re-evaluate later
     │
5. When step completes:
     ├── Update step status + output_data
     ├── Apply output_mapping to execution context
     ├── Check if downstream steps are now unblocked
     └── If failed: retry (up to max_retries) or mark execution failed
     │
6. When all steps complete → execution status = succeeded
     │
7. If trigger_config.chain → start next workflow
```

---

## 7. Advancement Mechanism

The engine needs to **advance** executions. Two complementary methods:

### Method A: Webhook Callback (real-time)
When a cloud_api step completes, the service calls back:
```
POST /api/workflows/executions/{id}/steps/{slug}/complete
{ "output_data": { ... }, "status": "succeeded" }
```

### Method B: Polling Cron (catch-all)
A cron job runs every 60 seconds:
```
GET /api/cron/advance-workflows
```
This scans for:
- Executions with `status=running` that have completed steps not yet advanced
- Steps with `status=dispatched` past their timeout
- `actp_workflow_tasks` that workers have completed but engine hasn't processed

This ensures workflows advance even if callbacks fail.

---

## 8. Example Workflow: Research → Generate → Render → Review → Publish

```json
{
  "slug": "research-to-publish",
  "name": "Full Content Pipeline",
  "steps": [
    {
      "slug": "research",
      "name": "Market Research via Safari",
      "executor": "local_task",
      "executor_config": {
        "task_type": "safari_research",
        "params": { "platforms": ["tiktok", "instagram"], "max_items": 50 }
      },
      "depends_on": [],
      "output_mapping": { "context.research_items": "$.output_data.items" }
    },
    {
      "slug": "extract-blueprints",
      "name": "Extract Creative Blueprints",
      "executor": "cloud_api",
      "executor_config": {
        "service": "researchlite",
        "endpoint": "/api/cron/extract-blueprints",
        "method": "POST",
        "body_from_context": { "items": "context.research_items" }
      },
      "depends_on": ["research"],
      "output_mapping": { "context.blueprints": "$.output_data.blueprints" }
    },
    {
      "slug": "generate-content",
      "name": "Generate Content from Blueprints",
      "executor": "cloud_api",
      "executor_config": {
        "service": "contentlite",
        "endpoint": "/api/generate/from-blueprint",
        "method": "POST",
        "body_from_context": { "blueprints": "context.blueprints" }
      },
      "depends_on": ["extract-blueprints"],
      "output_mapping": { "context.content_variants": "$.output_data.variants" }
    },
    {
      "slug": "render-video",
      "name": "Render Video via Remotion",
      "executor": "local_task",
      "executor_config": {
        "task_type": "remotion_render",
        "params_from_context": {
          "script": "context.content_variants[0].video_script",
          "template": "context.content_variants[0].template_id"
        }
      },
      "depends_on": ["generate-content"],
      "condition": { "expression": "context.content_variants[0].type == 'video'" },
      "output_mapping": { "context.video_url": "$.output_data.video_url" }
    },
    {
      "slug": "ai-review",
      "name": "AI Quality Review",
      "executor": "ai_review",
      "executor_config": {
        "model": "claude-haiku-4-5-20251001",
        "rubric": "content_quality_v1",
        "content_from_context": {
          "video_url": "context.video_url",
          "script": "context.content_variants[0].video_script",
          "target_platform": "context.content_variants[0].platform"
        }
      },
      "depends_on": ["render-video"],
      "output_mapping": {
        "context.review_score": "$.output_data.score",
        "context.review_feedback": "$.output_data.feedback",
        "context.approved": "$.output_data.approved"
      }
    },
    {
      "slug": "publish",
      "name": "Publish to Platform",
      "executor": "cloud_api",
      "executor_config": {
        "service": "mplite",
        "endpoint": "/api/enqueue",
        "method": "POST",
        "body_from_context": {
          "video_url": "context.video_url",
          "caption": "context.content_variants[0].caption",
          "platform": "context.content_variants[0].platform"
        }
      },
      "depends_on": ["ai-review"],
      "condition": { "expression": "context.approved == true && context.review_score >= 0.7" }
    }
  ],
  "trigger_config": {
    "type": "cron",
    "schedule": "0 8 * * *",
    "description": "Run full pipeline daily at 8am"
  }
}
```

---

## 9. API Endpoints

### Workflow Definitions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workflows` | List all workflow definitions |
| POST | `/api/workflows` | Create workflow definition |
| GET | `/api/workflows/:slug` | Get definition by slug |
| PUT | `/api/workflows/:slug` | Update definition |
| DELETE | `/api/workflows/:slug` | Disable workflow |

### Workflow Executions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/workflows/:slug/run` | Start new execution |
| GET | `/api/workflows/executions` | List executions (filterable) |
| GET | `/api/workflows/executions/:id` | Get execution with all steps |
| POST | `/api/workflows/executions/:id/cancel` | Cancel running execution |
| POST | `/api/workflows/executions/:id/retry` | Retry failed execution |
| POST | `/api/workflows/executions/:id/steps/:slug/complete` | Callback: step completed |

### Worker Task Queue (polled by actp-worker)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workflows/tasks/next?type=safari_research` | Poll for next task |
| POST | `/api/workflows/tasks/:id/claim` | Claim a task |
| POST | `/api/workflows/tasks/:id/complete` | Complete with output |
| POST | `/api/workflows/tasks/:id/fail` | Report failure |
| POST | `/api/workflows/tasks/:id/heartbeat` | Keep-alive for long tasks |

### Cron
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cron/advance-workflows` | Advance all running workflows |
| GET | `/api/cron/timeout-check` | Timeout stalled steps/tasks |
| GET | `/api/cron/trigger-scheduled` | Fire scheduled workflow triggers |

---

## 10. Failure Modes & Mitigations

| Failure | Detection | Mitigation |
|---------|-----------|------------|
| Cloud API step returns 5xx | HTTP status code | Retry with exponential backoff (1m, 5m, 15m) |
| Local task never claimed | `actp_workflow_tasks.created_at` age > 5min | Alert; mark step failed after timeout |
| Local task claimed but never completed | `claimed_at` age > `timeout_minutes` | Release claim, re-queue (up to max_retries) |
| Worker goes offline mid-task | Heartbeat stops | Dead worker detection resets tasks to pending |
| AI review API error | HTTP error or timeout | Retry; fallback to auto-approve with flag |
| Workflow definition has cycle | DAG validation on save | Reject definition with validation error |
| Step condition references missing context | Evaluation error | Skip step, log warning |
| Execution exceeds total timeout | `started_at` + `timeout_minutes` check | Cancel execution, alert |

---

## 11. Observability

### ACTPDash Integration
- **Workflows page**: List active executions, their current step, duration
- **Execution detail**: Visual DAG showing step status (green/yellow/red)
- **Step drill-down**: Input/output data, retry history, error messages
- **Metrics**: Avg execution time, success rate, most-failing steps

### Structured Logging
Every state transition logs to `actp_worker_logs`:
```json
{
  "event": "workflow.step.completed",
  "execution_id": "...",
  "step_slug": "render-video",
  "duration_ms": 45200,
  "output_size_bytes": 1024,
  "retry_count": 0
}
```

---

## 12. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| End-to-end workflow success rate | > 90% | `succeeded / (succeeded + failed)` |
| Avg research-to-publish latency | < 2 hours | `completed_at - started_at` |
| Step retry rate | < 10% | Steps with `retry_count > 0` |
| Stalled execution rate | < 2% | Executions requiring manual intervention |
| Worker task claim latency | < 30 seconds | `claimed_at - created_at` |

---

## 13. Dependencies

- **Supabase**: Shared instance (ivhfuhxorppptyuofbgq) for all tables
- **Existing services**: ResearchLite, ContentLite, GenLite, PublishLite, MPLite, MetricsLite
- **actp-worker**: Must be upgraded to poll `actp_workflow_tasks` (see PRD-002)
- **ACTPDash**: UI additions for workflow monitoring (see PRD-001 ACTPDash section)

---

## 14. Implementation Plan

| Phase | Scope | Estimate |
|-------|-------|----------|
| Phase 1 | DB tables + basic execution engine + advance cron | 2 days |
| Phase 2 | Cloud API executor + local task executor | 2 days |
| Phase 3 | AI review executor + condition evaluator | 1 day |
| Phase 4 | Worker polling for `actp_workflow_tasks` | 1 day |
| Phase 5 | ACTPDash workflow monitoring UI | 2 days |
| Phase 6 | Pre-built workflow definitions (research-to-publish, etc.) | 1 day |

---

## 15. Open Questions

1. **Where does the engine run?** Option A: New Vercel service (`workflow-engine`). Option B: Add to ACTPDash. Recommendation: New service — keeps ACTPDash as pure UI.
2. **Should workflows support parallel branches?** Yes — the DAG model supports it. Steps with different `depends_on` can run concurrently.
3. **How do we handle large video files in context?** Store URLs, not file contents. Remotion outputs go to Supabase Storage or R2; context stores the URL.
