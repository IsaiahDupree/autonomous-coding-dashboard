# MediaPoster - Event Tracking Implementation Guide

**Priority:** P1
**Status:** Ready for Implementation
**Target App:** `/Users/isaiahdupree/Documents/Software/MediaPoster`

---

## Overview

MediaPoster is a social media management platform. Tracking focuses on post creation, scheduling, publishing, and platform connections.

---

## Core Value Events

| Event | Trigger | Properties | North Star Milestone |
|-------|---------|------------|---------------------|
| `post_created` | User creates new post | `postId`, `mediaType` | ✅ First Value |
| `post_scheduled` | Post scheduled | `postId`, `platform`, `scheduledFor` | |
| `post_published` | Post goes live | `postId`, `platform`, `mediaType`, `scheduled` | ✅ Aha Moment |
| `media_uploaded` | Media uploaded | `mediaId`, `fileSize`, `mediaType`, `duration` | |
| `template_used` | Template applied | `templateId`, `category` | |
| `platform_connected` | Social account linked | `platform`, `accountId` | |

---

## Implementation Steps

### 1. Install Tracking SDK

```bash
cd /Users/isaiahdupree/Documents/Software/MediaPoster
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
    projectId: 'mediaposter',
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
      ctaLocation: location, // 'hero', 'pricing', 'footer'
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
      platformsConnected: connectedPlatforms.length,
    });
  }, []);

  return <WelcomeMessage />;
}
```

### 5. Core Value Events

**Post Created:** (North Star: First Value)

```typescript
// File: app/posts/create/action.ts
import { tracker } from '@/lib/tracking/userEventTracker';

async function createPost(data) {
  const post = await db.posts.create(data);

  tracker.track('post_created', {
    postId: post.id,
    mediaType: post.mediaType, // 'image', 'video', 'carousel', 'text'
    platforms: post.targetPlatforms, // ['instagram', 'twitter']
    hasTemplate: !!post.templateId,
    aiGenerated: post.aiGenerated,
  });

  return post;
}
```

**Post Scheduled:**

```typescript
// File: app/posts/schedule/action.ts
import { tracker } from '@/lib/tracking/userEventTracker';

async function schedulePost(postId, scheduledFor) {
  await db.posts.update(postId, { scheduledFor, status: 'scheduled' });

  tracker.track('post_scheduled', {
    postId,
    platform: post.platform,
    scheduledFor: scheduledFor.toISOString(),
    hoursUntilPost: (scheduledFor - Date.now()) / 3600000,
  });
}
```

**Post Published:** (North Star: Aha Moment)

```typescript
// File: app/api/publish/route.ts or worker
import { tracker } from '@/lib/tracking/userEventTracker';

async function publishPost(postId) {
  const result = await socialAPI.publish(post);

  tracker.track('post_published', {
    postId: post.id,
    platform: post.platform, // 'instagram', 'twitter', 'facebook', 'linkedin'
    mediaType: post.mediaType,
    scheduled: post.wasScheduled,
    publishedAt: new Date().toISOString(),
  });

  return result;
}
```

**Media Uploaded:**

```typescript
// File: app/api/upload/route.ts
import { tracker } from '@/lib/tracking/userEventTracker';

async function handleUpload(file) {
  const media = await uploadToStorage(file);

  tracker.track('media_uploaded', {
    mediaId: media.id,
    mediaType: media.type, // 'image', 'video'
    fileSize: file.size,
    duration: media.duration, // for videos
    format: file.type,
  });

  return media;
}
```

**Template Used:**

```typescript
// File: components/TemplateSelector.tsx
import { tracker } from '@/lib/tracking/userEventTracker';

function applyTemplate(templateId) {
  const template = templates.find(t => t.id === templateId);

  tracker.track('template_used', {
    templateId: template.id,
    category: template.category, // 'stories', 'reels', 'posts'
    templateName: template.name,
  });

  // Apply template...
}
```

**Platform Connected:**

```typescript
// File: app/settings/platforms/connect/page.tsx
import { tracker } from '@/lib/tracking/userEventTracker';

async function connectPlatform(platform) {
  const account = await oauthConnect(platform);

  tracker.track('platform_connected', {
    platform: platform, // 'instagram', 'twitter', 'facebook', 'linkedin', 'tiktok'
    accountId: account.id,
    accountName: account.displayName,
    followers: account.followerCount,
  });

  return account;
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
// Backend: Define MediaPoster-specific funnel
import { getUserEventTracking } from '@/services/userEventTracking';

const tracking = getUserEventTracking();

tracking.defineFunnel({
  id: 'mediaposter-activation',
  name: 'MediaPoster Activation Funnel',
  steps: [
    { name: 'Landing', eventName: '$pageview' },
    { name: 'Signup', eventName: 'signup_start' },
    { name: 'Login', eventName: 'login_success' },
    { name: 'Activated', eventName: 'activation_complete' },
    { name: 'First Post', eventName: 'post_created' },
    { name: 'Published', eventName: 'post_published' },
  ],
  windowDays: 7,
});

tracking.defineFunnel({
  id: 'mediaposter-monetization',
  name: 'MediaPoster Monetization Funnel',
  steps: [
    { name: 'Activated', eventName: 'activation_complete' },
    { name: 'First Post', eventName: 'post_created' },
    { name: 'Published', eventName: 'post_published' },
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
- [ ] All core value events tracked (post_created, post_published, etc.)
- [ ] Monetization events tracked (checkout, purchase)
- [ ] Error tracking captures API failures
- [ ] Performance tracking enabled (Core Web Vitals)
- [ ] Events visible in browser console (debug mode)
- [ ] Events sent to backend successfully
- [ ] No tracking in production if user has Do Not Track enabled

---

## Success Criteria

- ✅ All 6 core value events tracked
- ✅ Activation funnel tracked (signup → login → activated → first post → published)
- ✅ Monetization funnel tracked (activated → pricing → checkout → purchase)
- ✅ User identification on login
- ✅ Error rate < 0.1% of events
- ✅ Performance tracking enabled

---

## Next Steps

1. Copy SDK to MediaPoster codebase
2. Initialize tracker in app root
3. Add user identification in auth flow
4. Implement core value event tracking
5. Implement monetization event tracking
6. Test all events in development
7. Deploy and monitor in production
