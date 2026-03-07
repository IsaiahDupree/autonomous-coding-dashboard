# PRD-084: Self-Improving Automation Loop

## Working Directory
`/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard`

## Feature List
`/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/features/prd084-improvement-loop.json`

## Goal
Build a self-improving automation loop that reads live KPIs, uses Claude Haiku to identify bottlenecks, auto-executes high-confidence improvements, and routes low-confidence ones to human approval via Telegram.

## Features to Implement

**IL-001** — KPI collector function in `harness/improvement-loop.js`: reads `harness/linkedin-daemon-state.json`, `harness/linkedin-dm-queue.json`, `harness/upwork-queue.json`, `harness/dm-outreach-state.json`, `/Users/isaiahdupree/Documents/Software/business-goals.json`. Returns `{connections_today, dms_sent, upwork_submitted, reply_rate, revenue_gap}`.

**IL-002** — Claude Haiku analysis in `improvement-loop.js`: POST metrics + targets to `claude-haiku-4-5-20251001` → structured output `{bottleneck, recommended_action, action_params, confidence, reasoning}`. Use Anthropic SDK with structured output / tool use.

**IL-003** — Auto-executor: if `confidence>0.9` AND action in allowlist (`adjust_icp_threshold`, `swap_search_strategy`, `update_message_template`, `change_daily_limit`), apply immediately by editing the relevant config file. Log to `harness/improvement-log.ndjson`.

**IL-004** — Approval queue: low-confidence actions (≤0.9) → append to `harness/improvement-pending.json`. Send Telegram message with action details + `/il_approve_ID` and `/il_skip_ID` buttons.

**IL-005** — Strategy performance tracker: extend `harness/linkedin-daemon-state.json` to track per-strategy stats `{strategy_name, attempts, connections, reply_rate}`. Update after each LinkedIn cycle.

**IL-006** — DM template A/B tracker: in `harness/dm-outreach-state.json`, track reply rate per template variant. After 20 sends per variant, auto-swap lowest performer. Write new template to `harness/dm-templates.json`.

**IL-007** — `harness/improvement-log.ndjson`: append every analysis cycle `{ts, metrics_snapshot, bottleneck, action_taken, confidence, outcome}`.

**IL-008** — `harness/improvement-loop.js` daemon: runs every 6h via `setInterval`. Hot-reloads `business-goals.json` without restart. Exports `runCycle()` for manual trigger.

**IL-009** — `harness/launch-improvement-loop.sh`: `start|stop|status`. nohup with PID file at `harness/improvement-loop.pid`.

**IL-010** — Backend routes: `GET /api/improvement/status` (last cycle results), `GET /api/improvement/log` (last 20 entries), `GET /api/improvement/pending` (approval queue), `POST /api/improvement/run` (manual trigger).

**IL-011** — Dashboard: Business Goals tab on ACD dashboard at `http://localhost:3434`. Shows revenue gap bar chart, KPIs vs targets table, recent improvement actions list with approve/skip buttons for pending items.

## Rules
- Use real Anthropic SDK (claude-haiku-4-5-20251001) — no mock AI calls
- No hardcoded thresholds — read from `business-goals.json`
- Commit after each feature
- Mark feature `passes: true` in feature JSON after smoke test
