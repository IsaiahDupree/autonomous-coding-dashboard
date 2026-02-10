# PRD: Meta/Facebook Ads Cross-Product Integration

**Version:** 1.0  
**Date:** February 2026  
**Status:** Draft — Features DISABLED until deployment verified  
**Priority:** P0  
**Applies To:** All ACD targets with user-facing web apps  
**Owner:** WaitlistLab (Meta API Hub) + Growth Data Plane

---

## Executive Summary

Currently, Facebook Ads data flows **into** WaitlistLab (lead capture, insights, autopilot) but does **not** flow back **out** from the broader product ecosystem. When a user clicks an ad, lands on a lead form, and then signs up for SnapMix, SoftwareHub, or any other product — Facebook never learns about that conversion.

This PRD closes **7 critical gaps** so that every product in the platform feeds conversion data back to Meta's algorithm, enabling:
- Better ad optimization (Meta learns which leads convert)
- Cross-product retargeting audiences
- Unified attribution from ad click → lead → signup → purchase
- Centralized insights visible in the ACD dashboard

---

## ⚠️ DEPLOYMENT GATE

**All features in this PRD are DISABLED by default.** Each feature requires:
1. Environment variables configured (Meta tokens, Pixel ID, CAPI token)
2. Supabase shared schema deployed
3. Integration test passing against Meta sandbox
4. Manual enable flag set to `true`

Features that expose data to external APIs (Meta) **MUST NOT** be enabled until:
- Privacy policy updated to disclose data sharing
- CAPI events verified in Meta Events Manager Test Events
- Rate limiting confirmed functional
- PII handling reviewed (hashing, consent)

---

## Gap Analysis

| # | Gap | Impact | Solution |
|---|-----|--------|----------|
| 1 | No unified ingest endpoint for CAPI | Products can't send conversion events to Meta | WaitlistLab `POST /api/v1/meta/event` |
| 2 | No cross-product attribution | Meta can't optimize ads for downstream conversions | Growth Data Plane segment engine → CAPI |
| 3 | Lead form data stays in WaitlistLab | Other products can't access lead context | Shared `person` table in Supabase |
| 4 | Ad performance not in ACD | No visibility into ad ROI from dashboard | ACD backend `/api/meta/insights` endpoint |
| 5 | Pixel/CAPI not on all products | Pageview and event data missing from most apps | GDP client snippet deployed per app |
| 6 | Non-WaitlistLab conversions not reported | Signups, purchases in other apps invisible to Meta | GDP edge function per app |
| 7 | No automated audience sync | Segments can't auto-update Meta Custom Audiences | Segment engine → Custom Audience API |

---

## Feature Specifications

### GAP-001: Unified Meta CAPI Ingest Endpoint

**Location:** WaitlistLab API  
**Endpoint:** `POST /api/v1/meta/event`  
**Status:** 🔴 DISABLED until deployed

#### Purpose
Single API that any product calls to send server-side conversion events to Meta's Conversions API. Handles hashing, deduplication, batching, and rate limiting.

#### Request Schema
```typescript
POST /api/v1/meta/event
Authorization: Bearer <service-api-key>

{
  "event_name": "Purchase",          // Standard Meta event name
  "event_time": 1706745600,          // Unix timestamp
  "event_id": "uuid-for-dedup",      // Matches client pixel event_id
  "event_source_url": "https://softwarehub.io/checkout/success",
  
  "user_data": {
    "email": "user@example.com",     // Will be SHA256 hashed before sending
    "phone": "+1234567890",          // Will be SHA256 hashed
    "first_name": "John",            // Will be SHA256 hashed
    "last_name": "Doe",              // Will be SHA256 hashed
    "fbp": "_fbp cookie value",      // First-party cookie
    "fbc": "_fbc cookie value",      // Click ID cookie
    "client_ip_address": "1.2.3.4",
    "client_user_agent": "Mozilla/5.0...",
    "person_id": "uuid"              // Internal person ID for stitching
  },
  
  "custom_data": {
    "value": 29.99,
    "currency": "USD",
    "content_name": "SoftwareHub Pro Plan",
    "content_category": "subscription",
    "source_product": "softwarehub"   // Which product fired this
  }
}
```

#### Response
```json
{
  "success": true,
  "meta_response": { "events_received": 1, "fbtrace_id": "xxx" },
  "event_id": "uuid-for-dedup",
  "hashed": true
}
```

#### Implementation Details
- **PII Hashing:** All user_data fields SHA256 hashed before Meta API call
- **Deduplication:** `event_id` used for client Pixel ↔ server CAPI dedup
- **Batching:** Events queued and sent in batches of up to 1000 (Meta limit)
- **Rate Limiting:** Max 1000 events/second per Pixel
- **Retry:** Exponential backoff on 5xx errors (3 retries)
- **Logging:** Every event logged to `attribution_events` table
- **Auth:** Service-to-service API key (not user-facing)

#### Enable Flag
```env
META_CAPI_INGEST_ENABLED=false    # Set true only after deployment verified
META_PIXEL_ID=                     # Required
META_CAPI_ACCESS_TOKEN=            # Required
```

---

### GAP-002: Cross-Product Attribution via Segment Engine

**Location:** Growth Data Plane (Supabase Edge Functions)  
**Status:** 🔴 DISABLED until deployed

#### Purpose
When the segment engine evaluates person features and detects a conversion-worthy event from any product, it automatically fires a CAPI event back to Meta.

#### Trigger Events (auto-fire CAPI)

| Event | Source Product | Meta Event Name | Value |
|-------|---------------|-----------------|-------|
| Account created | Any | `Lead` | — |
| Free trial started | Any | `StartTrial` | — |
| Subscription purchased | Any | `Purchase` | plan_price |
| First feature used | Any | `CompleteRegistration` | — |
| Upgrade | Any | `Purchase` | upgrade_price |
| Snap created | SnapMix | `CustomEvent` | — |
| Course enrolled | SoftwareHub | `Subscribe` | — |
| Book published | VelloPad | `CustomEvent` | — |
| Date reserved | VelvetHold | `Schedule` | — |
| Letter sent | SteadyLetters | `Purchase` | letter_cost |

#### Architecture
```
Product App → unified_events table → segment engine cron
                                          │
                                          ▼
                                    person_features
                                          │
                                    evaluate segments
                                          │
                              ┌────────────┼────────────┐
                              ▼            ▼            ▼
                         Resend        Meta CAPI    Custom Audience
                         email         (GAP-001)    (GAP-007)
```

#### Enable Flag
```env
SEGMENT_ENGINE_META_CAPI_ENABLED=false   # Set true after GAP-001 deployed
SEGMENT_ENGINE_CRON_INTERVAL=300         # Seconds between runs
```

---

### GAP-003: Shared Person Table

**Location:** Supabase (shared schema)  
**Status:** 🔴 DISABLED until deployed

#### Purpose
Single `person` table that all products read/write, so lead form data captured by WaitlistLab is accessible to SnapMix, SoftwareHub, etc.

#### Schema
```sql
-- Core person record (source of truth)
CREATE TABLE IF NOT EXISTS shared.person (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  
  -- Attribution (from first touch)
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  meta_fbp TEXT,              -- _fbp cookie
  meta_fbc TEXT,              -- _fbc click ID
  meta_lead_form_id TEXT,     -- Which lead form captured them
  
  -- Status
  source_product TEXT,        -- First product they touched
  lifecycle_stage TEXT DEFAULT 'lead',  -- lead → activated → customer → churned
  
  -- Metadata
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Identity links across systems
CREATE TABLE IF NOT EXISTS shared.identity_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES shared.person(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,     -- 'supabase_auth', 'stripe', 'posthog', 'meta', 'resend'
  external_id TEXT NOT NULL,  -- The ID in that system
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, external_id)
);

-- RLS: service role only (not exposed to client)
ALTER TABLE shared.person ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.identity_link ENABLE ROW LEVEL SECURITY;

-- Only service role can access
CREATE POLICY "service_role_only" ON shared.person
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_only" ON shared.identity_link
  FOR ALL USING (auth.role() = 'service_role');
```

#### WaitlistLab Lead Form → Person Sync
```typescript
// When WaitlistLab captures a lead from Meta Lead Form:
async function syncLeadToPerson(leadData: MetaLeadFormData) {
  const person = await supabase
    .from('shared.person')
    .upsert({
      email: leadData.email,
      first_name: leadData.first_name,
      last_name: leadData.last_name,
      phone: leadData.phone,
      meta_lead_form_id: leadData.form_id,
      meta_fbc: leadData.fbc,
      utm_source: 'meta',
      utm_medium: 'paid',
      utm_campaign: leadData.campaign_name,
      source_product: 'waitlistlab',
    }, { onConflict: 'email' })
    .select()
    .single();
  
  return person;
}
```

#### Enable Flag
```env
SHARED_PERSON_TABLE_ENABLED=false   # Set true after migration applied
```

---

### GAP-004: Ad Performance in ACD Dashboard

**Location:** ACD Backend (`backend/src/index.ts`)  
**Status:** 🔴 DISABLED until deployed

#### Purpose
Surface Meta ad insights (spend, CPC, CTR, conversions) in the ACD dashboard so you can see ROI per project without leaving the dashboard.

#### Endpoints

```typescript
// GET /api/meta/insights
// Returns aggregated ad performance across all campaigns
// Query params: ?date_from=-7d&date_to=today&breakdown=campaign
{
  "success": true,
  "data": {
    "summary": {
      "spend": 1234.56,
      "impressions": 45000,
      "clicks": 890,
      "ctr": 1.98,
      "cpc": 1.39,
      "conversions": 67,
      "costPerConversion": 18.43
    },
    "byProject": [
      {
        "project": "waitlistlab",
        "spend": 800.00,
        "conversions": 45,
        "costPerConversion": 17.78
      },
      {
        "project": "softwarehub",
        "spend": 434.56,
        "conversions": 22,
        "costPerConversion": 19.75
      }
    ],
    "daily": [ ... ]
  }
}

// GET /api/meta/insights/:projectId
// Returns per-project breakdown with ad-level detail

// GET /api/meta/lead-forms
// Returns lead form submissions across all products
```

#### Implementation
- Reads from WaitlistLab's `performance_daily` table (shared Supabase)
- Joins with `shared.person` for cross-product attribution
- Caches results for 15 minutes (Meta data updates ~hourly)

#### Enable Flag
```env
ACD_META_INSIGHTS_ENABLED=false       # Set true after Supabase shared access confirmed
META_INSIGHTS_CACHE_TTL_SEC=900       # 15 min cache
```

---

### GAP-005: Meta Pixel + CAPI Client Snippet

**Location:** Each product's frontend  
**Status:** 🔴 DISABLED until deployed per product

#### Purpose
Drop-in snippet that every product app includes to fire client-side Pixel events AND server-side CAPI events with deduplication.

#### Client Snippet (Next.js)
```typescript
// lib/tracking/meta-pixel.ts
// DISABLED by default — only active when META_PIXEL_ENABLED=true

const META_PIXEL_ENABLED = process.env.NEXT_PUBLIC_META_PIXEL_ENABLED === 'true';
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function initPixel() {
  if (!META_PIXEL_ENABLED || !META_PIXEL_ID) return;
  // Standard Meta Pixel init
  fbq('init', META_PIXEL_ID);
  fbq('track', 'PageView');
}

export async function trackEvent(eventName: string, params: Record<string, any> = {}) {
  if (!META_PIXEL_ENABLED) return;
  
  const eventId = crypto.randomUUID();
  
  // Client-side pixel
  fbq('track', eventName, params, { eventID: eventId });
  
  // Server-side CAPI (dedup via event_id)
  await fetch('/api/tracking/meta-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_name: eventName,
      event_id: eventId,
      event_source_url: window.location.href,
      custom_data: params,
    }),
  });
}
```

#### Server-Side Relay (per product)
```typescript
// app/api/tracking/meta-event/route.ts
// Relays to WaitlistLab's unified CAPI endpoint (GAP-001)

export async function POST(req: Request) {
  if (process.env.META_CAPI_RELAY_ENABLED !== 'true') {
    return Response.json({ disabled: true });
  }
  
  const body = await req.json();
  
  // Forward to WaitlistLab CAPI hub
  const resp = await fetch(`${process.env.WAITLISTLAB_API_URL}/api/v1/meta/event`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WAITLISTLAB_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...body,
      user_data: {
        client_ip_address: req.headers.get('x-forwarded-for'),
        client_user_agent: req.headers.get('user-agent'),
        fbp: req.cookies?.get('_fbp')?.value,
        fbc: req.cookies?.get('_fbc')?.value,
      },
      custom_data: {
        ...body.custom_data,
        source_product: process.env.PRODUCT_ID,
      },
    }),
  });
  
  return Response.json(await resp.json());
}
```

#### Enable Flags (per product)
```env
NEXT_PUBLIC_META_PIXEL_ENABLED=false   # Client pixel
NEXT_PUBLIC_META_PIXEL_ID=             # Pixel ID
META_CAPI_RELAY_ENABLED=false          # Server relay
WAITLISTLAB_API_URL=                   # WaitlistLab base URL
WAITLISTLAB_SERVICE_KEY=               # Service auth key
PRODUCT_ID=snapmix                     # This product's identifier
```

#### Products to Deploy On
| Product | Priority | Key Events |
|---------|----------|------------|
| SnapMix | P1 | Signup, SnapCreated, ProUpgrade |
| SoftwareHub | P1 | Signup, CourseEnroll, Purchase |
| VelvetHold | P2 | Signup, DateReserved, Upgrade |
| SteadyLetters | P2 | Signup, LetterSent, Purchase |
| BlogCanvas | P2 | Signup, PostPublished |
| VelloPad | P3 | Signup, BookPublished |
| GapRadar | P3 | Signup, ReportGenerated |

---

### GAP-006: Non-WaitlistLab Conversion Events

**Location:** Growth Data Plane Edge Functions  
**Status:** 🔴 DISABLED until deployed

#### Purpose
Supabase Edge Function that each product calls when a conversion happens. It normalizes the event, stores it in the unified events table, and triggers CAPI via GAP-001.

#### Edge Function
```typescript
// supabase/functions/track-conversion/index.ts
// DISABLED unless CONVERSION_TRACKING_ENABLED=true

Deno.serve(async (req) => {
  if (Deno.env.get('CONVERSION_TRACKING_ENABLED') !== 'true') {
    return new Response(JSON.stringify({ disabled: true }), { status: 200 });
  }
  
  const { event_name, person_id, product, value, currency, metadata } = await req.json();
  
  // 1. Store in unified events table
  await supabase.from('shared.event').insert({
    person_id,
    product,
    event_name,
    properties: { value, currency, ...metadata },
    source: 'server',
  });
  
  // 2. Look up person for CAPI user_data
  const { data: person } = await supabase
    .from('shared.person')
    .select('email, phone, first_name, last_name, meta_fbp, meta_fbc')
    .eq('id', person_id)
    .single();
  
  // 3. Fire CAPI via GAP-001
  if (person && Deno.env.get('META_CAPI_FORWARD_ENABLED') === 'true') {
    await fetch(`${Deno.env.get('WAITLISTLAB_API_URL')}/api/v1/meta/event`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('WAITLISTLAB_SERVICE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_name,
        event_time: Math.floor(Date.now() / 1000),
        event_id: crypto.randomUUID(),
        user_data: {
          email: person.email,
          phone: person.phone,
          first_name: person.first_name,
          last_name: person.last_name,
          fbp: person.meta_fbp,
          fbc: person.meta_fbc,
          person_id,
        },
        custom_data: { value, currency, source_product: product, ...metadata },
      }),
    });
  }
  
  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
```

#### Enable Flags
```env
CONVERSION_TRACKING_ENABLED=false      # Master switch
META_CAPI_FORWARD_ENABLED=false        # Forward to Meta (requires GAP-001)
```

---

### GAP-007: Automated Custom Audience Sync

**Location:** Growth Data Plane Segment Engine  
**Status:** 🔴 DISABLED until deployed

#### Purpose
When the segment engine computes segment membership, automatically sync members to Meta Custom Audiences for retargeting.

#### Segment → Audience Mapping

| Segment | Meta Custom Audience | Ad Strategy |
|---------|---------------------|-------------|
| `activated_not_paid_day3` | "Activated Free Users" | Conversion campaign |
| `high_intent_pricing_2plus` | "High Intent Visitors" | Urgency ads |
| `paid_high_usage_7d` | "Power Users" | Referral/upsell ads |
| `churned_30d` | "Win-Back Targets" | Re-engagement ads |
| `all_leads` | "All Leads" | Lookalike seed |
| `all_customers` | "All Customers" | Exclusion + lookalike seed |

#### Implementation
```typescript
// Runs after segment engine evaluates membership
async function syncSegmentToCustomAudience(segmentId: string, audienceId: string) {
  if (process.env.META_CUSTOM_AUDIENCE_SYNC_ENABLED !== 'true') return;
  
  const members = await supabase
    .from('shared.segment_member')
    .select('person:shared.person(email, phone, first_name, last_name)')
    .eq('segment_id', segmentId);
  
  // Hash PII per Meta requirements
  const hashedUsers = members.map(m => ({
    email: sha256(m.person.email.toLowerCase().trim()),
    phone: m.person.phone ? sha256(m.person.phone) : undefined,
    fn: m.person.first_name ? sha256(m.person.first_name.toLowerCase().trim()) : undefined,
    ln: m.person.last_name ? sha256(m.person.last_name.toLowerCase().trim()) : undefined,
  }));
  
  // Meta Custom Audience API: replace all users
  await metaPublisher.replaceCustomAudienceUsers(audienceId, hashedUsers);
}
```

#### Enable Flag
```env
META_CUSTOM_AUDIENCE_SYNC_ENABLED=false   # Master switch
META_CUSTOM_AUDIENCE_IDS={}               # JSON map: segmentId → audienceId
```

---

## Deployment Checklist

### Pre-Deploy (ALL must pass before ANY feature is enabled)

- [ ] Privacy policy updated to disclose Meta data sharing
- [ ] User consent mechanism in place (cookie banner / ToS)
- [ ] Meta Business Manager app review approved
- [ ] Supabase `shared` schema migration applied
- [ ] All service API keys generated and stored securely
- [ ] Rate limiting tested (max 1000 events/sec)
- [ ] PII hashing verified (SHA256 before sending to Meta)
- [ ] Test events verified in Meta Events Manager
- [ ] CAPI deduplication confirmed (event_id matching)

### Per-Feature Enable Order

1. **GAP-003** (Shared Person Table) — foundation, no external API calls
2. **GAP-001** (Unified CAPI Endpoint) — WaitlistLab only, internal
3. **GAP-006** (Conversion Edge Function) — connects products to GAP-001
4. **GAP-005** (Pixel + CAPI Snippet) — deploy per product, one at a time
5. **GAP-002** (Segment Engine → CAPI) — automated, needs monitoring
6. **GAP-004** (ACD Insights Dashboard) — read-only, low risk
7. **GAP-007** (Custom Audience Sync) — highest risk, deploy last

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| CAPI event match rate | >70% | Meta Events Manager |
| Cross-product conversion attribution | >50% of conversions have ad click source | Shared events table |
| Ad ROAS improvement | +20% within 30 days of CAPI deploy | Meta Ads Manager |
| Cost per acquisition reduction | -15% from baseline | Meta Ads Manager |
| Lead → Customer attribution | >80% of customers traced to source | Shared person table |
| Dashboard insights latency | <15 min from Meta → ACD | ACD backend cache TTL |

---

## References

- [INTEGRATION_WAITLISTLAB_META.md](./INTEGRATION_WAITLISTLAB_META.md) — Existing Meta integration
- [UNIFIED_PLATFORM_ARCHITECTURE.md](./UNIFIED_PLATFORM_ARCHITECTURE.md) — Platform architecture
- [PRD_GROWTH_DATA_PLANE.md](../harness/prompts/PRD_GROWTH_DATA_PLANE.md) — Growth Data Plane
- [fb-ads-system-concept-extraction.md](./fb-ads-system-concept-extraction.md) — PCT concept
- [Meta Conversions API Docs](https://developers.facebook.com/docs/marketing-api/conversions-api)
- [Meta Custom Audiences API](https://developers.facebook.com/docs/marketing-api/audiences/guides/custom-audiences)
