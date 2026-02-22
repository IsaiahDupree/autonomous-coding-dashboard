# GenLite — Video Generation Job Queue

## Purpose
Build a Vercel-deployed job queue that manages video generation across cloud AI APIs (OpenAI Sora, Google Veo3, Nano Banana) and local Remotion renders. Submits briefs, polls for completion, stores output in Supabase Storage. Local Remotion jobs are picked up by actp-worker. Part of the ACTP Lite distributed service mesh.

## Project Location
`/Users/isaiahdupree/Documents/Software/genlite/`

## PRD
`/Users/isaiahdupree/Documents/Software/MediaPoster/Backend/services/creative_testing_pipeline/docs/architecture/GENLITE_PRD.md`

## Feature List
`/Users/isaiahdupree/Documents/Software/genlite/feature_list.json`

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (shared project `ivhfuhxorppptyuofbgq`)
- **Hosting**: Vercel (serverless + cron)
- **AI APIs**: OpenAI Sora, Google Veo3, Nano Banana
- **Storage**: Supabase Storage for video output
- **UI**: Tailwind CSS v4, shadcn/ui

## Shared Supabase Database
- `actp_gen_jobs` — Read/Write: generation job queue
- `actp_creatives` — Write: update video_url on completion
- `actp_cron_runs` — Write: cron execution records

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://ivhfuhxorppptyuofbgq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GENLITE_MASTER_KEY=gl_...
CRON_SECRET=...
OPENAI_API_KEY=...
GOOGLE_API_KEY=...
NANO_BANANA_API_KEY=...
```

## Sibling Services (DO NOT REBUILD)
- **MPLite** ✅ — https://mediaposter-lite.vercel.app
- **HookLite** ✅ — https://hooklite.vercel.app
- **MetricsLite** — Analytics cron (separate project)
- **AdLite** — Ad deployment (separate project)
- **ACTPDash** — Campaign dashboard (separate project)
- **actp-worker** — Local daemon that picks up Remotion jobs

## Key Patterns (follow MPLite/HookLite)
- API key auth with `gl_` prefix, SHA-256 hashing, Bearer token
- `lib/supabase.ts`, `lib/auth.ts`, `lib/api-helpers.ts`, `middleware.ts`
- Dashboard UI with Tailwind + shadcn/ui
- CLI in `cli/genlite.js`
- Cron endpoints with CRON_SECRET validation

## Critical Rules
- NEVER use mock data, mock providers, or placeholder implementations
- NEVER hardcode API keys or secrets
- Cloud jobs (sora/veo3/nano) submit to provider API then poll via cron
- Local jobs (remotion) marked executor='local' for actp-worker pickup
- All provider API calls must have timeout handling and retry logic
- Videos uploaded to Supabase Storage with public URLs
