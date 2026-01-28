# PRD: Sophisticated User Event Tracking for All Web App Targets

**Status:** Active  
**Created:** 2026-01-25  
**Based On:** BlankLogo PRD-EVENT-TRACKING-ML-SIMULATION.md  
**Applies To:** All web app targets (GapRadar, MediaPoster, CanvasCast, VelloPad, Portal28, BlogCanvas, SteadyLetters, etc.)

---

## Overview

Implement consistent, sophisticated user event tracking across ALL target web applications using the BlankLogo pattern. This enables:

1. **Funnel Optimization** - Track conversion from landing → signup → activation → value → monetization
2. **User Simulation** - Build ML models for purchase/churn prediction
3. **Cross-Project Analytics** - Compare metrics across all targets
4. **Attribution** - Track ad spend ROI with proper UTM/pixel integration

---

## Shared Tracking SDK

Use the ACD shared tracking library:
- **Backend**: `autonomous-coding-dashboard/backend/src/services/userEventTracking.ts`
- **Client SDK**: `autonomous-coding-dashboard/harness/shared/userEventTracker.ts`

Copy the client SDK to each target's `src/lib/tracking/` directory.

---

## Event Categories (Same for ALL Targets)

| Category | Purpose | Example Events |
|----------|---------|----------------|
| **Acquisition** | Where they came from | `landing_view`, `cta_click`, `pricing_view` |
| **Activation** | Did they get to value? | `signup_start`, `login_success`, `activation_complete` |
| **Core Value** | Product usage | `[product]_created`, `[product]_completed`, `[product]_downloaded` |
| **Monetization** | Revenue events | `checkout_started`, `purchase_completed`, `subscription_started` |
| **Retention** | Repeat behavior | `return_session`, `[product]_returning_user` |
| **Reliability** | Errors & performance | `error_shown`, `api_error`, `latency_bucket` |

---

## Target-Specific Core Value Events

### GapRadar
| Event | Description |
|-------|-------------|
| `run_created` | User started a new niche analysis run |
| `run_completed` | Analysis run finished successfully |
| `report_viewed` | User viewed a completed report |
| `report_downloaded` | User downloaded PDF/export |
| `trend_clicked` | User clicked a trending topic |
| `gap_saved` | User saved a gap opportunity |

### MediaPoster
| Event | Description |
|-------|-------------|
| `post_created` | User created a new post |
| `post_scheduled` | Post was scheduled |
| `post_published` | Post was published |
| `media_uploaded` | User uploaded media |
| `template_used` | User applied a template |
| `platform_connected` | User connected a social platform |

### CanvasCast
| Event | Description |
|-------|-------------|
| `project_created` | User started a new video project |
| `prompt_submitted` | User submitted a video prompt |
| `video_generated` | Video generation completed |
| `video_downloaded` | User downloaded the video |
| `script_edited` | User edited the generated script |
| `voice_selected` | User selected a voice option |

### VelloPad
| Event | Description |
|-------|-------------|
| `book_created` | User started a new book |
| `chapter_written` | User completed a chapter |
| `word_count_milestone` | User hit 1k/5k/10k/25k words |
| `pdf_generated` | Print-ready PDF was generated |
| `cover_designed` | User designed a cover |
| `order_placed` | User ordered a physical copy |

### BlogCanvas
| Event | Description |
|-------|-------------|
| `blog_created` | User created a new blog post |
| `blog_generated` | AI generated a blog post |
| `blog_approved` | Client approved a blog post |
| `blog_published` | Blog was published |
| `client_added` | New client was added |
| `brief_submitted` | Content brief was submitted |

### Portal28
| Event | Description |
|-------|-------------|
| `course_created` | User created a new course |
| `lesson_added` | User added a lesson |
| `course_published` | Course was published |
| `enrollment_completed` | Student enrolled in course |
| `lesson_completed` | Student completed a lesson |
| `certificate_issued` | Certificate was generated |

### SteadyLetters
| Event | Description |
|-------|-------------|
| `letter_created` | User created a new letter |
| `letter_rendered` | Letter was rendered to image |
| `letter_sent` | Letter was sent via mail API |
| `font_selected` | User selected a handwriting font |
| `recipient_added` | User added a recipient |
| `campaign_created` | User created a mail campaign |

---

## Required Properties (All Events)

```json
{
  "distinct_id": "anon_xxx",
  "user_id": "usr_xxx",
  "session_id": "sess_xxx",
  "timestamp": "2026-01-25T21:45:00Z",
  "source": "web | server | worker",
  "environment": "development | staging | production",
  
  "utm_source": "string",
  "utm_medium": "string", 
  "utm_campaign": "string",
  "utm_content": "string",
  "fbclid": "string",
  "gclid": "string",
  "referrer": "string",
  
  "device_type": "desktop | tablet | mobile",
  "browser": "string",
  "os": "string",
  "geo_country": "string",
  
  "experiment_variant": "string",
  "feature_flags": "object"
}
```

---

## 4 North Star Milestones (Track for Each Target)

| Milestone | Event | Description |
|-----------|-------|-------------|
| **Activated** | `activation_complete` | Logged in + ready to use product |
| **First Value** | `[product]_completed` | First successful product use |
| **Aha Moment** | `[product]_downloaded` or similar | User experienced core value |
| **Monetized** | `purchase_completed` | User made first purchase |

---

## Implementation Checklist (Per Target)

### 1. Install Tracking SDK
```bash
# Copy from ACD
cp /path/to/acd/harness/shared/userEventTracker.ts src/lib/tracking/
```

### 2. Initialize in App Root
```typescript
// app/layout.tsx or _app.tsx
import { tracker } from '@/lib/tracking/userEventTracker';

if (typeof window !== 'undefined') {
  tracker.init({
    projectId: 'gapradar', // target-specific
    apiEndpoint: process.env.NEXT_PUBLIC_TRACKING_API || 'http://localhost:3001/api/tracking/events',
    debug: process.env.NODE_ENV === 'development',
  });
}
```

### 3. Identify Users on Login
```typescript
// After successful authentication
tracker.identify(user.id, {
  email: user.email,
  plan: user.plan,
  createdAt: user.createdAt,
});
```

### 4. Track Core Value Events
```typescript
// Example: GapRadar run completion
tracker.track('run_completed', {
  runId: run.id,
  niche: run.niche,
  gapsFound: run.gaps.length,
  processingTimeMs: run.duration,
});
```

### 5. Track Conversions
```typescript
// After successful purchase
tracker.trackConversion('purchase', order.amount, {
  orderId: order.id,
  plan: order.plan,
  currency: order.currency,
});
```

---

## Feature List (Add to Each Target's feature_list.json)

```json
[
  {
    "id": "TRACK-001",
    "category": "tracking",
    "name": "Tracking SDK Integration",
    "description": "Install and initialize the user event tracking SDK",
    "passes": false
  },
  {
    "id": "TRACK-002", 
    "category": "tracking",
    "name": "Acquisition Event Tracking",
    "description": "Track landing_view, cta_click, pricing_view with UTM params",
    "passes": false
  },
  {
    "id": "TRACK-003",
    "category": "tracking", 
    "name": "Activation Event Tracking",
    "description": "Track signup_start, login_success, activation_complete",
    "passes": false
  },
  {
    "id": "TRACK-004",
    "category": "tracking",
    "name": "Core Value Event Tracking",
    "description": "Track product-specific value events (created, completed, downloaded)",
    "passes": false
  },
  {
    "id": "TRACK-005",
    "category": "tracking",
    "name": "Monetization Event Tracking", 
    "description": "Track checkout_started, purchase_completed, subscription events",
    "passes": false
  },
  {
    "id": "TRACK-006",
    "category": "tracking",
    "name": "Retention Event Tracking",
    "description": "Track return_session, returning_user product events",
    "passes": false
  },
  {
    "id": "TRACK-007",
    "category": "tracking",
    "name": "Error & Performance Tracking",
    "description": "Track errors, API failures, and Core Web Vitals",
    "passes": false
  },
  {
    "id": "TRACK-008",
    "category": "tracking",
    "name": "User Identification",
    "description": "Identify users on login with traits (email, plan, etc.)",
    "passes": false
  }
]
```

---

## Funnel Definitions (Configure in ACD)

### Standard Funnel (All Targets)
```json
{
  "id": "standard-funnel",
  "name": "Signup to Purchase",
  "steps": [
    { "name": "Landing", "eventName": "$pageview" },
    { "name": "CTA Click", "eventName": "cta_click" },
    { "name": "Signup Start", "eventName": "signup_start" },
    { "name": "Login Success", "eventName": "login_success" },
    { "name": "First Value", "eventName": "*_completed" },
    { "name": "Purchase", "eventName": "purchase_completed" }
  ],
  "windowDays": 30
}
```

---

## Dashboard Metrics (ACD Cross-Project View)

| Metric | Formula |
|--------|---------|
| **Activation Rate** | `login_success / signup_start` |
| **Aha Rate** | `first_value / activation_complete` |
| **Purchase Rate** | `purchase_completed / aha_users` |
| **30-Day Retention** | `return_session / activated_users` |
| **Revenue per Click** | `total_revenue / ad_clicks` |

---

## Priority Order for Implementation

1. **GapRadar** - P1 (currently in development)
2. **MediaPoster** - P1 (has existing analytics needs)
3. **CanvasCast** - P2 (video platform needs conversion tracking)
4. **VelloPad** - P2 (book completion funnel)
5. **BlogCanvas** - P3 (client approval funnel)
6. **Portal28** - P3 (course enrollment funnel)
7. **SteadyLetters** - P3 (letter sending funnel)

---

## Success Criteria

- [ ] All targets have tracking SDK installed
- [ ] All targets track the 4 North Star milestones
- [ ] All targets send events to ACD backend
- [ ] ACD dashboard shows cross-project funnel metrics
- [ ] Each target can view its own funnel analysis
