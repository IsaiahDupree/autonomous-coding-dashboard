# Mission: Main Terminal — Observe, Dispatch & Business Objectives Integration Tests

## Working Directory
`/Users/isaiahdupree/Documents/Software/actp-worker`

## Feature List
`/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/features/test-terminal-dispatch.json`

## Output File
`tests/test_terminal_dispatch_comprehensive.py`

## Goal
Write a comprehensive pytest test suite that validates the **main terminal** — both local and cloud — as the unified command-and-control interface for all Claude Code MCP agents and business automation. The terminal must be able to **observe** agent state, **dispatch** actions, and **achieve business objectives** through full integration of the memory and data planes.

## Architecture Under Test

### Local Terminal
- **`service_registry.py`** (`actp-worker/`) — unified `dispatch("service.topic", params)` router with 35+ services and 150+ topics. Three call modes: local Python, HTTP POST `/api/services/{service}/{topic}`, CLI `python -m service_registry call service.topic '{...}'`
- **`agent-core` CLI** — `agent plan/run/status/logs/memory/checkpoint/jobs/health` commands
- **ACD harness** — `acd.start_harness`, `acd.stop_harness`, `acd.wake`, `acd.harness_status`, `acd.harness_logs`, `acd.list_projects`, `acd.import_project`, `acd.dashboard_stats`, `acd.list_harnesses`
- **Data plane** (`data_plane.py`) — 30+ async methods covering CRM, DM, research, content, publishing, revenue, memory

### Cloud Terminal
- **CRMLite** (`/api/agent/status`, `/api/agent/context`, `/api/agent/action`, `/api/agent/audit`) — 14 routable actions, full audit log in `actp_agent_audit_log`
- **Workflow Engine** (`/api/workflows`, `/api/workflows/:slug/run`, `/api/workflows/executions`, `/api/workflows/tasks/next`) — DAG-based automations
- **ACD Dashboard** (`http://localhost:3000/api/agent-status`) — live worker grid with robustness metrics

### Memory Planes
- **Local**: agent-core SQLite DB (jobs, memory, checkpoints, lessons), `LessonStore`, `GoalRegistry`, `OpenLoopTracker`
- **Cloud**: Supabase `ivhfuhxorppptyuofbgq` — `actp_agent_memory`, `actp_agent_runs`, `actp_feedback_strategy`, `actp_agent_audit_log`, `actp_agent_health_snapshots`

## Test Structure

```python
import pytest, asyncio, httpx, json, os, sys

_WORKER_ROOT = os.path.dirname(os.path.dirname(__file__))
_AGENT_CORE  = "/Users/isaiahdupree/Documents/Software/agent-core"
for _p in (_WORKER_ROOT, _AGENT_CORE):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from service_registry import dispatch, init_all_services, list_topics, list_services

CRMLITE_URL   = os.getenv("CRMLITE_URL",   "https://crmlite-h3k1s46jj-isaiahduprees-projects.vercel.app")
WORKFLOW_URL  = os.getenv("WORKFLOW_URL",  "https://workflow-engine-7vhmjxq8i-isaiahduprees-projects.vercel.app")
ACD_DASH_URL  = os.getenv("ACD_DASH_URL",  "http://localhost:3000")
MASTER_KEY    = os.getenv("WORKFLOW_ENGINE_MASTER_KEY", "")
CRMLITE_KEY   = os.getenv("CRMLITE_MASTER_KEY", "")
```

## Test Classes (map to feature categories)

1. `TestServiceRegistry` — T-TERM-001 to 010: list_services, list_topics, dispatch envelope, fuzzy suggestions, CLI mode
2. `TestACDObserve` — T-TERM-011 to 020: harness_status, list_projects, dashboard_stats, harness_logs, NL intent recognition
3. `TestACDDispatch` — T-TERM-021 to 030: start (dry_run=True), stop, wake, import_project, NL→action mapping, CLI 'agent run'
4. `TestDataPlaneLocal` — T-TERM-031 to 045: system.heartbeat, system.full_status, research, dm, linkedin, crm, workflow, revenue, social
5. `TestMemoryPlaneLocal` — T-TERM-046 to 055: memory.write, agent memory search CLI, checkpoints, cognitive, graph, chat, goals
6. `TestCloudObserve` — T-TERM-056 to 062: CRMLite status/context/audit, Workflow Engine health/definitions/executions, ACD dashboard
7. `TestCloudDispatch` — T-TERM-063 to 068: CRMLite /api/agent/action with all 14 actions
8. `TestBusinessObjectives` — T-TERM-069 to 082: outreach, content pipeline, market research, LinkedIn, Upwork, revenue, Telegram
9. `TestCrossIntegration` — T-TERM-083 to 090: dm.sync→CRM, memory→cloud audit, workflow→local task, ACD progress in cloud
10. `TestAuditObservability` — T-TERM-091 to 097: event bus logging, CRMLite audit log, parallel output log, structured errors
11. `TestReporting` — T-TERM-098 to 103: results JSON, collection count, mock mode, integration markers, feature list update, commit

## Rules

1. **Mock by default** — use `httpx.MockTransport` / `monkeypatch` for all HTTP calls unless marked `@pytest.mark.integration`. Tests must pass without network access in unit mode.
2. **Live ACD dispatch** — tests in `TestACDDispatch` that call `acd.start_harness` MUST use `dryRun: True` to avoid actually launching workers.
3. **No real DMs** — `dm.send` and `linkedin.message` tests use dry_run/test accounts only.
4. **init_all_services()** called in `conftest.py` fixture with autouse=True scope='session'.
5. **Function naming** — test functions reference feature id, e.g. `test_T_TERM_001_list_services`.
6. **After each batch of 10 tests written**, mark those features `passes: true` in the feature list JSON.
7. **Integration tests** are marked `@pytest.mark.integration` and guarded by `pytest.importorskip` or env var check.
8. **Existing tests in `test_clawbot_acd_dispatch.py` must not be broken** — import from same fixtures.

## Key Service Topics Reference

```
# ACD (observe + dispatch)
acd.harness_status    acd.list_projects    acd.dashboard_stats
acd.harness_logs      acd.list_harnesses   acd.start_harness
acd.stop_harness      acd.wake             acd.import_project

# Data plane
system.heartbeat      system.full_status   system.list_services   system.self_test
research.platform     research.keyword     dm.health              dm.conversations
dm.send               dm.process_outreach  dm.sync                linkedin.status
linkedin.prospect     linkedin.campaign    crm.list_contacts      workflow.list
revenue.dashboard     social.metrics       safari.health          cognitive.score_event

# Memory
memory.write          graph.entities       chat.history           feedback.analysis
twitter.metrics       feedback.twitter_cycle

# Cloud (via httpx to cloud endpoints)
POST {CRMLITE_URL}/api/agent/action     {action, params}
GET  {CRMLITE_URL}/api/agent/status
GET  {CRMLITE_URL}/api/agent/context
GET  {CRMLITE_URL}/api/agent/audit
GET  {WORKFLOW_URL}/api/health
GET  {WORKFLOW_URL}/api/workflows
POST {WORKFLOW_URL}/api/workflows/{slug}/run
```

## Validation Steps

```bash
# Collect tests (must show >= 103)
python -m pytest tests/test_terminal_dispatch_comprehensive.py --collect-only 2>&1 | tail -5

# Run unit tests only (no live services needed)
python -m pytest tests/test_terminal_dispatch_comprehensive.py -m "not integration" -v

# Run integration tests (requires services running)
python -m pytest tests/test_terminal_dispatch_comprehensive.py -m integration -v
```

## Final Steps

1. Write results JSON to `tests/terminal_dispatch_results.json`
2. Mark all passing features `passes: true` in the feature list JSON
3. Commit:
```bash
git add tests/test_terminal_dispatch_comprehensive.py
git add tests/terminal_dispatch_results.json
git commit -m "test(terminal): XX/103 dispatch+observe+memory+cloud integration tests"
```
