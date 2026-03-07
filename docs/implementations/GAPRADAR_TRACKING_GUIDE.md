# GapRadar - Event Tracking Implementation Guide

**Priority:** P1
**Status:** Ready for Implementation
**Target App:** `/Users/isaiahdupree/Documents/Software/GapRadar`

---

## Overview

GapRadar is a niche analysis and market opportunity discovery platform. Tracking focuses on analysis runs, report generation, trend discovery, and gap opportunity identification.

---

## Core Value Events

| Event | Trigger | Properties | North Star Milestone |
|-------|---------|------------|---------------------|
| `run_created` | User starts new niche analysis | `runId`, `niche`, `keywords` | |
| `run_completed` | Analysis run finishes | `runId`, `gapsFound`, `processingTime` | ✅ First Value |
| `report_viewed` | User opens completed report | `reportId`, `runId`, `viewDuration` | ✅ Aha Moment |
| `report_downloaded` | User downloads PDF/export | `reportId`, `format`, `fileSize` | |
| `trend_clicked` | User clicks trending topic | `trendId`, `topic`, `trendScore` | |
| `gap_saved` | User saves gap opportunity | `gapId`, `niche`, `competitionScore` | |

---

## Implementation Steps

### 1. Install Tracking SDK

```bash
cd /Users/isaiahdupree/Documents/Software/GapRadar
mkdir -p src/lib/tracking
cp /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/shared/userEventTracker.ts src/lib/tracking/
```

### 2. Initialize Tracker

**File:** `app/layout.tsx` or `src/app.tsx`

```typescript
import { tracker } from '@/lib/tracking/userEventTracker';

// Initialize on client side only
if (typeof window !== 'undefined') {
  tracker.init({
    projectId: 'gapradar',
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

**Environment Variable:** Add to `.env.local`

```bash
NEXT_PUBLIC_TRACKING_API=http://localhost:3001/api/tracking/events
# Production:
# NEXT_PUBLIC_TRACKING_API=https://acd-backend.yourapp.com/api/tracking/events
```

### 3. Acquisition Events

**Landing Page View** (Auto-tracked via `$pageview`)

**CTA Click:**

```typescript
// File: components/CTAButton.tsx
import { tracker } from '@/lib/tracking/userEventTracker';

function CTAButton({ text, variant, location }: CTAProps) {
  const handleClick = () => {
    tracker.track('cta_click', {
      ctaText: text,
      ctaLocation: location, // 'hero', 'pricing', 'footer', 'nav'
      variant: variant, // 'primary', 'secondary'
    });
    // Navigate to signup...
  };

  return <button onClick={handleClick}>{text}</button>;
}
```

**Pricing View:**

```typescript
// File: app/pricing/page.tsx
import { tracker } from '@/lib/tracking/userEventTracker';

export default function PricingPage() {
  useEffect(() => {
    tracker.track('pricing_view', {
      referrer: document.referrer,
      source: searchParams.get('utm_source') || 'direct',
    });
  }, []);

  return <PricingTable />;
}
```

### 4. Activation Events

**Signup Start:**

```typescript
// File: app/auth/signup/page.tsx
import { tracker } from '@/lib/tracking/userEventTracker';

function SignupPage() {
  const handleFormStart = () => {
    tracker.track('signup_start', {
      source: searchParams.get('utm_source') || 'organic',
      referrer: document.referrer,
    });
  };

  return (
    <form onFocus={handleFormStart}>
      {/* ... */}
    </form>
  );
}
```

**Login Success + User Identification:**

```typescript
// File: app/auth/login/action.ts or middleware.ts
import { tracker } from '@/lib/tracking/userEventTracker';

async function handleLogin(credentials) {
  const user = await authenticate(credentials);

  if (user) {
    // Identify user
    tracker.identify(user.id, {
      email: user.email,
      plan: user.plan, // 'free', 'pro', 'enterprise'
      createdAt: user.createdAt,
      name: user.name,
      industry: user.industry,
    });

    // Track login
    tracker.track('login_success', {
      method: 'email', // or 'google', 'github'
    });
  }
}
```

**Activation Complete:**

```typescript
// File: app/onboarding/complete/page.tsx
import { tracker } from '@/lib/tracking/userEventTracker';

function OnboardingComplete() {
  useEffect(() => {
    tracker.track('activation_complete', {
      onboardingSteps: 3,
      timeToActivate: Date.now() - onboardingStartTime, // ms
      industrySelected: selectedIndustry,
      nicheInterests: selectedNiches.length,
    });
  }, []);

  return <WelcomeMessage />;
}
```

### 5. Core Value Events

**Run Created:**

```typescript
// File: app/analysis/create/action.ts
import { tracker } from '@/lib/tracking/userEventTracker';

async function createAnalysisRun(data) {
  const run = await db.analysisRuns.create({
    userId: user.id,
    niche: data.niche,
    keywords: data.keywords,
    status: 'pending',
  });

  tracker.track('run_created', {
    runId: run.id,
    niche: run.niche,
    keywords: run.keywords.join(', '),
    keywordCount: run.keywords.length,
  });

  return run;
}
```

**Run Completed:** (North Star: First Value)

```typescript
// File: app/api/analysis/worker/route.ts or worker
import { tracker } from '@/lib/tracking/userEventTracker';

async function completeAnalysisRun(runId) {
  const run = await db.analysisRuns.findUnique({ where: { id: runId } });
  const gaps = await analyzeGaps(run);

  await db.analysisRuns.update({
    where: { id: runId },
    data: { status: 'completed', gaps, completedAt: new Date() },
  });

  tracker.track('run_completed', {
    runId: run.id,
    niche: run.niche,
    gapsFound: gaps.length,
    processingTimeMs: Date.now() - run.createdAt.getTime(),
    topGapScore: Math.max(...gaps.map(g => g.score)),
  });

  return { run, gaps };
}
```

**Report Viewed:** (North Star: Aha Moment)

```typescript
// File: app/reports/[id]/page.tsx
import { tracker } from '@/lib/tracking/userEventTracker';

export default function ReportPage({ params }) {
  const startTime = useRef(Date.now());

  useEffect(() => {
    tracker.track('report_viewed', {
      reportId: params.id,
      runId: report.runId,
      gapsCount: report.gaps.length,
    });

    // Track view duration on unmount
    return () => {
      const viewDuration = Date.now() - startTime.current;
      tracker.track('report_view_duration', {
        reportId: params.id,
        durationSeconds: Math.floor(viewDuration / 1000),
      });
    };
  }, []);

  return <ReportDisplay report={report} />;
}
```

**Report Downloaded:**

```typescript
// File: components/ReportActions.tsx
import { tracker } from '@/lib/tracking/userEventTracker';

function DownloadReportButton({ reportId, format }: { reportId: string; format: 'pdf' | 'csv' | 'json' }) {
  const handleDownload = async () => {
    const file = await generateReport(reportId, format);

    tracker.track('report_downloaded', {
      reportId,
      format,
      fileSize: file.size,
      gapsIncluded: file.gapsCount,
    });

    // Trigger download...
  };

  return <button onClick={handleDownload}>Download {format.toUpperCase()}</button>;
}
```

**Trend Clicked:**

```typescript
// File: components/TrendingTopics.tsx
import { tracker } from '@/lib/tracking/userEventTracker';

function TrendingTopicCard({ trend }: { trend: Trend }) {
  const handleClick = () => {
    tracker.track('trend_clicked', {
      trendId: trend.id,
      topic: trend.topic,
      trendScore: trend.score,
      category: trend.category,
      velocity: trend.velocity, // how fast it's trending
    });

    // Navigate to trend details...
  };

  return <div onClick={handleClick}>{trend.topic}</div>;
}
```

**Gap Saved:**

```typescript
// File: components/GapCard.tsx
import { tracker } from '@/lib/tracking/userEventTracker';

function SaveGapButton({ gap }: { gap: Gap }) {
  const handleSave = async () => {
    await db.savedGaps.create({
      userId: user.id,
      gapId: gap.id,
      niche: gap.niche,
    });

    tracker.track('gap_saved', {
      gapId: gap.id,
      niche: gap.niche,
      competitionScore: gap.competitionScore,
      demandScore: gap.demandScore,
      overallScore: gap.score,
      category: gap.category,
    });
  };

  return <button onClick={handleSave}>Save Opportunity</button>;
}
```

### 6. Monetization Events

**Checkout Started:**

```typescript
// File: app/checkout/page.tsx
import { tracker } from '@/lib/tracking/userEventTracker';

function CheckoutPage() {
  useEffect(() => {
    tracker.track('checkout_started', {
      plan: selectedPlan.id, // 'pro', 'enterprise'
      billingCycle: billingCycle, // 'monthly', 'yearly'
      amount: selectedPlan.price,
      currency: 'USD',
      reportsGenerated: userStats.reportsGenerated,
    });
  }, []);

  return <CheckoutForm />;
}
```

**Purchase Completed:** (North Star: Monetized)

```typescript
// File: app/api/webhooks/stripe/route.ts
import { tracker } from '@/lib/tracking/userEventTracker';

async function handleStripeWebhook(event) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    tracker.trackConversion('purchase', session.amount_total / 100, {
      orderId: session.id,
      plan: session.metadata.plan,
      currency: session.currency,
      paymentMethod: session.payment_method_types[0],
      customerId: session.customer,
    });
  }
}
```

**Subscription Started:**

```typescript
// File: app/api/webhooks/stripe/route.ts
import { tracker } from '@/lib/tracking/userEventTracker';

async function handleSubscriptionCreated(subscription) {
  tracker.track('subscription_started', {
    subscriptionId: subscription.id,
    plan: subscription.items.data[0].price.lookup_key,
    interval: subscription.items.data[0].price.recurring.interval,
    amount: subscription.items.data[0].price.unit_amount / 100,
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
  });
}
```

### 7. Retention Events

**Return Session:**

```typescript
// File: app/layout.tsx or middleware
import { tracker } from '@/lib/tracking/userEventTracker';

function trackReturnSession(user) {
  const visitCount = user.visitCount || 1;
  const daysSinceLastVisit = (Date.now() - user.lastVisitAt) / 86400000;

  if (visitCount > 1) {
    tracker.track('return_session', {
      visitCount,
      daysSinceLastVisit: Math.floor(daysSinceLastVisit),
      weeksSinceSignup: Math.floor((Date.now() - user.createdAt) / 604800000),
      reportsGenerated: user.reportsGenerated,
      gapsSaved: user.gapsSaved,
    });
  }
}
```

### 8. Error Tracking

**API Errors:**

```typescript
// File: lib/api-client.ts
import { tracker } from '@/lib/tracking/userEventTracker';

async function apiRequest(endpoint, options) {
  try {
    const response = await fetch(endpoint, options);
    if (!response.ok) {
      tracker.track('api_error', {
        endpoint,
        method: options.method,
        statusCode: response.status,
        errorMessage: await response.text(),
      });
    }
    return response;
  } catch (error) {
    tracker.trackError(error as Error, {
      endpoint,
      context: 'api_request',
    });
    throw error;
  }
}
```

**Analysis Failures:**

```typescript
// File: app/api/analysis/worker/route.ts
import { tracker } from '@/lib/tracking/userEventTracker';

async function runAnalysis(runId) {
  try {
    return await performAnalysis(runId);
  } catch (error) {
    tracker.trackError(error as Error, {
      runId,
      context: 'analysis_worker',
      niche: run.niche,
    });

    await db.analysisRuns.update({
      where: { id: runId },
      data: { status: 'failed', error: error.message },
    });

    throw error;
  }
}
```

### 9. Logout / Reset

```typescript
// File: app/auth/logout/action.ts
import { tracker } from '@/lib/tracking/userEventTracker';

async function handleLogout() {
  tracker.track('logout', {});
  tracker.reset(); // Clears user identity
  // Clear session...
}
```

---

## Funnel Definition

```typescript
// Backend: Define GapRadar-specific funnels
import { getUserEventTracking } from '@/services/userEventTracking';

const tracking = getUserEventTracking();

tracking.defineFunnel({
  id: 'gapradar-activation',
  name: 'GapRadar Activation Funnel',
  steps: [
    { name: 'Landing', eventName: '$pageview' },
    { name: 'Signup', eventName: 'signup_start' },
    { name: 'Login', eventName: 'login_success' },
    { name: 'Activated', eventName: 'activation_complete' },
    { name: 'First Run', eventName: 'run_created' },
    { name: 'Run Completed', eventName: 'run_completed' },
    { name: 'Report Viewed', eventName: 'report_viewed' },
  ],
  windowDays: 7,
});

tracking.defineFunnel({
  id: 'gapradar-monetization',
  name: 'GapRadar Monetization Funnel',
  steps: [
    { name: 'Activated', eventName: 'activation_complete' },
    { name: 'First Run', eventName: 'run_completed' },
    { name: 'Report Viewed', eventName: 'report_viewed' },
    { name: 'Gap Saved', eventName: 'gap_saved' },
    { name: 'Pricing View', eventName: 'pricing_view' },
    { name: 'Checkout', eventName: 'checkout_started' },
    { name: 'Purchase', eventName: 'purchase_completed' },
  ],
  windowDays: 30,
});
```

---

## Testing Checklist

- [ ] SDK initialized in app root
- [ ] Debug mode enabled in development
- [ ] User identification on login works
- [ ] Reset on logout works
- [ ] All core value events tracked (run_created, run_completed, report_viewed, etc.)
- [ ] Monetization events tracked (checkout, purchase)
- [ ] Error tracking captures analysis failures
- [ ] Performance tracking enabled (Core Web Vitals)
- [ ] Events visible in browser console (debug mode)
- [ ] Events sent to backend successfully
- [ ] No tracking in production if user has Do Not Track enabled

---

## Success Criteria

- ✅ All 6 core value events tracked
- ✅ Activation funnel tracked (signup → login → activated → run created → run completed → report viewed)
- ✅ Monetization funnel tracked (activated → run completed → report viewed → gap saved → pricing → checkout → purchase)
- ✅ User identification on login
- ✅ Error rate < 0.1% of events
- ✅ Performance tracking enabled

---

## Next Steps

1. Copy SDK to GapRadar codebase
2. Initialize tracker in app root
3. Add user identification in auth flow
4. Implement core value event tracking
5. Implement monetization event tracking
6. Test all events in development
7. Deploy and monitor in production
