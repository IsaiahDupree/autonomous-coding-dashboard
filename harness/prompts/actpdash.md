# ACTPDash — Campaign Management Dashboard

## Purpose
Build a Vercel-deployed Next.js dashboard providing full ACTP campaign lifecycle management. Reads/writes the shared Supabase database and orchestrates actions through all Lite services (MPLite, GenLite, AdLite, MetricsLite, HookLite). Supabase Auth for user authentication. Real-time updates via Supabase Realtime. Part of the ACTP Lite distributed service mesh.

## Project Location
`/Users/isaiahdupree/Documents/Software/actpdash/`

## PRD
`/Users/isaiahdupree/Documents/Software/MediaPoster/Backend/services/creative_testing_pipeline/docs/architecture/ACTPDASH_PRD.md`

## Feature List
`/Users/isaiahdupree/Documents/Software/actpdash/feature_list.json`

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (shared project `ivhfuhxorppptyuofbgq`)
- **Auth**: Supabase Auth (email/password + magic link)
- **Hosting**: Vercel
- **UI**: Tailwind CSS v4, shadcn/ui, Recharts (charts), Lucide (icons)
- **Real-time**: Supabase Realtime subscriptions

## Shared Supabase Database (reads/writes all ACTP tables)
- `actp_campaigns` — CRUD for campaigns
- `actp_rounds` — Round management
- `actp_creatives` — Creative gallery
- `actp_organic_posts` — Publishing status
- `actp_ad_deployments` — Ad status
- `actp_performance_logs` — Metric charts
- `actp_winner_selections` — Winner history
- `actp_metric_alerts` — Alert feed
- `actp_gen_jobs` — Generation status
- `actp_worker_heartbeats` — Worker status

## Service Client URLs (proxied from ACTPDash API routes)
```
MPLITE_URL=https://mediaposter-lite.vercel.app
MPLITE_KEY=mpl_...
GENLITE_URL=https://genlite.vercel.app
GENLITE_KEY=gl_...
ADLITE_URL=https://adlite.vercel.app
ADLITE_KEY=alk_...
METRICSLITE_URL=https://metricslite.vercel.app
METRICSLITE_KEY=mlk_...
HOOKLITE_URL=https://hooklite.vercel.app
HOOKLITE_KEY=hlk_...
```

## Dashboard Pages
- `/` — Campaign list with status, progress, spend
- `/campaigns/new` — Campaign creation wizard
- `/campaigns/[id]` — Campaign detail: rounds, creatives, metrics
- `/creatives` — Grid gallery with thumbnails, scores
- `/creatives/[id]` — Video preview, metrics breakdown
- `/creatives/generate` — Submit to GenLite
- `/publish` — MPLite queue view
- `/ads` — Active ad deployments
- `/ads/rules` — Budget rule editor
- `/analytics` — Cross-creative comparison charts
- `/analytics/winners` — Winner history
- `/system` — All service health dashboard
- `/system/worker` — actp-worker heartbeat

## Sibling Services (DO NOT REBUILD)
- **MPLite** ✅ — https://mediaposter-lite.vercel.app
- **HookLite** ✅ — https://hooklite.vercel.app
- **MetricsLite** — Analytics cron
- **GenLite** — Video generation queue
- **AdLite** — Ad deployment queue
- **actp-worker** — Local Mac daemon

## Critical Rules
- NEVER use mock data, mock providers, or placeholder implementations
- NEVER hardcode API keys or secrets
- Use Supabase Auth (NOT API key auth) for dashboard access
- All service client calls must handle errors gracefully with user-friendly messages
- Supabase Realtime subscriptions for live updates
- Responsive design — usable on mobile
- Use Recharts for all metric charts
- Use shadcn/ui components consistently
