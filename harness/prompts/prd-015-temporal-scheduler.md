# PRD-015: Temporal Orchestration Scheduler

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **PRD**: /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/prd/PRD-015-TEMPORAL-ORCHESTRATION-SCHEDULER.md
- **Priority**: P-1 (agent-core)

## Context

The current system has two scheduler realities that don't talk to each other:
- `cron_definitions.py` — 33 in-process Python timers with no durability, no missed-run handling, no startup reconciliation
- `schedules` table in schema.sql — cron/interval definitions that aren't wired to cron_definitions.py

Result: if the worker crashes overnight, all crons that should have fired are silently skipped. No missed-run recovery, no circuit breakers, no agent-proposable schedules.

### Current Architecture
- `cron_definitions.py` — 33 hardcoded cron jobs, in-process asyncio loops
- `worker.py` — starts cron loops on startup
- `schedule_engine.py` does NOT exist yet

### Target Architecture
```
agent/scheduler/
  schedule_store.py      # SQLite-backed durable schedule definitions
  schedule_engine.py     # 10s tick loop, dispatches due runs
  schedule_policy.py     # risk tiers: low/medium/high auto-approval
  scheduled_run.py       # ScheduledRun lifecycle model
```

## Task

Implement the Temporal Orchestration Subsystem as described in PRD-015:

1. **Create schedule_store.py** — SQLite-backed schedule definitions with next_run_at, last_run_at, concurrency_policy
2. **ScheduleDefinition dataclass** — id, name, trigger_type (lifecycle/interval/calendar/delay/event/reconciliation), expression, missed_run_policy, shutdown_policy, risk_tier, enabled
3. **Create schedule_engine.py** — 10s tick loop that reads store, dispatches due runs via existing trigger functions
4. **ScheduledRun table** — run_id, schedule_id, status, started_at, completed_at, outcome, error
5. **Missed-run recovery** — on startup, find runs that should have fired while system was off, apply missed_run_policy (catch_up_once/skip/catch_up_all)
6. **Startup reconciliation** — detect orphaned in-flight runs, mark failed, requeue if policy says to
7. **Shutdown-aware policy** — on SIGTERM, apply shutdown_policy (graceful_finish/checkpoint_and_stop/requeue)
8. **Migrate all 33 cron_definitions.py entries** to schedule_store on first startup
9. **Create schedule_policy.py** — risk tiers with auto-approval logic
10. **Agent-proposable schedules** — ScheduleProposal → policy validation → activation flow
11. **Circuit breaker** — disable schedule after 3 consecutive failures, send Telegram alert
12. **Dead-letter queue** — SQLite table for failed run outcomes
13. **Add scheduler.* topics** to service_registry (propose_schedule, list_schedules, disable_schedule)
14. **Telegram /schedules command** — list enabled schedules with next-run times

## Testing

```bash
# Unit tests
python3 -m pytest tests/ -v -k "schedule or scheduler"

# Full test suite (must not regress)
python3 -m pytest tests/ -v
```

## Key Files
- `cron_definitions.py` — source of truth for existing cron jobs to migrate
- `worker.py` — wire in schedule_engine on startup instead of raw cron loops
- `service_registry.py` — add scheduler.* topics
- `telegram_bot.py` — add /schedules command

## CRITICAL: Feature Tracking

After completing each task, update `prd-015-features.json` in the project root:

```bash
python3 -c "
import json
with open('prd-015-features.json') as f: data = json.load(f)
for feat in data['features']:
    if feat['id'] == 'SCHED-001': feat['passes'] = True
with open('prd-015-features.json', 'w') as f: json.dump(data, f, indent=2)
print('Updated SCHED-001 to passes=true')
"
```

Do this for EVERY feature you complete.

## Git Workflow

```bash
git add -A && git commit -m "feat(prd-015): <description>"
```

## Constraints
- Do NOT break existing cron jobs — migration must preserve all 33 existing schedules
- Do NOT break existing tests (currently 308+)
- SQLite path: `~/.actp/scheduler.db`
- Supabase project: ivhfuhxorppptyuofbgq (for actp_scheduled_runs telemetry table)
- No mock data — real SQLite persistence required
