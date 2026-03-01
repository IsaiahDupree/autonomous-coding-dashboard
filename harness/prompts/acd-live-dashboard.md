# ACD Live Dashboard — Build Instructions

## What You Are Building

A real-time web dashboard for the Autonomous Coding Dashboard (ACD) that gives a live visual view of every running agent — parallel workers, series pipelines, PRD feature progress, and log streaming. This is mission control for the ACD itself.

**Stack**: Next.js 15 + React 18 + TypeScript + TailwindCSS + shadcn/ui + Lucide icons + Recharts + Server-Sent Events (SSE)

**Project path**: `/Users/isaiahdupree/Documents/Software/acd-live-dashboard`

## Data Sources (Read from filesystem — no external DB needed)

| File | Purpose |
|------|---------|
| `$ACD_HARNESS_DIR/parallel-status.json` | Worker assignments, current repos |
| `$ACD_HARNESS_DIR/parallel-output.log` | Main harness log |
| `$ACD_HARNESS_DIR/logs/*.log` | Per-agent logs |
| `$ACD_HARNESS_DIR/logs/agent-prds/*.log` | Phase 2/3 agent logs |
| `$ACD_HARNESS_DIR/repo-queue.json` | Queue, priorities, metadata |
| `$ACD_ACTP_DIR/prd-*-features.json` | Feature pass/fail per PRD |
| `$ACD_HARNESS_DIR/queue-status.json` | Overall completion status |

**Defaults**:
- `ACD_HARNESS_DIR` = `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness`
- `ACD_ACTP_DIR` = `/Users/isaiahdupree/Documents/Software/actp-worker`

## Core Implementation Requirements

### 1. Next.js App Setup
- Use `create-next-app` with App Router, TypeScript, Tailwind
- Install: `shadcn/ui`, `lucide-react`, `recharts`, `chokidar`, `@radix-ui/*`
- Dark terminal theme: background `#0d0d0d`, primary accent `#00ff88` (green), amber `#f59e0b`, cyan `#06b6d4`
- Monospace font for logs (JetBrains Mono or similar from Google Fonts)
- Layout: top nav bar + main content area, no sidebar

### 2. SSE Streaming Routes
Build two SSE endpoints:

**`/api/status`** — streams every 3s:
```json
{
  "workers": { "1": { "currentRepo": "...", "features": { "passed": 12, "total": 40 }, "pid": 12345, "cpu": 1.2, "mem": 0.3, "elapsed": "02:34:11", "status": "running" } },
  "seriesAgents": [...],
  "standaloneAgents": [...],
  "timestamp": "..."
}
```

**`/api/logs/[slug]`** — streams new lines from the log file using `fs.createReadStream` + chokidar change events

### 3. Process Scanner
Every 5s, run `ps aux` via `child_process.execSync`, parse the output to extract:
- PID, `--project` or `--project-id` value, model flag, elapsed time, %CPU, %MEM

### 4. Feature Progress Reader
Parse `prd-*-features.json` files: count `"passes": true` vs total features. Cache results and refresh on file change via chokidar.

### 5. Pages

**`/` (Command Center)**:
- Left 2/3: Parallel worker grid (W1–W10 tiles in a responsive grid)
- Right 1/3: Series pipeline flow (Phase 1 → 2 → 3 → standalone)
- Top bar stats: active agents, features done today, rate limits

**Worker tile design**:
```
┌─────────────────────────────────┐
│ ● W3  prd-107-crossplatform     │
│ claude-sonnet-4-5  [2h 34m]     │
│ ████████░░ 18/43 (42%)          │
│ Session #7 of 80                │
└─────────────────────────────────┘
```
- Pulsing green dot = active session
- Amber dot = rate-limited (backoff)
- Gray dot = idle/waiting between sessions

**Series pipeline panel**:
```
Phase 1: PRD-111 [✅ 58/58]
    ↓
Phase 2: PRD-112 [🔄 0/47] | PRD-113 [🔄 0/46] | PRD-114 [🔄] | PRD-115 [🔄]
    ↓ (locked until Phase 2 complete)
Phase 3: PRD-116..120 [⏳]
─────
Standalone: softwarehub-products [🔄 160/300 53%]
```

**`/prds/[slug]`**:
- Feature table (left 60%): ID | Description | Status chip
- Live log panel (right 40%): SSE tail with level filter tabs
- Session history accordion at bottom
- Restart button top-right

**`/queue`**:
- Full sorted table of all repos
- Priority badge | Name | Status | Worker | Progress | Complexity | Actions

**`/stats`**:
- Cost estimate cards (parse token counts from log JSON events)
- Sessions/hour bar chart (last 24h) with Recharts
- Rate limit timeline
- Live process table (PID, project, model, CPU, MEM, elapsed)

### 6. Control API
```
POST /api/control/restart-all    → kill run-parallel.js + respawn with 10 workers
POST /api/control/restart/:slug  → kill that specific harness process + respawn
POST /api/control/pause          → send SIGSTOP to all harness PIDs  
POST /api/control/resume         → send SIGCONT to all harness PIDs
```

Use `child_process.spawn` and `process.kill(pid, signal)`.

### 7. Visual Style Details
- Status colors: `#00ff88` running, `#f59e0b` rate-limited, `#ef4444` error, `#6b7280` idle, `#3b82f6` complete
- Progress bars: CSS gradient with glow effect `box-shadow: 0 0 8px #00ff88`
- Animated pulsing ring on active agent tiles using Tailwind `animate-pulse`
- Cards: `bg-zinc-900 border border-zinc-800 rounded-xl` 
- Log panel: `bg-black font-mono text-xs text-green-400` with green cursor blink
- Phase arrows: SVG `<path>` with `stroke-dasharray` animation when active

## Build Order (follow the feature list)

1. Scaffold app + install deps (F-001, F-002)
2. File watcher + ps scanner utilities (F-003, F-004)
3. SSE routes (F-005, F-006) + control API (F-007, F-008)
4. Command Center page — parallel grid (F-011 to F-020)
5. Series pipeline panel (F-021 to F-030)
6. PRD drill-down page (F-031 to F-040)
7. Queue page (F-041 to F-050)
8. Stats page (F-051 to F-060)

## Important Notes

- This is a **local dev server** — `next dev` on port 3333 is fine
- No authentication needed (local machine only)
- Read-only by default except for control API and enable/disable toggle
- When writing back to `repo-queue.json` (F-049), always `JSON.stringify(data, null, 2)` to preserve formatting
- Log files can be large (100MB+) — use streaming, never `fs.readFileSync` on full log
- Parse log lines as JSON where possible (harness outputs JSON lines) — extract `type`, `message`, timestamps
- Rate limit events appear as `"type":"rate_limit_event"` in log JSON
- Feature file updates fire rapidly when harness is writing — debounce chokidar events 500ms

## Mark features complete in the feature_list.json

After implementing each feature, set `"passes": true` in `/Users/isaiahdupree/Documents/Software/acd-live-dashboard/feature_list.json` for the corresponding feature ID.
