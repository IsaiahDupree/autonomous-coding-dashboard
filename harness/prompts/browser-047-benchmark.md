# Browser-047 — MCP Browser Automation Benchmark

## Mission
Complete the remaining features for the MCP Browser Automation Benchmark system. The benchmark script and report generation are already built — your job is to harden the tier-2 scoring, add a --watch flag, and set up CI integration.

## Working Directory
`/Users/isaiahdupree/Documents/Software/mcp-servers/benchmark/`

## PRD Reference
`docs/prd/PRD-047-MCP-BROWSER-BENCHMARK.md`

## Feature List
`harness/features/browser-047-benchmark.json`

## Features to Build (pending only)
- **F-047-006** `--watch N` flag: re-run benchmark every N minutes, append to `benchmark_history.json`, print delta scores
- **F-047-007** Tier-2 correctness scoring: `result_useful` is False when playwright response contains "is not installed" — do not count browser error messages as "success"
- **F-047-008** `Makefile` target `make benchmark` + `.github/workflows/benchmark.yml`

## Already Done (do NOT rebuild)
- F-047-001 through F-047-005: pre-flight checks, Chromium auto-setup, blueprint skip, ACTP HTTP check, report generation all complete

## Output Files
- `run_benchmark.py` — main benchmark script (modify in place)
- `Makefile` — add benchmark target (create if missing)
- `.github/workflows/benchmark.yml` — CI workflow (create)

## Key Facts
- PLAYWRIGHT_BROWSERS_PATH must be set to `~/Library/Caches/ms-playwright` on macOS
- blueprint-mcp has `skip_reason` in config — never spawn it
- playwright-mcp tool names: `browser_navigate`, `browser_snapshot`, `browser_take_screenshot`, `browser_evaluate`, `browser_click`, `browser_type`
- benchmark_results.json is the source for history delta tracking

## Validation
Run `python3 run_benchmark.py` — should complete in < 5 minutes with no hangs.
Run `python3 run_benchmark.py --watch 1` — should re-run after 1 minute.
Check that BENCHMARK_REPORT.md tier-2 rows do NOT show ✅ when playwright response contains "is not installed".
