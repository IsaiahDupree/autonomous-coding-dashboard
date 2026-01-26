# PRD: Growth Data Plane

**Status:** Active  
**Created:** 2026-01-25  
**Priority:** P0  
**Applies To:** All Web App Targets

## Overview

A **Growth Data Plane**: every touch (email/web/app/billing/booking) becomes a normalized event tied to a `person_id`, then a segment engine activates Resend + Meta retargeting + outbound sequences.

This powers both funnels:
- **newsletter → app signup → subscription**
- **cold outbound → booked call → close**

With **segmentation off usage + email events + website visits**, using **Resend webhooks + PostHog + Supabase + Meta Pixel/CAPI**.

## Environment Variables

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
POSTHOG_API_KEY=
POSTHOG_HOST=https://app.posthog.com
META_PIXEL_ID=
META_CAPI_ACCESS_TOKEN=
META_TEST_EVENT_CODE=
APP_BASE_URL=
TRACKING_DOMAIN=
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          GROWTH DATA PLANE                               │
├─────────────────────────────────────────────────────────────────────────┤
│  SOURCES                    NORMALIZE              ACTIVATE              │
│  ┌─────────┐               ┌─────────┐           ┌─────────────────┐    │
│  │ Resend  │──webhook──▶   │         │           │ Resend Emails   │    │
│  │ Webhooks│               │         │           └─────────────────┘    │
│  └─────────┘               │         │           ┌─────────────────┐    │
│  ┌─────────┐               │ Unified │──────────▶│ Meta Retarget   │    │
│  │ Stripe  │──webhook──▶   │ Events  │           └─────────────────┘    │
│  │ Webhooks│               │ Table   │           ┌─────────────────┐    │
│  └─────────┘               │         │           │ Outbound Seqs   │    │
│  ┌─────────┐               │         │           └─────────────────┘    │
│  │PostHog  │──identify──▶  │         │                                  │
│  │ + Pixel │               └────┬────┘                                  │
│  └─────────┘                    │                                       │
│  ┌─────────┐               ┌────▼────┐           ┌─────────────────┐    │
│  │ Click   │──redirect──▶  │ Person  │──────────▶│ Segment Engine  │    │
│  │ Tracker │               │Features │           └─────────────────┘    │
│  └─────────┘               └─────────┘                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Database Schema (Supabase)

### Core Tables

| Table | Purpose |
|-------|---------|
| `person` | Canonical person (leads + users) |
| `identity_link` | Links: posthog distinct_id, stripe customer, meta fbp/fbc |
| `event` | Normalized events from all sources |
| `email_message` | Emails sent with Resend |
| `email_event` | Resend webhook events (delivered/opened/clicked) |
| `subscription` | Stripe billing snapshot |
| `deal` | Outbound pipeline stages |
| `person_features` | Computed features for segmentation |
| `segment` | Segment definitions |
| `segment_member` | Person ↔ Segment memberships |

## Edge Functions

### 1. Resend Webhook Ingest
- Verify Svix signature
- Store email events
- Map tags to person_id

### 2. Click Redirect Tracker
- Attribution spine: email → click → session → conversion
- Set first-party cookie with person_id
- Log click events

### 3. Stripe Webhook
- Upsert subscription snapshot
- Map stripe_customer_id to person_id
- Log billing events

### 4. Segment Engine (Cron)
- Compute person features from events
- Evaluate segment membership
- Trigger automations (Resend, Meta CAPI, outbound)

## Client Integration

### PostHog Identity Stitching
```typescript
posthog.identify(personId, { email });
```

### Meta Pixel + CAPI Deduplication
```typescript
const eventId = crypto.randomUUID();
fbq('track', 'Lead', {}, { eventID: eventId });
await fetch('/api/meta/capi', { body: JSON.stringify({ event_id: eventId }) });
```

## Starter Segments (10)

### Newsletter → Subscription Funnel
1. **new_signup_no_activation_24h** → email: "1-minute setup"
2. **activated_not_paid_day3** → email: "use case pack"
3. **high_intent_pricing_2plus_not_paid** → email: "help picking plan" + Meta
4. **checkout_started_no_purchase_4h** → email: "quick fix" + Meta
5. **newsletter_clicker_not_signed_up** → email: "invite to try"
6. **inactive_7d_after_activation** → email: "save your work"
7. **paid_low_usage_7d** → email: "your first win"
8. **paid_high_usage_7d** → email: "referral loop"
9. **bounced_complained** → suppress from sequences
10. **high_clicks_low_usage** → email: "what are you trying to solve?"

### Outbound → Close Funnel
1. **visited_offer_2plus_no_reply** → outbound: "2-line follow up"
2. **clicked_outbound_no_booking** → outbound: "send scheduling link"
3. **booked_call** → sequence stop + pre-call email
4. **no_show** → reschedule + Meta retarget
5. **proposal_sent** → 3-touch close sequence
6. **warm_lead** → "case study drop"
7. **replied_positive** → route to human
8. **replied_negative** → tag objection + drip
9. **won** → onboarding + upsell
10. **lost** → 30-day nurture + retarget

## Key Rules

1. **Every email includes tags** `{person_id, campaign_id, funnel}` for deterministic webhook mapping
2. **Every conversion fires Pixel + CAPI** with same `event_id` for Meta deduplication

## Features

| ID | Name | Priority |
|----|------|----------|
| GDP-001 | Supabase Schema Setup | P0 |
| GDP-002 | Person & Identity Tables | P0 |
| GDP-003 | Unified Events Table | P0 |
| GDP-004 | Resend Webhook Edge Function | P0 |
| GDP-005 | Email Event Tracking | P0 |
| GDP-006 | Click Redirect Tracker | P1 |
| GDP-007 | Stripe Webhook Integration | P1 |
| GDP-008 | Subscription Snapshot | P1 |
| GDP-009 | PostHog Identity Stitching | P1 |
| GDP-010 | Meta Pixel + CAPI Dedup | P1 |
| GDP-011 | Person Features Computation | P1 |
| GDP-012 | Segment Engine | P1 |
| GDP-013 | Segment Definitions Table | P1 |
| GDP-014 | Newsletter Funnel Segments | P2 |
| GDP-015 | Outbound Funnel Segments | P2 |
| GDP-016 | Resend Email Automations | P2 |
| GDP-017 | Meta Retargeting Automations | P2 |
| GDP-018 | Deal Pipeline Management | P2 |
| GDP-019 | Feature Computation Cron | P2 |
| GDP-020 | Segment Membership Sync | P2 |

## Success Metrics

- 100% of user touches captured in unified events table
- Email → conversion attribution working end-to-end
- Meta Event Match Quality > 6.0
- Segment automations triggering within 5 minutes of qualification
