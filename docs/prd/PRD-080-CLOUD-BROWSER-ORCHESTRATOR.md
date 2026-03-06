# PRD-080: Cloud Browser Orchestrator (Vercel Service)
## Always-on cloud layer that books Safari/Chrome time on the local machine

**Status:** Draft
**Date:** 2026-03-05
**Priority:** P1

---

## 1. What This Is

A **Vercel Next.js service** (`orclit` — orchestrator lite) that runs 24/7 in the cloud and:

1. Reads business goals + current metrics from Supabase
2. Calculates which browser actions are needed to hit targets
3. **Books sessions** in `actp_browser_sessions` (the "reservation" table)
4. The local `browser-session-daemon.js` claims those bookings and executes them
5. Results flow back to Supabase
6. Self-improvement loop updates strategy params after each batch

This is the "scheduling brain" — it runs even when the local machine is off and queues work for when it comes back online.

---

## 2. Architecture

```
CLOUD (Vercel — always on)                    LOCAL (Mac — must be running)
┌─────────────────────────────┐               ┌─────────────────────────────┐
│  orclit Vercel service       │               │  browser-session-daemon.js  │
│                             │               │                             │
│  /api/orchestrate (cron)    │               │  polls every 60s            │
│    ↓ goal gap analysis       │               │  claims sessions            │
│    ↓ books sessions          │──Supabase──→  │  executes Safari/Chrome     │
│                             │               │  posts results back         │
│  /api/improve (cron 6h)     │←──Supabase──  │                             │
│    ↓ reads results           │               │  (instagram, twitter,       │
│    ↓ updates strategy configs│               │   tiktok, threads,          │
│                             │               │   linkedin chrome, upwork)  │
│  /api/health                │               └─────────────────────────────┘
│  /api/sessions/queue        │
│  /api/sessions/book         │
└─────────────────────────────┘
```

---

## 3. Features

### ORC-001 — Vercel Next.js App (`orclit`)
Create `/Users/isaiahdupree/Documents/Software/orclit/`:
- Next.js 14 App Router
- TypeScript
- Deploys to Vercel via `npx vercel --yes --prod`
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in Vercel env vars
- `ANTHROPIC_API_KEY` in Vercel env vars

### ORC-002 — Booking Cron (`/api/orchestrate`)
Runs every 30 min (Vercel cron):
```typescript
// vercel.json crons:
{ "path": "/api/orchestrate", "schedule": "*/30 * * * *" }
```
Logic: PORT the existing `cloud-orchestrator.js` runOrchestratorCycle() to TypeScript route handler.

### ORC-003 — Self-Improvement Cron (`/api/improve`)
Runs every 6h:
```typescript
{ "path": "/api/improve", "schedule": "0 */6 * * *" }
```
Ports `browser-session-daemon.js` runSelfImprovement() logic.

### ORC-004 — Session Queue API (`/api/sessions`)
- `GET /api/sessions/queue` — pending sessions (for dashboard)
- `POST /api/sessions/book` — manual booking (from skills/MCP)
- `GET /api/sessions/results` — last 24h results

### ORC-005 — Dashboard (`/`)
Simple Next.js page showing:
- Goal progress bars (revenue, CRM contacts, sessions today)
- Live session queue table (platform, action, status, scheduled_at)
- Last 10 improvement insights
- Per-platform success rate sparklines

### ORC-006 — Health Check (`/api/health`)
Returns:
```json
{ "status": "ok", "supabase": "connected", "last_booking_cycle": "ISO", "sessions_queued": N }
```

---

## 4. Implementation Steps

1. `npx create-next-app orclit --typescript --app --no-tailwind`
2. Add Supabase client: `npm install @supabase/supabase-js`
3. Add Anthropic SDK: `npm install @anthropic-ai/sdk`
4. Port `runOrchestratorCycle()` to `/api/orchestrate/route.ts`
5. Port `runSelfImprovement()` to `/api/improve/route.ts`
6. Add `vercel.json` with cron config
7. Add `/api/health/route.ts`
8. Add `/api/sessions/route.ts`
9. Build simple dashboard at `/app/page.tsx`
10. Deploy: `npx vercel --yes --prod`
11. Set env vars in Vercel dashboard

---

## 5. Key Files

```
orclit/
  src/app/
    page.tsx                    # Dashboard UI
    api/
      orchestrate/route.ts      # booking cron
      improve/route.ts          # self-improvement cron
      sessions/route.ts         # queue API
      health/route.ts           # health check
  lib/
    supabase.ts                 # Supabase client
    orchestrator.ts             # ported from cloud-orchestrator.js
    improver.ts                 # ported from browser-session-daemon.js
  vercel.json                   # cron config
```

---

## 6. Acceptance Criteria

- [ ] `/api/health` returns 200 with `status: ok` from Vercel
- [ ] Booking cron fires every 30 min and inserts rows into `actp_browser_sessions`
- [ ] Local daemon claims those rows within 60s of `scheduled_at`
- [ ] Self-improvement cron fires every 6h and updates `actp_strategy_configs`
- [ ] Dashboard shows real session queue and goal progress
- [ ] If local machine is off for 4h, bookings queue up and execute when it comes back
