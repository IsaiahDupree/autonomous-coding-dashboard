# Browser-049 — ACTP Computer Use Workflow Integration

## Mission
Complete the ACTP workflow integration for browser computer-use tasks. BrowserUseExecutor is already wired in — your job is to add payload validation, the audit log table, data plane method, capability registration, integration tests, and the blueprint setup script.

## Working Directory
`/Users/isaiahdupree/Documents/Software/actp-worker/`

## PRD Reference
`docs/prd/PRD-049-ACTP-COMPUTER-USE-INTEGRATION.md`

## Feature List
`harness/features/browser-049-computer-use-integration.json`

## Features to Build
- **F-049-003** Payload validation in `BrowserUseExecutor.execute()` — validate required fields per action before calling `browser_task()`
- **F-049-004** Verify `BrowserResult` → `complete_task` mapping is compatible with workflow engine schema
- **F-049-005** Create `supabase/migrations/20260301000010_browser_tasks.sql` with `actp_browser_tasks` table
- **F-049-006** After each executor run, INSERT row into `actp_browser_tasks`
- **F-049-007** Add `browser_use_health()` to `data_plane.py`
- **F-049-008** Register `browser_use` capability in `workflow_registration.py`
- **F-049-009** Seed `browser-use-research` workflow definition in Supabase
- **F-049-010** Create `tests/test_browser_use_executor.py`
- **F-049-011** Create `scripts/setup_blueprint_mcp.sh`
- **F-049-012** Update `ENV_CONFIG.md` with all browser automation env vars

## Already Done (do NOT rebuild)
- F-049-001: `BrowserUseExecutor` class in `workflow_executors.py` (lines ~2358–2440)
- F-049-002: `register_executor(BrowserUseExecutor())` in `init_executors()`

## Key Code Locations
- `workflow_executors.py` — BrowserUseExecutor class, init_executors()
- `workflow_registration.py` — register_capability() calls
- `data_plane.py` — all data plane methods
- `supabase/migrations/` — SQL migration files
- `browser_use_agent.py` — health_check(), browser_task()

## actp_browser_tasks Schema
```sql
CREATE TABLE actp_browser_tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         uuid,
  action          text NOT NULL,
  url             text,
  platform        text,
  backend         text,
  fallback_used   bool DEFAULT false,
  success         bool NOT NULL,
  latency_ms      float,
  result_preview  text,
  screenshot_stored bool DEFAULT false,
  error_msg       text,
  created_at      timestamptz DEFAULT now()
);
```

## Validation
```bash
# Verify executor is registered
python3 -c "from workflow_executors import init_executors, _EXECUTORS; init_executors(); print('browser_use' in _EXECUTORS)"
# Expected: True

# Run integration tests
pytest tests/test_browser_use_executor.py -v

# Verify migration file exists
ls supabase/migrations/ | grep browser_tasks

# Check blueprint setup script is executable
bash scripts/setup_blueprint_mcp.sh --help
```
