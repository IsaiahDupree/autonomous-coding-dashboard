# ACTP Closed-Loop Architecture

## Overview

The Ad Creative Testing Pipeline (ACTP) is a **10-service distributed system** split between **cloud services** (Vercel + Supabase) and a **local daemon** (actp-worker on macOS). The local machine handles tasks that require native OS access (Remotion rendering, Safari browser automation, Blotato uploads), while the cloud handles everything else.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLOUD (Vercel + Supabase)                     │
│                                                                       │
│  ┌──────────┐  ┌──────────┐  ┌─────────────┐  ┌──────────────┐      │
│  │ ACTPDash │  │ GenLite  │  │ MetricsLite │  │ ResearchLite │      │
│  │ (UI)     │  │ (Gen)    │  │ (Scoring)   │  │ (Research)   │      │
│  └────┬─────┘  └────┬─────┘  └──────┬──────┘  └──────┬───────┘      │
│       │              │               │                │               │
│  ┌────┴─────┐  ┌────┴─────┐  ┌──────┴──────┐  ┌──────┴───────┐      │
│  │ HookLite │  │ AdLite   │  │ PublishLite │  │ ContentLite  │      │
│  │ (Hooks)  │  │ (Ads)    │  │ (Publish)   │  │ (Content)    │      │
│  └──────────┘  └──────────┘  └─────────────┘  └──────────────┘      │
│                                                                       │
│                    ┌──────────────────┐                               │
│                    │  Supabase (DB)   │                               │
│                    │  Shared instance │                               │
│                    └────────┬─────────┘                               │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
                    ╔═════════╧═════════╗
                    ║  Communication    ║
                    ║  Layer            ║
                    ║  (Supabase DB +   ║
                    ║   HTTP APIs)      ║
                    ╚═════════╤═════════╝
                              │
┌─────────────────────────────┼───────────────────────────────────────┐
│                     LOCAL MACHINE (macOS)                             │
│                                                                       │
│                    ┌──────────────────┐                               │
│                    │   actp-worker    │                               │
│                    │   (Python daemon)│                               │
│                    └──┬──────┬──────┬─┘                               │
│                       │      │      │                                 │
│              ┌────────┘      │      └────────┐                       │
│              ▼               ▼               ▼                       │
│     ┌──────────────┐ ┌─────────────┐ ┌─────────────┐               │
│     │  Remotion    │ │   Safari    │ │   Blotato   │               │
│     │  Renderer    │ │  Automation │ │  Uploader   │               │
│     │  (npx)       │ │  (osascript)│ │  (HTTP API) │               │
│     └──────────────┘ └─────────────┘ └─────────────┘               │
│                                                                       │
│     Health Server: http://localhost:8765/health                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Services

### Cloud Services (Vercel)

| Service | Purpose | Key Routes |
|---------|---------|------------|
| **ACTPDash** | Unified dashboard UI | `/`, `/research`, `/content`, `/funnels`, `/api/system/health` |
| **GenLite** | Video generation job queue (Sora, Veo3, Remotion) | `/api/jobs`, `/api/status`, `/api/cron/process-jobs` |
| **AdLite** | Ad operations + graduation pipeline | `/api/actions`, `/api/deployments`, `/api/graduation` |
| **MetricsLite** | Metrics collection + scoring engine | `/api/scores`, `/api/winners`, `/api/timing` |
| **HookLite** | Webhook ingestion + attribution tracking | `/api/hooks/*`, `/api/attribution/*`, `/api/r/[slug]` |
| **ResearchLite** | Market research + blueprint extraction | `/api/research/*`, `/api/blueprints`, `/api/cron/collect-*` |
| **PublishLite** | Organic social publishing + timing optimization | `/api/publish`, `/api/timing`, `/api/cron/publish-scheduled` |
| **ContentLite** | Blueprint→content generation (video/email/blog) | `/api/generate/*`, `/api/cron/generate-variants` |
| **MPLite** | Publishing queue + local machine coordination | `/api/queue/*`, `/api/enqueue` |

### Local Service (macOS daemon)

| Component | Purpose |
|-----------|---------|
| **actp-worker** | Python asyncio daemon running 7 concurrent loops |
| **remotion_runner** | Claims `actp_gen_jobs` with `provider=remotion`, runs `npx remotion render` |
| **safari_executor** | Runs `osascript`-based CLI tools for TikTok/Instagram/YouTube uploads |
| **blotato_executor** | Routes uploads through Blotato's local HTTP API |
| **mplite_poller** | Polls MPLite cloud queue, claims items, routes to Safari/Blotato |
| **service_poller** | Triggers cron endpoints on cloud services (research, scoring, publishing) |
| **metrics_poller** | Triggers MetricsLite metric collection crons |
| **heartbeat** | Writes worker status to `actp_worker_heartbeats` every 30s |
| **health_server** | HTTP server on `:8765` for local health checks |

---

## Communication Patterns

### 1. Cloud → Local (Job Dispatch)

The cloud **never calls the local machine directly** (no inbound connections needed). Instead, the local worker **polls** for work:

```
Cloud                          Local
─────                          ─────
GenLite inserts                actp-worker polls
actp_gen_jobs row     ──DB──>  claim_remotion_job()
(status=pending,               │
 provider=remotion)            ▼
                               run Remotion render
                               │
                               ▼
                     <──DB──   update actp_gen_jobs
                               (status=succeeded,
                                video_url=/path/to.mp4)
```

**MPLite queue pattern** (same pull model):
```
Cloud                          Local
─────                          ─────
PublishLite/MPLite             actp-worker polls
enqueue item         ──API──>  GET /api/queue/next
(status=queued)                │
                               ▼ POST /api/queue/{id}/claim
                               │
                               ▼ Safari or Blotato upload
                               │
                               ▼ POST /api/queue/{id}/complete
                     <──API──  (post_url=https://tiktok.com/...)
```

### 2. Local → Cloud (Results + Orchestration)

The worker pushes results and triggers cloud services:

```
LOCAL actp-worker
     │
     ├── Heartbeat loop (30s) ──DB──> actp_worker_heartbeats
     │
     ├── Remotion loop (10s)  ──DB──> actp_gen_jobs (claim/complete)
     │                        ──DB──> actp_creatives (update video_url)
     │
     ├── MPLite loop (15s)    ──API──> MPLite /api/queue/* (poll/claim/complete/fail)
     │
     ├── Research loop (1hr)  ──API──> ResearchLite /api/cron/collect-hashtags
     │                        ──API──> ResearchLite /api/cron/collect-ads
     │                        ──API──> ResearchLite /api/cron/extract-blueprints
     │
     ├── Scoring loop (30min) ──API──> MetricsLite /api/scores
     │                        ──API──> MetricsLite /api/winners
     │
     ├── Publishing loop (15m)──API──> PublishLite /api/cron/publish-scheduled
     │                        ──API──> ContentLite /api/cron/generate-variants
     │
     └── Metrics loop (5min)  ──API──> MetricsLite /api/cron/organic-metrics
                              ──API──> MetricsLite /api/cron/threshold-check
```

### 3. Cloud ↔ Cloud (Service-to-Service)

Cloud services communicate via:
- **Shared Supabase DB** — all services read/write the same tables
- **Direct HTTP** — ACTPDash calls each service's `/api/health`
- **Webhooks** — HookLite receives from Meta, Stripe, TikTok Ads, MPLite

---

## The Closed Loop

The full autonomous cycle works like this:

```
1. RESEARCH        ResearchLite collects competitor content + ads
       ▼                  (hashtags, Ad Library, engagement data)
2. EXTRACT         ResearchLite extracts creative blueprints
       ▼                  (hook pattern, format, CTA style, timing)
3. GENERATE        ContentLite generates content variants from blueprints
       ▼                  (video scripts, image prompts, email, blog)
4. RENDER          GenLite queues → actp-worker renders via Remotion
       ▼                  (local npx remotion render → video file)
5. PUBLISH         PublishLite schedules → actp-worker uploads via Safari/Blotato
       ▼                  (TikTok, Instagram Reels, YouTube Shorts)
6. MEASURE         MetricsLite collects organic performance metrics
       ▼                  (views, likes, comments, engagement rate)
7. SCORE           MetricsLite scores creatives, identifies winners
       ▼                  (multi-factor: organic + velocity + engagement)
8. GRADUATE        AdLite graduates winners to paid ads ($5 micro-budgets)
       ▼                  (Meta Ads, TikTok Ads — retargeting + lookalike)
9. ATTRIBUTE       HookLite tracks conversions via UTM redirects
       ▼                  (click → page_view → conversion funnel)
10. ITERATE        Loop back to step 1 with new learnings
                          (winning angles feed new research queries)
```

---

## Health Check Architecture

### Three Layers of Health Monitoring

**Layer 1: Cloud Service Health** (ACTPDash `/api/system/health`)
```
ACTPDash calls GET /api/health on each cloud service:
  GenLite      → checks actp_gen_jobs counts, last cron run
  AdLite       → checks actp_ad_actions counts, last cron run
  MetricsLite  → checks collection counts, last cron run
  HookLite     → checks webhook counts, last event
  MPLite       → checks queue depth, active items
  ResearchLite → checks market items, blueprints, last cron
  PublishLite  → checks organic posts, accounts, last cron
  ContentLite  → checks content variants, last cron
```

**Layer 2: Worker Health** (Supabase `actp_worker_heartbeats` table)
```
actp-worker writes every 30s:
  worker_id:      "worker-local-01"
  last_heartbeat: "2026-02-22T17:00:00Z"
  jobs_completed: 142
  status:         "online" | "offline"
  system_info:    { cpu_percent, memory_percent, platform }
```

ACTPDash or any service can check worker health:
```sql
SELECT * FROM actp_worker_heartbeats
WHERE last_heartbeat > now() - interval '2 minutes'
  AND status = 'online';
```

**Layer 3: Local Health Server** (http://localhost:8765/health)
```json
{
  "worker_id": "worker-local-01",
  "status": "online",
  "started_at": "2026-02-22T12:00:00Z",
  "jobs_processed": 142,
  "jobs_running": 1,
  "pending_remotion_jobs": 3,
  "timestamp": "2026-02-22T17:00:00Z"
}
```

### Dead Worker Detection

If `actp_worker_heartbeats.last_heartbeat` is older than 2 minutes:
1. ACTPDash shows worker as **offline** in Pipeline Status
2. Any `actp_gen_jobs` with `status=running` and no progress for 10+ minutes get reset to `pending`
3. MPLite queue items claimed by the dead worker get auto-released after timeout

---

## Database Schema (Shared Supabase)

### Core ACTP Tables
| Table | Purpose |
|-------|---------|
| `actp_campaigns` | Campaign definitions |
| `actp_rounds` | Test rounds within campaigns |
| `actp_creatives` | Generated creatives (video, image, text) |
| `actp_organic_posts` | Published organic posts + metrics |
| `actp_ad_deployments` | Paid ad deployments + metrics |
| `actp_performance_logs` | Time-series metric snapshots |
| `actp_winner_selections` | Archived winners |

### Service Tables
| Table | Service | Purpose |
|-------|---------|---------|
| `actp_gen_jobs` | GenLite | Video generation job queue |
| `actp_ad_actions` | AdLite | Ad operations + graduation records |
| `actp_budget_rules` | AdLite | Budget pacing rules |
| `actp_cron_runs` | All | Cron job execution log |
| `actp_metric_alerts` | MetricsLite | Threshold alerts |
| `actp_content_scores` | MetricsLite | Creative scores |
| `actp_timing_matrix` | MetricsLite/PublishLite | Optimal posting times |
| `actp_webhooks` | HookLite | Webhook event log |
| `actp_attribution_events` | HookLite | Click/conversion tracking |
| `actp_redirect_links` | HookLite | UTM tracked short links |
| `actp_market_items` | ResearchLite | Collected competitor content |
| `actp_creative_blueprints` | ResearchLite | Extracted patterns |
| `actp_content_variants` | ContentLite | Generated content variants |
| `actp_worker_heartbeats` | actp-worker | Worker health |
| `actp_worker_logs` | actp-worker | Worker event log |
| `publish_queue` | MPLite | Publishing queue items |

### Communication Pattern Summary

| Direction | Method | Example |
|-----------|--------|---------|
| Cloud → Local | **DB polling** (pull) | Worker polls `actp_gen_jobs WHERE status=pending` |
| Cloud → Local | **HTTP polling** (pull) | Worker polls `MPLite /api/queue/next` |
| Local → Cloud | **DB write** (push) | Worker updates `actp_gen_jobs SET status=succeeded` |
| Local → Cloud | **HTTP POST** (push) | Worker calls `MPLite /api/queue/{id}/complete` |
| Local → Cloud | **HTTP POST** (push) | Worker triggers `ResearchLite /api/cron/*` |
| Cloud → Cloud | **Shared DB** | All services read/write same Supabase |
| Cloud → Cloud | **HTTP** | ACTPDash calls `/api/health` on each service |
| External → Cloud | **Webhooks** | Meta/Stripe/TikTok → HookLite `/api/hooks/*` |

---

## Environment Variables

### Cloud Services (each needs):
```
NEXT_PUBLIC_SUPABASE_URL=https://ivhfuhxorppptyuofbgq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CRON_SECRET=...
{SERVICE}_MASTER_KEY=...   # e.g. METRICSLITE_MASTER_KEY
```

### Local Worker (actp-worker/.env):
```
SUPABASE_URL=https://ivhfuhxorppptyuofbgq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
WORKER_ID=worker-local-01
WORKER_SECRET=...

# Service URLs + Keys (for triggering crons)
RESEARCHLITE_URL=https://researchlite-*.vercel.app
RESEARCHLITE_KEY=rlk_...
METRICSLITE_URL=https://metricslite-*.vercel.app
METRICSLITE_KEY=mlk_...
PUBLISHLITE_URL=https://publishlite-*.vercel.app
PUBLISHLITE_KEY=plk_...
CONTENTLITE_URL=https://contentlite-*.vercel.app
CONTENTLITE_KEY=clk_...
GENLITE_URL=https://actp-genlite-*.vercel.app
GENLITE_KEY=glk_...
ADLITE_URL=https://adlite-*.vercel.app
ADLITE_KEY=alk_...
MPLITE_URL=https://mediaposter-lite-*.vercel.app
MPLITE_KEY=mpl_...

# Local capabilities
REMOTION_PROJECT_DIR=/path/to/remotion/project
ENABLE_REMOTION_POLLER=true
ENABLE_MPLITE_POLLER=true
ENABLE_METRICS_POLLER=true
ENABLE_RESEARCH_POLLER=true
ENABLE_SCORING_POLLER=true
ENABLE_PUBLISHING_POLLER=true
USE_BLOTATO=false  # true to prefer Blotato over Safari
```

---

## Key Design Decisions

1. **Pull, never push to local** — The local machine is behind NAT/firewall. Cloud never initiates connections. Worker always polls.

2. **Supabase as message bus** — For Remotion jobs, Supabase acts as a durable queue (`actp_gen_jobs`). Atomic claim via `UPDATE ... WHERE status=pending`.

3. **HTTP APIs for orchestration** — For MPLite queue and cron triggers, worker calls cloud REST APIs. This is simpler than WebSockets and survives disconnects.

4. **Heartbeat for liveness** — Worker writes to `actp_worker_heartbeats` every 30s. Cloud services check this for dead worker detection.

5. **Feature flags per loop** — Each worker loop (`ENABLE_*_POLLER`) can be independently toggled. Run minimal loops during development, full set in production.

6. **Idempotent operations** — All cron endpoints and job completions are idempotent. Safe to retry on failure.

7. **Graceful degradation** — If worker goes offline, cloud services continue operating (cron jobs still fire via Vercel Cron). Only Remotion renders and Safari uploads stall.
