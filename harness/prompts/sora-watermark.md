# Sora Watermark Remover (Mobile) - ACD Harness Prompt

## AUTONOMOUS MODE
You are operating autonomously. Do NOT ask what to work on.
Read the feature_list.json, find the first feature where "passes": false, implement it, then move to the next.

## Project Context
Mobile companion app for **BlankLogo** — the production AI video watermark removal service.
Users upload AI-generated videos (Sora, TikTok, Runway, Pika, Kling, Luma) from their phone,
the BlankLogo backend removes the watermark via FFmpeg crop or YOLO/LAMA inpainting, and the
user downloads the clean video.

**Backbone Service (read this code for reference):**
`/Users/isaiahdupree/Documents/Software/WaterMarkRemover - BlankLogo/`
- `apps/api/` — Express.js API (job creation, status, webhooks)
- `apps/worker/src/pipeline/` — FFmpeg + inpainting pipeline steps
- `apps/web/` — Next.js web frontend (reference for UI patterns)
- `supabase/migrations/` — Production database schema (use these exact table names)
- `docs/SORA_WATERMARK_REMOVAL_WORKING_METHOD.md` — FFmpeg crop implementation details
- `docs/WATERMARK_REMOVAL_TECHNIQUES.md` — YOLO/LAMA inpainting architecture

**Tech Stack**: React Native + Expo Router, Supabase, RevenueCat, PostHog

## Database Schema (from BlankLogo — use exact table/column names)

### bl_jobs
```sql
id TEXT PRIMARY KEY
user_id UUID REFERENCES auth.users(id)
batch_id TEXT
status TEXT CHECK (status IN ('queued','processing','completed','failed','cancelled'))
input_url TEXT NOT NULL
input_filename TEXT
input_size_bytes BIGINT
input_duration_sec NUMERIC(10,2)
crop_pixels INTEGER DEFAULT 100
crop_position TEXT DEFAULT 'bottom'
platform TEXT DEFAULT 'custom'
processing_mode TEXT DEFAULT 'crop' CHECK (processing_mode IN ('crop','inpaint','auto'))
output_url TEXT
output_filename TEXT
output_size_bytes BIGINT
webhook_url TEXT
processing_time_ms INTEGER
error_message TEXT
created_at TIMESTAMPTZ DEFAULT NOW()
started_at TIMESTAMPTZ
completed_at TIMESTAMPTZ
expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
```

### bl_user_profiles
```sql
id UUID PRIMARY KEY REFERENCES auth.users(id)
email TEXT UNIQUE
api_key TEXT UNIQUE
plan TEXT DEFAULT 'free' CHECK (plan IN ('free','starter','pro','business'))
credits_remaining INTEGER DEFAULT 3
credits_used_total INTEGER DEFAULT 0
stripe_customer_id TEXT
revenuecat_user_id TEXT
```

### bl_usage_logs
```sql
id UUID DEFAULT gen_random_uuid()
user_id UUID REFERENCES auth.users(id)
job_id TEXT REFERENCES bl_jobs(id)
action TEXT
credits_used INTEGER DEFAULT 1
created_at TIMESTAMPTZ DEFAULT NOW()
```

### bl_platform_presets
```sql
id TEXT PRIMARY KEY  -- 'sora','tiktok','runway','pika','kling','luma','instagram','custom'
name TEXT NOT NULL
crop_pixels INTEGER DEFAULT 100
crop_position TEXT DEFAULT 'bottom'
is_active BOOLEAN DEFAULT true
```

## Platform Crop Configs
| Platform | crop_pixels | crop_position |
|----------|-------------|---------------|
| sora | 100 | bottom |
| tiktok | 80 | bottom |
| runway | 60 | bottom |
| pika | 70 | bottom |
| kling | 90 | bottom |
| luma | 75 | bottom |
| instagram | 50 | bottom |
| custom | user-defined | any |

## BlankLogo API Endpoints (reference apps/api/src/routes/)
- `POST /api/jobs` — create job (input_url, platform, processing_mode, crop_pixels)
- `GET /api/jobs/:id` — get job status
- `GET /api/jobs` — list user's jobs
- `DELETE /api/jobs/:id` — cancel job
- `POST /api/jobs/:id/retry` — retry failed job
- `GET /api/jobs/:id/download` — get signed download URL

## Subscription Tiers (RevenueCat product IDs)
| Tier | Credits/mo | Price | Product ID |
|------|-----------|-------|-----------|
| Free | 3 | $0 | — |
| Starter | 10 | $9/mo | `swr_starter_monthly` |
| Pro | 50 | $29/mo | `swr_pro_monthly` |
| Business | 200 | $79/mo | `swr_business_monthly` |

Annual: `swr_starter_annual` ($90), `swr_pro_annual` ($290), `swr_business_annual` ($790)

## AppKit Integration Reference
Templates at: `/Users/isaiahdupree/Documents/Software/EverReachOrganized/app-kit/templates/`
- `app/_layout.tsx` — Root layout with providers
- `app/paywall.tsx` — RevenueCat paywall screen
- `app/(tabs)/settings.tsx` — Settings + subscription management
- `constants/config.ts` — App config with feature flags
- `services/api.ts` — Supabase API service layer
- `types/models.ts` — Data models

## App-Specific Domain Features (SWR-xxx)
- SWR-001: Create bl_jobs, bl_user_profiles, bl_usage_logs, bl_platform_presets tables
- SWR-002: Video picker from camera roll (expo-image-picker, max 500MB validation)
- SWR-003: Platform selector UI with crop preview (8 platforms + custom)
- SWR-004: Upload video to Supabase Storage → POST /api/jobs to BlankLogo API
- SWR-005: Real-time job status via Supabase Realtime subscription on bl_jobs
- SWR-006: Progress bar with step labels (Queued → Processing → Ready)
- SWR-007: Download processed video to camera roll (expo-media-library)
- SWR-008: Share processed video via iOS/Android share sheet (expo-sharing)
- SWR-009: Batch processing — queue multiple videos simultaneously
- SWR-010: Processing mode selector (Crop vs Inpaint) with credit cost display
- SWR-011: Custom crop pixel override input for power users
- SWR-012: Job history list with status badges, platform icons, download buttons
- SWR-013: Auto-expire display — show days remaining before job deleted
- SWR-014: Retry failed jobs with one tap → POST /api/jobs/:id/retry
- SWR-015: Push notification on job complete (Expo Notifications + Supabase webhook)
- SWR-016: Credits balance in header/profile
- SWR-017: Credit deduction on job submit (check credits_remaining before submit)
- SWR-018: Low credit alert (≤2 remaining) → show upgrade prompt
- SWR-019: RevenueCat paywall (Starter/Pro/Business plans)
- SWR-020: Restore purchases flow
- SWR-021: Usage history screen (bl_usage_logs)
- SWR-022: One-time credit top-up purchase
- SWR-023: Platform auto-detect from video filename patterns
- SWR-024: Crop preview overlay before processing
- SWR-025: Before/after side-by-side video comparison viewer
- SWR-026: Video metadata display (duration, resolution, file size)
- SWR-027: Estimated processing time per platform/mode

## PostHog Analytics Events
Track these events with properties:
- `job_created` {platform, mode, file_size_mb, credits_before}
- `job_completed` {processing_time_ms, platform, mode}
- `job_failed` {error_type, platform}
- `paywall_shown` {trigger: 'low_credits'|'feature_gate'}
- `subscription_started` {plan, price, annual}
- `video_downloaded` {job_id}
- `video_shared` {job_id, destination}

## Rules
1. NO mock data, mock providers, placeholder stubs, or TODO returns in production code
2. All database operations use Supabase with RLS policies (user can only see own bl_jobs)
3. Environment variables for all secrets — never hardcode
4. TypeScript strict mode — no `any` types
5. Reference BlankLogo source code for real API contracts and schema
6. Test each feature before marking passes: true
