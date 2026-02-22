# MetricsLite — Analytics Cron Polling Service

## Purpose
Build a Vercel-deployed cron service that collects metrics from YouTube, TikTok, Instagram, Meta Ads, and TikTok Ads every 30 minutes. Writes normalized data to the shared ACTP Supabase database. Detects viral thresholds, engagement drops, spend alerts, and ad fatigue. Part of the ACTP Lite distributed service mesh.

## Project Location
`/Users/isaiahdupree/Documents/Software/metricslite/`

## PRD
`/Users/isaiahdupree/Documents/Software/MediaPoster/Backend/services/creative_testing_pipeline/docs/architecture/METRICSLITE_PRD.md`

## Feature List
`/Users/isaiahdupree/Documents/Software/metricslite/feature_list.json`

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (shared project `ivhfuhxorppptyuofbgq`)
- **Hosting**: Vercel (cron triggers + serverless functions)
- **APIs**: YouTube Data API v3, TikTok Content API, RapidAPI Instagram, Meta Marketing API v21, TikTok Business API v1.3
- **UI**: Tailwind CSS v4, shadcn/ui

## Shared Supabase Database
All ACTP Lite services share the same Supabase project. Key tables for MetricsLite:
- `actp_organic_posts` — Read: find active posts to collect metrics for
- `actp_ad_deployments` — Read: find active ads to collect metrics for
- `actp_performance_logs` — Write: normalized metric snapshots
- `actp_cron_runs` — Write: cron execution records
- `actp_metric_alerts` — Write: threshold crossing alerts
- `actp_creatives` — Read: link metrics back to creatives

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://ivhfuhxorppptyuofbgq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
METRICSLITE_MASTER_KEY=mlk_...
CRON_SECRET=...
YOUTUBE_API_KEY=...
TIKTOK_ACCESS_TOKEN=...
RAPIDAPI_KEY=...
META_ACCESS_TOKEN=...
TIKTOK_ADS_ACCESS_TOKEN=...
TIKTOK_ADVERTISER_ID=...
```

## Sibling Services (DO NOT REBUILD)
- **MPLite** ✅ — https://mediaposter-lite.vercel.app (organic publish queue)
- **HookLite** ✅ — https://hooklite.vercel.app (webhook receiver)
- **GenLite** — Video generation queue (separate project)
- **AdLite** — Ad deployment queue (separate project)
- **ACTPDash** — Campaign dashboard (separate project)
- **actp-worker** — Local Mac daemon (separate project)

## Key Patterns (follow MPLite/HookLite patterns)
- API key auth with `mlk_` prefix, SHA-256 hashing, Bearer token
- `lib/supabase.ts` for client setup (anon + admin)
- `lib/auth.ts` for key generation/validation
- `lib/api-helpers.ts` for ok()/err() response helpers
- `middleware.ts` protecting API routes, allowing public endpoints
- Dashboard UI with Tailwind + shadcn/ui
- CLI in `cli/metricslite.js`

## Critical Rules
- NEVER use mock data, mock providers, or placeholder implementations
- NEVER hardcode API keys or secrets
- All platform API calls must have proper error handling and rate limit respect
- Metrics must be normalized to a standard format before writing to DB
- Cron endpoints must validate CRON_SECRET header
- All database writes must be idempotent
