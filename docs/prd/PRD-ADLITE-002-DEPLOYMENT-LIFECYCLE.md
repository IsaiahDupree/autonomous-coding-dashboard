# PRD-ADLITE-002: AdLite Deployment Lifecycle Completion

## Overview
Complete the AdLite deployment creation and management lifecycle. Currently `GET /api/deployments` exists but there is no `POST` to create a deployment, no single-record `GET /api/deployments/[id]`, and the `actp_ad_deployments` table schema is assumed but not verified. This PRD fills those gaps so the full loop — create → deploy → monitor → pause/scale/kill — is self-contained in AdLite.

## Working Directory
`/Users/isaiahdupree/Documents/Software/adlite/`

## Problem Statement
- `POST /api/deployments` does not exist — no way to register a new ad deployment via API
- `GET /api/deployments/[id]` does not exist — can't fetch a single deployment's state
- `PUT /api/deployments/[id]` does not exist — can't manually update status
- `actp_ad_deployments` table shape is inferred from `actions.ts` but not documented
- No Supabase migration file for AdLite tables exists in the repo
- `creative_id` is required on `POST /api/actions` but rule-engine–originated actions don't have one (see PRD-ADLITE-001)

## Files to Create / Modify

---

### 1. New: `app/api/deployments/[id]/route.ts`

```ts
import { NextRequest } from 'next/server'
import { requireAuth, ok, err } from '@/lib/api-helpers'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.response!

  try {
    const { data, error } = await supabaseAdmin
      .from('actp_ad_deployments')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) return err(error.message, 'db_error', error.code === 'PGRST116' ? 404 : 500)
    return ok({ deployment: data })
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Internal error', 'internal_error', 500)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.response!

  try {
    const body = await req.json() as {
      status?: string
      spend_cents?: number
      metrics?: Record<string, unknown>
      ended_at?: string
      notes?: string
    }

    const validStatuses = ['pending', 'active', 'paused', 'killed', 'completed']
    if (body.status && !validStatuses.includes(body.status)) {
      return err(`status must be one of: ${validStatuses.join(', ')}`, 'validation_error', 400)
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.status !== undefined)      updates.status = body.status
    if (body.spend_cents !== undefined) updates.spend_cents = body.spend_cents
    if (body.metrics !== undefined)     updates.metrics = body.metrics
    if (body.ended_at !== undefined)    updates.ended_at = body.ended_at
    if (body.notes !== undefined)       updates.notes = body.notes

    const { data, error } = await supabaseAdmin
      .from('actp_ad_deployments')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (error) return err(error.message, 'db_error', 500)
    return ok({ deployment: data })
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Internal error', 'internal_error', 500)
  }
}
```

---

### 2. Modify: `app/api/deployments/route.ts` — add POST

Add a `POST` export to the existing file:

```ts
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.response!

  try {
    const body = await req.json() as {
      platform: string
      creative_id?: string
      campaign_id?: string
      ad_set_name?: string
      ad_name?: string
      daily_budget_cents?: number
      total_budget_cents?: number
      targeting?: Record<string, unknown>
      destination_url?: string
      headline?: string
      description?: string
      call_to_action?: string
      image_url?: string
      video_url?: string
      offer_id?: string
      icp_id?: string
      notes?: string
    }

    if (!body.platform) return err('platform is required', 'validation_error', 400)
    const validPlatforms = ['meta', 'tiktok_ads']
    if (!validPlatforms.includes(body.platform)) {
      return err(`platform must be one of: ${validPlatforms.join(', ')}`, 'validation_error', 400)
    }

    const { data, error } = await supabaseAdmin
      .from('actp_ad_deployments')
      .insert({
        platform: body.platform,
        creative_id: body.creative_id ?? null,
        campaign_id: body.campaign_id ?? null,
        ad_set_name: body.ad_set_name ?? null,
        ad_name: body.ad_name ?? null,
        daily_budget_cents: body.daily_budget_cents ?? 0,
        total_budget_cents: body.total_budget_cents ?? 0,
        targeting: body.targeting ?? {},
        destination_url: body.destination_url ?? null,
        headline: body.headline ?? null,
        description: body.description ?? null,
        call_to_action: body.call_to_action ?? 'LEARN_MORE',
        image_url: body.image_url ?? null,
        video_url: body.video_url ?? null,
        offer_id: body.offer_id ?? null,
        icp_id: body.icp_id ?? null,
        notes: body.notes ?? null,
        status: 'pending',
        spend_cents: 0,
      })
      .select()
      .single()

    if (error) return err(error.message, 'db_error', 500)
    return ok({ deployment: data }, 201)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Internal error', 'internal_error', 500)
  }
}
```

---

### 3. Modify: `app/api/actions/route.ts` — make `creative_id` optional

Change the validation block (around line 52) from:
```ts
if (!body.creative_id) return err('creative_id is required', 'validation_error', 400)
```
To remove that line entirely and update the insert to allow null:
```ts
creative_id: body.creative_id ?? null,
```

---

### 4. New: `supabase/migrations/001_adlite_tables.sql`

Create this file to document and ensure AdLite's Supabase schema (apply to project `ivhfuhxorppptyuofbgq`):

```sql
-- AdLite core tables
-- Project: ivhfuhxorppptyuofbgq

CREATE TABLE IF NOT EXISTS actp_ad_deployments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform            text NOT NULL,                            -- 'meta' | 'tiktok_ads'
  status              text NOT NULL DEFAULT 'pending',          -- pending|active|paused|killed|completed
  creative_id         text,
  campaign_id         text,
  external_ad_id      text,                                     -- Meta ad_id or TikTok ad_id after deploy
  external_adset_id   text,
  ad_set_name         text,
  ad_name             text,
  headline            text,
  description         text,
  call_to_action      text DEFAULT 'LEARN_MORE',
  destination_url     text,
  image_url           text,
  video_url           text,
  daily_budget_cents  integer DEFAULT 0,
  total_budget_cents  integer DEFAULT 0,
  spend_cents         integer DEFAULT 0,
  targeting           jsonb DEFAULT '{}',
  metrics             jsonb DEFAULT '{}',
  offer_id            text,
  icp_id              text,
  notes               text,
  deployed_at         timestamptz,
  ended_at            timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_deployments_platform ON actp_ad_deployments(platform);
CREATE INDEX IF NOT EXISTS idx_ad_deployments_status   ON actp_ad_deployments(status);
CREATE INDEX IF NOT EXISTS idx_ad_deployments_offer_id ON actp_ad_deployments(offer_id);

CREATE TABLE IF NOT EXISTS actp_ad_actions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id  uuid REFERENCES actp_ad_deployments(id) ON DELETE SET NULL,
  creative_id    text,
  campaign_id    text,
  platform       text NOT NULL,
  action_type    text NOT NULL,   -- deploy|pause|resume|scale_budget|kill
  status         text NOT NULL DEFAULT 'pending',
  params         jsonb DEFAULT '{}',
  result         jsonb,
  error          text,
  attempts       integer DEFAULT 0,
  max_attempts   integer DEFAULT 3,
  completed_at   timestamptz,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_actions_status      ON actp_ad_actions(status);
CREATE INDEX IF NOT EXISTS idx_ad_actions_platform    ON actp_ad_actions(platform);
CREATE INDEX IF NOT EXISTS idx_ad_actions_deployment  ON actp_ad_actions(deployment_id);
CREATE INDEX IF NOT EXISTS idx_ad_actions_created     ON actp_ad_actions(created_at);

CREATE TABLE IF NOT EXISTS actp_budget_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id   uuid REFERENCES actp_ad_deployments(id) ON DELETE CASCADE,
  rule_type       text NOT NULL,   -- performance_pause|performance_scale|daily_cap|total_cap|fatigue
  conditions      jsonb DEFAULT '{}',
  action          jsonb DEFAULT '{}',
  enabled         boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_rules_deployment ON actp_budget_rules(deployment_id);
CREATE INDEX IF NOT EXISTS idx_budget_rules_enabled    ON actp_budget_rules(enabled);

-- Meta rule engine tables
CREATE TABLE IF NOT EXISTS actp_meta_thresholds (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id          text UNIQUE NOT NULL,
  ctr_min           numeric DEFAULT 0.005,
  cpc_max           numeric DEFAULT 12.0,
  roas_min          numeric DEFAULT 1.5,
  cpa_max           numeric DEFAULT 600.0,
  scale_roas_min    numeric DEFAULT 3.0,
  scale_factor      numeric DEFAULT 1.2,
  max_multiplier    numeric DEFAULT 2.0,
  impressions_min   integer DEFAULT 1000,
  spend_min         numeric DEFAULT 20.0,
  age_hours_min     numeric DEFAULT 48.0,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS actp_meta_performance_snapshots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id        text NOT NULL,
  adset_id     text,
  campaign_id  text,
  impressions  integer DEFAULT 0,
  clicks       integer DEFAULT 0,
  spend        numeric DEFAULT 0,
  ctr          numeric DEFAULT 0,
  cpc          numeric DEFAULT 0,
  roas         numeric DEFAULT 0,
  cpa          numeric DEFAULT 0,
  conversions  integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meta_snapshots_ad_id     ON actp_meta_performance_snapshots(ad_id);
CREATE INDEX IF NOT EXISTS idx_meta_snapshots_created   ON actp_meta_performance_snapshots(created_at);

CREATE TABLE IF NOT EXISTS actp_meta_decisions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id             text NOT NULL,
  adset_id          text,
  campaign_id       text,
  action            text NOT NULL,   -- PAUSE|SCALE|REACTIVATE|HOLD
  reason            text,
  metrics           jsonb DEFAULT '{}',
  threshold_used    text DEFAULT 'default',
  dry_run           boolean DEFAULT true,
  adlite_action_id  text,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meta_decisions_ad_id    ON actp_meta_decisions(ad_id);
CREATE INDEX IF NOT EXISTS idx_meta_decisions_action   ON actp_meta_decisions(action);
CREATE INDEX IF NOT EXISTS idx_meta_decisions_created  ON actp_meta_decisions(created_at);
```

---

## Seed Default Thresholds (run once)

```sql
INSERT INTO actp_meta_thresholds (offer_id, ctr_min, cpc_max, roas_min, cpa_max, scale_roas_min)
VALUES
  ('offer-001', 0.005, 12.0, 1.5, 600.0, 3.0),
  ('offer-002', 0.010, 5.0,  2.0, 300.0, 4.0),
  ('default',   0.008, 8.0,  2.0, 300.0, 3.5)
ON CONFLICT (offer_id) DO NOTHING;
```

---

## API Reference (complete after this PRD)

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/health` | Service health |
| GET    | `/api/status` | Live deployment counts + recent actions |
| GET    | `/api/deployments` | List deployments (filterable by status, platform) |
| **POST** | `/api/deployments` | **NEW** — Create deployment record |
| **GET** | `/api/deployments/[id]` | **NEW** — Single deployment |
| **PATCH** | `/api/deployments/[id]` | **NEW** — Update status/metrics |
| GET    | `/api/actions` | List actions |
| POST   | `/api/actions` | Queue action (creative_id now optional) |
| GET    | `/api/runs` | List cron run history |
| POST   | `/api/cron/process-actions` | Execute pending actions (cron, every 5min) |
| POST   | `/api/cron/performance-check` | Score ads + queue pause/scale (cron, 8/14/20 UTC) |
| POST   | `/api/cron/budget-pacing` | Check 90% daily cap (cron, hourly) |
| POST   | `/api/cron/spend-caps` | Check total cap (cron, every 10min) |
| POST   | `/api/cron/fatigue-check` | Check ad fatigue (cron, every 6h) |
| GET/POST | `/api/graduation` | Graduation logic for graduating organic → paid |

---

## Acceptance Criteria

- [ ] `POST /api/deployments` creates a row in `actp_ad_deployments` with status `pending`
- [ ] `GET /api/deployments/[id]` returns a single deployment or 404
- [ ] `PATCH /api/deployments/[id]` updates status, spend, metrics
- [ ] `POST /api/actions` succeeds with `creative_id` omitted (null stored)
- [ ] `supabase/migrations/001_adlite_tables.sql` exists and matches current live schema
- [ ] All existing tests still pass after `creative_id` change
