# WaitlistLab Meta API Integration Plan
# For Programmatic Creative Testing System

**Version:** 1.0  
**Date:** January 2025  
**Status:** Integration Ready  

---

## Executive Summary

WaitlistLab already has a **production-ready Meta Marketing API integration** that can be leveraged for the Programmatic Creative Testing (PCT) system. This document outlines the integration approach and reusable components.

---

## Existing WaitlistLab Components

### 1. MetaPublisher Class (`meta-publisher.ts`)

**Location:** `/WaitlistLabapp/waitlist-lab/src/lib/meta-publisher.ts`

**Capabilities:**
| Feature | Method | Status |
|---------|--------|--------|
| Image Upload | `uploadImage(imageUrl)` | ✅ Ready |
| Video Upload | `uploadVideo(videoUrl, title)` | ✅ Ready |
| Campaign CRUD | `createCampaign()`, `getCampaigns()`, `updateCampaign()` | ✅ Ready |
| Ad Set CRUD | `createAdSet()`, `getAdSets()`, `updateAdSet()` | ✅ Ready |
| Ad Creative | `createAdCreative()`, `createDynamicCreative()` | ✅ Ready |
| Ad CRUD | `createAd()`, `getAds()`, `updateAdStatus()` | ✅ Ready |
| Insights | `getInsights()`, `syncDailyInsights()` | ✅ Ready |
| Conversions API | `sendConversionEvent()` | ✅ Ready |
| Token Verification | `verifyToken()` | ✅ Ready |

**Rate Limiting:** Built-in exponential backoff (5 retries, 1s→60s delay)

### 2. FacebookGraphAPI Class (`facebook.ts`)

**Location:** `/WaitlistLabapp/waitlist-lab/src/lib/facebook.ts`

Simpler wrapper for read operations and metric parsing.

### 3. Database Tables

| Table | Purpose |
|-------|---------|
| `meta_objects` | Tracks created campaigns, ad sets, ads, creatives |
| `performance_daily` | Daily performance metrics per ad |
| `attribution_events` | Conversions API event logging |

### 4. API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/campaigns/*/deploy` | Campaign deployment |
| `GET /api/v1/meta/page-id` | Page ID extraction |
| `POST /api/webhooks/meta` | Webhook handling |

---

## Integration Architecture

### Option A: Direct Import (Recommended for ACD)

```typescript
// Import MetaPublisher from WaitlistLab via npm workspace or monorepo
import { metaPublisher } from '@waitlistlab/meta-publisher';

// Or copy the class to ACD's shared lib
import { metaPublisher } from '@/lib/integrations/meta-publisher';
```

**Pros:**
- Zero duplication
- Shared token management
- Unified database logging

**Cons:**
- Requires monorepo setup or npm workspace

### Option B: Shared Supabase + Separate Instances

```
┌─────────────────────┐     ┌─────────────────────┐
│   ACD Dashboard     │     │    WaitlistLab      │
│  (PCT Module)       │     │   (Existing)        │
├─────────────────────┤     ├─────────────────────┤
│ MetaPublisher Copy  │     │  MetaPublisher      │
└─────────┬───────────┘     └─────────┬───────────┘
          │                           │
          └─────────┬─────────────────┘
                    ▼
        ┌───────────────────────┐
        │   Shared Supabase     │
        │  - meta_objects       │
        │  - performance_daily  │
        │  - pct_* tables       │
        └───────────────────────┘
```

**Pros:**
- Independent deployments
- Shared data via Supabase

**Cons:**
- Code duplication
- Token management in two places

### Option C: WaitlistLab as API Gateway (Best for Microservices)

```
┌─────────────────────┐
│   ACD Dashboard     │
│  (PCT Module)       │
├─────────────────────┤
│  PCT API Calls      │
└─────────┬───────────┘
          │ HTTP
          ▼
┌─────────────────────┐
│   WaitlistLab API   │
│  /api/v1/meta/*     │
├─────────────────────┤
│   MetaPublisher     │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Meta Marketing API │
└─────────────────────┘
```

**Pros:**
- Single Meta token management
- Centralized rate limiting
- WaitlistLab handles Meta complexity

**Cons:**
- Network latency
- WaitlistLab must be running

---

## Recommended Integration: Option B (Shared Supabase)

For the ACD Programmatic Creative Testing module, **Option B** is recommended:

1. **Copy `MetaPublisher` class** to ACD's lib folder
2. **Share Supabase database** for unified data
3. **Use same environment variables** for Meta credentials
4. **Add PCT-specific tables** alongside existing Meta tables

---

## Implementation Steps

### Phase 1: Copy MetaPublisher (Day 1)

```bash
# Copy from WaitlistLab to ACD
cp /WaitlistLabapp/waitlist-lab/src/lib/meta-publisher.ts \
   /autonomous-coding-dashboard/src/lib/integrations/
```

Modifications needed:
- Update import paths
- Connect to ACD's Supabase client
- Add PCT-specific logging

### Phase 2: Environment Setup (Day 1)

Required environment variables (same as WaitlistLab):
```env
META_ACCESS_TOKEN=xxx
META_AD_ACCOUNT_ID=act_xxx
META_PAGE_ID=xxx
META_PIXEL_ID=xxx  # Optional for CAPI
```

### Phase 3: Database Schema (Day 2)

Add PCT tables that reference `meta_objects`:

```sql
-- Link PCT hooks to deployed ads
ALTER TABLE pct_hooks ADD COLUMN IF NOT EXISTS
  meta_ad_id TEXT REFERENCES meta_objects(meta_id);

-- Link PCT templates to creatives
ALTER TABLE pct_templates ADD COLUMN IF NOT EXISTS
  meta_creative_id TEXT REFERENCES meta_objects(meta_id);
```

### Phase 4: PCT Ad Deployment Service (Days 3-5)

```typescript
// src/lib/pct/ad-deployer.ts
import { metaPublisher } from '@/lib/integrations/meta-publisher';

export async function deployHookAsAd(params: {
  hook: PCTHook;
  template: PCTTemplate;
  adSetId: string;
  imageUrl: string;
}) {
  // 1. Upload image
  const { hash } = await metaPublisher.uploadImage(params.imageUrl);
  
  // 2. Create creative with hook text
  const creative = await metaPublisher.createAdCreative({
    name: `PCT-${params.hook.id}`,
    object_story_spec: {
      page_id: process.env.META_PAGE_ID!,
      link_data: {
        message: params.hook.content,
        link: params.template.landing_url,
        image_hash: hash,
        call_to_action: { type: 'LEARN_MORE' },
      },
    },
  });
  
  // 3. Create ad
  const ad = await metaPublisher.createAd({
    adset_id: params.adSetId,
    name: `${params.hook.content.substring(0, 30)}...`,
    creative_id: creative.id,
    status: 'PAUSED',
  });
  
  // 4. Update hook with meta_ad_id
  await supabase
    .from('pct_hooks')
    .update({ meta_ad_id: ad.id })
    .eq('id', params.hook.id);
  
  return ad;
}

export async function deployBatch(hooks: PCTHook[], options: {
  template: PCTTemplate;
  adSetId: string;
  delayMs?: number;  // Default 2000ms between ads
}) {
  const results = [];
  
  for (const hook of hooks) {
    try {
      const ad = await deployHookAsAd({
        hook,
        template: options.template,
        adSetId: options.adSetId,
        imageUrl: options.template.image_url,
      });
      results.push({ success: true, hook, ad });
      
      // Rate limiting delay
      await sleep(options.delayMs || 2000);
    } catch (error) {
      results.push({ success: false, hook, error });
    }
  }
  
  return results;
}
```

### Phase 5: Performance Sync (Days 6-7)

Reuse WaitlistLab's `syncDailyInsights()` method, then correlate with PCT parameters:

```typescript
// src/lib/pct/performance-analyzer.ts
export async function analyzeHookPerformance() {
  // 1. Sync latest insights
  await metaPublisher.syncDailyInsights('last_7d');
  
  // 2. Join performance with PCT parameters
  const { data } = await supabase.rpc('get_hook_performance', {
    date_range: 'last_7d',
  });
  
  // 3. Identify winners
  const winners = data.filter(h => 
    h.ctr > 2.0 && h.cpc < 1.0
  );
  
  return { winners, all: data };
}
```

---

## API Compatibility Notes

### Graph API Version
- WaitlistLab uses: `v21.0`
- Meta docs reference: `v22.0`
- **Recommendation:** Update to `v22.0` when stable

### Required Permissions
Same for both systems:
- `ads_management`
- `ads_read`
- `business_management`

### Rate Limits
Meta's rate limits apply to the entire ad account, so if both WaitlistLab and PCT are active:
- Coordinate deployments
- Use shared queue if possible
- Respect built-in exponential backoff

---

## Alternative: Recreation from Scratch

If you prefer **not** to depend on WaitlistLab:

### Minimal MetaPublisher for PCT

```typescript
// Simplified version with only PCT-needed methods
class PCTMetaPublisher {
  // Keep: uploadImage, createAdCreative, createAd, getInsights
  // Remove: Campaign creation (use existing campaigns)
  // Remove: CAPI (not needed for ad testing)
}
```

### Estimated effort: 2-3 days
- Copy core request/retry logic
- Implement: `uploadImage`, `createAdCreative`, `createAd`
- Implement: `getAds`, `getInsights`
- Skip: Campaign/AdSet creation, CAPI, video upload

---

## Conclusion

**WaitlistLab's Meta integration is production-ready** and can be leveraged immediately. The recommended approach is:

1. ✅ Copy `MetaPublisher` class to ACD
2. ✅ Share Supabase database
3. ✅ Add PCT-specific tables and services
4. ✅ Build deployment queue with rate limiting
5. ✅ Connect performance data to PCT parameters

This approach gets PCT to market fastest while maintaining clean architecture.

---

## References

- WaitlistLab Meta Docs: `/WaitlistLabapp/waitlist-lab/docs/META_ADS_API_INTEGRATION.md`
- Meta Marketing API: https://developers.facebook.com/docs/marketing-api
- PCT PRD: `./PRD-Programmatic-Creative-Testing-EXTENDED.md`
- PCT Feature List: `./feature_list_programmatic_ads.json`
