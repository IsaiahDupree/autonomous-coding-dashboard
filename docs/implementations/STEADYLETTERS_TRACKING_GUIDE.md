# SteadyLetters - Event Tracking Implementation Guide

**Priority:** P3
**Status:** Ready for Implementation
**Target App:** `/Users/isaiahdupree/Documents/Software/SteadyLetters`

---

## Overview

SteadyLetters is a handwritten letter automation platform that allows users to create, render, and send personalized handwritten letters via mail APIs. Tracking focuses on letter creation, rendering, sending, and campaign management.

---

## Core Value Events

| Event | Trigger | Properties | North Star Milestone |
|-------|---------|------------|---------------------|
| `letter_created` | User creates new letter | `letterId`, `recipientCount`, `hasCustomFont` | ✅ First Value |
| `letter_rendered` | Letter rendered to image | `letterId`, `format`, `renderTime` | |
| `letter_sent` | Letter sent via mail API | `letterId`, `provider`, `cost` | ✅ Aha Moment |
| `font_selected` | User selects handwriting font | `fontId`, `fontName`, `category` | |
| `recipient_added` | User adds recipient | `recipientId`, `source`, `hasCustomFields` | |
| `campaign_created` | User creates mail campaign | `campaignId`, `recipientCount`, `estimatedCost` | |

---

## Implementation Steps

### 1. Install Tracking SDK

```bash
cd /Users/isaiahdupree/Documents/Software/SteadyLetters
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
    projectId: 'steadyletters',
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
      plan: user.plan, // 'free', 'starter', 'growth', 'enterprise'
      createdAt: user.createdAt,
      name: user.name,
      industry: user.industry,
      teamSize: user.teamSize,
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
      onboardingSteps: 4,
      timeToActivate: Date.now() - onboardingStartTime, // ms
      recipientsImported: importedRecipients.length,
      fontSelected: !!selectedFont,
    });
  }, []);

  return <WelcomeMessage />;
}
```

### 5. Core Value Events

**Letter Created:** (North Star: First Value)

```typescript
// File: app/letters/create/action.ts
import { tracker } from '@/lib/tracking/userEventTracker';

async function createLetter(data) {
  const letter = await db.letters.create({
    userId: user.id,
    content: data.content,
    fontId: data.fontId,
    recipients: data.recipients,
  });

  tracker.track('letter_created', {
    letterId: letter.id,
    recipientCount: letter.recipients.length,
    wordCount: letter.content.split(/\s+/).length,
    hasCustomFont: letter.fontId !== 'default',
    hasImages: letter.images?.length > 0,
    templateUsed: !!letter.templateId,
  });

  return letter;
}
```

**Letter Rendered:**

```typescript
// File: app/api/render/route.ts
import { tracker } from '@/lib/tracking/userEventTracker';

async function renderLetter(letterId) {
  const startTime = Date.now();
  const letter = await db.letters.findUnique({ where: { id: letterId } });

  const renderedImage = await renderToImage(letter);
  const renderTime = Date.now() - startTime;

  await db.letters.update({
    where: { id: letterId },
    data: { renderedImageUrl: renderedImage.url, status: 'rendered' },
  });

  tracker.track('letter_rendered', {
    letterId,
    format: renderedImage.format, // 'png', 'jpg', 'pdf'
    renderTimeMs: renderTime,
    imageSize: renderedImage.fileSize,
    pageCount: renderedImage.pageCount,
  });

  return renderedImage;
}
```

**Letter Sent:** (North Star: Aha Moment)

```typescript
// File: app/api/send/route.ts
import { tracker } from '@/lib/tracking/userEventTracker';

async function sendLetter(letterId) {
  const letter = await db.letters.findUnique({ where: { id: letterId } });
  const results = await mailProvider.sendBatch(letter.recipients, letter.renderedImageUrl);

  await db.letters.update({
    where: { id: letterId },
    data: {
      status: 'sent',
      sentAt: new Date(),
      cost: results.totalCost,
    },
  });

  tracker.track('letter_sent', {
    letterId: letter.id,
    recipientCount: letter.recipients.length,
    provider: 'lob', // or 'sendoso', 'postcard-mania'
    cost: results.totalCost,
    estimatedDeliveryDays: results.estimatedDelivery,
    international: results.internationalCount > 0,
  });

  return results;
}
```

**Font Selected:**

```typescript
// File: components/FontPicker.tsx
import { tracker } from '@/lib/tracking/userEventTracker';

function FontPicker({ onSelect }: { onSelect: (font: Font) => void }) {
  const handleFontSelect = (font: Font) => {
    tracker.track('font_selected', {
      fontId: font.id,
      fontName: font.name,
      category: font.category, // 'cursive', 'print', 'signature'
      isPremium: font.isPremium,
      price: font.price || 0,
    });

    onSelect(font);
  };

  return <FontGallery onSelect={handleFontSelect} />;
}
```

**Recipient Added:**

```typescript
// File: app/recipients/add/action.ts
import { tracker } from '@/lib/tracking/userEventTracker';

async function addRecipient(data) {
  const recipient = await db.recipients.create({
    userId: user.id,
    name: data.name,
    address: data.address,
    customFields: data.customFields,
  });

  tracker.track('recipient_added', {
    recipientId: recipient.id,
    source: data.source, // 'manual', 'import', 'api'
    hasCustomFields: Object.keys(data.customFields || {}).length > 0,
    country: recipient.address.country,
  });

  return recipient;
}
```

**Campaign Created:**

```typescript
// File: app/campaigns/create/action.ts
import { tracker } from '@/lib/tracking/userEventTracker';

async function createCampaign(data) {
  const campaign = await db.campaigns.create({
    userId: user.id,
    name: data.name,
    letterId: data.letterId,
    recipientIds: data.recipientIds,
  });

  const estimatedCost = calculateCost(campaign.recipientIds.length);

  tracker.track('campaign_created', {
    campaignId: campaign.id,
    recipientCount: campaign.recipientIds.length,
    letterId: campaign.letterId,
    estimatedCost,
    scheduledSend: campaign.scheduledFor ? campaign.scheduledFor.toISOString() : null,
    isRecurring: !!campaign.recurrenceRule,
  });

  return campaign;
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
      plan: selectedPlan.id, // 'starter', 'growth', 'enterprise'
      billingCycle: billingCycle, // 'monthly', 'yearly'
      amount: selectedPlan.price,
      currency: 'USD',
      lettersSent: userStats.lettersSent,
      creditsNeeded: creditsNeeded,
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
      creditsAdded: session.metadata.credits,
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
    includedCredits: subscription.metadata.monthlyCredits,
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
      lettersSent: user.lettersSent,
      campaignsActive: user.activeCampaigns,
    });
  }
}
```

**Recurring Campaign Sent:**

```typescript
// File: app/api/campaigns/worker/route.ts
import { tracker } from '@/lib/tracking/userEventTracker';

async function sendRecurringCampaign(campaignId) {
  const campaign = await db.campaigns.findUnique({ where: { id: campaignId } });

  // Send letters...

  tracker.track('recurring_campaign_sent', {
    campaignId,
    occurrenceNumber: campaign.occurrenceCount,
    recipientCount: campaign.recipientIds.length,
    daysSinceFirstSend: Math.floor((Date.now() - campaign.firstSentAt.getTime()) / 86400000),
  });
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

**Mail Provider Failures:**

```typescript
// File: lib/mail-provider.ts
import { tracker } from '@/lib/tracking/userEventTracker';

async function sendToProvider(letter, recipients) {
  try {
    return await provider.send({ letter, recipients });
  } catch (error) {
    tracker.trackError(error as Error, {
      letterId: letter.id,
      provider: 'lob',
      recipientCount: recipients.length,
      context: 'mail_provider',
    });

    tracker.track('send_failed', {
      letterId: letter.id,
      provider: 'lob',
      errorCode: error.code,
      errorMessage: error.message,
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
// Backend: Define SteadyLetters-specific funnels
import { getUserEventTracking } from '@/services/userEventTracking';

const tracking = getUserEventTracking();

tracking.defineFunnel({
  id: 'steadyletters-activation',
  name: 'SteadyLetters Activation Funnel',
  steps: [
    { name: 'Landing', eventName: '$pageview' },
    { name: 'Signup', eventName: 'signup_start' },
    { name: 'Login', eventName: 'login_success' },
    { name: 'Activated', eventName: 'activation_complete' },
    { name: 'Letter Created', eventName: 'letter_created' },
    { name: 'Letter Rendered', eventName: 'letter_rendered' },
    { name: 'Letter Sent', eventName: 'letter_sent' },
  ],
  windowDays: 7,
});

tracking.defineFunnel({
  id: 'steadyletters-monetization',
  name: 'SteadyLetters Monetization Funnel',
  steps: [
    { name: 'Activated', eventName: 'activation_complete' },
    { name: 'Letter Created', eventName: 'letter_created' },
    { name: 'Letter Sent', eventName: 'letter_sent' },
    { name: 'Pricing View', eventName: 'pricing_view' },
    { name: 'Checkout', eventName: 'checkout_started' },
    { name: 'Purchase', eventName: 'purchase_completed' },
  ],
  windowDays: 30,
});

tracking.defineFunnel({
  id: 'steadyletters-campaign',
  name: 'Campaign Creation Funnel',
  steps: [
    { name: 'Recipient Added', eventName: 'recipient_added' },
    { name: 'Letter Created', eventName: 'letter_created' },
    { name: 'Font Selected', eventName: 'font_selected' },
    { name: 'Letter Rendered', eventName: 'letter_rendered' },
    { name: 'Campaign Created', eventName: 'campaign_created' },
    { name: 'Letter Sent', eventName: 'letter_sent' },
  ],
  windowDays: 14,
});
```

---

## Testing Checklist

- [ ] SDK initialized in app root
- [ ] Debug mode enabled in development
- [ ] User identification on login works
- [ ] Reset on logout works
- [ ] All core value events tracked (letter_created, letter_sent, campaign_created, etc.)
- [ ] Monetization events tracked (checkout, purchase)
- [ ] Error tracking captures mail provider failures
- [ ] Performance tracking enabled (Core Web Vitals)
- [ ] Events visible in browser console (debug mode)
- [ ] Events sent to backend successfully
- [ ] No tracking in production if user has Do Not Track enabled

---

## Success Criteria

- ✅ All 6 core value events tracked
- ✅ Activation funnel tracked (signup → login → activated → letter created → letter sent)
- ✅ Monetization funnel tracked (activated → letter sent → pricing → checkout → purchase)
- ✅ Campaign funnel tracked (recipient added → letter created → font selected → letter rendered → campaign created → letter sent)
- ✅ User identification on login
- ✅ Error rate < 0.1% of events
- ✅ Performance tracking enabled

---

## Next Steps

1. Copy SDK to SteadyLetters codebase
2. Initialize tracker in app root
3. Add user identification in auth flow
4. Implement core value event tracking
5. Implement monetization event tracking
6. Test all events in development
7. Deploy and monitor in production
