# User Event Tracking System - Architecture Documentation

**Status:** Active
**Last Updated:** 2026-03-07
**Applies To:** All web app targets (MediaPoster, CanvasCast, VelloPad, BlogCanvas, Portal28, and future apps)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [SDK Components](#sdk-components)
4. [Event Categories](#event-categories)
5. [Implementation Guide](#implementation-guide)
6. [Target-Specific Events](#target-specific-events)
7. [Funnel Analysis](#funnel-analysis)
8. [Dashboard Metrics](#dashboard-metrics)

---

## Overview

The User Event Tracking System provides sophisticated, consistent event tracking across all target web applications. It enables:

- **Funnel Optimization** - Track conversion from landing → signup → activation → value → monetization
- **User Simulation** - Build ML models for purchase/churn prediction
- **Cross-Project Analytics** - Compare metrics across all targets
- **Attribution** - Track ad spend ROI with proper UTM/pixel integration
- **Performance Monitoring** - Track Core Web Vitals (LCP, FID, CLS, TTFB, FCP)
- **Error Tracking** - Capture and analyze client-side errors
- **Session Analysis** - Track user sessions, scroll depth, and engagement

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Target Web Apps                          │
│  (MediaPoster, CanvasCast, VelloPad, BlogCanvas, Portal28)  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Client SDK (userEventTracker.ts)                     │  │
│  │  - Auto-tracking (clicks, scrolls, errors, perf)      │  │
│  │  - Manual event tracking                              │  │
│  │  - Session management                                 │  │
│  │  - User identification                                │  │
│  └────────────────┬──────────────────────────────────────┘  │
└────────────────────┼────────────────────────────────────────┘
                     │ HTTP POST (batched)
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              ACD Backend (:3001/api/tracking/events)        │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Tracking Service (userEventTracking.ts)              │  │
│  │  - Event ingestion                                    │  │
│  │  - Funnel analysis                                    │  │
│  │  - Retention analysis                                 │  │
│  │  - Statistics & export                                │  │
│  └────────────────┬──────────────────────────────────────┘  │
└────────────────────┼────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 Data Storage Layer                          │
│  - Event store (in-memory / database)                       │
│  - Session data                                             │
│  - User profiles                                            │
│  - Funnel definitions                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## SDK Components

### 1. Client SDK (`harness/shared/userEventTracker.ts`)

**Purpose:** Lightweight client-side tracking library for web applications.

**Features:**
- ✅ Auto-tracking (page views, clicks, forms, scrolls, errors, performance, outbound links)
- ✅ Manual event tracking with custom properties
- ✅ User identification and session management
- ✅ UTM parameter capture and attribution
- ✅ Device/browser/OS detection
- ✅ Privacy-friendly (respects Do Not Track)
- ✅ Batched event sending for performance
- ✅ Core Web Vitals tracking (LCP, FID, CLS, TTFB, FCP)
- ✅ Cookie and localStorage support
- ✅ SPA-friendly (tracks route changes)

**File Size:** ~760 lines, ~25KB uncompressed

**Dependencies:** None (vanilla TypeScript)

### 2. Backend Service (`backend/src/services/userEventTracking.ts`)

**Purpose:** Server-side event processing, storage, and analysis.

**Features:**
- ✅ Event ingestion and storage
- ✅ Funnel analysis with conversion rates
- ✅ Retention analysis (cohort-based)
- ✅ Session management
- ✅ User identity management (alias support)
- ✅ Event querying and filtering
- ✅ Statistics and reporting
- ✅ CSV/JSON export

**File Size:** ~1036 lines, ~35KB

**Dependencies:** Node.js EventEmitter (built-in)

---

## Event Categories

All targets track events across 6 standard categories:

| Category | Purpose | Example Events |
|----------|---------|----------------|
| **Acquisition** | Where users came from | `landing_view`, `cta_click`, `pricing_view` |
| **Activation** | Did they get to value? | `signup_start`, `login_success`, `activation_complete` |
| **Core Value** | Product usage | `[product]_created`, `[product]_completed`, `[product]_downloaded` |
| **Monetization** | Revenue events | `checkout_started`, `purchase_completed`, `subscription_started` |
| **Retention** | Repeat behavior | `return_session`, `[product]_returning_user` |
| **Reliability** | Errors & performance | `error_shown`, `api_error`, `latency_bucket`, `$performance`, `$error` |

### Auto-Tracked Events

The SDK automatically tracks these events (configurable):

| Event | Description | Triggered By |
|-------|-------------|--------------|
| `$pageview` | Page view or route change | Initial load, SPA navigation |
| `$session_start` | New session started | First page view or after timeout |
| `$session_end` | Session ended | Browser close, tab close |
| `$click` | Element clicked | Click on buttons, links, `[data-track]` |
| `$form_start` | Form interaction began | First input focus |
| `$form_submit` | Form submitted | Submit event |
| `$scroll_depth` | Scroll milestones | 25%, 50%, 75%, 100% |
| `$outbound_link` | External link clicked | Click on non-same-origin link |
| `$error` | JavaScript error | Window error, unhandled rejection |
| `$performance` | Performance metric | LCP, FID, CLS, TTFB, FCP, INP |
| `$page_show` | Page became visible | Visibility change |
| `$page_hide` | Page became hidden | Visibility change |

---

## Implementation Guide

### Quick Start (5 Steps)

#### 1. Install Tracking SDK

Copy the client SDK to your target app:

```bash
# From ACD root
cp harness/shared/userEventTracker.ts <target-app>/src/lib/tracking/
```

#### 2. Initialize in App Root

```typescript
// app/layout.tsx or _app.tsx or main.tsx
import { tracker } from '@/lib/tracking/userEventTracker';

if (typeof window !== 'undefined') {
  tracker.init({
    projectId: 'mediaposter', // unique per target
    apiEndpoint: process.env.NEXT_PUBLIC_TRACKING_API || 'http://localhost:3001/api/tracking/events',
    debug: process.env.NODE_ENV === 'development',
    autoTrack: {
      pageViews: true,
      clicks: true,
      forms: true,
      scrollDepth: true,
      errors: true,
      performance: true,
      outboundLinks: true,
    },
  });
}
```

#### 3. Identify Users on Login

```typescript
// After successful authentication
tracker.identify(user.id, {
  email: user.email,
  plan: user.plan, // free, pro, enterprise
  createdAt: user.createdAt,
});
```

#### 4. Track Core Value Events

```typescript
// Example: MediaPoster - post published
tracker.track('post_published', {
  postId: post.id,
  platform: post.platform, // instagram, twitter, etc.
  mediaType: post.mediaType, // image, video, carousel
  scheduled: post.isScheduled,
});
```

#### 5. Track Conversions

```typescript
// After successful purchase
tracker.trackConversion('purchase', order.amount, {
  orderId: order.id,
  plan: order.plan,
  currency: order.currency || 'USD',
  paymentMethod: order.paymentMethod,
});
```

### Required Environment Variables

Add to each target's `.env.local`:

```bash
NEXT_PUBLIC_TRACKING_API=https://acd-backend.yourapp.com/api/tracking/events
# Or for local development:
# NEXT_PUBLIC_TRACKING_API=http://localhost:3001/api/tracking/events
```

### Required Event Properties

All events automatically include:

```typescript
{
  // User Identity
  "userId": "usr_xxx" | undefined,      // After identify()
  "anonymousId": "anon_xxx",            // Always present

  // Session
  "sessionId": "sess_xxx",

  // Context
  "timestamp": "2026-03-07T12:00:00Z",
  "pageUrl": "https://app.com/dashboard",
  "pageTitle": "Dashboard - MyApp",
  "referrer": "https://google.com",

  // Attribution
  "utm_source": "string" | undefined,
  "utm_medium": "string" | undefined,
  "utm_campaign": "string" | undefined,
  "utm_term": "string" | undefined,
  "utm_content": "string" | undefined,

  // Device/Browser
  "$device_type": "desktop" | "tablet" | "mobile",
  "$browser": "Chrome" | "Firefox" | "Safari" | "Edge" | "Opera",
  "$os": "Windows" | "macOS" | "Linux" | "Android" | "iOS",
  "$screen_width": 1920,
  "$screen_height": 1080,
  "$viewport_width": 1440,
  "$viewport_height": 900,
  "$lib_version": "1.0.0"
}
```

---

## Target-Specific Events

### MediaPoster

| Event | Trigger | Properties |
|-------|---------|------------|
| `post_created` | User creates a new post | `postId`, `mediaType` |
| `post_scheduled` | Post scheduled for later | `postId`, `platform`, `scheduledFor` |
| `post_published` | Post goes live | `postId`, `platform`, `mediaType` |
| `media_uploaded` | Media file uploaded | `mediaId`, `fileSize`, `mediaType` |
| `template_used` | Template applied | `templateId`, `category` |
| `platform_connected` | Social account linked | `platform` |

### CanvasCast (Video Generation)

| Event | Trigger | Properties |
|-------|---------|------------|
| `project_created` | New video project started | `projectId`, `format` |
| `prompt_submitted` | AI prompt entered | `projectId`, `promptLength` |
| `video_generated` | Video generation complete | `projectId`, `duration`, `processingTime` |
| `video_downloaded` | User downloads video | `projectId`, `format`, `quality` |
| `script_edited` | User edits AI script | `projectId`, `changeCount` |
| `voice_selected` | Voice option chosen | `projectId`, `voiceId`, `language` |

### VelloPad (Book Writing)

| Event | Trigger | Properties |
|-------|---------|------------|
| `book_created` | New book started | `bookId`, `genre` |
| `chapter_written` | Chapter completed | `bookId`, `chapterNumber`, `wordCount` |
| `word_count_milestone` | Hit milestone | `bookId`, `milestone` (1000, 5000, 10000, 25000) |
| `pdf_generated` | Print-ready PDF created | `bookId`, `pageCount` |
| `cover_designed` | Cover designed | `bookId`, `template` |
| `order_placed` | Physical copy ordered | `bookId`, `quantity`, `amount` |

### BlogCanvas (AI Blog Writing)

| Event | Trigger | Properties |
|-------|---------|------------|
| `blog_created` | New blog post created | `blogId`, `clientId` |
| `blog_generated` | AI generated content | `blogId`, `wordCount`, `topic` |
| `blog_approved` | Client approves post | `blogId`, `approvalTime` |
| `blog_published` | Post published | `blogId`, `platform` |
| `client_added` | New client added | `clientId`, `industry` |
| `brief_submitted` | Content brief submitted | `briefId`, `topicsCount` |

### Portal28 (Online Courses)

| Event | Trigger | Properties |
|-------|---------|------------|
| `course_created` | New course created | `courseId`, `category` |
| `lesson_added` | Lesson added to course | `courseId`, `lessonId`, `duration` |
| `course_published` | Course goes live | `courseId`, `lessonCount`, `price` |
| `enrollment_completed` | Student enrolled | `courseId`, `userId`, `paymentMethod` |
| `lesson_completed` | Student finishes lesson | `courseId`, `lessonId`, `completionTime` |
| `certificate_issued` | Certificate generated | `courseId`, `userId` |

---

## 4 North Star Milestones

Track these 4 key milestones for every user in every target:

| Milestone | Event | Description | Business Impact |
|-----------|-------|-------------|-----------------|
| **Activated** | `activation_complete` | User logged in + onboarded | Can use the product |
| **First Value** | `[product]_completed` | First successful core action | Experienced the value |
| **Aha Moment** | `[product]_downloaded` | User got tangible output | Confirmed the value |
| **Monetized** | `purchase_completed` | First payment received | Revenue generated |

**Implementation:**

```typescript
// 1. Activated - after onboarding
tracker.track('activation_complete', {
  onboardingSteps: 3,
  timeToActivate: 120, // seconds
});

// 2. First Value - after first core action
tracker.track('post_created', { /* ... */ }); // MediaPoster example

// 3. Aha Moment - after download/export
tracker.track('post_published', { /* ... */ }); // MediaPoster example

// 4. Monetized - after purchase
tracker.trackConversion('purchase', amount, { /* ... */ });
```

---

## Funnel Analysis

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

## Dashboard Metrics

### Key Metrics (Cross-Project View)

| Metric | Formula | Good Benchmark |
|--------|---------|----------------|
| **Activation Rate** | `login_success / signup_start` | > 70% |
| **Aha Rate** | `first_value / activation_complete` | > 50% |
| **Purchase Rate** | `purchase_completed / aha_users` | > 5% |
| **30-Day Retention** | `return_session / activated_users` | > 40% |
| **Revenue per Click** | `total_revenue / ad_clicks` | > $2 for B2B SaaS |

---

## Success Criteria

- ✅ All targets have tracking SDK installed
- ✅ All targets track the 4 North Star milestones
- ✅ All targets send events to ACD backend
- ✅ ACD dashboard shows cross-project funnel metrics
- ✅ Each target can view its own funnel analysis
