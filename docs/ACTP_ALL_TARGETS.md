# ACTP — All Targets & How They Connect

**Date:** February 22, 2026  
**Purpose:** Complete map of every system that participates in the Ad Creative Testing Pipeline, what it does, and how data flows between them.

---

## System Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            EXTERNAL PLATFORMS                                │
│                                                                               │
│  Instagram  TikTok  YouTube  Facebook  Twitter  Threads  LinkedIn  Pinterest │
│  Bluesky    Meta Ads API    TikTok Ads API    Stripe    Sora (ChatGPT)       │
└──────┬──────────┬───────────┬──────────┬──────────┬──────────┬──────────────┘
       │          │           │          │          │          │
       ▼          ▼           ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLOUD SERVICES (Vercel + Supabase)                    │
│                                                                               │
│  ┌────────────┐ ┌────────────┐ ┌──────────────┐ ┌───────────────┐           │
│  │  ACTPDash  │ │  HookLite  │ │ ResearchLite │ │  ContentLite  │           │
│  │  (UI)      │ │  (Webhooks)│ │ (Research)   │ │  (Generation) │           │
│  └─────┬──────┘ └─────┬──────┘ └──────┬───────┘ └───────┬───────┘           │
│        │               │               │                 │                    │
│  ┌─────┴──────┐ ┌──────┴─────┐ ┌──────┴───────┐ ┌──────┴───────┐           │
│  │ MetricsLite│ │  AdLite    │ │ PublishLite  │ │   GenLite    │           │
│  │ (Scoring)  │ │  (Ads)     │ │ (Publishing) │ │   (Jobs)     │           │
│  └────────────┘ └────────────┘ └──────────────┘ └──────┬───────┘           │
│                                                         │                    │
│  ┌────────────┐                                         │                    │
│  │   MPLite   │◄────────────────────────────────────────┘                    │
│  │ (Queue)    │                                                               │
│  └─────┬──────┘     ┌────────────────────────────────┐                       │
│        │             │   Supabase (Shared Database)   │                       │
│        │             │   Project: ivhfuhxorppptyuofbgq│                       │
│        │             └───────────────┬────────────────┘                       │
└────────┼─────────────────────────────┼──────────────────────────────────────┘
         │                             │
         │         ╔═══════════════════╧═══════════════════╗
         │         ║  Worker pulls from DB + HTTP APIs     ║
         │         ╚═══════════════════╤═══════════════════╝
         │                             │
┌────────┼─────────────────────────────┼──────────────────────────────────────┐
│        ▼          LOCAL MACHINE (macOS)                                       │
│  ┌─────────────────────────────────────────────────────┐                     │
│  │                    actp-worker                       │                     │
│  │              (Python asyncio daemon)                 │                     │
│  │  7 polling loops + health server (:8765)             │                     │
│  └──┬──────────────┬──────────────────┬────────────────┘                     │
│     │              │                  │                                        │
│     ▼              ▼                  ▼                                        │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐                              │
│  │ Remotion │  │    Safari    │  │  Blotato  │                              │
│  │ Service  │  │  Automation  │  │  Cloud API│                              │
│  │ (:3100)  │  │  (:7070)     │  │  (v2)     │                              │
│  └──────────┘  └──────────────┘  └───────────┘                              │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────┐            │
│  │                   MediaPoster (Legacy Backend)               │            │
│  │  Python FastAPI — orchestrator, creative engine, ad deployer │            │
│  │  Port :5555   /api/actp/*   96 ACTP routes                  │            │
│  └──────────────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Every Target — What It Does & How It Connects

---

### 1. ACTPDash (Dashboard UI)

| | |
|---|---|
| **Type** | Cloud (Vercel, Next.js) |
| **Repo** | github.com/IsaiahDupree/actpdash |
| **Path** | `/Users/isaiahdupree/Documents/Software/actpdash/` |
| **URL** | https://actpdash-1ktx5ctqk-isaiahduprees-projects.vercel.app |

**Purpose:** Unified control center for the entire ACTP pipeline.

**Pages:**
- `/` — Overview (campaigns, rounds, creatives, organic posts, ads, winners)
- `/research` — Market research items + top blueprints (from ResearchLite)
- `/content` — Content calendar, scheduled posts, content variants (from ContentLite/PublishLite)
- `/funnels` — Attribution events, UTM links, conversion funnel (from HookLite)
- `/campaigns`, `/rounds`, `/creatives`, `/organic`, `/deployments`, `/winners` — ACTP data views
- `/services` — Service status grid
- `/performance` — Performance metrics

**Connections:**
| Connects To | How | Purpose |
|-------------|-----|---------|
| All 8 cloud services | HTTP `GET /api/health` | System health check |
| actp-worker | Reads `actp_worker_heartbeats` table | Worker liveness |
| Supabase | Direct DB queries (server components) | Render all data pages |

---

### 2. GenLite (Video Generation Job Queue)

| | |
|---|---|
| **Type** | Cloud (Vercel, Next.js) |
| **Repo** | github.com/IsaiahDupree/genlite |
| **Path** | `/Users/isaiahdupree/Documents/Software/genlite/` |
| **URL** | https://actp-genlite-bj9s9aswy-isaiahduprees-projects.vercel.app |

**Purpose:** Manages the `actp_gen_jobs` table. Submits jobs to cloud AI providers (Sora API, Veo3, Banana). Remotion jobs are left `pending` for actp-worker to claim locally.

**Key Routes:**
- `POST /api/jobs` — Create a generation job
- `GET /api/jobs/[id]` — Job status
- `POST /api/cron/process-jobs` — Submit pending cloud jobs, poll running jobs
- `GET /api/health` — Health check

**Connections:**
| Connects To | How | Purpose |
|-------------|-----|---------|
| Sora API | HTTP (cloud) | Submit/poll cloud video generation |
| Veo3 API | HTTP (cloud) | Submit/poll cloud video generation |
| actp-worker | Shared DB (`actp_gen_jobs`) | Worker claims `provider=remotion` jobs |
| Supabase | Direct DB | Read/write job records |

---

### 3. AdLite (Ad Operations)

| | |
|---|---|
| **Type** | Cloud (Vercel, Next.js) |
| **Repo** | github.com/IsaiahDupree/adlite |
| **Path** | `/Users/isaiahdupree/Documents/Software/adlite/` |
| **URL** | https://adlite-2t11vefb4-isaiahduprees-projects.vercel.app |

**Purpose:** Manages paid ad deployments. Deploys winning creatives to Meta Ads and TikTok Ads with micro-budgets. Handles budget pacing, fatigue detection, and the organic→paid graduation pipeline.

**Key Routes:**
- `POST /api/actions` — Create ad action
- `GET /api/deployments` — List active ad deployments
- `GET /api/graduation` — Find graduation candidates
- `POST /api/graduation` — Graduate organic winners to paid
- `POST /api/cron/process-actions` — Execute pending ad actions
- `POST /api/cron/budget-pacing` — Check budget pacing
- `POST /api/cron/spend-caps` — Enforce spend caps

**Connections:**
| Connects To | How | Purpose |
|-------------|-----|---------|
| Meta Ads API | HTTP | Create/manage Facebook/Instagram ads |
| TikTok Ads API | HTTP | Create/manage TikTok ads |
| MetricsLite | Shared DB (`actp_winner_selections`) | Read winners for graduation |
| Supabase | Direct DB | Read/write ad actions, deployments, budget rules |

---

### 4. MetricsLite (Metrics Collection + Scoring)

| | |
|---|---|
| **Type** | Cloud (Vercel, Next.js) |
| **Repo** | github.com/IsaiahDupree/metricslite |
| **Path** | `/Users/isaiahdupree/Documents/Software/metricslite/` |
| **URL** | https://metricslite-ea58t3a9r-isaiahduprees-projects.vercel.app |

**Purpose:** Collects organic and paid performance metrics from platform APIs. Runs the content scoring engine to identify winners. Provides timing analysis for optimal posting.

**Key Routes:**
- `GET /api/metrics/[creative_id]` — Creative metrics
- `GET /api/scores` — Score all creatives
- `POST /api/scores` — Score single creative
- `GET /api/winners` — Top winners
- `POST /api/winners` — Archive winners
- `GET /api/timing` — Timing analysis
- `POST /api/timing` — Sync timing matrix to PublishLite
- `POST /api/cron/organic-metrics` — Collect organic metrics
- `POST /api/cron/threshold-check` — Check viral/alert thresholds

**Connections:**
| Connects To | How | Purpose |
|-------------|-----|---------|
| YouTube Data API | HTTP | Fetch video stats (views, likes) |
| TikTok API | HTTP | Fetch video stats |
| Instagram Graph API | HTTP | Fetch reel stats |
| Meta Ads Insights API | HTTP | Fetch ad performance |
| TikTok Ads Reporting API | HTTP | Fetch ad performance |
| PublishLite | Shared DB (`actp_timing_matrix`) | Optimal posting times |
| AdLite | Shared DB (`actp_winner_selections`) | Winner data for graduation |
| Supabase | Direct DB | Read/write performance logs, scores, alerts |

---

### 5. HookLite (Webhooks + Attribution)

| | |
|---|---|
| **Type** | Cloud (Vercel, Next.js) |
| **Repo** | github.com/IsaiahDupree/hooklite |
| **Path** | `/Users/isaiahdupree/Documents/Software/hooklite/` |
| **URL** | https://hooklite-hrvcbd155-isaiahduprees-projects.vercel.app |

**Purpose:** Receives webhooks from external platforms. Provides UTM redirect links, click tracking, and conversion funnel analytics.

**Key Routes:**
- `POST /api/hooks/meta` — Meta webhook receiver
- `POST /api/hooks/stripe` — Stripe webhook receiver
- `POST /api/hooks/tiktok` — TikTok webhook receiver
- `POST /api/hooks/mplite` — MPLite webhook receiver
- `POST /api/hooks/generic` — Generic webhook
- `GET /api/r/[slug]` — UTM redirect link (302 redirect + click tracking)
- `POST /api/attribution/events` — Record attribution event
- `GET /api/attribution/events` — List events
- `POST /api/attribution/redirects` — Create tracked redirect link
- `GET /api/attribution/funnel` — Conversion funnel data

**Connections:**
| Connects To | How | Purpose |
|-------------|-----|---------|
| Meta (inbound) | Webhook POST | Ad status changes, page events |
| Stripe (inbound) | Webhook POST | Payment events |
| TikTok (inbound) | Webhook POST | Ad events |
| MPLite (inbound) | Webhook POST | Publish completion events |
| End users (inbound) | GET `/r/[slug]` | Click tracking via redirect |
| Supabase | Direct DB | Read/write webhooks, attribution events, redirect links |

---

### 6. ResearchLite (Market Research)

| | |
|---|---|
| **Type** | Cloud (Vercel, Next.js) |
| **Repo** | github.com/IsaiahDupree/researchlite |
| **Path** | `/Users/isaiahdupree/Documents/Software/researchlite/` |
| **URL** | https://researchlite-nvn955oaj-isaiahduprees-projects.vercel.app |

**Purpose:** Collects competitor content from Instagram hashtags and Meta Ad Library. Extracts creative blueprints (hook patterns, formats, CTAs) that drive content generation.

**Key Routes:**
- `GET /api/research/hashtags` — Query collected hashtag data
- `GET /api/research/ad-library` — Query collected ads
- `GET /api/blueprints` — List extracted blueprints
- `POST /api/blueprints` — Extract blueprint from content
- `POST /api/cron/collect-hashtags` — Collect IG hashtag media
- `POST /api/cron/collect-ads` — Collect Meta Ad Library ads
- `POST /api/cron/extract-blueprints` — Extract patterns into blueprints

**Connections:**
| Connects To | How | Purpose |
|-------------|-----|---------|
| Instagram Graph API | HTTP | Search hashtags, fetch top/recent media |
| Meta Ad Library API | HTTP | Search competitor ads |
| OpenAI API | HTTP | Extract blueprint patterns from content |
| ContentLite | Shared DB (`actp_creative_blueprints`) | Blueprints feed content generation |
| Supabase | Direct DB | Read/write market items, blueprints |

---

### 7. PublishLite (Organic Publishing)

| | |
|---|---|
| **Type** | Cloud (Vercel, Next.js) |
| **Repo** | github.com/IsaiahDupree/publishlite |
| **Path** | `/Users/isaiahdupree/Documents/Software/publishlite/` |
| **URL** | https://publishlite-3a2em2vff-isaiahduprees-projects.vercel.app |

**Purpose:** Manages organic social media publishing. Schedules posts at optimal times using Thompson Sampling. Routes publishing through MPLite queue for local execution.

**Key Routes:**
- `POST /api/publish` — Publish to Instagram/Facebook
- `POST /api/publish/schedule` — Schedule a post
- `GET /api/timing` — Get timing optimization matrix
- `POST /api/cron/publish-scheduled` — Process scheduled posts
- `POST /api/cron/update-timing` — Update Thompson Sampling model

**Connections:**
| Connects To | How | Purpose |
|-------------|-----|---------|
| Instagram Content Publishing API | HTTP | Direct publish (image, reel, carousel) |
| Facebook Page Publishing API | HTTP | Direct publish (text, photo, video) |
| MPLite | Shared DB (`publish_queue`) | Queue items for local machine publishing |
| MetricsLite | Shared DB (`actp_timing_matrix`) | Optimal timing data |
| Supabase | Direct DB | Read/write organic posts, schedules |

---

### 8. ContentLite (Content Generation)

| | |
|---|---|
| **Type** | Cloud (Vercel, Next.js) |
| **Repo** | github.com/IsaiahDupree/contentlite |
| **Path** | `/Users/isaiahdupree/Documents/Software/contentlite/` |
| **URL** | https://contentlite-bf8rwf8z6-isaiahduprees-projects.vercel.app |

**Purpose:** Generates content variants from creative blueprints. Produces video scripts, image prompts, email newsletters, and SEO blog posts using AI.

**Key Routes:**
- `POST /api/generate/from-blueprint` — Generate video variant from blueprint
- `POST /api/generate/email` — Generate email newsletter from winner
- `POST /api/generate/blog` — Generate SEO blog post from winner
- `POST /api/cron/generate-variants` — Auto-generate variants for top blueprints
- `POST /api/cron/generate-content` — Process queued content generation

**Connections:**
| Connects To | How | Purpose |
|-------------|-----|---------|
| OpenAI API | HTTP | Generate video scripts, email copy, blog posts |
| ResearchLite | Shared DB (`actp_creative_blueprints`) | Read blueprints as input |
| GenLite | Shared DB (`actp_gen_jobs`) | Create render jobs for video variants |
| Supabase | Direct DB | Read/write content variants |

---

### 9. MPLite (Publishing Queue)

| | |
|---|---|
| **Type** | Cloud (Vercel, Next.js) |
| **Repo** | (part of mediaposter-lite) |
| **Path** | `/Users/isaiahdupree/Documents/Software/mediaposter-lite/` |
| **URL** | https://mediaposter-lite-isaiahduprees-projects.vercel.app |

**Purpose:** Durable publishing queue that bridges cloud services and local machine. Cloud services enqueue items; local worker polls, claims, executes (via Safari/Blotato), and reports back.

**Key Routes:**
- `GET /api/queue/next` — Get next queued item (worker polls this)
- `POST /api/queue/[id]/claim` — Worker claims an item
- `POST /api/queue/[id]/complete` — Worker reports success + post URL
- `POST /api/queue/[id]/fail` — Worker reports failure
- `GET /api/queue/stats` — Queue depth and stats
- `GET /api/health` — Health check
- `GET /api/status` — Service status

**Connections:**
| Connects To | How | Purpose |
|-------------|-----|---------|
| actp-worker | HTTP (worker polls) | Worker claims + completes queue items |
| PublishLite | Shared DB (`publish_queue`) | PublishLite enqueues items |
| HookLite | HTTP webhook | Notifies on publish completion |
| Supabase | Direct DB | Read/write queue items, activity log |

---

### 10. actp-worker (Local Daemon)

| | |
|---|---|
| **Type** | Local (Python asyncio) |
| **Repo** | github.com/IsaiahDupree/actp-worker |
| **Path** | `/Users/isaiahdupree/Documents/Software/actp-worker/` |
| **Runs on** | Your Mac (not deployed to cloud) |

**Purpose:** Python daemon running 7 concurrent polling loops. Bridges cloud services with local-only capabilities (Remotion rendering, Safari browser automation, Blotato uploads). Also orchestrates cloud cron jobs.

**Core Modules:**
| Module | Purpose |
|--------|--------|
| `remotion_runner.py` | Renders video via Remotion REST API (`POST /api/v1/render/brief` + poll) |
| `safari_executor.py` | Uploads via Safari HTTP command API (`POST /v1/commands` + poll), Sora gen |
| `blotato_executor.py` | Publishes via Blotato v2 cloud API (CDN upload + `POST /v2/posts`) |
| `video_pipeline.py` | Full lifecycle: render → watermark removal → Supabase Storage → publish |
| `multi_publisher.py` | Smart routing: Blotato (9 platforms) vs Safari (7 platforms) |
| `mplite_poller.py` | Polls MPLite queue, routes through `multi_publisher` |
| `heartbeat.py` | Liveness + local service health (Remotion/Safari/Blotato) |

**Polling Loops:**
| Loop | Interval | What It Does |
|------|----------|-------------|
| Heartbeat | 30s | Writes liveness + local service health to `actp_worker_heartbeats` |
| Remotion | 10s | Claims `actp_gen_jobs` (provider=remotion), renders via REST API |
| MPLite | 15s | Polls MPLite `/api/queue/next`, publishes via multi_publisher |
| Metrics | 5min | Triggers MetricsLite cron endpoints |
| Research | 1hr | Triggers ResearchLite cron endpoints |
| Scoring | 30min | Triggers MetricsLite scoring + winner archival |
| Publishing | 15min | Triggers PublishLite + ContentLite cron endpoints |

**Connections:**
| Connects To | How | Purpose |
|-------------|-----|---------|
| Supabase | Direct DB (Python client) | Claim jobs, write heartbeats, upload to Storage |
| MPLite | HTTP (polling) | Poll/claim/complete queue items |
| ResearchLite | HTTP (cron trigger) | Trigger collection crons |
| MetricsLite | HTTP (cron trigger) | Trigger metric collection + scoring |
| PublishLite | HTTP (cron trigger) | Trigger scheduled publishing |
| ContentLite | HTTP (cron trigger) | Trigger variant generation |
| Remotion Service | REST API (`localhost:3100`) | Render videos via `POST /api/v1/render/brief` |
| Safari Automation | HTTP command API (`localhost:7070`) | Upload videos, Sora gen + watermark removal |
| Blotato | Cloud API (`backend.blotato.com/v2`) | CDN upload + publish to 9 platforms |

---

### 11. Remotion Microservice (Local Video Rendering)

| | |
|---|---|
| **Type** | Local (Node.js HTTP service) |
| **Path** | `/Users/isaiahdupree/Documents/Software/Remotion/` |
| **URL** | `http://localhost:3100` |
| **Auth** | `X-API-Key` header |
| **Start** | `npm run service:start` |

**Purpose:** Full REST API for video rendering, TTS, AI video generation, talking avatars, and static ad images. Has its own job queue with priority, retry, and webhook support.

**Key Endpoints:**
| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /health/ready` | Readiness check with queue stats |
| `POST /api/v1/render/brief` | Render video from JSON brief |
| `POST /api/v1/render/batch` | Batch render multiple videos |
| `POST /api/v1/render/static-ad` | Render static ad images |
| `POST /api/v1/tts/generate` | Text-to-speech (OpenAI/ElevenLabs) |
| `POST /api/v1/tts/voice-clone` | Voice cloning |
| `POST /api/v1/video/generate` | AI video (LTX/Mochi/Wan2.2/Sora) |
| `POST /api/v1/video/image-to-video` | Animate images |
| `POST /api/v1/image/character` | AI character generation (DALL-E) |
| `POST /api/v1/avatar/infinitetalk` | Talking head videos |
| `GET /api/v1/jobs/:id` | Job status + result |

**ACTP Connection:** actp-worker claims `actp_gen_jobs` with `provider=remotion` from Supabase, submits via `POST /api/v1/render/brief`, polls `GET /api/v1/jobs/:id` for completion. Health checked every 30s in heartbeat.

---

### 12. Safari Automation Service (Browser Automation)

| | |
|---|---|
| **Type** | Local (Node.js HTTP + WebSocket) |
| **Path** | `/Users/isaiahdupree/Documents/Software/Safari Automation/` |
| **Control API** | `http://localhost:7070` |
| **Telemetry WS** | `ws://localhost:7071` |
| **Start** | `cd packages/protocol && npm run start` |

**Purpose:** Browser automation for platforms that don't have APIs. Generates Sora videos via sora.chatgpt.com, uploads to TikTok/Instagram/YouTube via AppleScript, removes watermarks.

**Key Endpoints:**
| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /ready` | Readiness (database, safari, selectors) |
| `POST /v1/commands` | Submit command → 202 + command_id |
| `GET /v1/commands/:id` | Command status + result |
| `GET /v1/sora/usage` | Sora generation limits |
| `ws://localhost:7071/v1/stream` | Real-time telemetry events |

**Command Types:** `sora.generate`, `sora.generate.clean`, `sora.batch.clean`, `sora.clean`

**Platform Automations:**
| Platform | Script | Capability |
|----------|--------|-----------|
| TikTok | `safari_tiktok_cli.py` | Video upload |
| Instagram | `safari_instagram_poster.py` | Reel upload |
| YouTube | `safari_youtube_uploader` | Shorts upload |
| Twitter/X | `safari_twitter_poster.py` | Tweet + DMs |
| Threads | `safari_threads_poster.py` | Posts |
| Reddit | `safari_reddit_poster.py` | Posts |
| Sora | `sora_full_automation.py` | Video generation + watermark removal |

**ACTP Connection:** actp-worker submits commands via `POST /v1/commands` and polls `GET /v1/commands/:id`. Supports 7 upload platforms + Sora video generation with watermark removal. Health/readiness checked every 30s via `/ready`.

---

### 13. Blotato (Cloud Publishing API)

| | |
|---|---|
| **Type** | External Cloud API |
| **Base URL** | `https://backend.blotato.com/v2` |
| **Auth** | `blotato-api-key` header |
| **Docs** | https://help.blotato.com/api/api-reference |

**Purpose:** Cloud-based social media publishing to 9 platforms. Also provides AI video creation (POV, narrated, slideshow). No local server needed — it's a pure cloud API.

**Key Endpoints:**
| Endpoint | Description | Rate Limit |
|----------|-------------|------------|
| `POST /v2/media` | Upload media → Blotato CDN URL | 10/min |
| `POST /v2/posts` | Publish/schedule to any platform | 30/min |
| `POST /v2/videos/creations` | Create AI video | 1/min |
| `GET /v2/videos/creations/:id` | Video generation status | — |

**9 Supported Platforms:** Twitter, Instagram, TikTok, YouTube, Facebook, LinkedIn, Pinterest, Threads, Bluesky

**ACTP Connection:** actp-worker uploads media to Blotato CDN via `POST /v2/media`, then publishes via `POST /v2/posts` with platform-specific target configs. Handles all 9 platforms including LinkedIn, Pinterest, Bluesky (which Safari can't reach). `multi_publisher.py` auto-routes to Blotato or Safari based on platform and availability.

---

### 14. MediaPoster (Legacy Python Backend)

| | |
|---|---|
| **Type** | Local (Python FastAPI) |
| **Path** | `/Users/isaiahdupree/Documents/Software/MediaPoster/` |
| **URL** | `http://localhost:5555` |
| **ACTP Routes** | 96 endpoints under `/api/actp/*` |

**Purpose:** The original ACTP implementation. Contains the full orchestrator, creative engine, ad deployer, winner selector, organic publisher, analytics collector, iteration engine, and monitoring system. Now being decomposed into the Lite microservices.

**Key ACTP Components:**
| File | Purpose |
|------|---------|
| `orchestrator.py` | Main campaign loop controller |
| `creative_engine.py` | Generate creatives from blueprints |
| `organic_publisher.py` | Publish to social platforms |
| `analytics_collector.py` | Collect metrics from platforms |
| `winner_selector.py` | Thompson Sampling winner selection |
| `ad_deployer.py` | Deploy winning creatives as paid ads |
| `iteration_engine.py` | Iterate on winners to find new angles |
| `mplite_client.py` | Client for MPLite queue |
| `mplite_publisher.py` | Publisher via MPLite |
| `integration.py` | MPLiteBridge for ACTP↔MPLite sync |

**ACTP Connection:** This is the monolithic predecessor. The Lite services are replacing it piece by piece. It still has the most complete implementation of the full loop. Key patterns were extracted into the Lite services.

---

### 15. WaterMarkRemover / BlankLogo (Video Processing)

| | |
|---|---|
| **Type** | Local + Modal (serverless) |
| **Path** | `/Users/isaiahdupree/Documents/Software/WaterMarkRemover - BlankLogo/` |
| **Local API** | `http://localhost:7070` (when via Safari Automation) |
| **Modal API** | `https://isaiahdupree33--blanklogo-watermark-removal-process-video-http.modal.run` |

**Purpose:** AI-powered watermark removal from videos (Sora, TikTok, Runway watermarks). Uses inpainting to intelligently remove watermarks.

**Key Endpoints:**
| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/video/process` | Process video (inpaint/crop/auto) |
| `GET /api/v1/jobs/:id` | Job status + processed video path |

**ACTP Connection:** Part of the video pipeline. After Sora generates a video (via Safari Automation), the watermark is removed before publishing. Connected via Safari Automation's `sora.generate.clean` command which auto-chains generation → download → watermark removal.

---

### 16. WaitlistLab (Landing Pages + Offers)

| | |
|---|---|
| **Type** | Cloud (deployed app) |
| **Path** | `/Users/isaiahdupree/Documents/Software/WaitlistLabapp/` |

**Purpose:** Landing page and offer management. ACTP can drive traffic to WaitlistLab landing pages via HookLite UTM redirect links, then track conversions back through the attribution funnel.

**ACTP Connection:**
| Connection | How |
|------------|-----|
| HookLite → WaitlistLab | UTM redirect links drive traffic to landing pages |
| WaitlistLab → HookLite | Conversion events (signup, purchase) sent via webhook |
| AdLite | Paid ads point to WaitlistLab landing pages |

---

### 17. Supabase (Shared Database)

| | |
|---|---|
| **Type** | Cloud (hosted Postgres) |
| **Project ID** | `ivhfuhxorppptyuofbgq` |

**Purpose:** Single shared database that all services read/write. Acts as the message bus between cloud services and the local worker.

**Key Tables:**
| Table | Primary Writer(s) | Primary Reader(s) |
|-------|-------------------|-------------------|
| `actp_campaigns` | ACTPDash, MediaPoster | All services |
| `actp_rounds` | MediaPoster, orchestrator | All services |
| `actp_creatives` | ContentLite, GenLite | All services |
| `actp_gen_jobs` | GenLite, ContentLite | actp-worker (claims remotion) |
| `actp_organic_posts` | PublishLite, actp-worker | MetricsLite, ACTPDash |
| `actp_ad_deployments` | AdLite | MetricsLite, ACTPDash |
| `actp_performance_logs` | MetricsLite | ACTPDash, AdLite |
| `actp_content_scores` | MetricsLite | AdLite (graduation) |
| `actp_winner_selections` | MetricsLite | AdLite, ContentLite |
| `actp_market_items` | ResearchLite | ACTPDash |
| `actp_creative_blueprints` | ResearchLite | ContentLite |
| `actp_content_variants` | ContentLite | PublishLite, ACTPDash |
| `actp_timing_matrix` | MetricsLite | PublishLite |
| `actp_webhooks` | HookLite | ACTPDash |
| `actp_attribution_events` | HookLite | ACTPDash |
| `actp_redirect_links` | HookLite | HookLite (redirects) |
| `actp_metric_alerts` | MetricsLite | ACTPDash |
| `actp_cron_runs` | All services | ACTPDash |
| `actp_worker_heartbeats` | actp-worker | ACTPDash |
| `actp_worker_logs` | actp-worker | ACTPDash |
| `publish_queue` | PublishLite, MPLite | actp-worker (via MPLite API) |

---

## The Complete Data Flow

```
 ┌─── RESEARCH ──────────────────────────────────────────────────────────┐
 │                                                                        │
 │  ResearchLite collects from:                                          │
 │    • Instagram Graph API (hashtag search → top/recent media)          │
 │    • Meta Ad Library API (competitor ad creatives)                     │
 │  Stores → actp_market_items                                           │
 │  Extracts → actp_creative_blueprints (hook, format, CTA, timing)      │
 │                                                                        │
 └──────────────────────────────┬─────────────────────────────────────────┘
                                ▼
 ┌─── GENERATE ──────────────────────────────────────────────────────────┐
 │                                                                        │
 │  ContentLite reads blueprints, generates:                             │
 │    • Video scripts + image prompts → actp_content_variants            │
 │    • Email newsletters                                                 │
 │    • SEO blog posts                                                    │
 │  Creates render jobs → actp_gen_jobs                                   │
 │                                                                        │
 └──────────────────────────────┬─────────────────────────────────────────┘
                                ▼
 ┌─── RENDER ────────────────────────────────────────────────────────────┐
 │                                                                        │
 │  GenLite routes by provider:                                          │
 │    • provider=sora → Sora API (cloud)                                 │
 │    • provider=veo3 → Veo3 API (cloud)                                 │
 │    • provider=remotion → actp-worker claims locally                   │
 │  actp-worker → Remotion Service (:3100) → rendered MP4               │
 │  Optional: Safari Automation → Sora browser gen → watermark removal   │
 │                                                                        │
 └──────────────────────────────┬─────────────────────────────────────────┘
                                ▼
 ┌─── PUBLISH ───────────────────────────────────────────────────────────┐
 │                                                                        │
 │  PublishLite schedules at optimal times (Thompson Sampling)           │
 │  Routes through:                                                       │
 │    Path A: MPLite queue → actp-worker → Safari Automation (local)     │
 │    Path B: MPLite queue → actp-worker → Blotato cloud API             │
 │    Path C: Direct Instagram/Facebook API (cloud, no local needed)     │
 │  Platforms: TikTok, Instagram, YouTube, Twitter, Threads, Facebook,   │
 │             LinkedIn, Pinterest, Bluesky                               │
 │                                                                        │
 └──────────────────────────────┬─────────────────────────────────────────┘
                                ▼
 ┌─── MEASURE ───────────────────────────────────────────────────────────┐
 │                                                                        │
 │  MetricsLite collects from platform APIs:                             │
 │    • YouTube Data API (views, likes, comments)                        │
 │    • TikTok API (views, shares, engagement)                           │
 │    • Instagram Insights API (reach, impressions)                      │
 │    • Meta Ads Insights (impressions, clicks, spend, conversions)      │
 │    • TikTok Ads Reporting (impressions, clicks, spend)                │
 │  Stores → actp_performance_logs (time-series)                         │
 │                                                                        │
 └──────────────────────────────┬─────────────────────────────────────────┘
                                ▼
 ┌─── SCORE + SELECT WINNERS ────────────────────────────────────────────┐
 │                                                                        │
 │  MetricsLite scoring engine evaluates:                                │
 │    • Organic engagement (30%): views, likes, comments, shares         │
 │    • Paid performance (25%): CTR, CPA, ROAS                          │
 │    • Velocity (20%): growth rate in first 24h                         │
 │    • Engagement rate (15%)                                             │
 │    • Cross-platform consistency (10%)                                  │
 │  Winners (score ≥ 60) → actp_winner_selections                       │
 │                                                                        │
 └──────────────────────────────┬─────────────────────────────────────────┘
                                ▼
 ┌─── GRADUATE TO PAID ──────────────────────────────────────────────────┐
 │                                                                        │
 │  AdLite graduation pipeline:                                          │
 │    • Finds winners not yet graduated                                   │
 │    • Creates retargeting + lookalike campaigns                        │
 │    • Deploys with $5 micro-budgets                                    │
 │    • Meta Ads API + TikTok Ads API                                    │
 │  Stores → actp_ad_deployments, actp_ad_actions                        │
 │                                                                        │
 └──────────────────────────────┬─────────────────────────────────────────┘
                                ▼
 ┌─── ATTRIBUTE ─────────────────────────────────────────────────────────┐
 │                                                                        │
 │  HookLite tracks the full funnel:                                     │
 │    • UTM redirect links (/r/slug → destination with tracking)         │
 │    • Click events, page views, conversions                            │
 │    • Webhook receivers (Meta, Stripe, TikTok callbacks)               │
 │  Funnel: impression → click → page_view → conversion                  │
 │  Drives traffic to: WaitlistLab landing pages, product pages          │
 │                                                                        │
 └──────────────────────────────┬─────────────────────────────────────────┘
                                ▼
 ┌─── ITERATE ───────────────────────────────────────────────────────────┐
 │                                                                        │
 │  Winning angles feed back into ResearchLite:                          │
 │    • Top-performing hooks → new hashtag research queries              │
 │    • Best formats → bias blueprint extraction                         │
 │    • Timing data → optimize next publish schedule                     │
 │  LOOP BACK TO STEP 1                                                   │
 │                                                                        │
 └───────────────────────────────────────────────────────────────────────┘
```

---

## Target Count Summary

| Category | Targets | Names |
|----------|---------|-------|
| **Cloud Services** | 9 | ACTPDash, GenLite, AdLite, MetricsLite, HookLite, ResearchLite, PublishLite, ContentLite, MPLite |
| **Local Daemon** | 1 | actp-worker |
| **Local Services** | 2 | Remotion Microservice (:3100), Safari Automation (:7070) |
| **External APIs** | 1 | Blotato (backend.blotato.com/v2) |
| **Legacy Backend** | 1 | MediaPoster (localhost:5555) |
| **Video Processing** | 1 | WaterMarkRemover / BlankLogo (Modal + local) |
| **Landing Pages** | 1 | WaitlistLab |
| **Database** | 1 | Supabase (ivhfuhxorppptyuofbgq) |
| **Total** | **17** | |

### External Platform APIs Consumed

| Platform | Used By | Purpose |
|----------|---------|---------|
| Instagram Graph API | ResearchLite, MetricsLite, PublishLite | Research, metrics, direct publish |
| Meta Ad Library API | ResearchLite | Competitor ad research |
| Meta Ads API | AdLite, MetricsLite | Deploy ads, collect ad metrics |
| TikTok API | MetricsLite | Organic video metrics |
| TikTok Ads API | AdLite, MetricsLite | Deploy ads, collect ad metrics |
| YouTube Data API | MetricsLite | Video stats |
| Facebook Page API | PublishLite | Direct publish |
| OpenAI API | ResearchLite, ContentLite, Remotion | Blueprint extraction, content gen, TTS |
| ElevenLabs API | Remotion | Voice cloning, TTS |
| Stripe | HookLite (webhook) | Payment event tracking |
| Sora (chatgpt.com) | Safari Automation | Video generation via browser |
| Blotato API | actp-worker | Multi-platform publishing |
