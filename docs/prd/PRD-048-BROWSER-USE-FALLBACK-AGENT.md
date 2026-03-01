# PRD-048 — Browser Use Fallback Agent

**Status:** In Progress  
**Priority:** P1  
**Domain:** `browser_automation`  
**Module:** `actp-worker/browser_use_agent.py`  
**Supabase Project:** ivhfuhxorppptyuofbgq  
**Related Files:** `browser_use_agent.py`, `workflow_executors.py`

---

## Overview

When ACTP's primary Safari Automation HTTP APIs (ports 3001–3108) fail or are unreachable, the Browser Use Fallback Agent transparently retries the task using a 3-tier fallback chain: Safari API → playwright-mcp (headless Chromium) → steipete/macos-automator-mcp (AppleScript Safari). This gives ACTP agents resilient browser access for navigation, content extraction, screenshots, form fills, and web searches.

---

## Goals

1. Provide a single `browser_task(task: BrowserTask) → BrowserResult` interface for all ACTP agents.
2. Auto-fallback: try Safari API first, playwright-mcp second, steipete AppleScript third.
3. Log which backend was used and whether fallback occurred.
4. Support 8 action types: `navigate`, `snapshot`, `screenshot`, `evaluate`, `click`, `type`, `extract`, `search`.
5. Return structured `BrowserResult` with `success`, `data`, `screenshot_b64`, `backend`, `latency_ms`.
6. Expose convenience wrappers: `browser_navigate`, `browser_extract`, `browser_screenshot`, `browser_search`.
7. Pass `PLAYWRIGHT_BROWSERS_PATH` correctly on macOS (`~/Library/Caches/ms-playwright`).

---

## Architecture

```
ACTP Agent / Workflow Executor
  └─► browser_task(BrowserTask)
        │
        ├─ 1. Safari Automation HTTP API  (platform-specific, fast)
        │       └─ health-check (2s timeout) → POST /api/navigate|screenshot|execute
        │
        ├─ 2. playwright-mcp             (headless Chromium, any URL)
        │       └─ MCP stdio: browser_navigate / browser_snapshot / browser_take_screenshot
        │           browser_evaluate / browser_click / browser_type
        │
        └─ 3. steipete/macos-automator-mcp  (AppleScript — navigate + evaluate only)
                └─ MCP stdio: execute_script
```

---

## BrowserTask Fields

| Field | Type | Description |
|-------|------|-------------|
| `action` | str | navigate\|snapshot\|screenshot\|evaluate\|click\|type\|extract\|search |
| `url` | str | Target URL |
| `platform` | str | Optional: instagram\|twitter\|tiktok\|threads\|linkedin |
| `selector` | str | CSS selector or element label for click/type |
| `text` | str | Text to type or search query |
| `expression` | str | JS expression for evaluate |
| `timeout` | float | Per-action timeout (default 30s) |
| `prefer_fallback` | bool | Skip Safari API, go straight to playwright |

---

## BrowserResult Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Whether the action succeeded |
| `data` | Any | Extracted text, URL, title, etc. |
| `screenshot_b64` | str | Base64 PNG if screenshot was taken |
| `error` | str | Error message if failed |
| `backend` | str | Which backend was used |
| `latency_ms` | float | Time taken |
| `fallback_used` | bool | True if primary Safari API was skipped |

---

## Platform → Safari API Mapping

| Platform | Base URL (default) |
|----------|-------------------|
| instagram | http://localhost:3001 |
| tiktok | http://localhost:3102 |
| twitter | http://localhost:3003 |
| threads | http://localhost:3004 |
| linkedin | http://localhost:3105 |
| upwork | http://localhost:3108 |

All URLs configurable via env vars (`SAFARI_INSTAGRAM_DM_URL`, etc.).

---

## Features

### F-048-001 — Safari API health check (done)
Fast 2s health probe to `/api/health` or `/` before dispatching. Skips API if down.

### F-048-002 — playwright-mcp navigate/snapshot (done)
`browser_navigate` + `browser_snapshot` for page navigation and accessibility tree extraction.

### F-048-003 — playwright-mcp screenshot (done)
`browser_take_screenshot` (not `browser_screenshot` — tool name must match MCP schema).

### F-048-004 — playwright-mcp evaluate (done)
`browser_evaluate` for JS expression execution in headless Chromium context.

### F-048-005 — playwright-mcp click + type (done)
DOM ref extraction from snapshot → `browser_click` + `browser_type` for form interaction.

### F-048-006 — playwright-mcp extract (done)
Navigate + snapshot → return accessibility tree as structured content for LLM consumption.

### F-048-007 — DuckDuckGo web search (done)
`search` action navigates to `duckduckgo.com?q=...` and extracts results via snapshot.

### F-048-008 — steipete AppleScript tertiary fallback (done)
For `navigate` and `evaluate` only. Uses `tell application "Safari" to open location / do JavaScript`.

### F-048-009 — macOS PLAYWRIGHT_BROWSERS_PATH fix (done)
Set `~/Library/Caches/ms-playwright` in env before spawning playwright MCP subprocess.

### F-048-010 — health_check() utility
Async function to check all backends: playwright, steipete, and all 6 Safari API platforms.

### F-048-011 — CLI for manual testing
`python3 browser_use_agent.py --action navigate --url https://example.com`  
`python3 browser_use_agent.py --action health`

### F-048-012 — Unit tests
`tests/test_browser_use_agent.py` — mock MCP subprocess calls, test fallback chain logic, verify correct tool names are called for each action type.

### F-048-013 — Retry on transient errors
Add 1 retry with 1s delay for playwright actions that fail with `timeout` or `connection refused`.

### F-048-014 — Session reuse optimization
Instead of spawning a new playwright-mcp process per call, keep a persistent subprocess alive for the duration of a task batch. Add `PlaywrightSession` context manager.

### F-048-015 — Screenshot save to disk
Add `save_screenshot(result, path)` helper that writes `screenshot_b64` to a PNG file for debugging.

---

## Acceptance Criteria

- [ ] `browser_task(BrowserTask(action="navigate", url="https://example.com"))` succeeds via playwright
- [ ] `browser_task(BrowserTask(action="extract", url="https://example.com"))` returns >100 chars of content
- [ ] `browser_task(BrowserTask(action="screenshot", url="https://example.com"))` returns non-empty `screenshot_b64`
- [ ] `browser_task(BrowserTask(action="navigate", platform="instagram"))` tries Safari API first, falls back if down
- [ ] `health_check()` returns status for all backends within 20s
- [ ] Unit tests pass: `pytest tests/test_browser_use_agent.py -v`
- [ ] CLI `--action health` prints backend status within 25s
