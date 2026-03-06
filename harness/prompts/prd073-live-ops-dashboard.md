# Agent Prompt: Live Ops Dashboard (PRD-073)

## Your mission
Build a Next.js `live-ops-dashboard` service — a real-time Polsia-style operations dashboard showing what the autonomous company system is doing. The `/live` page streams a scrolling activity log. Other pages show queue, agents, engineering, marketing, and metrics.

## Target repo
`/Users/isaiahdupree/Documents/Software/live-ops-dashboard`

Create as a new Next.js 15 project (App Router). Use Tailwind CSS, shadcn/ui, Recharts, Lucide icons.

## Project scaffold
```
app/
  page.tsx              ← redirect to /live
  live/page.tsx         ← real-time activity feed
  queue/page.tsx        ← task queue table
  agents/page.tsx       ← per-agent status cards
  metrics/page.tsx      ← daily summary + charts
  engineering/page.tsx  ← commits + deploys
  marketing/page.tsx    ← campaigns + engagement
api/
  stream/activity/route.ts  ← SSE endpoint (tails orchestrator-activity.jsonl)
  status/route.ts           ← JSON snapshot of all panels
  health/route.ts           ← service health check
components/
  ActivityFeed.tsx      ← auto-scrolling colored feed
  AgentCard.tsx         ← per-agent status card
  MetricsBadge.tsx      ← colored status badge
  SafariGrid.tsx        ← port health grid
lib/
  supabase.ts           ← Supabase client
  files.ts              ← JSONL file reader utilities
```

## Data sources
- `ORCHESTRATOR_LOG` env var → path to `orchestrator-activity.jsonl` (for SSE stream)
- Supabase project `ivhfuhxorppptyuofbgq` → `company_tasks`, `company_campaigns`, `company_post_metrics`
- Safari services health: `http://localhost:{3003,3005,3007,3106}/health`
- ACD status: read `harness/queue-status.json` + `harness/watchdog-heartbeat.json`

## SSE endpoint pattern
```typescript
// app/api/stream/activity/route.ts
export async function GET() {
  const stream = new ReadableStream({ start(controller) {
    const tail = spawn('tail', ['-f', process.env.ORCHESTRATOR_LOG]);
    tail.stdout.on('data', d => controller.enqueue(`data: ${d}\n\n`));
  }});
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' }});
}
```

## Design
- Dark terminal aesthetic: bg-[#0d0d0d], text-gray-100, monospace for activity feed
- Color coding: blue=engineering, green=marketing, yellow=ops, red=error
- Mobile responsive (Tailwind grid)

## PRD
See: `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/prd/PRD-073-LIVE-OPS-DASHBOARD.md`

## Tests
`vitest` unit tests for: SSE stream handler, activity line color classifier, status endpoint response shape, Supabase query builders. Run: `npm test`.
