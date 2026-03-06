# PRD-073: Live Ops Dashboard (Polsia-style)

## Status: Ready
## Author: Isaiah Dupree
## Created: 2026-03-04
## Priority: P1 — Real-time observability for autonomous system

---

## 1. Problem Statement

When the orchestrator runs autonomously, **there is no real-time window into what it's doing**. Polsia's most compelling feature is https://polsia.com/live — a scrolling log showing every action the autonomous system takes: web searches, Git commits, emails sent, tasks queued. This transparency is both a product demo and an operational tool.

Without a live dashboard, the autonomous system is a black box. Debugging requires tailing log files manually. Users can't verify the system is working without SSH access.

---

## 2. Solution Overview

A **Live Ops Dashboard** — a Next.js web service that reads from the orchestrator's activity log and Supabase, and renders a real-time view of:
- Current active task and which agent is running it
- Scrolling live activity feed (like Polsia's live log)
- Queue depth and pending tasks
- Agent performance metrics (tasks done today, success rate)
- Engineering commits + deploys
- Marketing posts + engagement
- Estimated revenue impact

Accessible at `/live` — shareable link for demos and investor proof-of-work.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────┐
│              LIVE OPS DASHBOARD (Next.js)            │
│                                                      │
│  /live          ← real-time activity stream          │
│  /queue         ← task queue inspector               │
│  /agents        ← per-agent status + metrics         │
│  /engineering   ← recent commits + deploys           │
│  /marketing     ← campaigns + engagement             │
│  /metrics       ← ARR impact, tasks/day, uptime      │
│                                                      │
│  Data sources:                                       │
│  - logs/orchestrator-activity.jsonl (SSE stream)     │
│  - Supabase: company_tasks, company_campaigns        │
│  - ACD queue-status.json + heartbeat                 │
└─────────────────────────────────────────────────────┘
```

---

## 4. Feature List

### Core Pages
- `DASH-001` `/live` page: real-time scrolling activity feed via SSE (Server-Sent Events) from `orchestrator-activity.jsonl`
- `DASH-002` `/queue` page: table of pending/active/completed tasks from `company_tasks` Supabase table
- `DASH-003` `/agents` page: card per agent (engineering, marketing, ops) with status, last action, tasks today
- `DASH-004` `/metrics` page: daily summary — tasks completed, success rate, commits pushed, posts published

### Live Feed
- `DASH-005` SSE endpoint: `GET /api/stream/activity` — tails `orchestrator-activity.jsonl` and pushes new lines as SSE events
- `DASH-006` Activity line renderer: color-coded by agent type (blue=engineering, green=marketing, yellow=ops, red=error)
- `DASH-007` Auto-scroll with pause-on-hover (like a terminal feed)
- `DASH-008` Filter bar: filter live feed by agent type or task status

### Engineering Panel
- `DASH-009` Recent commits widget: last 10 Git commits across all repos (from `engineering-agent.jsonl`)
- `DASH-010` Deploy status widget: live Vercel deployment status per service
- `DASH-011` Test coverage trend: pass count over time from feature list JSONs

### Marketing Panel
- `DASH-012` Recent posts widget: last 10 posts with platform icon, content preview, engagement stats
- `DASH-013` Engagement chart: 7-day chart of likes + views per platform (line chart)
- `DASH-014` Top performer card: best post this week with hook + metrics

### System Health
- `DASH-015` ACD health widget: queue PID alive, heartbeat age, current repo, % complete (from dashboard.js data)
- `DASH-016` Safari services status grid: green/red per port (3003/3005/3007/3106)
- `DASH-017` Uptime counter: orchestrator uptime since last restart

### Ops
- `DASH-018` API: `GET /api/status` returns JSON snapshot of all panels (for programmatic use)
- `DASH-019` Mobile-responsive layout (Tailwind CSS)
- `DASH-020` Dark mode (matches terminal aesthetic)

---

## 5. Success Criteria

- `/live` page loads and shows real activity within 2s of orchestrator writing a log line
- All 4 main pages render without errors when no orchestrator is running (graceful empty states)
- `/api/status` returns valid JSON in < 100ms
- Dashboard is deployable to Vercel with `vercel deploy`

---

## 6. Dependencies

- Orchestrator `logs/orchestrator-activity.jsonl` (produced by PRD-070)
- Supabase `company_tasks` + `company_campaigns` tables
- ACD `harness/acd-dashboard.js` data format (existing)
- Next.js 15+, Tailwind CSS, Recharts (charts)
