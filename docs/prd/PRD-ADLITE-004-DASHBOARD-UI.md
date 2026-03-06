# PRD-ADLITE-004: AdLite Dashboard UI

## Overview
Build a real-time dashboard UI within AdLite that shows active deployments, pending action queue, rule engine decisions, spend summaries, and manual controls. The UI lives at the AdLite root (`/`) and replaces or extends the current placeholder `app/page.tsx`.

## Working Directory
`/Users/isaiahdupree/Documents/Software/adlite/`

## Stack
- Next.js App Router (already in use)
- TailwindCSS (already in use)
- Supabase client (`@/lib/supabase`) for real-time data
- shadcn/ui components (install if not present: `npx shadcn@latest init`)
- Lucide icons
- No additional backend routes needed — all data fetches via existing AdLite API routes

---

## Pages / Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `DashboardPage` | Overview: KPI cards + active deployments table |
| `/deployments` | `DeploymentsPage` | Full deployment list + create button |
| `/deployments/[id]` | `DeploymentDetailPage` | Single deployment: metrics, actions, decisions |
| `/actions` | `ActionsPage` | Action queue: pending/running/completed/failed |
| `/decisions` | `DecisionsPage` | Rule engine decisions audit log |
| `/settings` | `SettingsPage` | Threshold config per offer, env check |

---

## Component Breakdown

### `app/page.tsx` — DashboardPage

Sections:
1. **KPI Cards** (top row, 4 cards)
   - Total Active Ads
   - Pending Actions
   - Total Spend (last 7d, USD)
   - Actions Today (pause + scale count)

2. **Active Deployments Table**
   - Columns: Platform | Name | Status | Spend | CTR | ROAS | CPA | Last Action | Actions
   - Row actions: Pause button, Scale (+20%) button, View details link
   - Status badge colors: `active` = green, `paused` = yellow, `killed` = red, `pending` = gray

3. **Pending Actions Queue** (bottom panel, last 10 pending)
   - Columns: Platform | Type | Params preview | Queued at | Attempts

```tsx
// app/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase'
import { KpiCards } from '@/components/dashboard/kpi-cards'
import { DeploymentsTable } from '@/components/dashboard/deployments-table'
import { PendingActionsPanel } from '@/components/dashboard/pending-actions-panel'

export const revalidate = 30  // ISR: refresh every 30s

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()

  const [
    { data: deployments },
    { data: pendingActions },
    { data: recentDecisions },
  ] = await Promise.all([
    supabase.from('actp_ad_deployments')
      .select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('actp_ad_actions')
      .select('*').eq('status', 'pending')
      .order('created_at', { ascending: true }).limit(20),
    supabase.from('actp_meta_decisions')
      .select('*').order('created_at', { ascending: false }).limit(10),
  ])

  const activeCount  = deployments?.filter(d => d.status === 'active').length ?? 0
  const totalSpend   = deployments?.reduce((s, d) => s + (d.spend_cents ?? 0), 0) ?? 0
  const pendingCount = pendingActions?.length ?? 0
  const actionsToday = recentDecisions?.filter(d =>
    new Date(d.created_at) > new Date(Date.now() - 86400000) &&
    d.action !== 'HOLD'
  ).length ?? 0

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">AdLite — Ad Automation</h1>
      <KpiCards
        activeAds={activeCount}
        pendingActions={pendingCount}
        totalSpendCents={totalSpend}
        actionsToday={actionsToday}
      />
      <DeploymentsTable deployments={deployments ?? []} />
      <PendingActionsPanel actions={pendingActions ?? []} />
    </main>
  )
}
```

---

### `components/dashboard/kpi-cards.tsx`

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Clock, DollarSign, Zap } from 'lucide-react'

interface KpiCardsProps {
  activeAds: number
  pendingActions: number
  totalSpendCents: number
  actionsToday: number
}

export function KpiCards({ activeAds, pendingActions, totalSpendCents, actionsToday }: KpiCardsProps) {
  const cards = [
    { title: 'Active Ads',       value: activeAds,                                    icon: Activity,    color: 'text-green-600' },
    { title: 'Pending Actions',  value: pendingActions,                               icon: Clock,       color: 'text-yellow-600' },
    { title: 'Total Spend (7d)', value: `$${(totalSpendCents / 100).toFixed(2)}`,     icon: DollarSign,  color: 'text-blue-600' },
    { title: 'Rule Actions Today', value: actionsToday,                               icon: Zap,         color: 'text-purple-600' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(c => (
        <Card key={c.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
            <c.icon className={`h-4 w-4 ${c.color}`} />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

---

### `components/dashboard/deployments-table.tsx`

```tsx
'use client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const STATUS_COLORS: Record<string, string> = {
  active:    'bg-green-100 text-green-800',
  paused:    'bg-yellow-100 text-yellow-800',
  killed:    'bg-red-100 text-red-800',
  pending:   'bg-gray-100 text-gray-800',
  completed: 'bg-blue-100 text-blue-800',
}

export function DeploymentsTable({ deployments }: { deployments: Record<string, unknown>[] }) {
  const router = useRouter()

  async function handleAction(depId: string, adId: string, actionType: string, adSetId?: string) {
    const params = actionType === 'scale_budget'
      ? { ad_set_id: adSetId, new_daily_budget_cents: 0, reason: 'manual_scale_20pct' }
      : { ad_id: adId, reason: `manual_${actionType}` }

    await fetch('/api/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADLITE_MASTER_KEY ?? ''}` },
      body: JSON.stringify({
        deployment_id: depId,
        platform: 'meta',
        action_type: actionType,
        params,
      }),
    })
    router.refresh()
  }

  if (!deployments.length) {
    return <p className="text-sm text-muted-foreground">No deployments yet.</p>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Spend</TableHead>
            <TableHead className="text-right">CTR</TableHead>
            <TableHead className="text-right">ROAS</TableHead>
            <TableHead className="text-right">CPA</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deployments.map((dep) => {
            const metrics = (dep.metrics as Record<string, number>) ?? {}
            const statusStr = String(dep.status ?? 'pending')
            return (
              <TableRow key={String(dep.id)}>
                <TableCell className="font-medium">
                  <Link href={`/deployments/${dep.id}`} className="hover:underline">
                    {String(dep.ad_name ?? dep.id ?? '—').slice(0, 40)}
                  </Link>
                </TableCell>
                <TableCell className="capitalize">{String(dep.platform ?? '—')}</TableCell>
                <TableCell>
                  <Badge className={STATUS_COLORS[statusStr] ?? 'bg-gray-100 text-gray-800'}>
                    {statusStr}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  ${((Number(dep.spend_cents ?? 0)) / 100).toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {metrics.ctr ? `${(metrics.ctr * 100).toFixed(2)}%` : '—'}
                </TableCell>
                <TableCell className="text-right">
                  {metrics.roas ? metrics.roas.toFixed(2) : '—'}
                </TableCell>
                <TableCell className="text-right">
                  {metrics.cpa ? `$${metrics.cpa.toFixed(2)}` : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {statusStr === 'active' && (
                      <Button size="sm" variant="outline"
                        onClick={() => handleAction(String(dep.id), String(dep.external_ad_id ?? ''), 'pause')}>
                        Pause
                      </Button>
                    )}
                    {statusStr === 'paused' && (
                      <Button size="sm" variant="outline"
                        onClick={() => handleAction(String(dep.id), String(dep.external_ad_id ?? ''), 'resume')}>
                        Resume
                      </Button>
                    )}
                    {statusStr === 'active' && (
                      <Button size="sm" variant="outline"
                        onClick={() => handleAction(String(dep.id), String(dep.external_ad_id ?? ''), 'scale_budget', String(dep.external_adset_id ?? ''))}>
                        +20%
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
```

---

### `components/dashboard/pending-actions-panel.tsx`

```tsx
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const ACTION_COLORS: Record<string, string> = {
  pause:        'bg-red-100 text-red-800',
  resume:       'bg-green-100 text-green-800',
  scale_budget: 'bg-blue-100 text-blue-800',
  deploy:       'bg-purple-100 text-purple-800',
  kill:         'bg-gray-100 text-gray-800',
}

export function PendingActionsPanel({ actions }: { actions: Record<string, unknown>[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pending Action Queue ({actions.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {!actions.length ? (
          <p className="text-sm text-muted-foreground">No pending actions.</p>
        ) : (
          <div className="space-y-2">
            {actions.map(a => {
              const actionType = String(a.action_type ?? '')
              const params = (a.params as Record<string, unknown>) ?? {}
              return (
                <div key={String(a.id)} className="flex items-center justify-between py-1 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge className={ACTION_COLORS[actionType] ?? 'bg-gray-100 text-gray-800'}>
                      {actionType}
                    </Badge>
                    <span className="text-sm text-muted-foreground capitalize">{String(a.platform ?? '')}</span>
                    <span className="text-xs text-muted-foreground">
                      {params.ad_id ? `ad: ${String(params.ad_id).slice(-8)}` :
                       params.ad_set_id ? `adset: ${String(params.ad_set_id).slice(-8)}` : ''}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(String(a.created_at)).toLocaleTimeString()} · attempt {Number(a.attempts ?? 0) + 1}/{Number(a.max_attempts ?? 3)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

---

### `app/decisions/page.tsx` — Decisions Audit Log

```tsx
import { createServerSupabaseClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const revalidate = 60

const ACTION_COLORS: Record<string, string> = {
  PAUSE:      'bg-red-100 text-red-800',
  SCALE:      'bg-blue-100 text-blue-800',
  REACTIVATE: 'bg-green-100 text-green-800',
  HOLD:       'bg-gray-100 text-gray-600',
}

export default async function DecisionsPage() {
  const supabase = createServerSupabaseClient()
  const { data: decisions } = await supabase
    .from('actp_meta_decisions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Rule Engine Decisions</h1>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Ad ID</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">CPC</TableHead>
              <TableHead className="text-right">ROAS</TableHead>
              <TableHead>Dry Run</TableHead>
              <TableHead>AdLite Action</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(decisions ?? []).map(d => {
              const metrics = (d.metrics as Record<string, number>) ?? {}
              return (
                <TableRow key={d.id}>
                  <TableCell>
                    <Badge className={ACTION_COLORS[d.action] ?? 'bg-gray-100 text-gray-600'}>
                      {d.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{String(d.ad_id ?? '').slice(-10)}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate">{d.reason ?? '—'}</TableCell>
                  <TableCell className="text-right text-sm">
                    {metrics.ctr ? `${(metrics.ctr * 100).toFixed(2)}%` : '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {metrics.cpc ? `$${Number(metrics.cpc).toFixed(2)}` : '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {metrics.roas ? Number(metrics.roas).toFixed(2) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={d.dry_run ? 'secondary' : 'default'}>
                      {d.dry_run ? 'dry' : 'live'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {d.adlite_action_id ? String(d.adlite_action_id).slice(-8) : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(d.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </main>
  )
}
```

---

### `app/settings/page.tsx` — Threshold Config

```tsx
import { createServerSupabaseClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const revalidate = 300

export default async function SettingsPage() {
  const supabase = createServerSupabaseClient()
  const { data: thresholds } = await supabase
    .from('actp_meta_thresholds')
    .select('*')
    .order('offer_id')

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Settings — Meta Thresholds</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(thresholds ?? []).map(t => (
          <Card key={t.offer_id}>
            <CardHeader>
              <CardTitle className="text-base">{t.offer_id}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">CTR min</span><span>{(t.ctr_min * 100).toFixed(1)}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">CPC max</span><span>${t.cpc_max}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">ROAS min</span><span>{t.roas_min}x</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">CPA max</span><span>${t.cpa_max}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Scale ROAS</span><span>{t.scale_roas_min}x</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Scale factor</span><span>{t.scale_factor}x (max {t.max_multiplier}x)</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Min impressions</span><span>{t.impressions_min.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Min spend</span><span>${t.spend_min}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Min age</span><span>{t.age_hours_min}h</span></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}
```

---

### `app/layout.tsx` — Nav update

Add sidebar nav links to the existing layout:

```tsx
const NAV_LINKS = [
  { href: '/',            label: 'Dashboard' },
  { href: '/deployments', label: 'Deployments' },
  { href: '/actions',     label: 'Action Queue' },
  { href: '/decisions',   label: 'Decisions' },
  { href: '/settings',    label: 'Settings' },
]
```

---

## `app/api/status/route.ts` — Enrich status endpoint

The existing `/api/status` route should return a summary useful to the dashboard. Update it to return:

```ts
{
  deployments: { total, active, paused, killed, pending },
  actions: { pending, running, completed_today, failed_today },
  decisions: { total_today, pause_today, scale_today, hold_today },
  last_cron_run: { job_type, status, completed_at, duration_ms },
  spend: { total_cents_active }
}
```

---

## Env Vars Needed for UI

Add to `adlite/.env.local`:
```
NEXT_PUBLIC_ADLITE_MASTER_KEY=<same as ADLITE_MASTER_KEY>
```

**Note:** This exposes the key to the browser for the manual Pause/Scale buttons. For production, proxy through a server action instead. The current approach is acceptable for internal use.

---

## Install shadcn/ui components (run once)

```bash
cd /Users/isaiahdupree/Documents/Software/adlite
npx shadcn@latest add card badge button table
```

---

## Acceptance Criteria

- [ ] `/` shows KPI cards + deployments table + pending actions panel
- [ ] Pause / Resume / +20% buttons queue actions via `POST /api/actions`
- [ ] `/decisions` shows rule engine audit log with action badges and metrics
- [ ] `/settings` shows all threshold rows from `actp_meta_thresholds`
- [ ] `/api/status` returns enriched summary with deployment + action + decision counts
- [ ] Nav links present on all pages
- [ ] `npm run build` completes with no type errors
- [ ] Dashboard loads in < 2s (ISR, 30s revalidate on main page)
