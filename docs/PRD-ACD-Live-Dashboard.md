# PRD: ACD Live Dashboard
## Autonomous Coding Dashboard — Real-Time Agent Visualization UI

**Version**: 1.0  
**Priority**: P-44 (3rd in ACD queue)  
**Stack**: Next.js 15 + React + TailwindCSS + shadcn/ui + Lucide Icons + Server-Sent Events  
**Project Path**: `/Users/isaiahdupree/Documents/Software/acd-live-dashboard`

---

## Overview

A full-stack real-time web dashboard that gives a live, visual view into every agent the Autonomous Coding Dashboard (ACD) is running — parallel workers, series pipelines, PRD-level progress, and individual feature pass/fail tracking. Think of it as a mission control center for the ACD.

---

## Core Goals

1. **Visibility** — see every agent (parallel + series) at a glance, no more `ps aux` commands
2. **Progress** — real-time feature completion bars per PRD, with pass/fail indicators
3. **Topology** — visual graph showing which agents are parallel vs. series dependencies
4. **Logs** — live log streaming per agent, filterable by level
5. **Control** — start, stop, restart individual agents or the entire parallel harness
6. **Health** — rate limit status, backoff timers, session counts, cost tracking

---

## UI Layout

### Main Views
- **Command Center** (default) — full parallel worker grid + series pipeline panel side by side
- **PRD Drill-Down** — click any PRD to see full feature list with pass/fail status + current session log
- **Queue View** — upcoming repos ranked by priority with estimated completion
- **Cost & Stats** — token usage, cost per PRD, session counts, rate limit history

### Design Language
- Dark terminal-inspired theme (`#0d0d0d` background, green/amber/cyan accents)
- Monospace fonts for logs and feature names
- Smooth animated progress bars with glow effects
- Pulsing indicators for actively running sessions
- Card-based agent tiles with status badges

---

## Pages & Routes

| Route | Description |
|-------|-------------|
| `/` | Command Center — live parallel grid + series pipeline |
| `/prds` | All PRDs in queue sorted by priority |
| `/prds/[slug]` | PRD detail — feature list, logs, sessions, cost |
| `/queue` | Full queue with priority ordering |
| `/agents` | All running harness processes with PID, model, elapsed |
| `/logs/[slug]` | Full scrollable log viewer for a specific agent |
| `/stats` | Cost tracking, session counts, token usage charts |
| `/api/status` | SSE stream: live parallel-status.json + feature progress |
| `/api/logs/[slug]` | SSE stream: tail -f for agent log file |
| `/api/control/[action]` | POST: start/stop/restart harness or specific agent |

---

## Data Sources

All data is read from the local filesystem (no external DB required for core features):

| Source | Used For |
|--------|---------|
| `harness/parallel-status.json` | Worker assignments, current repos |
| `harness/parallel-output.log` | Main harness log stream |
| `harness/logs/*.log` | Per-agent log files |
| `harness/logs/agent-prds/*.log` | Phase 2/3 agent logs |
| `harness/repo-queue.json` | Queue, priorities, metadata |
| `actp-worker/prd-*-features.json` | Feature pass/fail per PRD |
| `harness/queue-status.json` | Overall completion status |
| `process list (ps aux)` | Live PID + CPU + memory per agent |

---

## Features (60 total)

### F-001 to F-010: Setup & Infrastructure
- Next.js 15 app with App Router, TypeScript, Tailwind, shadcn/ui
- API routes for SSE streaming (status, logs)
- File system watcher (chokidar) for `parallel-status.json` and feature files
- `ps aux` subprocess polling every 5s for live process data
- Environment config: `ACD_HARNESS_DIR`, `ACD_ACTP_DIR` pointing to local paths
- Error boundary and loading skeletons for all panels
- Responsive layout (desktop primary, tablet-friendly)
- Dark mode by default with system preference detection
- Health check route `/api/health`
- Build and dev scripts

### F-011 to F-020: Command Center — Parallel Grid
- Worker grid: 1 tile per parallel worker (W1–W10)
- Each tile shows: current repo name, priority, model, elapsed time, features progress bar
- Live pulsing dot for actively running session vs. idle/waiting
- Color-coded by status: green=running, amber=rate-limited, red=error, gray=idle
- Click tile to open PRD drill-down
- Top bar: total agents count, total features completed today, active rate limits
- Auto-refresh every 3s via SSE without full page reload
- Worker slot shows session number (#12 of 80, etc.)
- Estimated completion time per worker (features/hour × remaining)
- Keyboard shortcut `R` to refresh all, `1-9` to jump to worker

### F-021 to F-030: Series Pipeline Panel
- Vertical pipeline view for series agents (PRD-111 → 112 → 113...)
- Phase indicators: Phase 1 (complete), Phase 2 (active), Phase 3 (waiting)
- Each phase shows agents as horizontal row of cards
- Connecting arrows between phases with animated flow
- Phase completion percentage and ETA
- Dependency locks: locked phases show reason (waiting for Phase N)
- softwarehub-products shown as standalone track
- Expand/collapse phases
- Status badges per agent (complete ✅ / running 🔄 / queued ⏳ / error ❌)
- Click any agent to drill into its log + feature progress

### F-031 to F-040: PRD Drill-Down
- Feature list rendered as table: feature ID, description, status (pass/fail/pending)
- Feature status color coded: green=pass, red=fail, gray=pending, yellow=in-progress
- Search/filter features by keyword
- Real-time log panel on the right (SSE tail of agent log)
- Log filtering by level: all / info / error / rate-limit events
- Session history: list of past sessions with start time, duration, features completed
- Model badge (opus/sonnet/haiku) with cost estimate
- "Restart Agent" button (POST to `/api/control/restart/:slug`)
- "View Full Log" link to `/logs/[slug]`
- Feature completion spark line (progress over time)

### F-041 to F-050: Queue View
- Full paginated list of all 105+ repos sorted by priority
- Priority badge (P-46, P-45...) with color gradient (high=green, low=gray)
- Status column: completed ✅ / in-progress 🔄 / queued ⏳ / disabled ⛔
- Assigned worker column (which worker slot is handling it)
- Feature count: passed/total
- Complexity badge: critical / high / medium / low
- Filter by: status, complexity, model tier
- Search by repo name or slug
- Drag to reprioritize (updates priority in repo-queue.json)
- "Enable/Disable" toggle per repo

### F-051 to F-060: Stats, Cost & Controls
- Cost dashboard: tokens used + estimated cost per PRD, per model tier
- Session count chart: sessions per hour over last 24h (bar chart)
- Rate limit events timeline: when they hit and reset
- Feature completion velocity: features/hour trend line
- Global controls: "Restart ACD (10 workers)", "Pause All", "Resume All"
- Per-model usage breakdown: opus vs sonnet vs haiku %
- Live process table: PID, project, model, CPU%, MEM%, elapsed
- Export stats as JSON or CSV
- Queue ETA: estimated time to complete entire remaining queue
- Last updated timestamp and refresh interval indicator
