# PRD-016: Agent Goal + Learning System

**Status:** Draft  
**Target:** `agent-core`  
**Author:** Isaiah Dupree  
**Date:** 2026-02-24

---

## Problem

Current `agent-core` agents are stateless between restarts. Goals are provided at job-dispatch time, not maintained as persistent records. There is no structured system for:

- Persisting what outcomes matter across startup/shutdown
- Resuming active goal work after restart
- Capturing failures as classified lessons rather than lost context
- Learning from wins (repeatable plans, prompts, schedule policies)
- Closing the loop from external outcomes (revenue, analytics, CRM) back into agent behavior

The result: agents do tasks, but don't operate a system. Restarts lose context. Failures repeat. Wins aren't captured as playbooks. The system can't improve over time without manual intervention.

---

## Goal

Build a 4-layer **Agent Operating System** for goals and learning:

1. **Goal System** — what should be achieved (hierarchical, persistent, measurable)
2. **Execution System** — how work gets done (already largely exists in agent-core)
3. **Continuity System** — startup/shutdown/checkpoint/resume
4. **Learning System** — what changed after wins/failures

---

## Mental Model

> Goals tell agents what outcomes matter. Schedulers and orchestrators keep work moving through startup/shutdown. Verifiers and external metrics tell the truth about results. AARs and playbooks turn results into learning.

---

## 1. Goal Hierarchy

```
Mission / Theme        (long horizon — lives in AGENTS.md / skill docs)
  └─ Objective         (outcome-oriented, time-bounded)
       └─ Key Results  (measurable signals — at most 3-5 per objective)
            └─ Initiatives (projects/strategies)
                 └─ Tasks / Runs (executable work dispatched as agent jobs)
                      └─ Scheduled maintenance/review jobs (ongoing support)
```

### Example

- **Objective:** Improve agent reliability for Telegram requests
- **KR1:** 95% interpreter accuracy on test suite
- **KR2:** <2% false action rate
- **KR3:** 90% verified-success for low-risk actions
- **Initiative:** Build interpreter + verifier + NL test harness
- **Tasks:** add paraphrase suite, add idempotency checks, run staging tests nightly

---

## 2. Goal Contract (canonical dataclass)

| Field | Type | Description |
|-------|------|-------------|
| `goal_id` | str | ULID prefixed `goal_` |
| `goal_type` | enum | objective \| key_result \| initiative \| maintenance \| watchdog \| experiment \| learning |
| `title` | str | Short human label |
| `description` | str | Full intent |
| `parent_goal_id` | str? | Hierarchy link |
| `owner_agent` | str | Agent ID or pool |
| `priority` | int | 1 (critical) → 5 (low) |
| `success_metrics` | list[str] | Measurable "done" conditions |
| `failure_conditions` | list[str] | Trigger failure classification |
| `constraints` | list[str] | Hard limits (budget, scope, time) |
| `review_cadence` | str | cron expr or interval |
| `start_condition` | str | When to activate |
| `stop_condition` | str | When to auto-archive |
| `time_horizon` | str | ISO deadline or "ongoing" |
| `dependencies` | list[str] | Other `goal_id`s |
| `allowed_capabilities` | list[str] | Capability scope (same as scheduler risk model) |
| `learning_required` | bool | Whether outcomes feed lesson store |
| `status` | GoalStatus | planned→ready→active→blocked→completed→archived |
| `created_at` | str | ISO UTC |
| `updated_at` | str | ISO UTC |

---

## 3. Goal Types

| Type | Behavior |
|------|----------|
| `objective` | Hit a measurable target. Measured by KRs. |
| `key_result` | Numeric signal tied to an objective. Has current/target value. |
| `initiative` | Project/strategy that advances a KR. Dispatches runs. |
| `maintenance` | Keep system healthy. Repeating. Sweeps, summarization, checkpoints. |
| `watchdog` | Detect issues and trigger recovery. Alert if condition fires. |
| `experiment` | Run A/B test, compare policies. Reports winner. |
| `learning` | Distill lessons/playbooks from operations. |

---

## 4. Goal State Machine

```
planned → ready → active → waiting → retrying
                         ↘ blocked
                         ↘ checkpointed → active (resume)
                         ↘ completed
                         ↘ completed_with_caveats
                         ↘ failed → archived
```

Transitions are recorded in `goal_state_events` for audit.

---

## 5. Run Ledger

Every execution attempt against a goal creates a `GoalRun`:

| Field | Description |
|-------|-------------|
| `run_id` | ULID `grun_` |
| `goal_id` | Parent goal |
| `job_id` | agent-core job if dispatched |
| `attempt` | Retry count |
| `plan_summary` | What was planned |
| `actions_taken` | List of action names |
| `verifier_status` | passed \| failed \| skipped |
| `local_outcome` | succeeded \| failed \| partial |
| `business_outcome` | improved \| neutral \| degraded \| unknown |
| `failure_category` | See taxonomy below |
| `metrics_before` | Snapshot of KR values before |
| `metrics_after` | Snapshot of KR values after |
| `duration_seconds` | Wall time |
| `checkpoint_ref` | Resume pointer if interrupted |

### Failure Taxonomy

`interpretation_error` | `planning_error` | `tool_error` | `execution_timeout` |  
`verification_failure` | `policy_block` | `missing_context` | `resource_limit` |  
`external_dependency` | `bad_schedule_policy` | `run_overlap`

---

## 6. After-Action Review (AAR)

Generated automatically after every failed or notable run. Can also be triggered manually.

| Field | Description |
|-------|-------------|
| `aar_id` | ULID `aar_` |
| `run_id` | Source run |
| `goal_id` | Parent goal |
| `what_happened` | Narrative summary |
| `root_cause` | Classified failure category + detail |
| `what_worked` | Steps/plans that succeeded |
| `what_failed` | Steps that failed |
| `lesson_candidates` | List of raw lesson strings |
| `recommended_changes` | Proposed adjustments |
| `promoted` | bool — whether lessons were committed to lesson store |
| `created_at` | ISO UTC |

---

## 7. Lesson Store

Promoted from AARs (or written by agent directly). Reusable heuristics.

| Field | Description |
|-------|-------------|
| `lesson_id` | ULID `les_` |
| `goal_type` | Which goal type this applies to |
| `action_type` | Which action/tool family |
| `lesson_text` | The heuristic in plain language |
| `evidence_run_ids` | Runs that confirmed this lesson |
| `confidence` | 0.0–1.0 |
| `category` | anti_pattern \| safe_default \| winning_strategy \| policy_patch |
| `active` | bool |
| `times_applied` | Counter |
| `times_validated` | Counter |
| `created_at` | ISO UTC |

---

## 8. Playbook Rules

Validated winning strategies, promoted from lessons once confidence ≥ threshold.

| Field | Description |
|-------|-------------|
| `rule_id` | ULID `rule_` |
| `title` | Short label |
| `applies_to_goal_type` | Scope |
| `applies_to_action_type` | Scope |
| `rule_text` | Reusable directive for agent context |
| `source_lesson_ids` | Lesson lineage |
| `activation_mode` | shadow \| canary \| full |
| `promoted_at` | ISO UTC |

---

## 9. Continuity: Startup Reconciliation (extends PRD-015)

On startup (after scheduler reconciliation):

1. Load `active` and `blocked` goals
2. Load `running` / `checkpointed` GoalRuns
3. Resume checkpointed runs allowed by `resume_if_checkpointed` policy
4. Rebuild open loops (pending retries, clarifications, follow-ups)
5. Load lessons relevant to active goal types
6. Load active playbook rules into agent context
7. Emit `GoalReconciliationReport`

---

## 10. Continuity: Shutdown Manager

On clean shutdown:

1. Drain mode — stop accepting new goal dispatches
2. Save run checkpoints for in-flight GoalRuns
3. Persist goal progress summaries (KR values snapshot)
4. Flush open loops + pending retries
5. Write "what was happening" shutdown summary
6. Mark `last_clean_shutdown_at`

---

## 11. Learning Loop (v1 — weekly scheduled job)

1. Collect all `GoalRun`s from the last 7 days
2. Run `OutcomeAggregator` — group by goal_type, action_type, failure_category
3. Generate AAR candidates for failed/partial runs
4. Score lesson candidates (frequency × impact)
5. Promote lessons with score ≥ threshold to `lesson_store`
6. Promote lessons with confidence ≥ 0.8 to `playbook_rules` (shadow mode)
7. Emit `LearningCycleReport`

---

## 12. External Feedback Integration (v1 — 2 sources)

### analytics_ingestor

- Reads from PostHog `posthog.funnel` + `posthog.events`
- Maps product outcomes (activation/conversion changes) to recent GoalRuns

### crm_outcome_ingestor

- Reads from `crm.stats` delta
- Maps CRM pipeline changes to recent outreach GoalRuns

Each ingestor writes to `outcome_records.business_outcome` for the relevant run.

---

## 13. Policy Update Safety Pattern

```
Propose → Validate → Canary → Promote → (Rollback if regression)
```

`playbook_rules` always start in `shadow` or `canary` mode. Promotion to `full` requires:
- `times_validated >= 3`
- No regressions detected in canary window

---

## 14. DB Tables (new — all in `agent-core` SQLite)

- `goal_definitions`
- `key_results` (KR values over time)
- `goal_state_events` (FSM audit log)
- `goal_runs`
- `outcome_records`
- `after_action_reviews`
- `lessons`
- `playbook_rules`
- `open_loops`
- `learning_cycle_reports`

---

## 15. New Modules

### `agent/goals/`
- `goal_registry.py` — CRUD for goal_definitions + state transitions
- `goal_state_machine.py` — FSM transitions with validation
- `kr_tracker.py` — Key Result value snapshots + progress
- `initiative_router.py` — Selects and dispatches work toward active KRs

### `agent/learning/`
- `outcome_aggregator.py` — Aggregates GoalRun outcomes by type/category
- `after_action_review_engine.py` — Generates AARs from run records
- `lesson_store.py` — CRUD for lessons, confidence tracking
- `playbook_manager.py` — Promotes lessons → rules, activation mode lifecycle

### `agent/continuity/`
- `open_loop_tracker.py` — Pending retries, clarifications, follow-ups
- `shutdown_manager.py` — Clean shutdown sequence + summary

---

## 16. Implementation Phases

### Phase 1 (this session)
- Schema migration: all 10 tables
- `agent/goals/`: `goal_registry.py`, `goal_state_machine.py`, `kr_tracker.py`
- `agent/learning/`: `lesson_store.py`, `after_action_review_engine.py`, `outcome_aggregator.py`
- `agent/continuity/`: `open_loop_tracker.py`
- Tests: `tests/test_goal_system_p16.py`

### Phase 2
- `playbook_manager.py` — shadow/canary/full promotion lifecycle
- `initiative_router.py` — goal orchestrator + dispatcher
- `shutdown_manager.py` — clean shutdown sequence
- Wire startup reconciliation from PRD-015 to load active goals + lessons

### Phase 3
- External feedback ingestors (PostHog, CRM)
- Weekly learning review scheduled job (via PRD-015 scheduler)
- Policy patch canary rollout
- GoalReconciliationReport integrated into startup

---

## 17. Mapping to Existing `agent-core` Architecture

| PRD-016 concept | Existing component |
|---|---|
| Goal Orchestrator | extends `agent/core/orchestrator.py` |
| Run Ledger | extends `agent/db/schema.sql` jobs table |
| Scheduler | `agent/runtime/scheduler.py` (PRD-015) |
| Checkpoint manager | `agent/runtime/checkpoint_manager.py` |
| Startup reconciler | `agent/scheduler/schedule_reconciler.py` (PRD-015) |
| Event log | `agent/runtime/event_bus.py` |
| Memory/Lessons | `agent/memory/` (PRD-014) |

---

## 18. Non-Goals (v1)

- No LLM-generated policy patches in v1 (human-readable lesson strings only)
- No multi-agent goal arbitration in v1 (single owner_agent per goal)
- No real-time streaming of KR values (batch snapshot only)
- No external API ingestion beyond PostHog + CRM in v1
