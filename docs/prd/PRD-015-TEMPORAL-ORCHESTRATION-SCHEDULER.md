# PRD-015: Temporal Orchestration & Scheduler Subsystem

**Status:** Active  
**Priority:** P-1 (agent-core)  
**Target repo:** `agent-core` — `agent/scheduler/`  
**Depends on:** PRD-014 (Conversation Memory), existing `jobs`/`checkpoints`/`events` tables  

---

## 1. Problem

The current system has two scheduler realities that don't talk to each other:

- **`schedules` table** in `schema.sql` — cron/interval definitions with `next_run_at`, `last_run_at`, basic concurrency policy. Used by the runtime job executor.
- **`cron_definitions.py` in `actp-worker`** — Python-level in-process timers with no durability, no missed-run handling, no startup reconciliation.

Neither gives us:
- Missed-run recovery (what happened while the system was off?)
- Shutdown-aware run policies (graceful finish vs checkpoint-and-stop vs requeue)
- Startup reconciliation (orphaned in-flight runs, catch-up vs skip decisions)
- Agent-proposable schedules (AI can't safely create new recurring jobs today)
- Risk-tiered auto-approval (everything either blocks or has no guard)
- Observable scheduler telemetry (no circuit breakers, no failure rates, no dead-letter)

This PRD defines the **Temporal Orchestration Subsystem** that unifies these into a clean, autonomous-friendly, startup/shutdown-aware scheduler.

---

## 2. Core idea

> **Cron is just one trigger type. The real subsystem is Temporal Orchestration: schedule definitions, durable run instances, reconciliation on startup, controlled shutdown, and verified outcomes.**

The agent should never write raw cron entries. Instead it **proposes** schedules through a pipeline:

```
AI (planner/interpreter)
  → ScheduleProposal
  → Policy/Validator (schema + semantic + policy + conflict)
  → ScheduleActivationRequest
  → Scheduler Engine
  → ScheduledRun instances
  → Executor/Verifier
  → Telemetry feedback to AI
```

This gives **bounded autonomy**: the agent moves fast inside a trusted operating envelope without constant human approval.

---

## 3. Trigger type taxonomy

| Type | Description | Examples |
|------|-------------|---------|
| `lifecycle` | Boot/shutdown hooks | startup hydration, shutdown flush |
| `interval` | Every N seconds/minutes | heartbeat, autosave, scheduler tick |
| `calendar` | Cron expression, time-based | daily compaction, morning summary |
| `delay` | One-shot at future time | follow-up in 15 min, retry probe |
| `event` | Fires on system event | on stall → probe, on idle → summarize |
| `reconciliation` | Startup self-healing sweeper | orphan detection, missed-run audit |

---

## 4. Missed-run policies

For every `ScheduleDefinition`, one must be declared:

| Policy | Behavior | Use for |
|--------|----------|---------|
| `catch_up_all` | Run every missed occurrence | critical audits, ledger syncs |
| `catch_up_latest_only` | Run once for most recent miss | summaries, status refreshes |
| `skip_missed` | Ignore misses; next on schedule | low-value housekeeping |
| `coalesce` | Merge multiple missed → one run | memory compaction, analytics rollup |
| `resume_if_checkpointed` | Resume mid-run from checkpoint | long AI jobs, research workflows |

---

## 5. Concurrency policies

| Policy | Behavior |
|--------|----------|
| `allow_overlap` | Multiple instances simultaneously (idempotent reads only) |
| `forbid_overlap` | Skip next if one is active (best default) |
| `enqueue_one` | Allow at most one queued pending next run |
| `replace_running` | Cancel current, start fresh (use sparingly) |

---

## 6. Shutdown policies (per schedule)

| Policy | Behavior |
|--------|----------|
| `graceful_finish` | Let run complete within timeout |
| `checkpoint_and_stop` | Save checkpoint, exit cleanly |
| `interrupt_and_retry_later` | Stop and requeue for next startup |
| `must_not_interrupt` | Block shutdown until done (rare) |

---

## 7. Risk tiers for auto-approval

### Tier A — Auto-approve
Low-risk, reversible, idempotent:
- Status sweeps, autosaves, summaries, compaction, read-only refreshes
- Agent creates/modifies freely within quotas

### Tier B — Auto-approve with stricter constraints
Moderate-risk:
- Retries, notifications, cache invalidation, conditional restarts
- Agent creates if: low frequency, bounded retries, verification included, scoped permissions

### Tier C — Requires elevated policy token
High-risk:
- Destructive actions, financial/critical writes, external publishing at scale, broad DB mutations
- Not blocked forever — different channel/policy token required

---

## 8. Canonical contracts

### `ScheduleProposal` (AI output)
```python
@dataclass
class ScheduleProposal:
    name: str
    trigger_type: TriggerType            # lifecycle|interval|calendar|delay|event|reconciliation
    trigger_spec: dict                   # {"interval_seconds": 60} or {"cron": "0 6 * * *"} etc.
    task_template: str                   # name from schedule template catalog
    task_params: dict
    objective: str                       # human-readable intent
    missed_run_policy: MissedRunPolicy
    concurrency_policy: ConcurrencyPolicy
    shutdown_policy: ShutdownPolicy
    timeout_seconds: int
    max_retries: int
    retry_backoff_seconds: int
    priority: int
    risk_estimate: RiskTier              # A | B | C
    verification_required: bool
    capability_scope: list[str]          # e.g. ["read_job_status", "write_checkpoints"]
    proposed_by: str                     # agent | user | system
```

### `ScheduleDefinition` (compiled, validated, stored)
Extends the existing `schedules` table with:
- `trigger_type`, `missed_run_policy`, `shutdown_policy`
- `capability_scope_json`, `risk_tier`
- `activation_mode` (`shadow|canary|full`)
- `circuit_breaker_state` (`closed|open|half_open`)
- `failure_count_since_reset`, `last_circuit_trip_at`
- `policy_bundle` (which pre-authorized envelope applies)

### `ScheduledRun`
```python
@dataclass
class ScheduledRun:
    run_id: str
    schedule_id: str
    intended_run_at: str
    created_at: str
    started_at: str | None
    completed_at: str | None
    status: RunStatus                    # pending|running|completed|failed|skipped|orphaned|coalesced
    attempt: int
    job_id: str | None                   # links to jobs table
    checkpoint_ref: str | None
    verification_status: str | None
    result_summary: str
    missed_run_catch_up: bool            # was this created by reconciliation?
    coalesced_from_count: int            # >1 if coalesced
```

### `ScheduleValidationReport`
```python
@dataclass
class ScheduleValidationReport:
    schema_valid: bool
    semantic_valid: bool
    policy_violations: list[str]
    conflict_warnings: list[str]
    defaults_applied: dict               # which fields were auto-filled
    recommended_activation_mode: str
    simulation_summary: str | None       # next N run times, overlap risk, etc.
    approved: bool
    risk_tier: RiskTier
```

### `ReconciliationReport`
```python
@dataclass
class ReconciliationReport:
    startup_time: str
    schedules_loaded: int
    missed_runs_detected: int
    runs_coalesced: int
    runs_skipped: int
    runs_catch_up_dispatched: int
    runs_resumed_from_checkpoint: int
    orphaned_runs_marked: int
    circuit_breakers_tripped: int
    errors: list[str]
    actions_taken: list[str]
```

### `ScheduleRuntimeTelemetry`
```python
@dataclass
class ScheduleRuntimeTelemetry:
    schedule_id: str
    total_runs: int
    success_rate: float
    avg_duration_seconds: float
    overlap_incidents: int
    missed_run_recoveries: int
    retry_rate: float
    verification_pass_rate: float
    shutdown_checkpoint_rate: float
    circuit_breaker_state: str
    last_failure_reason: str | None
    auto_tune_suggestions: list[str]
```

---

## 9. Policy bundles (pre-authorized envelopes)

### `maintenance_autonomy`
- Can create interval/calendar jobs for summaries/compaction/sweeps
- Min interval: 60s
- No external writes
- Tier A/B auto-approve

### `recovery_autonomy`
- Can create delayed/event-triggered retry probes
- Bounded retries (max 3)
- Must include verification + circuit breaker
- Can pause/resume runs

### `messaging_autonomy`
- Can schedule follow-up/status notifications
- Rate-limited (max 1/5min per user)
- Dedup required
- Canary mode for new recurring user-facing jobs

---

## 10. Schedule Compiler

The compiler layer converts `ScheduleProposal` → `ScheduleDefinition + TaskTemplate + RuntimeDefaults`.

**Responsibilities:**
- Fill safe defaults by task family if fields omitted
- Normalize trigger specs (validate cron expressions, clamp intervals to minimums)
- Attach policy-derived constraints
- Assign capability scope from policy bundle
- Generate idempotency key strategy
- Add verification requirements from task family defaults
- Produce `ScheduleValidationReport`

**Agent benefit:** Agent proposes high-level intent ("sweep stalled jobs every 5 min, coalesce misses, forbid overlap"); compiler emits correct low-level config. AI never guesses infrastructure details.

---

## 11. Dry-run / Simulation

Before activation, every new schedule runs through `simulate_schedule()`:

**Returns:**
- Next N run times (24h / 7d horizon)
- Overlap risk score
- Projected resource usage
- Missed-run behavior example
- Startup/restart behavior example
- Conflict warnings

Agent can adjust proposal based on simulation output before activating.

---

## 12. Activation modes (canary for cron)

| Mode | Behavior |
|------|----------|
| `shadow` | Compute due runs and simulate execution; no side effects |
| `canary` | Run at reduced scope/frequency for first N runs |
| `full` | Normal activation after canary success thresholds |

---

## 13. Runtime safety controls

| Control | Purpose |
|---------|---------|
| **Leases/locks** | Prevent duplicate workers per run instance |
| **Idempotent run keys** | Safe retries + restart recovery |
| **Heartbeats + stall detection** | Auto-detect hung runs |
| **Checkpointing** | Long-running jobs resume after shutdown |
| **Dead-letter queue** | Repeatedly failing jobs quarantined, not infinite-looped |
| **Circuit breaker** | Auto-pauses bad schedule after X consecutive failures |

---

## 14. Startup sequence

1. Load `ScheduleDefinition` records from DB
2. Load active/in-flight `ScheduledRun` records
3. **Reconciliation pass:**
   - Detect missed runs (intended_run_at < now, status=pending)
   - Apply `missed_run_policy` per schedule
   - Detect orphaned runs (status=running, no heartbeat, lease expired)
   - Resume checkpointed runs if `resume_if_checkpointed`
   - Check circuit breaker states; reset `half_open` if cooldown passed
4. Emit `ReconciliationReport` (logged + optionally sent to Telegram admin)
5. Start scheduler tick loop
6. Start executor workers

---

## 15. Shutdown sequence

1. Stop accepting new scheduled dispatches
2. Mark scheduler as `draining`
3. For each in-flight run, apply `shutdown_policy`:
   - `graceful_finish` → wait up to timeout
   - `checkpoint_and_stop` → trigger checkpoint, mark run `paused`
   - `interrupt_and_retry_later` → mark run `pending`, requeue
4. Persist all run states + progress
5. Save conversation context + memory deltas (PRD-014 integration)
6. Mark shutdown `clean` with timestamp

---

## 16. New DB tables / schema changes

```sql
-- Extend existing schedules table with new columns (migration)
ALTER TABLE schedules ADD COLUMN trigger_type TEXT NOT NULL DEFAULT 'interval';
ALTER TABLE schedules ADD COLUMN missed_run_policy TEXT NOT NULL DEFAULT 'skip_missed';
ALTER TABLE schedules ADD COLUMN shutdown_policy TEXT NOT NULL DEFAULT 'graceful_finish';
ALTER TABLE schedules ADD COLUMN capability_scope_json TEXT;
ALTER TABLE schedules ADD COLUMN risk_tier TEXT NOT NULL DEFAULT 'A';
ALTER TABLE schedules ADD COLUMN activation_mode TEXT NOT NULL DEFAULT 'full';
ALTER TABLE schedules ADD COLUMN policy_bundle TEXT;
ALTER TABLE schedules ADD COLUMN circuit_breaker_state TEXT NOT NULL DEFAULT 'closed';
ALTER TABLE schedules ADD COLUMN failure_count_since_reset INTEGER NOT NULL DEFAULT 0;
ALTER TABLE schedules ADD COLUMN last_circuit_trip_at TEXT;

-- New: scheduled run instances
CREATE TABLE IF NOT EXISTS scheduled_runs (
  run_id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  intended_run_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending|running|completed|failed|skipped|orphaned|coalesced
  attempt INTEGER NOT NULL DEFAULT 0,
  job_id TEXT,
  checkpoint_ref TEXT,
  verification_status TEXT,
  result_summary TEXT,
  missed_run_catch_up INTEGER NOT NULL DEFAULT 0,
  coalesced_from_count INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (schedule_id) REFERENCES schedules(schedule_id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sched_runs_schedule ON scheduled_runs(schedule_id);
CREATE INDEX IF NOT EXISTS idx_sched_runs_status ON scheduled_runs(status);
CREATE INDEX IF NOT EXISTS idx_sched_runs_intended ON scheduled_runs(intended_run_at);

-- New: reconciliation reports (audit log)
CREATE TABLE IF NOT EXISTS reconciliation_reports (
  report_id TEXT PRIMARY KEY,
  startup_time TEXT NOT NULL,
  schedules_loaded INTEGER,
  missed_runs_detected INTEGER,
  runs_coalesced INTEGER,
  runs_skipped INTEGER,
  runs_catch_up_dispatched INTEGER,
  runs_resumed INTEGER,
  orphaned_runs_marked INTEGER,
  circuit_breakers_tripped INTEGER,
  errors_json TEXT,
  actions_json TEXT,
  created_at TEXT NOT NULL
);
```

---

## 17. New modules

```
agent/scheduler/
  schedule_proposal.py        # ScheduleProposal dataclass + TriggerSpec variants
  schedule_compiler.py        # Proposal → ValidatedScheduleDefinition + defaults
  schedule_validator.py       # Schema + semantic + policy + conflict checks
  schedule_engine.py          # Due-run scanner, run instance creator, tick loop
  schedule_reconciler.py      # Startup reconciliation pass + ReconciliationReport
  schedule_executor.py        # Pull runs from DB, dispatch to job executor
  schedule_telemetry.py       # ScheduleRuntimeTelemetry + circuit breaker logic
  schedule_simulator.py       # simulate_schedule() dry-run path
  policy_bundles.py           # Pre-authorized operating envelopes
```

---

## 18. Implementation phases

### Phase 1 — Safe basics
- `scheduled_runs` table migration
- `schedule_compiler.py` with defaults-by-task-family
- `schedule_validator.py` (schema + semantic + policy)
- `schedule_reconciler.py` (startup reconciliation pass)
- Extend existing scheduler tick to create `ScheduledRun` records
- `missed_run_policy` enforcement in reconciler
- `ReconciliationReport` logged on startup

### Phase 2 — Reliability hardening
- Circuit breaker per schedule
- Dead-letter quarantine for repeated failures
- `shutdown_policy` enforcement
- `canary` and `shadow` activation modes
- `schedule_telemetry.py` + runtime health tracking
- `schedule_simulator.py` dry-run path

### Phase 3 — Agent autonomy upgrades
- `ScheduleProposal` → compiler → activation flow
- Policy bundles (`maintenance_autonomy`, `recovery_autonomy`, `messaging_autonomy`)
- `service_registry.py` topic: `system.propose_schedule`
- Conversation interpreter intent: `schedule_task` → `ScheduleProposal`
- Telemetry feedback loop → auto-tune suggestions to AI
- Event-triggered schedule synthesis

---

## 19. Integration with other PRDs

| PRD | Integration point |
|-----|-----------------|
| **PRD-014** (Conversation Memory) | `lifecycle` schedules drive startup hydration + shutdown flush; `interval` schedules drive autosave |
| **PRD-002** (Local Agent Daemon) | `schedule_executor.py` replaces raw `cron_definitions.py` loops in actp-worker |
| **existing `jobs` table** | `ScheduledRun.job_id` links to job created by executor |
| **existing `checkpoints` table** | `ScheduledRun.checkpoint_ref` + `resume_if_checkpointed` policy |
| **`service_registry.py`** | New topic: `system.propose_schedule`, `system.scheduler_status` |
| **`conversation_interpreter.py`** | New intent: `schedule_task` maps to `ScheduleProposal` generation |
| **`action_authority.py`** | New actions: `propose_schedule` (write), `scheduler_status` (read) |

---

## 20. Test requirements

- `tests/test_scheduler.py` covering all 9 modules
- Startup reconciliation: missed runs → correct policy applied
- Compiler: proposal → valid schedule definition + correct defaults
- Validator: rejects invalid specs, passes valid ones
- Circuit breaker: trips after X failures, resets on cooldown
- Simulation: returns next run times for interval + calendar triggers
- Shutdown: graceful finish vs checkpoint-and-stop vs requeue behavior
- All existing 523 agent-core tests must continue to pass

---

## 21. One clean rule

> **Let the agent propose schedules freely, but only activate compiled, validated, scoped, and observable schedules.**
>
> Safety comes from the pipeline, not from blocking the agent.
