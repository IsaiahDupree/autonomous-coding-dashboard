# MPLite — Organic Publishing Queue

## Purpose
Organic publishing queue for ACTP. Manages video post scheduling and execution across TikTok, YouTube, Instagram, Twitter, and Threads. ACTP enqueues posts, local machine (actp-worker) polls, claims, uploads via Safari/Blotato, reports completion. Part of the ACTP Lite distributed service mesh.

## Project Location
`/Users/isaiahdupree/Documents/Software/mediaposter-lite/`

## Feature List
`/Users/isaiahdupree/Documents/Software/mediaposter-lite/feature_list.json`

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (shared project `ivhfuhxorppptyuofbgq`)
- **Hosting**: Vercel
- **UI**: Tailwind CSS v4, shadcn/ui

## Shared Supabase Database
- `publish_queue` — Read/Write: publishing queue items
- `publishing_config` — Read/Write: global config
- `platforms` — Read/Write: platform definitions
- `daily_counters` — Read/Write: daily publish counts
- `schedules` — Read/Write: scheduled posts
- `activity_log` — Write: activity audit trail
- `api_keys` — Read/Write: API key management
- `webhooks` — Read/Write: outbound webhook config

## Existing Implementation
MPLite is fully built and deployed. Check existing code before creating new files.

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://ivhfuhxorppptyuofbgq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
MPLITE_MASTER_KEY=mpl_...
```

## Live URL
https://mediaposter-lite.vercel.app

## Sibling Services (DO NOT REBUILD)
- **HookLite** ✅ — https://hooklite.vercel.app
- **MetricsLite** — Analytics cron
- **GenLite** — Video generation queue
- **AdLite** — Ad deployment queue
- **ACTPDash** — Campaign dashboard
- **actp-worker** — Local Mac daemon (polls MPLite queue)

## Critical Rules
- NEVER use mock data, mock providers, or placeholder implementations
- NEVER hardcode API keys or secrets
- Queue operations must be atomic (claim must prevent double-claim)
- Platform daily limits must be enforced
- All API responses use consistent ok()/err() format
