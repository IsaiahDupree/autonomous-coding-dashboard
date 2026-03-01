# PRD-101: Agent Spawner & Self-Healing System

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **Feature List**: /Users/isaiahdupree/Documents/Software/actp-worker/prd-101-features.json
- **Priority**: P0 (CRITICAL — system reliability)

## Context

The Agent Spawner & Self-Healing System enables the Cognitive Orchestrator to dynamically launch, monitor, and recover specialized agents. Each terminal (agent process) must be observable, restartable, and self-correcting without human intervention.

Key requirements:
- Terminals can spin up named agents on demand
- Every agent has a heartbeat and health score
- Failed agents auto-restart with exponential backoff
- Circuit breakers prevent infinite restart loops
- All agent lifecycle events logged to Supabase
- Capability registry so the orchestrator knows what each agent can do

## Architecture

```
AgentSpawner (agent_spawner.py)
      ├── AgentRegistry       — known agents, capabilities, endpoints
      ├── ProcessLauncher     — subprocess spawn with env + args
      ├── HealthMonitor       — periodic heartbeat checks
      ├── CircuitBreaker      — halt restarts after N failures
      └── SelfHealingLoop     — detect → diagnose → restart → verify
```

## Task

### Core Module: `agent_spawner.py`
1. `AgentRegistry.register(agent_id, name, entry_point, capabilities, health_url)` — register an agent definition
2. `AgentRegistry.list_agents()` — return all registered agents with current status
3. `AgentRegistry.get_agent(agent_id)` — fetch single agent spec
4. `AgentRegistry.unregister(agent_id)` — remove from registry
5. `ProcessLauncher.spawn(agent_id)` — launch agent subprocess with correct env vars
6. `ProcessLauncher.spawn_all(tags)` — spawn all agents matching tag filter
7. `ProcessLauncher.terminate(agent_id)` — graceful SIGTERM then SIGKILL
8. `ProcessLauncher.restart(agent_id)` — terminate + spawn with delay
9. `ProcessLauncher.get_pid(agent_id)` — return running PID or None
10. `ProcessLauncher.is_running(agent_id)` — bool check via psutil

### Health Monitor
11. `HealthMonitor.check(agent_id)` — HTTP GET to health_url, returns HealthResult
12. `HealthMonitor.check_all()` — concurrent health check all registered agents
13. `HealthMonitor.score(agent_id)` — 0–100 health score from uptime, response time, error rate
14. `HealthMonitor.start_loop(interval_seconds)` — asyncio loop, checks every N seconds
15. `HealthMonitor.get_report()` — full health report dict for all agents

### Circuit Breaker
16. `CircuitBreaker.record_failure(agent_id)` — increment failure counter
17. `CircuitBreaker.record_success(agent_id)` — reset failure counter
18. `CircuitBreaker.is_tripped(agent_id)` — True if failures ≥ threshold (default 5)
19. `CircuitBreaker.reset(agent_id)` — manually reset circuit
20. `CircuitBreaker.get_state(agent_id)` — CLOSED / OPEN / HALF_OPEN

### Self-Healing Loop
21. `SelfHealingLoop.detect_failures()` — find all agents with health score < 50
22. `SelfHealingLoop.diagnose(agent_id)` — check logs, exit code, memory usage
23. `SelfHealingLoop.attempt_recovery(agent_id)` — restart if circuit not tripped
24. `SelfHealingLoop.verify_recovery(agent_id)` — health check after restart, wait 10s
25. `SelfHealingLoop.escalate(agent_id)` — notify via Telegram + log to Supabase if unrecoverable
26. `SelfHealingLoop.run(interval_seconds)` — main asyncio healing loop

### Agent Capability Registry
27. `CapabilityRegistry.register_capabilities(agent_id, capabilities_list)` — store what agent can do
28. `CapabilityRegistry.find_capable_agent(capability)` — return agent_id that handles a capability
29. `CapabilityRegistry.route_task(task_type)` — auto-route task to correct agent
30. `CapabilityRegistry.list_capabilities()` — full capability → agent map

### Supabase Tables
31. Create migration `actp_agent_registry` — id, agent_id, name, entry_point, capabilities jsonb, health_url, status, registered_at
32. Create migration `actp_agent_health_log` — id, agent_id, health_score, response_ms, error, checked_at
33. Create migration `actp_agent_restarts` — id, agent_id, reason, pid_before, pid_after, success, restarted_at
34. Create migration `actp_circuit_breakers` — agent_id (pk), state, failure_count, last_failure_at, tripped_at

### Pre-Registered Agents (seed data)
35. Register `content-agent` — entry_point: content_generation_agent.py, capabilities: [content.generate, content.publish]
36. Register `acquisition-agent` — entry_point: acquisition_agent.py, capabilities: [outreach.dm, outreach.linkedin, upwork.propose]
37. Register `revenue-agent` — entry_point: revenue_analytics_agent.py, capabilities: [revenue.track, analytics.report]
38. Register `orchestrator` — entry_point: cognitive_orchestrator.py, capabilities: [orchestrator.plan, orchestrator.delegate]
39. Register `safari-automation` — health_url: http://localhost:3106/health, capabilities: [research.market, dm.send]

### Health Server Routes
40. `GET /api/agents` — list all agents with health scores
41. `POST /api/agents/:id/spawn` — spawn a specific agent
42. `POST /api/agents/:id/restart` — force restart
43. `POST /api/agents/:id/terminate` — graceful shutdown
44. `GET /api/agents/:id/health` — single agent health check
45. `POST /api/agents/:id/circuit-reset` — reset circuit breaker

### Testing
46. `test_spawn_and_detect_running()` — spawn mock agent, verify is_running=True
47. `test_health_check_healthy()` — mock HTTP health endpoint, verify score > 80
48. `test_circuit_breaker_trips_after_5_failures()` — verify OPEN state
49. `test_self_healing_restarts_failed_agent()` — kill agent, verify auto-restart
50. `test_capability_routing()` — verify content.generate routes to content-agent

## Key Files
- `agent_spawner.py` (new — full spawner system)
- `health_server.py` (add /api/agents routes)
- `worker.py` (boot spawner + healing loop)
- `supabase/migrations/` (4 new tables)
