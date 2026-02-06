# Cross-System Integration - Shared Infrastructure Features

## Project Overview
Build shared infrastructure components that connect all ACD projects: unified authentication, shared database tables, client SDKs for consuming Remotion/WaitlistLab APIs, cross-platform publishing, and unified analytics.

## Reference Documents
- PRD: `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/UNIFIED_PLATFORM_ARCHITECTURE.md`
- Feature List: `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/feature_list_cross_system_integration.json`

## Core Principle: Build Once, Use Everywhere

Every shared component should:
1. Live in ONE project (the owner)
2. Be consumable by ALL projects that need it
3. Have clear API contracts
4. Be versioned for stability

## Feature Categories

### 1. Shared Auth (AUTH-*) - Owner: Portal28
```
┌─────────────────────────────────────────────────────────────┐
│                    SHARED AUTHENTICATION                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Portal28 (Auth Hub)                                         │
│  ├── Supabase auth.users (source of truth)                  │
│  ├── shared_users (profile data)                            │
│  ├── shared_entitlements (product access)                   │
│  └── Stripe customer (payments)                             │
│                                                              │
│  All Products Use:                                           │
│  ├── Same Supabase project                                  │
│  ├── Shared cookie domain                                   │
│  ├── Same Stripe customer ID                                │
│  └── Cross-product SSO                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2. Shared Database (DB-*) - Owner: Portal28
```sql
-- Core shared tables (already defined in architecture doc)

shared_users           -- User profiles
shared_entitlements    -- Product access/plans
shared_assets          -- Creative assets (images, videos, audio)
shared_events          -- Analytics events
```

### 3. Remotion Client SDKs (RC-*) - Owner: Remotion
```typescript
// Shared TypeScript client for all Remotion API consumers

import { RemotionClient } from '@acd/remotion-client';

const client = new RemotionClient({
  apiUrl: process.env.REMOTION_API_URL,
  apiKey: process.env.REMOTION_API_KEY
});

// All consumers use same client:
// - Content Factory (images, videos, before/after)
// - PCT (static ads, mini-VSL)
// - MediaPoster (template videos)
// - WaitlistLab (ad creatives)
```

### 4. Meta API Hub (MH-*) - Owner: WaitlistLab
```typescript
// Shared Meta Marketing API client

import { MetaAPIHub } from '@acd/meta-hub';

const meta = new MetaAPIHub({
  accessToken: process.env.META_ACCESS_TOKEN,
  pixelId: process.env.META_PIXEL_ID
});

// All consumers use same client:
// - PCT (campaigns, ads, insights)
// - Content Factory (ads, pixel events)
// - EverReach (mobile app events)
```

### 5. Publishing (PUB-*) - Multiple Owners
```
Platform Ownership:
├── TikTok → Content Factory (CF-TIKTOK-*)
├── Meta Ads → WaitlistLab (MH-*)
├── Instagram → MediaPoster (PUB-003)
├── YouTube → MediaPoster (PUB-004)
├── X/Twitter → MediaPoster
└── Threads → MediaPoster
```

### 6. Analytics (AN-*) - Owner: Portal28
```typescript
// Shared event tracking

import { trackEvent } from '@acd/analytics';

// Works in any product
trackEvent({
  product: 'content-factory',
  event: 'video_generated',
  properties: {
    duration: 8,
    template: 'before-after',
    awareness_level: 3
  }
});

// Stored in shared_events table
// Queryable across all products
```

### 7. Asset Management (AST-*) - Owner: Remotion
```typescript
// Shared asset storage

import { AssetStore } from '@acd/asset-store';

const assets = new AssetStore({
  bucket: process.env.R2_BUCKET,
  cdnUrl: process.env.CDN_URL
});

// Upload from any product
const url = await assets.upload(buffer, {
  type: 'image',
  source: 'nano-banana',
  userId: user.id
});

// Deduplicated, CDN-delivered, tracked in shared_assets
```

### 8. API Gateway (GW-*) - Owner: Remotion
```typescript
// API key management and rate limiting

// Each consumer gets an API key
// Remotion tracks usage per key
// Rate limits per consumer
// Audit logging
```

## Implementation Priority

### P0: Foundation (Week 1-2)
1. **AUTH-001**: Shared Supabase config
2. **DB-001, DB-002**: shared_users, shared_entitlements tables
3. **STRIPE-001**: Shared Stripe customer
4. **RC-001**: Remotion TypeScript client SDK
5. **MH-001**: WaitlistLab Meta API client library
6. **GW-001, GW-002**: API key management, rate limiting

### P1: Core Integrations (Week 3-4)
7. **RC-002, RC-003**: Content Factory + PCT Remotion integration
8. **MH-002, MH-004**: PCT Meta integration, shared Pixel CAPI
9. **DB-003, DB-004**: shared_assets, shared_events tables
10. **AN-001**: Shared event tracking SDK
11. **AST-001**: Shared asset storage

### P2: Extended Integrations (Week 5-6)
12. **RC-004, RC-005, RC-006**: Mini-VSL, MediaPoster, WaitlistLab Remotion
13. **PUB-001 to PUB-004**: TikTok, Instagram, YouTube publishing
14. **CF-TIKTOK-001 to 003**: TikTok full integration
15. **PCT-WL-001 to 003**: PCT → WaitlistLab full integration

### P3: Polish & Edge Cases (Week 7-8)
16. Remaining auth features (AUTH-003 to 005)
17. Remaining analytics (AN-003 to 006)
18. Cross-product features (GAPRADAR-*, EMAIL-*, MOBILE-*)

## Key Integration Patterns

### Pattern 1: Content Factory → Remotion → WaitlistLab
```
Content Factory
    ↓ calls
Remotion /api/ai/nano-banana
    ↓ returns images
Content Factory
    ↓ calls
Remotion /api/templates/before-after
    ↓ returns video
Content Factory
    ↓ calls
WaitlistLab Meta API Hub
    ↓ creates ad
Meta Ads Manager
```

### Pattern 2: PCT → Remotion → WaitlistLab
```
PCT
    ↓ generates hooks
PCT
    ↓ calls
Remotion /api/render/static
    ↓ returns ad images
PCT
    ↓ calls
WaitlistLab Meta API Hub
    ↓ creates campaign + ads
Meta Ads Manager
    ↓ runs ads
WaitlistLab
    ↓ fetches insights
PCT
    ↓ identifies winners
PCT generates more like winners
```

### Pattern 3: MediaPoster → Remotion → Platforms
```
MediaPoster
    ↓ calls
Remotion /api/render/video
    ↓ returns video
MediaPoster
    ↓ publishes to
Instagram Graph API
YouTube Data API
X API v2
```

## Technical Requirements

### Shared NPM Packages (to create)
```
@acd/remotion-client     - Remotion API client
@acd/meta-hub            - Meta Marketing API client
@acd/analytics           - Shared event tracking
@acd/asset-store         - Shared asset storage
@acd/auth                - Shared auth utilities
```

### Environment Variables (all products)
```bash
# Shared Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...

# Shared Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Remotion API
REMOTION_API_URL=https://remotion.yourapp.com
REMOTION_API_KEY=...

# Meta API (via WaitlistLab)
META_HUB_URL=https://waitlistlab.yourapp.com/api/meta
META_HUB_KEY=...

# Shared Email
RESEND_API_KEY=...

# Shared Storage
R2_BUCKET=acd-assets
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
CDN_URL=https://cdn.yourapp.com
```

## Success Metrics

| Metric | Target |
|--------|--------|
| Shared auth adoption | 100% of products |
| API reuse (vs duplicate code) | >90% |
| Cross-product user tracking | 100% coverage |
| Shared asset deduplication | >50% storage savings |
| API latency (internal calls) | <100ms |

## Instructions for Development

1. **Work on owner project first** - Each feature has a target_project
2. **Create shared packages** - Don't copy code, npm install
3. **API contracts are sacred** - Don't break existing consumers
4. **Version everything** - /v1/ endpoints, semver packages
5. **Test cross-product flows** - Integration tests across projects
6. **Document all APIs** - OpenAPI specs, TypeScript types

## Feature Dependencies

```
AUTH-001 (shared supabase)
    ↓ required by
DB-001, DB-002 (tables)
    ↓ required by
AN-001 (event tracking)
    ↓ enables
AN-002 to AN-006 (analytics features)

RC-001 (remotion client)
    ↓ required by
RC-002 to RC-006 (product integrations)

MH-001 (meta hub)
    ↓ required by
MH-002 to MH-006 (meta features)
PCT-WL-001 to 003 (PCT integration)
```
