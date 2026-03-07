# PRD-082: Self-Healing Agent System

## Working Directory
`/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard`

## Feature List
`/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/features/prd082-self-healing.json`

## Goal
Build a self-healing system that monitors all Safari services, auto-restarts downed ports, and uses Claude Code SDK to automatically fix code errors detected in logs.

## Features to Implement

**SH-001** — `harness/overstory-bridge.js`: reads `harness/doctor-log.ndjson` tail for entries where `diagnosis=confirmed_bug`. When found, spawns `code-fixer-agent.js` with the error context. Debounces: max 1 fix attempt per file per 10 min.

**SH-002** — `harness/code-fixer-agent.js`: Claude Code SDK session. Reads error log excerpt, identifies root cause, edits the offending file, runs `npm run build` or equivalent to verify fix. Logs result to `harness/healing-stats.json`.

**SH-003** — `harness/service-monitor.js`: polls all Safari service ports every 30s: `3100,3003,3102,3105,3005,3006,3007,3004,3106`. Tracks consecutive failures. Writes status to `harness/service-health.json`.

**SH-004** — Auto-restart: if port down >2 consecutive checks (60s), call `bash harness/watchdog-safari.sh` to restart. If still down after restart, escalate to Telegram alert. Max 3 restart attempts per service per hour.

**SH-005** — `.overstory/specs/code-fixer.yaml` and `.overstory/specs/service-monitor.yaml`: Overstory spec files defining agent behavior and constraints for each daemon.

**SH-006** — `harness/prompts/code-fixer.md`: Claude Code SDK prompt — reads error context, identifies root cause in codebase, applies minimal fix, validates with build/test.

**SH-007** — `harness/launch-self-healing.sh`: `start|stop|status`. Starts `service-monitor.js` + `overstory-bridge.js` with nohup. PID files at `harness/service-monitor.pid`, `harness/overstory-bridge.pid`.

**SH-008** — Backend route: `GET /api/healing/status` returns `{monitored_services: [{port, name, status, uptime_pct, last_restart}], recent_heals: [...], heal_success_rate}`.

**SH-009** — `harness/healing-stats.json`: `{total_attempts, successes, failures, mttr_seconds, by_service: {}}`. Updated after each heal attempt.

**SH-010** — Dashboard panel: Self-Healing section on the ACD dashboard at `http://localhost:3434`. Shows service status grid (green/red per port), recent heal events, success rate gauge.

## Rules
- No mock data — real port polling and real Safari service integration
- Commit after each feature
- Mark feature `passes: true` in feature JSON after smoke test
