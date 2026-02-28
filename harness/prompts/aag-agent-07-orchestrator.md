# AAG Agent 07 — Acquisition Orchestrator & Cron Jobs

## Mission
Build the central orchestrator that ties all agents together: state machine enforcement, daily cap management, 9 cron jobs, emergency pause/resume, and the main status dashboard endpoint.

## Features to Build
AAG-076 through AAG-092, AAG-111 through AAG-120, AAG-146, AAG-147, AAG-174

## Depends On
All other agents (01-06, 08-09) — this wires them all together.

## Working Directory
`/Users/isaiahdupree/Documents/Software/Safari Automation/scripts/acquisition/`

## Output Files
- `acquisition/orchestrator.py`
- `acquisition/state_machine.py`
- `acquisition/daily_caps.py`
- `acquisition/api/server.py` — FastAPI app
- `acquisition/api/routes/orchestrator.py`
- `acquisition/api/schemas.py`
- `tests/test_orchestrator.py`

## state_machine.py
```python
VALID_TRANSITIONS = {
    "new":          ["qualified", "archived"],
    "qualified":    ["warming", "ready_for_dm", "archived"],  # ready_for_dm via high-score skip
    "warming":      ["ready_for_dm", "archived"],
    "ready_for_dm": ["contacted", "archived"],
    "contacted":    ["replied", "follow_up_1", "archived"],
    "follow_up_1":  ["replied", "follow_up_2", "archived"],
    "follow_up_2":  ["replied", "archived"],
    "replied":      ["call_booked", "archived"],
    "call_booked":  ["closed_won", "closed_lost"],
    "closed_won":   [],
    "closed_lost":  ["new"],    # re-enter after 90 days
    "archived":     ["new"],    # re-enter after 180 days
}

class InvalidTransitionError(Exception):
    pass

def validate_transition(from_stage: str, to_stage: str) -> None:
    allowed = VALID_TRANSITIONS.get(from_stage, [])
    if to_stage not in allowed:
        raise InvalidTransitionError(
            f"Cannot transition from '{from_stage}' to '{to_stage}'. "
            f"Allowed: {allowed}"
        )
```

All calls to `queries.update_pipeline_stage()` must call `validate_transition()` first.

## daily_caps.py
```python
class DailyCapsManager:
    async def check(self, action: str, platform: str) -> bool:
        """Returns True if under limit, False if at/over limit."""
        row = await queries.get_daily_cap(action, platform)
        return row.sent_today < row.daily_limit
    
    async def increment(self, action: str, platform: str) -> None:
        await queries.increment_daily_cap(action, platform)
    
    async def reset_all(self) -> None:
        """Call at midnight UTC. Reset sent_today=0 for all rows."""
        await queries.reset_all_daily_caps()
    
    async def get_usage_summary(self) -> dict:
        """Returns dict: {platform_action: "sent/limit"} for status endpoint."""

    async def seed_defaults(self) -> None:
        """On startup: ensure all default rows exist in acq_daily_caps."""
```

## AcquisitionOrchestrator
```python
class AcquisitionOrchestrator:
    def __init__(self):
        self.discovery = DiscoveryAgent()
        self.scoring = ScoringAgent()
        self.warmup = WarmupAgent()
        self.outreach = OutreachAgent()
        self.followup = FollowUpAgent()
        self.email = EmailAgent()
        self.entity = EntityResolutionAgent()
        self.reporting = ReportingAgent()
        self.caps = DailyCapsManager()
    
    async def is_paused(self) -> bool:
        # Check Supabase: SELECT value FROM acq_system_state WHERE key='acquisition_paused'
        # OR check env: ACQUISITION_PAUSED
    
    async def run_step(self, step: str, dry_run: bool = False) -> StepResult:
        if not ENABLE_ACQUISITION and not dry_run:
            return StepResult(skipped=True, reason='ENABLE_ACQUISITION=false')
        if await self.is_paused():
            return StepResult(skipped=True, reason='system_paused')
        
        steps = {
            'discovery': lambda: self.discovery.run(dry_run=dry_run),
            'scoring': lambda: self.scoring.run(dry_run=dry_run),
            'warmup_schedule': lambda: self.warmup.schedule_batch(dry_run=dry_run),
            'warmup_execute': lambda: self.warmup.execute_pending(dry_run=dry_run),
            'email_discover': lambda: self.email.discover_batch(dry_run=dry_run),
            'outreach': lambda: self.outreach.run(dry_run=dry_run),
            'email_send': lambda: self.email.send_pending(dry_run=dry_run),
            'sync_followup': lambda: self.followup.process_followups(dry_run=dry_run),
            'entity_resolve': lambda: self.entity.resolve_batch(dry_run=dry_run),
            'report': lambda: self.reporting.generate_weekly(deliver=not dry_run),
        }
        
        fn = steps.get(step)
        if not fn:
            raise ValueError(f"Unknown step: {step}")
        
        return await self._run_with_retry(fn, max_retries=3)
    
    async def _run_with_retry(self, fn, max_retries=3):
        delays = [300, 900, 3600]  # 5min, 15min, 1hr
        for attempt in range(max_retries):
            try:
                return await fn()
            except Exception as e:
                if attempt < max_retries - 1:
                    await asyncio.sleep(delays[attempt])
                else:
                    raise
```

## Cron Jobs — add to cron_definitions.py
```python
# 9 acquisition crons (all gated by ENABLE_ACQUISITION)
CronJob("acquisition_discovery",    "0 6 * * *",   "acquisition_discovery"),
CronJob("acquisition_scoring",      "0 7 * * *",   "acquisition_scoring"),
CronJob("acquisition_entity",       "30 6 * * *",  "acquisition_entity_resolution"),
CronJob("acquisition_email_disc",   "30 7 * * *",  "acquisition_email_discovery"),
CronJob("acquisition_warmup_sched", "0 8 * * *",   "acquisition_warmup_schedule"),
CronJob("acquisition_warmup_exec",  "30 8 * * *",  "acquisition_warmup_execute"),
CronJob("acquisition_outreach",     "0 9 * * *",   "acquisition_dm_outreach"),
CronJob("acquisition_email_send",   "30 9 * * *",  "acquisition_email_send"),
CronJob("acquisition_sync_followup","0 */4 * * *", "acquisition_sync_followup"),
CronJob("acquisition_report",       "0 9 * * 1",   "acquisition_weekly_report"),
```

## acq_system_state table (add to migration 001)
```sql
CREATE TABLE IF NOT EXISTS acq_system_state (
  key    text PRIMARY KEY,
  value  text,
  updated_at timestamptz DEFAULT now()
);
INSERT INTO acq_system_state(key, value) VALUES ('acquisition_paused', 'false') ON CONFLICT DO NOTHING;
```

## FastAPI Server
```python
# acquisition/api/server.py
from fastapi import FastAPI
app = FastAPI(title="Acquisition API", version="1.0.0")

app.include_router(orchestrator_router, prefix="/api/acquisition/orchestrator")
app.include_router(discovery_router,   prefix="/api/acquisition/discovery")
app.include_router(warmup_router,      prefix="/api/acquisition/warmup")
app.include_router(outreach_router,    prefix="/api/acquisition/outreach")
app.include_router(followup_router,    prefix="/api/acquisition/followup")
app.include_router(email_router,       prefix="/api/acquisition/email")
app.include_router(entity_router,      prefix="/api/acquisition/entity")
app.include_router(reports_router,     prefix="/api/acquisition/reports")

@app.get("/api/acquisition/status")
async def pipeline_status():
    # Returns: pipeline stage counts + today stats + cap usage + agent health
    stage_counts = await queries.get_pipeline_snapshot()
    today_stats  = await queries.get_today_stats()
    cap_usage    = await caps.get_usage_summary()
    return {"pipeline": stage_counts, "today": today_stats, "caps": cap_usage}

@app.get("/health")
async def health(): return {"status": "ok"}
```

## Pydantic Schemas (schemas.py)
Define: NicheConfigCreate, NicheConfigUpdate, DiscoveryRunResult, WarmupStatus,
OutreachRequest, OutreachResult, FollowUpResult, PipelineStatus,
WeeklyReport, EmailStatus, EntityResolutionResult

## CLI
```bash
python3 acquisition/orchestrator.py --status          # pipeline snapshot table
python3 acquisition/orchestrator.py --run-all         # run all steps in order
python3 acquisition/orchestrator.py --step discovery  # single step
python3 acquisition/orchestrator.py --dry-run         # full run, no sends
python3 acquisition/orchestrator.py --pause           # emergency stop
python3 acquisition/orchestrator.py --resume          # resume
```

## Tests Required
```python
test_state_machine_valid_transition()
test_state_machine_invalid_raises_error()
test_daily_cap_blocks_at_limit()
test_daily_cap_resets_at_midnight()
test_pause_blocks_all_steps()
test_retry_with_backoff_on_failure()
test_full_pipeline_continues_after_step_failure()
test_enable_acquisition_false_skips_all_crons()
```
