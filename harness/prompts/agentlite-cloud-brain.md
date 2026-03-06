# AgentLite — Cloud Brain: 24/7 Orchestrator That Books Local Safari/Chrome Time

## Context

Isaiah Dupree's business goal: $5K/month from AI automation consulting.
ICP: software founders $500K–$5M ARR needing AI automation.
Offers: AI Automation Audit+Build ($2,500), Social Growth System ($500/mo), ACTP Setup ($1,500).

The local Mac runs Safari automation agents (ports 3100–3107) and a Telegram-connected ig-daemon.
The cloud orchestrator needs to:
1. Decide WHAT to do next based on business metrics and goals
2. BOOK time slots on the local machine by writing to `safari_command_queue` (Supabase) with `scheduled_for` timestamps
3. Read results from completed rows and update business metrics
4. Self-schedule: avoid double-booking, respect 9am–9pm active hours, respect daily rate limits

This is the "cloud brain" that tells the local machine what to do, when.

**Stack**: Next.js 16 App Router, TypeScript, TailwindCSS, Vercel crons
**Project path**: `/Users/isaiahdupree/Documents/Software/agentlite`
**Supabase project**: `ivhfuhxorppptyuofbgq` (shared with all services)

## What to Build

### 1. Project Scaffold

```
agentlite/
  package.json
  tsconfig.json
  vercel.json           (crons + function config)
  next.config.ts
  tailwind.config.ts
  app/
    layout.tsx          (dark terminal theme: #0d0d0d bg, #22c55e green, mono font)
    page.tsx            (dashboard: next 10 bookings + last 10 results)
    api/
      health/route.ts
      cron/orchestrate/route.ts    (Vercel cron every 15min)
      cron/process-results/route.ts (Vercel cron every 5min)
      book/route.ts                (POST — manually book an action)
      schedule/route.ts            (GET — view upcoming bookings)
      metrics/route.ts             (GET — business metrics snapshot)
  lib/
    supabase.ts         (supabaseAdmin using service role key)
    goals.ts            (read business-goals from Supabase or fallback JSON)
    decision-engine.ts  (decide next action from metrics + goals)
    booking.ts          (write to safari_command_queue with scheduling logic)
    api-helpers.ts      (requireCronAuth, ok, err helpers)
```

### 2. Supabase Schema (new tables — apply on first run)

```sql
-- Track all orchestrator decisions and their outcomes
CREATE TABLE IF NOT EXISTS agent_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL,        -- prospect_discover, dm_batch, upwork_scan, profile_enrich
  platform TEXT NOT NULL DEFAULT 'instagram',
  params JSONB NOT NULL DEFAULT '{}',
  scheduled_for TIMESTAMPTZ NOT NULL,
  safari_queue_id UUID,             -- FK to safari_command_queue row
  status TEXT NOT NULL DEFAULT 'scheduled',  -- scheduled, executing, completed, failed, cancelled
  result JSONB,
  decision_reason TEXT,             -- why orchestrator chose this action
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Business metrics snapshots (one row per metric per day)
CREATE TABLE IF NOT EXISTS agent_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,        -- prospects_discovered, dms_sent, reply_rate, pipeline_status_count
  metric_value NUMERIC NOT NULL,
  platform TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);
```

Run these idempotently from `lib/supabase.ts` on server startup.

### 3. Decision Engine (`lib/decision-engine.ts`)

The core logic: given current metrics and business goals, decide what action to book next.

```typescript
interface Decision {
  action: 'prospect_discover' | 'dm_batch' | 'upwork_scan' | 'profile_enrich' | 'none'
  platform: 'instagram' | 'tiktok' | 'twitter' | 'upwork'
  params: Record<string, unknown>
  reason: string
  priority: number  // 1=urgent, 2=normal, 3=low
}

async function decideNextAction(metrics: MetricsSnapshot): Promise<Decision>
```

Decision rules (evaluate in order, return first match):

1. **Prospect funnel low** — `suggested_actions WHERE status='suggested'` count < 20
   → `prospect_discover` on instagram, keywords=['buildinpublic', 'saasfounder', 'aiautomation']
   → reason: "Prospect funnel below 20 — running discovery"

2. **DM queue empty** — `crm_message_queue WHERE status='pending'` count < 5
   → `dm_batch` on instagram, limit=10
   → reason: "DM queue below 5 — scheduling next batch"

3. **Upwork not scanned today** — no `agent_bookings` with action_type='upwork_scan' completed today
   → `upwork_scan` on upwork
   → reason: "Daily Upwork scan not done"

4. **Morning discovery** — current hour is 8-9am and no prospect_discover today
   → `prospect_discover` with all sources: hashtag + top_accounts + followers
   → reason: "Morning discovery sweep"

5. **Profile enrich stale** — `crm_contacts WHERE last_enriched_at < now() - interval '7 days'` count > 10
   → `profile_enrich` on instagram, limit=20
   → reason: "Stale profiles need enrichment"

6. **Default** → `none`, reason: "Queue healthy, no action needed"

### 4. Booking Logic (`lib/booking.ts`)

```typescript
async function bookAction(decision: Decision): Promise<{ bookingId: string, scheduledFor: Date }>
```

Steps:
1. Find the next available slot (no other `agent_bookings` within 15 minutes of the proposed time)
2. Respect active hours: only schedule between 9am–9pm in America/Chicago timezone
3. If outside active hours, schedule for next 9am
4. Insert into `safari_command_queue`:
   ```json
   {
     "platform": "instagram",
     "action": "prospect_discover",
     "params": { "sources": ["hashtag"], "keywords": [...], "maxProspects": 30 },
     "status": "pending",
     "priority": 1,
     "scheduled_for": "<ISO timestamp>"
   }
   ```
5. Insert into `agent_bookings` with `safari_queue_id` = inserted row ID
6. Return booking ID + scheduled time

### 5. Result Processor (`api/cron/process-results/route.ts`)

Runs every 5 minutes. Reads completed `safari_command_queue` rows and records metrics:

```typescript
// Find completed rows not yet processed
const { data: completed } = await supabase
  .from('safari_command_queue')
  .select('*')
  .eq('status', 'completed')
  .is('processed_at', null)  // add this column to safari_command_queue if missing
  .gte('updated_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
  .limit(50)

for (const row of completed) {
  // Parse result and record metric
  const result = row.result as Record<string, unknown>

  if (row.action === 'prospect_discover') {
    await recordMetric('prospects_discovered', result.discovered ?? 0, row.platform)
  } else if (row.action === 'dm_batch') {
    await recordMetric('dms_scheduled', result.scheduled ?? 0, row.platform)
  }

  // Update agent_bookings status
  await supabase.from('agent_bookings')
    .update({ status: 'completed', result, completed_at: new Date().toISOString() })
    .eq('safari_queue_id', row.id)

  // Mark as processed
  await supabase.from('safari_command_queue')
    .update({ processed_at: new Date().toISOString() })
    .eq('id', row.id)
}
```

### 6. Main Orchestrate Cron (`api/cron/orchestrate/route.ts`)

Runs every 15 minutes via Vercel cron.

```typescript
export async function POST(req: NextRequest) {
  const auth = requireCronAuth(req)
  if (!auth.authorized) return auth.response!

  // 1. Snapshot current metrics
  const metrics = await snapshotMetrics()

  // 2. Check for already-pending bookings in next 30 min
  const upcoming = await getUpcomingBookings(30)
  if (upcoming.length >= 2) {
    return ok({ status: 'skip', reason: 'Queue full', upcoming: upcoming.length })
  }

  // 3. Decide next action
  const decision = await decideNextAction(metrics)
  if (decision.action === 'none') {
    return ok({ status: 'idle', reason: decision.reason, metrics })
  }

  // 4. Book it
  const booking = await bookAction(decision)

  // 5. Log to agent_metrics
  await recordMetric('orchestrator_decisions', 1, decision.platform, {
    action: decision.action, reason: decision.reason
  })

  return ok({ status: 'booked', booking, decision, metrics })
}
```

### 7. Manual Booking Endpoint (`api/book/route.ts`)

```typescript
POST /api/book
body: {
  action: 'prospect_discover' | 'dm_batch' | 'upwork_scan' | 'profile_enrich'
  platform?: string
  params?: Record<string, unknown>
  scheduled_for?: string  // ISO — if omitted, book for next available slot
}
response: { bookingId, scheduledFor, queueId }
```

### 8. Schedule View (`api/schedule/route.ts`)

```typescript
GET /api/schedule?hours=24
response: {
  upcoming: Array<{ id, action_type, platform, scheduled_for, status, decision_reason }>
  counts: { scheduled, executing, completed_today, failed_today }
}
```

### 9. Metrics Snapshot (`api/metrics/route.ts`)

```typescript
GET /api/metrics
response: {
  prospects_in_funnel: number,  // suggested_actions WHERE status='suggested'
  dms_pending: number,          // crm_message_queue WHERE status='pending'
  dms_sent_today: number,       // crm_message_queue WHERE status='sent' AND updated_at >= today
  upwork_proposals_pending: number,
  reply_rate_7d: number,        // % of sent DMs that got replies in last 7 days (from crm_contacts)
  contacts_total: number,
  last_discovery_at: string | null
}
```

### 10. Dashboard UI (`app/page.tsx`)

Dark terminal dashboard (same aesthetic as ACD live dashboard):
- **Top bar**: 4 stat cards — prospects in funnel, DMs pending, reply rate 7d, proposals pending
- **Left panel**: "Upcoming Bookings" — next 10 scheduled actions with time, type, platform, reason
- **Right panel**: "Recent Results" — last 10 completed actions with outcome
- **Bottom**: "Metrics Trend" — sparkline charts for prospects_discovered and dms_sent (last 7 days)
- Auto-refresh every 30 seconds via `setInterval + fetch(/api/metrics)`

### 11. `vercel.json`

```json
{
  "crons": [
    { "path": "/api/cron/orchestrate", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/process-results", "schedule": "*/5 * * * *" }
  ],
  "functions": {
    "app/api/**/*.ts": { "maxDuration": 60 }
  }
}
```

### 12. Environment Variables

```
SUPABASE_URL=https://ivhfuhxorppptyuofbgq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<from env>
CRON_SECRET=<random 32-char string>
NEXT_PUBLIC_SUPABASE_URL=https://ivhfuhxorppptyuofbgq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from env>
```

## Acceptance Criteria

- `GET /api/health` returns `{ status: 'ok', service: 'agentlite' }`
- `GET /api/metrics` returns correct counts from Supabase (all fields numeric, no nulls crashing)
- `GET /api/schedule?hours=24` returns `{ upcoming: [], counts: { scheduled: 0, ... } }` shape
- `POST /api/book` with `action=prospect_discover` inserts into both `safari_command_queue` AND `agent_bookings`
- `POST /api/cron/orchestrate` with correct `Authorization: Bearer <CRON_SECRET>` makes a decision and returns `{ status: 'booked' | 'idle' | 'skip' }`
- `POST /api/cron/process-results` reads completed queue rows and updates `agent_bookings` status
- Dashboard page renders without error: 4 stat cards + upcoming + recent results visible
- `npm run build` passes with no TypeScript errors
- Deploy: `npx vercel --yes --prod` succeeds and `https://<agentlite-url>/api/health` returns 200

## Rules

- No mock data — all API routes query real Supabase
- Follow publishlite's cron route pattern: `requireCronAuth`, `ok()`, `err()` helpers
- Theme: always-dark — bg #0d0d0d, green #22c55e, monospace font (Geist Mono)
- `safari_command_queue` action values must match what ig-daemon handles: `prospect_discover`, `dm_batch`, `upwork_scan`, `profile_enrich`
- All Supabase queries use `supabaseAdmin` (service role) not anon key
- Active hours timezone: America/Chicago
- Commit and push to GitHub after build passes
- Deploy to Vercel with `npx vercel --yes --prod`
