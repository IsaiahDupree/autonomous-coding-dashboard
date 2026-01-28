# User Event Tracking Guide

## Overview

This document describes the sophisticated user event tracking system implemented for the Autonomous Coding Dashboard and all target web applications.

## Components

### 1. Backend Service (`backend/src/services/userEventTracking.ts`)

Full-featured server-side event tracking with:

- **Event Types**: Page views, clicks, forms, conversions, errors, performance metrics, feature flags, A/B tests
- **Session Management**: Automatic session tracking with timeout handling
- **User Identification**: Anonymous and identified users with traits
- **Funnel Analysis**: Define multi-step funnels and track conversion rates
- **Retention Analysis**: Cohort-based retention tracking
- **Export**: JSON and CSV export capabilities

### 2. Client-Side SDK (`harness/shared/userEventTracker.ts`)

Lightweight drop-in tracking for web applications:

- **Auto-tracking**: Page views, clicks, scroll depth, forms, errors, outbound links
- **Core Web Vitals**: LCP, FID, CLS, TTFB, FCP automatic capture
- **SPA Support**: History API interception for single-page apps
- **Session Persistence**: LocalStorage and cookie-based session management
- **Batched Sending**: Efficient event batching with configurable flush intervals
- **Privacy Respecting**: Do Not Track support, configurable masking

## API Endpoints

### Track Events

```bash
# Batch events from SDK
POST /api/tracking/events
{
  "projectId": "my-project",
  "events": [...]
}

# Single event
POST /api/tracking/track
{
  "eventName": "button_clicked",
  "properties": { "buttonId": "signup" },
  "userId": "user-123"
}

# Page view
POST /api/tracking/pageview
{
  "url": "https://example.com/pricing",
  "title": "Pricing",
  "userId": "user-123"
}

# Conversion
POST /api/tracking/conversion
{
  "name": "purchase",
  "value": 99.99,
  "properties": { "orderId": "ORD-123" }
}

# Identify user
POST /api/tracking/identify
{
  "userId": "user-123",
  "traits": { "email": "user@example.com", "plan": "pro" }
}
```

### Query Events

```bash
# Get events
GET /api/tracking/{projectId}/events?eventType=page_view&limit=100

# Get event counts
GET /api/tracking/{projectId}/counts/{eventName}?groupBy=day

# Get statistics
GET /api/tracking/{projectId}/stats

# Export data
GET /api/tracking/{projectId}/export?format=csv
```

### Funnel Analysis

```bash
# Define funnel
POST /api/tracking/funnels
{
  "id": "signup-funnel",
  "name": "Signup Flow",
  "steps": [
    { "name": "Landing", "eventName": "$pageview" },
    { "name": "Signup Click", "eventName": "signup_click" },
    { "name": "Form Submit", "eventName": "$form_submit" },
    { "name": "Conversion", "eventName": "$conversion" }
  ],
  "windowDays": 7
}

# Analyze funnel
GET /api/tracking/funnels/{funnelId}/analysis
```

### Retention Analysis

```bash
GET /api/tracking/{projectId}/retention?cohortEvent=$signup&returnEvent=$pageview&granularity=day
```

## Client SDK Usage

### Installation

Copy `harness/shared/userEventTracker.ts` to your target web app.

### Basic Usage

```typescript
import { tracker } from './userEventTracker';

// Initialize
tracker.init({
  projectId: 'my-project',
  apiEndpoint: 'http://localhost:3001/api/tracking/events',
  debug: true,
  autoTrack: {
    pageViews: true,
    clicks: true,
    scrollDepth: true,
    forms: true,
    errors: true,
    performance: true,
  },
});

// Identify user (after login)
tracker.identify('user-123', {
  email: 'user@example.com',
  plan: 'pro',
  signupDate: '2026-01-01',
});

// Track custom events
tracker.track('feature_used', {
  featureName: 'export',
  format: 'csv',
});

// Track conversions
tracker.trackConversion('purchase', 99.99, {
  orderId: 'ORD-123',
  plan: 'pro',
});
```

### Auto-Tracked Events

The SDK automatically tracks:

| Event | Trigger |
|-------|---------|
| `$pageview` | Page load, SPA navigation |
| `$click` | Clicks on buttons, links, [data-track] elements |
| `$scroll_depth` | 25%, 50%, 75%, 100% scroll thresholds |
| `$form_start` | First interaction with a form |
| `$form_submit` | Form submission |
| `$error` | JavaScript errors, unhandled rejections |
| `$session_start` | New session begins |
| `$session_end` | Page unload |
| `$outbound_link` | Click on external link |

### Performance Metrics

Automatically captured Core Web Vitals:

- **LCP** (Largest Contentful Paint)
- **FID** (First Input Delay)
- **CLS** (Cumulative Layout Shift)
- **FCP** (First Contentful Paint)
- **TTFB** (Time to First Byte)

## Target Web Apps Integration

To add tracking to a target web app (GapRadar, MediaPoster, CanvasCast, etc.):

1. Copy `harness/shared/userEventTracker.ts` to the project's `src/lib/` directory
2. Initialize in the app's root layout:

```tsx
// app/layout.tsx or _app.tsx
import { tracker } from '@/lib/userEventTracker';

if (typeof window !== 'undefined') {
  tracker.init({
    projectId: 'gapradar', // or your project ID
    apiEndpoint: process.env.NEXT_PUBLIC_TRACKING_API,
  });
}
```

3. Track key conversion events:

```tsx
// After successful signup
tracker.trackConversion('signup', undefined, { plan: 'free' });

// After purchase
tracker.trackConversion('purchase', price, { plan, orderId });

// After key feature usage
tracker.track('run_created', { niche: query });
```

## New Features Added (feat-026 to feat-045)

Based on PRD analysis, the following new features were added to the ACD:

### PRD Management (feat-026 to feat-028)
- PRD Scanner - Auto-discover PRDs from targets
- PRD Sync - Merge multiple PRDs into unified backlog
- PRD Voice/Text Input - Add requirements via voice

### User Tracking (feat-029 to feat-032) ✅ Implemented
- Backend event collection service
- Client-side tracking SDK
- Funnel analysis
- Retention analysis

### Target Management (feat-033 to feat-035)
- Project queue dashboard
- PRD viewer with navigation
- Feature extraction from PRD

### Automation (feat-036 to feat-038)
- Sleep/wake mode for CPU efficiency
- Multi-repo queue orchestrator
- Adaptive session delay

### Testing (feat-039 to feat-040)
- E2E test runner integration
- Test coverage dashboard

### Analytics (feat-041 to feat-042)
- Cross-project analytics
- Cost forecasting

### Integrations (feat-043 to feat-045)
- Supabase project connection
- Deployment status tracker
- PostHog integration
