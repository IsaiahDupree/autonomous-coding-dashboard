# Browser-048 — Browser Use Fallback Agent

## Mission
Complete and harden the Browser Use Fallback Agent in actp-worker. The core 3-tier fallback chain is already built. Your job is to add the CLI, write unit tests, add retry logic, and build the persistent session optimization.

## Working Directory
`/Users/isaiahdupree/Documents/Software/actp-worker/`

## PRD Reference
`docs/prd/PRD-048-BROWSER-USE-FALLBACK-AGENT.md`

## Feature List
`harness/features/browser-048-fallback-agent.json`

## Features to Build (pending only)
- **F-048-011** CLI: add `if __name__ == "__main__":` block to `browser_use_agent.py` with argparse. Args: `--action`, `--url`, `--platform`, `--selector`, `--text`, `--expression`. Print result as JSON.
- **F-048-012** Unit tests: create `tests/test_browser_use_agent.py` — mock `_mcp_call` and `_safari_api_available`, test fallback chain logic, verify `browser_take_screenshot` (not `browser_screenshot`) is used for screenshots
- **F-048-013** Retry: in playwright actions, catch `timeout` / `connection refused` errors and retry once with 1s delay
- **F-048-014** `PlaywrightSession` context manager: keep a single playwright-mcp subprocess alive for a batch of calls. Reduces per-call overhead.
- **F-048-015** `save_screenshot(result, path)` helper function

## Already Done (do NOT rebuild)
- F-048-001 through F-048-010: Safari API health check, playwright navigate/snapshot/screenshot/evaluate/click/type/extract/search, steipete fallback, macOS PLAYWRIGHT_BROWSERS_PATH fix, health_check() — all complete in `browser_use_agent.py`

## Key Facts
- playwright-mcp tool names (verified from MCP schema):
  - `browser_navigate` — navigate to URL
  - `browser_snapshot` — accessibility tree snapshot
  - `browser_take_screenshot` — screenshot (NOT `browser_screenshot`)
  - `browser_evaluate` — run JS expression
  - `browser_click` — click element by ref
  - `browser_type` — type text into element
- PLAYWRIGHT_BROWSERS_PATH = `~/Library/Caches/ms-playwright` on macOS (r1212 installed)
- steipete MCP path: `/Users/isaiahdupree/Documents/Software/mcp-servers/steipete-macos-automator-mcp/dist/server.js`
- Safari API base URLs: instagram=3001, tiktok=3102, twitter=3003, threads=3004, linkedin=3105

## Validation
```bash
# Test CLI
python3 browser_use_agent.py --action health
python3 browser_use_agent.py --action navigate --url https://example.com
python3 browser_use_agent.py --action extract --url https://example.com

# Run unit tests
pytest tests/test_browser_use_agent.py -v
```
All 3 CLI commands should complete without error. Unit tests should pass.
