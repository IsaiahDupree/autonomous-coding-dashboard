# PRD-047 — MCP Browser Automation Benchmark System

**Status:** In Progress  
**Priority:** P1  
**Domain:** `browser_automation`  
**Module:** `mcp-servers/benchmark/`  
**Related Files:** `run_benchmark.py`, `BENCHMARK_REPORT.md`, `benchmark_results.json`

---

## Overview

A repeatable benchmark harness that tests all installed MCP browser/Safari automation servers against a standard action suite, produces ranked results and a markdown report. Enables data-driven selection of the right MCP backend for ACTP agent tasks.

---

## Goals

1. Benchmark all 7 MCP systems across 11 actions (Tier-1 basic + Tier-2 computer-use).
2. Auto-detect available backends via pre-flight check; skip unreachable ones gracefully.
3. Produce `BENCHMARK_REPORT.md` + `benchmark_results.json` after every run.
4. Surface per-action winners so ACTP agents know which backend to prefer per task type.
5. Handle browser browser-install issues (Chromium path, extension requirements) automatically.

---

## Systems Under Test

| Key | System | Tier | Notes |
|-----|--------|------|-------|
| `joshrutkowski` | joshrutkowski/applescript-mcp | 1 | AppleScript, 33 tools |
| `peakmojo` | peakmojo/applescript-mcp | 1 | Raw AppleScript execute |
| `steipete` | steipete/macos-automator-mcp | 1 | Best-in-class macOS, 200+ recipes |
| `lxman` | lxman/safari-mcp-server | 1 | Native Safari sessions |
| `playwright` | microsoft/playwright-mcp | 2 | Headless Chromium, computer-use |
| `blueprint` | railsblueprint/blueprint-mcp | 2 | Real Chrome profile (needs extension) |
| `actp` | ACTP/instagram-dm-service | 1 | HTTP API, Safari automation |

---

## Benchmark Actions

### Tier-1 (all systems)
1. `get_url` — get current tab URL
2. `execute_js` — run `document.title` via JS
3. `navigate` — navigate to `https://example.com`
4. `get_tabs` — list all open tabs
5. `screenshot` — capture current browser state
6. `error_handling` — intentionally bad input; score error message quality
7. `session_recovery` — after bad state, can it self-recover?

### Tier-2 computer-use (playwright + blueprint only)
8. `snapshot` — get accessibility tree / DOM snapshot
9. `click_element` — find and click an element by label
10. `form_fill` — type into an input field
11. `extract_content` — extract page as clean text for LLM consumption

---

## Metrics

- `success` (bool) per run
- `latency_ms` (p50, avg across N_RUNS)
- `error_quality` (0–3: cryptic → actionable)
- `result_useful` (bool — did the response contain usable content?)
- `overall_score` = 0.5×success + 0.25×speed + 0.25×error_quality

---

## Features

### F-047-001 — Pre-flight check system
Auto-detect which MCP servers are available before running tests. Skip gracefully with reason.

### F-047-002 — Chromium auto-setup
Detect Chromium revision required by bundled playwright version; install if missing. Set `PLAYWRIGHT_BROWSERS_PATH` on macOS correctly (`~/Library/Caches/ms-playwright`).

### F-047-003 — blueprint-mcp skip/defer
Blueprint requires Chrome extension WebSocket. Detect when extension is not connected and produce informative `SKIPPED` result rather than hanging.

### F-047-004 — ACTP HTTP API pre-flight
Check if ACTP instagram-dm service is running on port 3001. Skip benchmark if not, show "start service with: npm run start:server" hint.

### F-047-005 — Benchmark report generation
Auto-write `BENCHMARK_REPORT.md` with rankings table, per-action results table, error handling scores, and per-action winner with preview.

### F-047-006 — Re-run on schedule
Add `--watch` flag to re-run benchmark every N minutes and append results to history JSON.

### F-047-007 — Tier-2 action correctness scoring
For playwright computer-use actions: verify snapshot contains real DOM content (not just error messages). Score `result_useful` based on content length + keyword presence.

### F-047-008 — Benchmark CI integration
Add a `Makefile` target `make benchmark` and a GitHub Actions workflow that runs the benchmark on push and posts results as a PR comment.

---

## Acceptance Criteria

- [ ] All 5 reachable systems complete Tier-1 benchmark in < 5 minutes
- [ ] playwright-mcp runs Tier-2 actions with real Chromium (no "not installed" errors)
- [ ] blueprint-mcp is gracefully skipped with setup instructions in report
- [ ] BENCHMARK_REPORT.md is regenerated after each run
- [ ] Per-action winner correctly identifies best system per task type
