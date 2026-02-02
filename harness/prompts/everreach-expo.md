# EverReach Expo CRM - Harness Prompt

## Project Overview

EverReach Expo is an AI-powered Personal CRM built with React Native/Expo. Key features include:
- Contact management with warmth scoring
- AI-powered message generation
- Screenshot analysis for contact extraction
- Voice notes with transcription
- Superwall/RevenueCat paywall integration
- PostHog analytics

## Current Focus: Meta Pixel Integration

The current task is to implement Meta Pixel (Facebook Pixel) integration for tracking conversions and enabling Meta Ads optimization.

## Tech Stack

- **Frontend:** React Native, Expo
- **Backend:** Vercel serverless functions
- **Database:** Supabase (PostgreSQL)
- **Analytics:** PostHog (existing), Meta Pixel (to add)
- **Payments:** Superwall, RevenueCat

## Key Files

- `services/analytics.ts` - Existing analytics service with AnalyticsService class
- `lib/posthog.ts` - PostHog integration
- `lib/backendAnalytics.ts` - Backend event tracking
- `backend-vercel/` - Vercel serverless API

## PRD Reference

See `docs/PRD_META_PIXEL_INTEGRATION.md` for detailed requirements.

## Feature List

See `feature_list.json` for the list of features to implement (META-001 through META-018).

## Implementation Guidelines

1. **Privacy First:** Always check user consent before tracking
2. **Deduplication:** Use event_id for client-server deduplication
3. **PII Hashing:** Hash email/phone with SHA256 before sending to Meta
4. **CAPI Integration:** Send events both client-side and server-side

## Key Events to Track

| Priority | Event | Meta Event Name |
|----------|-------|-----------------|
| P0 | Subscription Purchased | Purchase |
| P0 | Trial Started | StartTrial |
| P0 | Sign In (new user) | CompleteRegistration |
| P1 | Paywall Viewed | ViewContent |
| P2 | Message Sent | Lead |

## Environment Variables Needed

```
EXPO_PUBLIC_META_PIXEL_ID=
META_PIXEL_ID=
META_CONVERSIONS_ACCESS_TOKEN=
```

## Success Criteria

- All P0 events tracked correctly
- Events appear in Meta Events Manager
- Deduplication working (no duplicate events)
- Consent check prevents tracking when denied
