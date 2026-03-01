# PRD-116: Agent Worker Daemon

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **Feature List**: /Users/isaiahdupree/Documents/Software/actp-worker/prd-116-features.json
- **Priority**: P0 — this is the single entry point that starts ALL domain agents; nothing runs without it

## Context

Currently, each agent (PRD-112 through PRD-115) is a standalone class. There is no unified entry point that:
1. Starts all 4 domain agents as independent async daemons
2. Registers them in `actp_agent_registry` so the Cognitive Orchestrator (PRD-100) knows what's running
3. Monitors their health and triggers self-healing when one crashes
4. Handles graceful shutdown (SIGTERM/SIGINT) without losing in-flight work
5. Exposes a unified health dashboard showing all agent statuses

This PRD builds `worker.py` — the **EverReach OS process supervisor**. Think of it like `supervisord` but purpose-built for native tool calling agents, with Supabase as the process registry.

## Architecture

```
worker.py  — EverReach OS Agent Worker Daemon
    ├── AgentSupervisor         — starts/monitors/restarts all domain agents
    ├── AgentRegistry           — registers agents in Supabase actp_agent_registry
    ├── HealthHeartbeat         — sends periodic heartbeats to Supabase
    ├── GracefulShutdown        — SIGTERM handler, drain in-flight tasks
    ├── DailyRoutineScheduler   — APScheduler 06:00 routine trigger
    └── UnifiedHealthServer     — GET /health, GET /agents, GET /agents/:id/status

Domain Agents started as asyncio Tasks:
    ├── SocialMediaDomainAgent  (PRD-112) — run_as_daemon(poll_interval=30)
    ├── ContentCreationDomainAgent (PRD-113) — run_as_daemon(poll_interval=60)
    ├── AcquisitionDomainAgent  (PRD-114) — run_as_daemon(poll_interval=30)
    └── RevenueAnalyticsDomainAgent (PRD-115) — run_as_daemon(poll_interval=120)
```

## Task

### AgentSupervisor
1. `AgentSupervisor.__init__(agents_config)` — list of agent classes + poll intervals to launch
2. `AgentSupervisor.start_all()` — create asyncio.Task for each agent's run_as_daemon()
3. `AgentSupervisor.watch_loop()` — asyncio loop: check each task every 10s, restart if crashed
4. `AgentSupervisor.restart_agent(agent_id)` — cancel old task, re-instantiate agent class, create new task
5. `AgentSupervisor.stop_all()` — cancel all tasks gracefully, wait for in-flight tasks to drain
6. `AgentSupervisor.get_status()` — return dict: agent_id → {status: running/crashed/restarting, pid, uptime}
7. `AgentSupervisor.get_crash_count(agent_id)` — crashes in last 24hr from actp_agent_runs
8. `AgentSupervisor._should_backoff(agent_id)` — True if crash_count > 5 in last 1hr (exponential backoff)
9. `AgentSupervisor._backoff_delay(agent_id)` — return 2^crash_count seconds (max 300)

### AgentRegistry (Supabase)
10. `AgentRegistry.register_all(agents)` — UPSERT all agent rows to actp_agent_registry at startup
11. `AgentRegistry.set_status(agent_id, status)` — UPDATE actp_agent_registry SET status=X, last_seen=now()
12. `AgentRegistry.set_needs_restart(agent_id, val)` — UPDATE needs_restart field
13. `AgentRegistry.poll_restart_requests()` — SELECT FROM actp_agent_registry WHERE needs_restart=True (used by supervisor watch_loop)
14. `AgentRegistry.deregister_all()` — UPDATE status='stopped' for all agents on shutdown

### HealthHeartbeat
15. `HealthHeartbeat.start(interval=30)` — asyncio loop sending heartbeats every N seconds
16. `HealthHeartbeat.send(agent_id, health_dict)` — UPDATE actp_agent_registry SET last_heartbeat=now(), health=health_dict
17. `HealthHeartbeat.detect_stale(threshold=90)` — SELECT agents WHERE last_heartbeat < now()-threshold_seconds (called by supervisor)

### GracefulShutdown
18. `GracefulShutdown.register()` — signal.signal(SIGTERM, handler) + signal.signal(SIGINT, handler)
19. `GracefulShutdown.handler(sig, frame)` — set stop_event, log shutdown signal
20. `GracefulShutdown.drain_wait(timeout=30)` — wait up to 30s for in-flight tasks to complete
21. `GracefulShutdown.force_stop()` — cancel remaining tasks after timeout, call AgentRegistry.deregister_all()

### DailyRoutineScheduler
22. `DailyRoutineScheduler.__init__()` — APScheduler AsyncIOScheduler instance
23. `DailyRoutineScheduler.setup()` — register all daily routine jobs at 06:00:
    - `ContentCreationDomainAgent.run_daily_pipeline()` at 06:00
    - `AcquisitionDomainAgent.run_pipeline_advance()` at 09:00
    - `RevenueAnalyticsDomainAgent.run_daily_check()` at 08:00
    - `AcquisitionDomainAgent.run_daily_prospecting()` at 11:00 and 15:00
    - `RevenueAnalyticsDomainAgent.run_weekly_report()` Sundays at 20:00
    - `RevenueAnalyticsDomainAgent.run_cost_audit()` at 23:00
24. `DailyRoutineScheduler.start()` — scheduler.start()
25. `DailyRoutineScheduler.shutdown()` — scheduler.shutdown(wait=False)

### Unified Health Server
26. `HealthServer.start(port=8090)` — aiohttp server on port 8090
27. `GET /health` — returns overall status: {status: healthy/degraded/critical, agents: N, uptime}
28. `GET /agents` — returns all agents: [{agent_id, status, uptime, error_count, last_run_at, health}]
29. `GET /agents/:agent_id` — detailed status for one agent: runs history, tool call stats
30. `GET /agents/:agent_id/restart` — force restart a specific agent (calls supervisor.restart_agent)
31. `POST /agents/task` — create a task for a specific agent (body: agent_type, goal, context, priority)
32. `GET /scheduler/jobs` — list all scheduled jobs with next_run_time

### Main Entry Point
33. `async def main()` — orchestrate startup:
    1. Load .env, validate ANTHROPIC_API_KEY present
    2. Initialize Supabase client
    3. Run DB migrations check (verify all 4 agent table groups exist)
    4. Instantiate all 4 domain agents with correct models
    5. Register all agents in AgentRegistry
    6. Start DailyRoutineScheduler
    7. Start HealthServer
    8. Start HealthHeartbeat
    9. Register GracefulShutdown
    10. Start AgentSupervisor.watch_loop() + start_all()
    11. Wait for stop_event
    12. GracefulShutdown.drain_wait()
    13. Deregister all agents
34. `if __name__ == '__main__': asyncio.run(main())` — entry point
35. CLI flag `--agents social,content,acquisition,revenue` — launch only specified agents
36. CLI flag `--dry-run` — validate config + DB connectivity without starting agent loops
37. CLI flag `--list-agents` — print all registered agents and their last status
38. CLI flag `--restart-agent AGENT_ID` — trigger restart via Supabase signal

### Migration Check
39. `check_required_tables()` — verify these tables exist: actp_agent_runs, actp_agent_memory, actp_agent_tasks, actp_tool_call_log, actp_engagement_actions, actp_viral_templates, actp_deal_log, actp_revenue_goals, actp_weekly_snapshots, anthropic_cost_log
40. If any table missing: print warning with migration command, continue with available agents

### Env Validation
41. `validate_env()` — check all required env vars: ANTHROPIC_API_KEY (required), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, optionally warn on missing: STRIPE_SECRET_KEY, TELEGRAM_BOT_TOKEN, APPLE_KEY_ID
42. Print startup banner with enabled/disabled agents based on `ENABLE_*` flags

### Tests
43. `test_supervisor_restarts_crashed_agent()` — mock agent that raises exception, verify restart called
44. `test_supervisor_backoff_after_5_crashes()` — 5 crashes in 1hr, verify backoff delay applied
45. `test_graceful_shutdown_drains_in_flight()` — start task, send SIGTERM, verify task completes before exit
46. `test_daily_routine_jobs_registered()` — verify all 6 scheduled jobs present in scheduler
47. `test_health_server_returns_all_agents()` — GET /agents, verify all 4 domain agents in response
48. `test_registry_deregisters_on_shutdown()` — shutdown, verify all agents status='stopped' in DB

## Key Files
- `worker.py` (new — main entry point, replaces any existing worker.py)
- `agent_supervisor.py` (new — AgentSupervisor + AgentRegistry + HealthHeartbeat + GracefulShutdown)
- `daily_routine.py` (new — DailyRoutineScheduler with all crons)
- `health_server.py` (extend — add unified /agents routes)

## Environment Variables
- `ENABLE_SOCIAL_MEDIA_AGENT=true` (default false until PRD-112 built)
- `ENABLE_CONTENT_AGENT=true`
- `ENABLE_ACQUISITION_AGENT=true`
- `ENABLE_REVENUE_AGENT=true`
- `WORKER_HEALTH_PORT=8090`
- `SUPERVISOR_WATCH_INTERVAL=10`

## Run
```bash
# Start all agents
python3 worker.py

# Start specific agents only
python3 worker.py --agents content,revenue

# Validate without starting
python3 worker.py --dry-run

# Check status
python3 worker.py --list-agents
```
