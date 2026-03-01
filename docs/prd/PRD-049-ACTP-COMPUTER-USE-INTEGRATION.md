# PRD-049 — ACTP Computer Use Workflow Integration

**Status:** In Progress  
**Priority:** P1  
**Domain:** `browser_automation`  
**Module:** `actp-worker/workflow_executors.py`  
**Supabase Project:** ivhfuhxorppptyuofbgq  
**Related Files:** `workflow_executors.py`, `browser_use_agent.py`, `data_plane.py`

---

## Overview

Expose the Browser Use Fallback Agent as a first-class ACTP workflow executor (`BrowserUseExecutor`) so any workflow step can dispatch computer-use browser tasks — navigation, content extraction, form submission, screenshots — with full fallback resilience. This closes the gap when platform-specific Safari APIs go down.

---

## Goals

1. Register `BrowserUseExecutor` with `task_type = "browser_use"` in `init_executors()`.
2. Support 8 actions via the executor interface: `navigate`, `extract`, `screenshot`, `evaluate`, `click`, `type`, `search`, `health`.
3. Pass `BrowserTask` parameters from workflow task `payload` directly to `browser_use_agent`.
4. Return structured executor result compatible with workflow engine's `complete_task` schema.
5. Add a `browser_use_health` data plane method for the workflow engine to verify the backend is available before dispatching.
6. Support `prefer_fallback: true` in payload to skip Safari API and go straight to playwright.
7. Add Supabase table `actp_browser_tasks` to log all computer-use dispatches for audit/debugging.

---

## Architecture

```
Workflow Engine (cloud)
  └─► actp_workflow_tasks  (task_type="browser_use")
        └─► WorkflowTaskPoller (local daemon)
              └─► BrowserUseExecutor.execute(task)
                    └─► browser_use_agent.browser_task(BrowserTask)
                          └─► [Safari API | playwright-mcp | steipete-mcp]
                    └─► actp_browser_tasks  (audit log)
                    └─► complete_task(result)  → workflow engine
```

---

## Supabase Table: `actp_browser_tasks`

```sql
CREATE TABLE actp_browser_tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid REFERENCES actp_workflow_tasks(id),
  action      text NOT NULL,
  url         text,
  platform    text,
  backend     text,          -- 'safari_api' | 'playwright' | 'steipete'
  fallback_used bool DEFAULT false,
  success     bool NOT NULL,
  latency_ms  float,
  result_preview text,       -- first 500 chars of extracted content
  screenshot_stored bool DEFAULT false,
  error_msg   text,
  created_at  timestamptz DEFAULT now()
);
```

---

## BrowserUseExecutor Actions

| Action | Description | Payload Fields |
|--------|-------------|---------------|
| `navigate` | Navigate to URL, return title+URL | `url`, `platform?` |
| `extract` | Extract readable content from URL | `url`, `platform?` |
| `screenshot` | Screenshot current page or URL | `url?`, `platform?` |
| `evaluate` | Run JS expression in browser | `url`, `expression` |
| `click` | Click element by label/selector | `url`, `selector` |
| `type` | Type text into element | `url`, `selector`, `text` |
| `search` | DuckDuckGo search + extract results | `text` (query) |
| `health` | Check all browser backends | — |

---

## Features

### F-049-001 — BrowserUseExecutor class (done)
`task_type = "browser_use"`, dispatches to `browser_use_agent.browser_task()`.

### F-049-002 — init_executors registration (done)
`register_executor(BrowserUseExecutor())` added to `init_executors()`.

### F-049-003 — Payload → BrowserTask mapping
Map workflow task `payload` dict → `BrowserTask` dataclass fields. Validate required fields per action.

### F-049-004 — Result → workflow complete_task mapping
Map `BrowserResult` fields → workflow engine completion payload. Include `backend`, `latency_ms`, `fallback_used` in metadata.

### F-049-005 — `actp_browser_tasks` migration
Create and apply migration `20260301000010_browser_tasks.sql`.

### F-049-006 — Audit log write after each task
After every `execute()`, INSERT into `actp_browser_tasks` with result summary.

### F-049-007 — `browser_use_health` data plane method
`data_plane.browser_use_health()` calls `browser_use_agent.health_check()`, returns dict with per-backend status.

### F-049-008 — Capability registration
Register `browser_use` capability in `actp_worker_registrations` on startup. List supported actions in capability metadata.

### F-049-009 — Workflow definition for browser-use research
Seed a `browser-use-research` workflow definition: step 1 = `browser_use/extract`, step 2 = `save_content/store`.

### F-049-010 — Integration test
`tests/test_browser_use_executor.py` — mock `browser_task`, verify executor correctly maps payload, records audit log, returns correct completion schema.

### F-049-011 — blueprint-mcp setup automation
Script `scripts/setup_blueprint_mcp.sh`:
1. Install blueprint-mcp Chrome extension (link to CWS page)
2. Run `node cli.js enable` to connect extension to MCP server
3. Validate connection and print "blueprint-mcp: CONNECTED" if successful

### F-049-012 — ENV doc update
Add `PLAYWRIGHT_BROWSERS_PATH`, `PLAYWRIGHT_MCP_CMD`, `STEIPETE_MCP_PATH`, `SAFARI_*_URL` vars to `ENV_CONFIG.md`.

---

## Acceptance Criteria

- [ ] `BrowserUseExecutor` registered and visible in `init_executors()` log
- [ ] Workflow task `{task_type: "browser_use", payload: {action: "extract", url: "https://example.com"}}` runs end-to-end
- [ ] `actp_browser_tasks` table exists and receives one row per executor run
- [ ] `browser_use_health` data plane method returns status within 25s
- [ ] `tests/test_browser_use_executor.py` passes
- [ ] `scripts/setup_blueprint_mcp.sh` prints connection instructions
