# AdLite — Ad Deployment & Budget Management Queue

## Purpose
Build a Vercel-deployed service that manages ad campaign creation, budget scaling, fatigue detection, and spend enforcement on Meta Ads and TikTok Ads platforms. Runs hourly cron jobs for budget pacing and auto-scales winners. Part of the ACTP Lite distributed service mesh.

## Project Location
`/Users/isaiahdupree/Documents/Software/adlite/`

## PRD
`/Users/isaiahdupree/Documents/Software/MediaPoster/Backend/services/creative_testing_pipeline/docs/architecture/ADLITE_PRD.md`

## Feature List
`/Users/isaiahdupree/Documents/Software/adlite/feature_list.json`

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (shared project `ivhfuhxorppptyuofbgq`)
- **Hosting**: Vercel (serverless + cron)
- **Ad APIs**: Meta Marketing API v21, TikTok Business API v1.3
- **UI**: Tailwind CSS v4, shadcn/ui

## Shared Supabase Database
- `actp_ad_actions` — Read/Write: action queue (deploy, scale, pause, kill)
- `actp_ad_deployments` — Read/Write: active ad deployment tracking
- `actp_budget_rules` — Read/Write: auto-scale and spend cap rules
- `actp_metric_alerts` — Write: fatigue/spend alerts
- `actp_cron_runs` — Write: cron execution records
- `actp_creatives` — Read: get video_url for ad creation

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://ivhfuhxorppptyuofbgq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADLITE_MASTER_KEY=alk_...
CRON_SECRET=...
META_ACCESS_TOKEN=...
META_AD_ACCOUNT_ID=act_...
META_APP_SECRET=...
TIKTOK_ADS_ACCESS_TOKEN=...
TIKTOK_ADVERTISER_ID=...
```

## Sibling Services (DO NOT REBUILD)
- **MPLite** ✅ — https://mediaposter-lite.vercel.app
- **HookLite** ✅ — https://hooklite.vercel.app (receives ad platform webhooks)
- **MetricsLite** — Collects ad metrics that AdLite uses for fatigue detection
- **GenLite** — Generates creatives that AdLite deploys as ads
- **ACTPDash** — Dashboard proxies to AdLite for ad management UI

## Key Patterns (follow MPLite/HookLite)
- API key auth with `alk_` prefix, SHA-256 hashing, Bearer token
- `lib/supabase.ts`, `lib/auth.ts`, `lib/api-helpers.ts`, `middleware.ts`
- Dashboard UI with Tailwind + shadcn/ui
- CLI in `cli/adlite.js`
- Cron endpoints with CRON_SECRET validation

## Critical Rules
- NEVER use mock data, mock providers, or placeholder implementations
- NEVER hardcode API keys or secrets
- Ad platform API calls must have comprehensive error handling
- Budget changes must be logged and auditable
- Spend caps MUST be enforced — never exceed by more than 10%
- Fatigue detection must auto-pause ads to protect budget
