# HookLite — Webhook Receiver & Event Dashboard

## Purpose
Webhook receiver service for ACTP. Receives inbound webhooks from Meta Ads, TikTok Ads, Stripe, WaitlistLab, and MPLite. Validates platform-specific signatures, logs events to Supabase, and triggers downstream handlers that update ACTP tables. Part of the ACTP Lite distributed service mesh.

## Project Location
`/Users/isaiahdupree/Documents/Software/hooklite/`

## PRD
`/Users/isaiahdupree/Documents/Software/MediaPoster/Backend/services/creative_testing_pipeline/docs/architecture/HOOKLITE_PRD.md`

## Feature List
`/Users/isaiahdupree/Documents/Software/hooklite/feature_list.json`

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (shared project `ivhfuhxorppptyuofbgq`)
- **Hosting**: Vercel
- **UI**: Tailwind CSS v4, shadcn/ui

## Shared Supabase Database
- `actp_webhooks` — Write: all inbound webhook events
- `hooklite_api_keys` — Read/Write: API key management
- `actp_ad_deployments` — Write: meta/tiktok handlers update ad status
- `actp_performance_logs` — Write: stripe/waitlistlab handlers log events
- `actp_organic_posts` — Write: mplite handler records publish completions

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://ivhfuhxorppptyuofbgq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
HOOKLITE_MASTER_KEY=hlk_...
META_APP_SECRET=...
TIKTOK_APP_SECRET=...
STRIPE_WEBHOOK_SECRET=...
WAITLISTLAB_WEBHOOK_SECRET=...
MPLITE_WEBHOOK_SECRET=...
```

## Existing Implementation
HookLite is already partially built. Check existing code before creating new files. Key existing files:
- `app/api/hooks/meta/route.ts` — Meta webhook handler
- `app/api/hooks/tiktok/route.ts` — TikTok webhook handler
- `app/api/hooks/stripe/route.ts` — Stripe webhook handler
- `app/api/hooks/waitlistlab/route.ts` — WaitlistLab handler
- `app/api/hooks/mplite/route.ts` — MPLite handler
- `app/api/hooks/generic/route.ts` — Generic handler
- `app/api/events/route.ts` — Events list API
- `app/api/health/route.ts` — Health check
- `lib/supabase.ts`, `lib/auth.ts`, `lib/api-helpers.ts`
- `middleware.ts`, `cli/hooklite.js`

## Sibling Services (DO NOT REBUILD)
- **MPLite** ✅ — https://mediaposter-lite.vercel.app
- **MetricsLite** — Analytics cron (separate project)
- **GenLite** — Video generation queue (separate project)
- **AdLite** — Ad deployment queue (separate project)
- **ACTPDash** — Campaign dashboard (separate project)
- **actp-worker** — Local Mac daemon (separate project)

## Critical Rules
- NEVER use mock data, mock providers, or placeholder implementations
- NEVER hardcode API keys or secrets
- Webhook endpoints MUST be public (no API key required) — they validate via platform signatures
- Dashboard/events API endpoints MUST require Bearer token authentication
- All signature validation must be timing-safe
- Handler errors must not fail the webhook response (always return 200 to platform)
