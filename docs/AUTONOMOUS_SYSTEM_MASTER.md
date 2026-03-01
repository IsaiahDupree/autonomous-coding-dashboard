# Autonomous Business System — Master Documentation

> **Last updated**: March 2026 | **Owner**: Isaiah Dupree  
> **Purpose**: Single source of truth — architecture, integrations, business functions, feedback loops, gaps, and roadmap to full autonomy.

---

## Table of Contents

1. [Vision & Business Goals](#1-vision--business-goals)
2. [System Architecture](#2-system-architecture)
3. [Full Stack Inventory](#3-full-stack-inventory)
4. [Business Function Matrix](#4-business-function-matrix)
5. [Platform Integration Status](#5-platform-integration-status)
6. [Content Marketing Pipeline](#6-content-marketing-pipeline)
7. [Lead Generation & Sales Pipeline](#7-lead-generation--sales-pipeline)
8. [Code Delivery Pipeline](#8-code-delivery-pipeline)
9. [Feedback Loop Architecture](#9-feedback-loop-architecture)
10. [YouTube Integration](#10-youtube-integration)
11. [Gmail Integration](#11-gmail-integration)
12. [Data Signal Inventory](#12-data-signal-inventory)
13. [Gap Analysis & Roadmap](#13-gap-analysis--roadmap)
14. [Self-Improvement Loop](#14-self-improvement-loop)
15. [Integration Test Checklist](#15-integration-test-checklist)
16. [Operations Runbook](#16-operations-runbook)

---

## 1. Vision & Business Goals

### The Mission

Run a software business autonomously — marketing, lead generation, outreach, deal closure, code delivery, and self-improvement — with minimal human intervention. Human input is reserved for creative direction, high-stakes decisions, and edge cases.

### Revenue Streams

| Stream | Mechanism | Status |
|---|---|---|
| SaaS App Sales | Rork/Expo apps → App Store → RevenueCat/Superwall | ACD building 43 apps |
| Freelance/Agency | Upwork proposals + code delivery | ✅ Operational |
| Content Monetization | Viral content → audience → product sales | ✅ Pipeline operational |
| Info Products | Creator Growth Kit, ACTP System, Safari Automation | Offers seeded |
| AI Automation Services | LinkedIn B2B prospecting → discovery calls | ✅ Operational |

### The 10 Core Autonomy Requirements

The system must be able to:

1. **Research** — scan what's working in target niches (competitor posts, trends, top creators)
2. **Create** — generate video, copy, and code from research blueprints
3. **Publish** — post to all platforms at AI-optimized times
4. **Engage** — reply to comments and DMs, maintain conversations
5. **Qualify** — score leads from DMs, comments, connection requests, emails
6. **Convert** — move qualified leads from contact → call → deal
7. **Deliver** — ship code, reports, and content deliverables to clients
8. **Measure** — collect performance data from every action
9. **Learn** — identify what worked → do more; what failed → stop
10. **Self-improve** — apply the same loop to its own codebase (ACD)

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ACTP BRAIN (Cloud / Vercel)                  │
│  WorkflowEngine  ContentLite  ResearchLite  PublishLite          │
│  GenLite  MetricsLite  AdLite  MPLite  ACTPDash                 │
│  └─────── All share: Supabase ivhfuhxorppptyuofbgq ───────────┘  │
└─────────────────────────────────────────────────────────────────┘
                         ▲ ▼  REST / Supabase
┌─────────────────────────────────────────────────────────────────┐
│               ACTP WORKER (Local Python Daemon)                  │
│  worker.py  |  33+ cron jobs  |  21+ workflow executors         │
│  Clients: market_research, cloud_sync, linkedin, upwork,        │
│           dm_outreach, blotato, remotion, firefly, sora,        │
│           mplite, youtube (NEW), gmail (NEW)                    │
│  Telegram bot + AI engine (tool-calling, multi-platform DMs)    │
└─────────────────────────────────────────────────────────────────┘
                         ▲ ▼  HTTP localhost
┌─────────────────────────────────────────────────────────────────┐
│          SAFARI AUTOMATION SERVICES (Local Node.js)              │
│  3001: Instagram DM    3003: Twitter DM    3102: TikTok DM      │
│  3004: Threads         3005: IG Comments   3006: TT Comments    │
│  3007: TW Comments     3105: LinkedIn      3106: Market Research │
│  3108: Upwork          3200: Cloud Sync (platform poller)       │
└─────────────────────────────────────────────────────────────────┘
                         ▲ ▼  Safari browser tabs
┌─────────────────────────────────────────────────────────────────┐
│     PLATFORMS: IG  TW  TT  Threads  LinkedIn  YouTube  Gmail    │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Principles

- **Local worker** handles Safari browser automation and local file operations
- **Cloud services** handle AI generation, scheduling, scoring, and orchestration
- **Supabase** is the single shared data layer — all services read/write the same DB
- **Cloud Sync** (port 3200) continuously polls all platform services → Supabase
- **Workflow Engine** orchestrates multi-step pipelines as DAGs
- **Everything is pull-based** — workers poll for tasks rather than waiting for push

---

## 3. Full Stack Inventory

### Cloud Services (Vercel)

| Service | Status | Purpose |
|---|---|---|
| Workflow Engine | ✅ Live | DAG orchestration (14 routes, 5 tables) |
| ContentLite | ✅ Live | Content generation (scripts, tweets, descriptions) |
| ResearchLite | ✅ Live | Market research + blueprint extraction |
| PublishLite | ✅ Live | Scheduling + Thompson Sampling timing |
| MediaPoster Lite (MPLite) | ✅ Live | Multi-platform publish queue |
| GenLite | ✅ Live | Remotion template registry |
| MetricsLite | ✅ Live | Post scoring + winner archive |
| AdLite | ✅ Live | Paid ad management |
| ACTPDash | ✅ Live | Dashboard |
| HookLite | ⚠️ Auth issue | Attribution tracking (fix: disable Vercel auth) |

### Local Safari Automation Services

| Port | Service | Status |
|---|---|---|
| 3001 | Instagram DM | ✅ Operational |
| 3003 | Twitter DM | ✅ Operational |
| 3102 | TikTok DM | ✅ Operational (OS-level click verified) |
| 3105 | LinkedIn | ✅ Operational |
| 3004 | Threads Comments | ✅ Operational |
| 3005 | Instagram Comments | ✅ Operational |
| 3006 | TikTok Comments | ✅ Operational |
| 3007 | Twitter Comments | ✅ Operational |
| 3106 | Market Research | ✅ Operational (5 platforms, 1000 posts/niche) |
| 3108 | Upwork | ✅ Operational |
| 3200 | Cloud Sync | ✅ Operational |

### Executor Registry (workflow_executors.py)

| task_type | Executor | Actions |
|---|---|---|
| safari_research | SafariResearchExecutor | research niche content |
| remotion_render | RemotionRenderExecutor | render video from brief |
| blotato_multi_publish | BlotatoMultiPublishExecutor | publish to TT/YT/IG/FB |
| save_content | SaveContentExecutor | save to actp_published_content |
| market_research | MarketResearchExecutor | search, niche, full, cross-platform |
| feedback_loop | FeedbackLoopExecutor | register, checkbacks, analyze, strategy |
| universal_feedback | UniversalFeedbackExecutor | all-platform feedback cycles |
| cloud_sync | CloudSyncExecutor | dms, notifications, posts, brief, analytics |
| send_dm | SendDmExecutor | send DM on any platform |
| crm_dm_sync | CrmDmSyncExecutor | sync conversations to CRM |
| linkedin | LinkedInExecutor | prospect, connect, message, campaign |
| upwork | UpworkExecutor | search, score, propose, submit, track |
| dm_outreach | DmOutreachExecutor | unified DM outreach across platforms |
| safari_comments | SafariCommentsExecutor | post comments, engagement sessions |
| firefly | FireflyExecutor | AI image generation |
| sora_generate | SoraGenerateExecutor | AI video generation |
| media_poster | MediaPosterExecutor | MPLite queue management |
| youtube | YoutubeExecutor | stats, analytics, brief (NEW) |
| gmail | GmailExecutor | inbox, classify, reply, CRM sync (NEW) |

### Supabase Tables (ivhfuhxorppptyuofbgq) — Key Tables

**CRM:** `crm_contacts` (520), `crm_conversations`, `crm_messages`, `crm_message_queue`, `crm_score_history`, `linkedin_prospects`

**Platform Sync:** `platform_poll_state`, `platform_dms`, `platform_notifications`, `post_stats`, `post_stats_history`, `cloud_action_queue`, `content_learnings`, `linkedin_invitations`

**Content Pipeline:** `actp_feedback_posts`, `actp_feedback_strategy`, `actp_niche_config`, `actp_twitter_research`, `actp_twitter_queue`, `actp_twitter_frameworks`, `actp_twitter_creators`, `actp_twitter_playbook`, `actp_published_content`, `actp_platform_research`, `actp_platform_creators`

**Workflow:** `actp_workflow_definitions`, `actp_workflow_executions`, `actp_workflow_steps`, `actp_workflow_tasks`, `actp_worker_registrations`

**Business:** `actp_accounts` (6 platforms), `actp_offers` (3 offers), `actp_keyword_watchlist`, `actp_dm_outreach_queue`

**Analytics:** `actp_video_analysis`, `actp_content_reviews`, `actp_review_rubrics`, `actp_remotion_templates`, `actp_publish_schedule`

**NEW (to add):** `youtube_video_stats`, `gmail_emails`

---

## 4. Business Function Matrix

| Function | Automated | Systems | Gaps |
|---|---|---|---|
| Competitor research | ✅ Full | Market Research (3106), ResearchLite | — |
| Content brief generation | ✅ Full | ContentLite + cloud_sync analytics | — |
| Video script writing | ✅ Full | ContentLite /generate/* | — |
| Video rendering | ✅ Full | Remotion + GenLite | — |
| Image generation | ✅ Full | Firefly, Sora | — |
| Multi-platform publishing | ✅ Full | Blotato, MPLite, Safari | — |
| Optimal post timing | ✅ Full | Thompson Sampling in PublishLite | — |
| Post performance tracking | ✅ Full | Cloud Sync, UniversalFeedbackExecutor | Watch time, CTR |
| Content improvement loop | ✅ Full | FeedbackLoopExecutor, ContentLite | — |
| DM outreach | ✅ Full | DM services 3001/3003/3102/3105 | Intent classification |
| DM inbox monitoring | ✅ Full | Cloud Sync (60s poll) | Auto-reply AI |
| Comment posting | ✅ Full | Comments services 3004-3007 | — |
| Comment sentiment reading | ⚠️ Partial | Text collected, not classified | NLP classifier needed |
| LinkedIn prospecting | ✅ Full | li_prospect.py + LinkedIn (3105) | Live connect test |
| LinkedIn outreach campaigns | ✅ Full | LinkedInExecutor + crm_brain.py | — |
| Upwork scanning | ✅ Full | UpworkExecutor (3108) | — |
| Upwork proposals | ✅ Full | Battle-tested end-to-end | — |
| CRM contact scoring | ✅ Full | crm_brain.py → Claude AI 0-100 | — |
| Lead qualification | ⚠️ Partial | CRM score only | DM intent routing needed |
| Deal pipeline tracking | ⚠️ Partial | linkedin_prospects stages | Email/calendar missing |
| Client email threading | ❌ Missing | — | Gmail integration needed |
| Email lead capture | ❌ Missing | — | Gmail integration needed |
| YouTube stats collection | ❌ Missing | — | YouTube API client needed |
| YouTube feedback loop | ❌ Missing | — | YouTube Analytics needed |
| Code delivery (repo build) | ✅ Full | ACD harness | — |
| Code shipping (deploy) | ✅ Full | vercel --yes --prod | — |
| App Store delivery | ⚠️ Partial | 43 repos queued (P1-P46) | ACD processing |
| Paid ad management | ⚠️ Partial | AdLite scaffold | Meta Ads API |
| Attribution tracking | ⚠️ Partial | HookLite (auth issue) | Fix auth |
| Self-improvement (code) | ✅ Full | ACD queue, 43 repos | — |
| Memory & learning | ✅ Full | EchoVault 3-layer system | — |
| System health monitoring | ✅ Full | heartbeat_agent.py every 30min | — |
| Natural language control | ✅ Full | Telegram bot + AI tool-calling | — |

---

## 5. Platform Integration Status

### Instagram

| Capability | Status | Method |
|---|---|---|
| Send DM | ✅ | Safari port 3001 |
| List conversations | ✅ | Safari port 3001 |
| Post comment | ✅ | Safari port 3005 |
| Post stats (likes/comments/shares) | ✅ | Cloud Sync |
| Notifications (follows/mentions) | ✅ | Cloud Sync |
| Watch time / reach / impressions | ❌ | Needs IG Insights scrape |
| Story analytics | ❌ | Needs IG Insights scrape |
| Follower attribution | ❌ | Needs activity feed scrape |

### Twitter / X

| Capability | Status | Method |
|---|---|---|
| Send DM | ✅ | Safari port 3003 |
| Post tweet / reply | ✅ | Safari port 3007 |
| Research tweets | ✅ | Safari port 3007 |
| Track tweet stats | ✅ | Cloud Sync (1hr/4hr/24hr checkbacks) |
| Feedback loop | ✅ | FeedbackLoopExecutor |
| Tweet impressions | ❌ | Needs Twitter Analytics scrape |

### TikTok

| Capability | Status | Method |
|---|---|---|
| Send DM | ✅ | Safari port 3102 (OS-level click) |
| Post comment | ✅ | Safari port 3006 |
| Research niche videos | ✅ | Market Research (3106) |
| Video stats (views/likes/shares) | ✅ | Cloud Sync |
| Watch time / completion rate | ❌ | Needs TikTok Studio scrape |
| Traffic source breakdown | ❌ | Needs TikTok Studio scrape |
| Audience demographics | ❌ | Needs TikTok Studio scrape |

### LinkedIn

| Capability | Status | Method |
|---|---|---|
| Connection request | ✅ | Safari port 3105 |
| Send DM / InMail | ✅ | Safari port 3105 |
| AI-generated outreach | ✅ | Safari port 3105 |
| Profile search + ICP scoring | ✅ | li_prospect.py (osascript) |
| Invitation tracking (sent/received) | ✅ | Cloud Sync → linkedin_invitations |
| Post engagement (likes/comments) | ❌ | Not implemented |
| Profile visit count | ❌ | Needs LI Dashboard scrape |

### YouTube

| Capability | Status | Method |
|---|---|---|
| Video upload | ✅ | Blotato account 228 |
| Video stats (views/likes/comments) | ❌ | YouTube Data API v3 (NEW) |
| Watch time / avg view duration | ❌ | YouTube Analytics API (NEW) |
| CTR (impressions → clicks) | ❌ | YouTube Analytics API (NEW) |
| Traffic source breakdown | ❌ | YouTube Analytics API (NEW) |
| Subscriber delta | ❌ | YouTube Data API v3 (NEW) |
| Revenue / RPM | ❌ | YouTube Analytics API (NEW) |

### Gmail

| Capability | Status | Method |
|---|---|---|
| Read inbox (lead capture) | ❌ | Gmail API (NEW) |
| Classify emails (lead/client/spam) | ❌ | Claude AI classification (NEW) |
| Reply / send email | ❌ | Gmail API (NEW) |
| Sync to CRM | ❌ | Gmail API + Supabase (NEW) |
| Thread history for context | ❌ | Gmail API (NEW) |

### Upwork

| Capability | Status | Method |
|---|---|---|
| Search + score jobs | ✅ | Safari port 3108 |
| Generate AI proposal | ✅ | UpworkExecutor |
| Submit proposal | ✅ | Safari port 3108 (battle-tested) |
| Track applications | ✅ | UpworkExecutor |
| Client messaging | ✅ | Safari port 3108 |

---

## 6. Content Marketing Pipeline

```
RESEARCH (Weekly)
  Market Research API → 1000 posts + 100 creators per niche
  ResearchLite → extract "Creative DNA" (hook, format, CTA pattern)
  → actp_creative_blueprints

GENERATE (Daily 5AM)
  ContentLite reads winning blueprints
  → Generate tweet / script / carousel
  → AI review gate (7-dimension rubric, APPROVE/REVISE/REJECT)
  → Approved → actp_twitter_queue + MPLite queue

RENDER (On demand)
  Remotion renders video from script + GenLite template
  Firefly/Sora generates images/B-roll
  → Video file ready for upload

PUBLISH (Scheduled by PublishLite)
  Thompson Sampling selects optimal time per platform
  Blotato / MPLite → TikTok, YouTube, Instagram, Facebook
  Safari → Twitter, Threads
  → register_post in universal_feedback_engine

TRACK (1hr / 4hr / 24hr checkbacks)
  Cloud Sync polls stats continuously
  UniversalFeedbackExecutor classifies: viral / good / average / flop
  3 metric snapshots → actp_feedback_posts

ANALYZE (Daily 6AM)
  Aggregate patterns: best hooks, formats, times, topics
  → actp_feedback_strategy updated

IMPROVE (Next cycle)
  ContentLite reads updated strategy
  → Better prompts → higher baseline performance
```

### Platform Posting Matrix

| Platform | Content Type | Publisher | Frequency |
|---|---|---|---|
| Twitter | Tweets, threads | Safari port 3007 | Daily 5AM |
| Threads | Posts | Safari port 3004 | 3× daily |
| TikTok | Short video | Blotato / MPLite | 1-2× daily |
| Instagram | Reels, carousels | Blotato / MPLite | 1-2× daily |
| YouTube | Shorts, long-form | Blotato account 228 | 3-5× weekly |
| Facebook | Text, video | Blotato / Meta API | Daily |
| LinkedIn | Posts | Manual review + Safari | 3× weekly |

---

## 7. Lead Generation & Sales Pipeline

### Source 1: LinkedIn Prospecting

```
6 ICP search queries → score (0-100) → linkedin_prospects
→ qualified → send connection request (Safari 3105)
→ connection_sent → connected → personalized intro DM
→ messaged → responded → book call?
→ booked → closed_won / closed_lost
```

**Status**: Operational. 55 prospects stored (19 qualified). ~10 connection requests/day rate limit.

### Source 2: Platform DM Inbox (All Platforms)

```
Cloud Sync polls DMs every 60s across IG/TW/TT/LI
→ New DM saved to platform_dms
→ CRM scoring (Claude AI 0-100)
→ High-score: AI generates reply → crm_message_queue
→ Safari sends reply via appropriate DM service
→ Thread stored in crm_conversations
```

**Status**: Operational. 520 CRM contacts.

### Source 3: Upwork

```
Every 2h: scan for new jobs matching ICP
→ Score relevance (0-100)
→ Score ≥ threshold → generate AI proposal (Claude)
→ Submit via Safari (3108)
→ Win → create delivery workflow
```

**Status**: Fully operational, battle-tested.

### Source 4: Email Leads (Gmail — NEW)

```
Every 15min: Gmail API reads inbox
→ Classify: lead / client / vendor / spam
→ Lead: extract to crm_contacts, Claude scores 0-100
→ Score ≥ 70: generate AI reply → queue
→ Score ≥ 85: trigger LinkedIn research → cross-channel DM
→ Auto-send if confidence > 0.9, else queue for review
→ Apply ACTP_PROCESSED label
```

**Status**: ❌ Not yet implemented. See [Section 11](#11-gmail-integration).

### CRM Pipeline Stages

| Stage | Trigger | Automated Action |
|---|---|---|
| `new` | Contact scraped / email received | Score and qualify |
| `qualified` | Score ≥ threshold | Queue outreach |
| `connection_sent` | LI connection sent | Wait |
| `connected` | Accepted | Queue intro DM |
| `messaged` | DM sent | Wait for reply |
| `responded` | Reply received | AI intent classification |
| `booked` | Meeting scheduled | Calendar + prep brief |
| `closed_won` | Deal signed | Start delivery workflow |
| `closed_lost` | No response after N attempts | Archive |

---

## 8. Code Delivery Pipeline

### ACD (Autonomous Coding Dashboard)

```
feature_list.json (~300 features per repo)
→ ACD prompt: harness/prompts/{slug}.md
→ Claude harness: implement → test → commit → push
→ Vercel auto-deploys on push
→ heartbeat_agent verifies deployment success
→ Repeat for next feature
```

**Queue**: 43 repos (P1-P46)
- **P1-P7**: ACTP Lite services (ACTPDash, actp-worker, AdLite, GenLite, MetricsLite, HookLite, MPLite)
- **P8-P25**: Original app repos
- **P26-P46**: 21 Rork Expo Router apps (6,331 total features across all 21)

### Client Code Delivery (Upwork)

```
Win proposal → break into milestones (ACD-style feature list)
→ ACD harness builds features → commits to client repo
→ Update Upwork milestone as completed
→ Request payment release via Upwork service (3108)
```

---

## 9. Feedback Loop Architecture

The system runs **nested feedback loops** at multiple timescales:

### Loop 1: Post Performance (Hours → 24h)
- T+1h, T+4h, T+24h metric snapshots
- Classify: viral / good / average / flop
- Update `actp_feedback_strategy` → improve next content brief
- **Systems**: Cloud Sync + UniversalFeedbackExecutor + ContentLite

### Loop 2: Campaign Performance (Weekly)
- Market Research API scrapes competitor content weekly
- Compare to own performance → gap analysis
- Update niche strategy in `actp_niche_config`
- **Systems**: ResearchLite + `twitter_research_weekly` cron

### Loop 3: Lead Pipeline (Daily)
- Audit who's stalled in "messaged" > 3 days → queue follow-up
- Track win/loss rate → adjust scoring thresholds
- **Systems**: CRM scoring + `crm_dm_sync` cron + `linkedin_prospecting` cron

### Loop 4: Revenue (Monthly)
- RevenueCat → which apps have highest LTV?
- Which content drove downloads? → shift focus
- **Systems**: RevenueCat data plane + MetricsLite

### Loop 5: Self-Improvement (Continuous)
- Bug reports / feature requests → ACD harness builds fix
- Tests pass → commit → deploy → heartbeat verifies
- **Systems**: ACD + Vercel CI/CD + heartbeat_agent

---

## 10. YouTube Integration

### Why Critical

YouTube is the highest-leverage platform:
- Long-form content has compounding search traffic
- Watch time + CTR are the strongest content optimization signals
- Monetization (RPM) creates direct revenue feedback
- Demographics reveal actual audience composition vs. assumed ICP

### Required Signals

| Signal | API | System Use |
|---|---|---|
| Views / likes / comments | YouTube Data v3 `videos.list` | Engagement baseline |
| Watch time (minutes) | YouTube Analytics `reports.query` | Content quality |
| Avg view duration | YouTube Analytics | Hook + retention quality |
| CTR (impressions → clicks) | YouTube Analytics | Title + thumbnail quality |
| Traffic sources | YouTube Analytics | Discovery strategy |
| Subscriber delta | YouTube Data v3 `channels.list` | Growth rate |
| Revenue / RPM | YouTube Analytics (monetization) | Direct revenue signal |

### Client Design (`youtube_client.py`)

```python
# youtube_client.py — actp-worker
# pip install google-auth google-auth-oauthlib google-api-python-client

SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
]

async def get_channel_stats() -> dict
async def get_recent_video_ids(n=20) -> list[str]
async def get_video_stats(video_ids: list[str]) -> list[dict]
async def get_video_analytics(video_id: str, days=28) -> dict
  # returns: watch_time, avg_duration, impressions, ctr, subscribers_gained
async def get_traffic_sources(video_id: str, days=28) -> dict
async def get_channel_demographics(days=28) -> dict
async def get_revenue_stats(days=28) -> dict  # requires monetization scope
async def sync_recent_videos_to_supabase(n=20) -> int
```

### Supabase Schema

```sql
CREATE TABLE youtube_video_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id TEXT NOT NULL,
  title TEXT,
  published_at TIMESTAMPTZ,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  watch_time_minutes NUMERIC DEFAULT 0,
  avg_view_duration_secs NUMERIC DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  subscribers_gained INTEGER DEFAULT 0,
  revenue_usd NUMERIC DEFAULT 0,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_id, DATE_TRUNC('hour', checked_at))
);
```

### Integration into Feedback Loop

```
YouTube video published via Blotato (account 228)
→ youtube_client.sync_recent_videos_to_supabase()
→ Cloud Sync polls YouTube stats every 5min
→ UniversalFeedbackExecutor check-backs at 1hr/6hr/24hr
→ Watch time + CTR stored in actp_feedback_posts.metrics_snapshot
→ Strategy updated: which title format / thumbnail style / hook → highest CTR
→ Next video generated with optimized brief
```

### Auth Setup

```bash
# 1. Google Cloud Console: enable YouTube Data API v3 + YouTube Analytics API
# 2. Create OAuth 2.0 credentials → download client_secrets.json
# 3. cp client_secrets.json actp-worker/
# 4. First run (opens browser → authorize → saves token):
python actp-worker/youtube_client.py --auth
# 5. Subsequent polls: token auto-refreshed from youtube_token.json

# Required env vars:
YOUTUBE_CLIENT_SECRETS_FILE=actp-worker/client_secrets.json
YOUTUBE_TOKEN_FILE=actp-worker/youtube_token.json
YOUTUBE_CHANNEL_ID=UCxxxxxxxxx
ENABLE_YOUTUBE_ANALYTICS=true
```

---

## 11. Gmail Integration

### Why Critical

Email is the highest-conversion B2B channel:
- Inbound leads from content marketing arrive via email
- Client project communications are email-first
- Deal negotiation and contract signing happen over email
- Missing email monitoring = losing deals silently

### Data We Need

| Signal | Use in System |
|---|---|
| New unread emails | Lead intake, client comms |
| Sender identity | CRM contact matching |
| Email body text | Intent classification |
| Thread history | Full conversation context for AI |
| Attachments | Detect proposals, briefs, contracts |

### Client Design (`gmail_client.py`)

```python
# gmail_client.py — actp-worker
# pip install google-auth google-auth-oauthlib google-api-python-client

SCOPES = ['https://www.googleapis.com/auth/gmail.modify']

async def read_unread_emails(max=50) -> list[EmailRecord]
async def get_thread(thread_id: str) -> list[EmailRecord]
async def classify_email(email: EmailRecord) -> str  # lead|client|vendor|spam|other
async def score_lead_email(email: EmailRecord) -> int  # 0-100 Claude AI
async def send_reply(thread_id: str, body: str) -> bool
async def create_draft(to: str, subject: str, body: str) -> str
async def apply_label(message_id: str, label: str) -> bool
async def sync_to_crm(email: EmailRecord) -> str  # returns crm_contact_id
async def process_inbox(max=50) -> dict  # full pipeline: read→classify→score→reply
```

### Processing Flow

```
Every 15min cron: gmail_client.process_inbox()
→ read_unread_emails(max=50)
→ For each email:
   ├── Check: is sender an existing CRM contact?
   │   Yes → append to crm_conversations, route to pending_replies
   │   No → classify: lead / client / vendor / spam
   ├── Lead path:
   │   → extract: name, email, company, topic
   │   → upsert crm_contacts (source: email)
   │   → Claude AI scores 0-100
   │   → score ≥ 70: generate AI reply → crm_message_queue
   │   → score ≥ 85: trigger LinkedIn profile lookup → cross-channel DM
   ├── Client path:
   │   → update deal record in Supabase
   │   → Telegram alert to Isaiah
   │   → Generate context-aware reply
   ├── Auto-send if confidence > 0.9, else queue for review
   └── Apply Gmail label: ACTP_PROCESSED
```

### Supabase Schema

```sql
CREATE TABLE gmail_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id TEXT UNIQUE NOT NULL,
  thread_id TEXT,
  from_email TEXT NOT NULL,
  from_name TEXT,
  subject TEXT,
  snippet TEXT,
  body_text TEXT,
  classification TEXT,  -- lead|client|vendor|spam|other
  intent_score INTEGER, -- 0-100
  crm_contact_id UUID REFERENCES crm_contacts(id),
  reply_sent BOOLEAN DEFAULT FALSE,
  reply_draft TEXT,
  received_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Auth Setup

```bash
# Reuses same Google OAuth credentials as YouTube
# Add Gmail scope during initial auth flow

# Required env vars:
GMAIL_CREDENTIALS_FILE=actp-worker/client_secrets.json
GMAIL_TOKEN_FILE=actp-worker/gmail_token.json
GMAIL_POLL_INTERVAL_SECS=900  # 15min
GMAIL_AUTO_SEND_THRESHOLD=0.9
ENABLE_GMAIL=true
```

---

## 12. Data Signal Inventory

### Content Performance

| Signal | Platforms | Status | Used For |
|---|---|---|---|
| Views | All | ✅ | Performance baseline |
| Likes | All | ✅ | Engagement rate |
| Comments count | All | ✅ | Engagement rate |
| Shares / Reposts | TW/TT/Threads | ✅ | Viral coefficient |
| Saves | IG/TT | ⚠️ Partial | Content resonance |
| Bookmarks | TW | ✅ | Long-term value |
| Watch time | TT/YT | ❌ | Hook + retention quality |
| CTR | YT | ❌ | Title + thumbnail quality |
| Avg view duration | TT/YT | ❌ | Pacing quality |
| Impressions / Reach | IG/YT | ❌ | Distribution health |
| Traffic sources | TT/YT | ❌ | Discovery strategy |
| Story analytics | IG | ❌ | Story quality |

### DM / Relationship

| Signal | Status | Gap |
|---|---|---|
| New DMs (text) | ✅ | — |
| DM lead score | ✅ | Intent classification |
| Auto-reply | ❌ | AI reply queue needed |
| Response rate | ❌ | Not tracked |
| Conversation depth | ❌ | Not tracked |

### Lead Sources

| Source | Status | Gap |
|---|---|---|
| LinkedIn connections | ✅ | — |
| DM inbox (all platforms) | ✅ | Intent routing |
| Upwork applications | ✅ | — |
| Email inbound | ❌ | Gmail integration needed |
| Comment engagement | ⚠️ Partial | Profile → CRM pipeline |
| Content-driven followers | ❌ | Follower attribution |

### Business

| Signal | Status | Gap |
|---|---|---|
| Upwork win rate + earnings | ✅ | — |
| App revenue (RevenueCat) | ✅ | — |
| App conversion (Superwall) | ✅ | — |
| Email → deal conversion | ❌ | Gmail needed |
| Deal close rate | ⚠️ Partial | Stage velocity not tracked |
| YouTube revenue / RPM | ❌ | YouTube API needed |

---

## 13. Gap Analysis & Roadmap

### Phase 1 — High Impact, API-Based (This Week)

| Gap | Effort | Implementation |
|---|---|---|
| YouTube video stats | Low | YouTube Data API v3 — `youtube_client.py` |
| YouTube watch time / CTR | Low | YouTube Analytics API — same client |
| Gmail lead capture | Medium | Gmail API — `gmail_client.py` |
| Comment sentiment classification | Low | GPT-4o mini batch on collected comment text |
| DM intent classification | Medium | Claude per-conversation in crm_dm_sync |

### Phase 2 — Browser Automation (2-4 Weeks)

| Gap | Effort | Implementation |
|---|---|---|
| TikTok Studio (watch time) | High | Safari automation on TikTok Studio pages |
| Instagram Insights (reach/saves) | High | Safari automation on IG Insights |
| Follower attribution | Medium | Activity feed scraper |
| Auto-reply AI for DMs | Medium | Claude generates reply → confidence gate → send |
| LinkedIn post engagement | Low | Add endpoint to LinkedIn service (3105) |

### Phase 3 — Revenue Attribution (4-8 Weeks)

| Gap | Effort | Implementation |
|---|---|---|
| Email open tracking | Medium | HookLite tracking pixel (fix auth first) |
| Cross-channel attribution | High | UTM + HookLite + CRM source tracking |
| Deal velocity tracking | Low | Timestamp stage transitions in CRM |
| YouTube revenue integration | Low | Analytics API monetization scope |

---

## 14. Self-Improvement Loop

### ACD Code Pipeline

```
IDENTIFY: Bug reports (Telegram), performance data (heartbeat),
          gap analysis (this doc), feature backlog (feature_list.json)

PRIORITIZE: repo-queue.json (P1-P46)
            → Business impact first
            → Dependencies resolved before dependents

BUILD: ACD harness (Claude AI)
       → Read spec → Write code → Run tests
       → Pass: commit → push → Vercel auto-deploys
       → Fail: retry (3x) → flag for human review

VERIFY: heartbeat_agent.py
        → All services up? → smoke test endpoints
        → Write result to Obsidian daily notes
        → Telegram alert if degraded

MEASURE: Did this feature improve the target metric?
         → Feed back to prioritization
```

### 3-Layer Memory System

```
Layer 1: ~/.memory/vault/KNOWLEDGE-GRAPH.md
  → Durable facts, architecture decisions, ICP definitions
  → Example: "TikTok DM requires OS-level click — JS .click() ignored"

Layer 2: ~/.memory/vault/DAILY-NOTES/YYYY-MM-DD.md  
  → Daily event log (auto-written by heartbeat_agent.py)
  → Example: "2026-03-01: 12 LI invitations synced, 3 Upwork leads scored"

Layer 3: ~/.memory/vault/TACIT-KNOWLEDGE.md
  → Owner preferences, hard rules, lessons learned
  → Example: "LinkedIn rate limit: max 10 connection requests/day"
  → Example: "Instagram port 3100 has auth middleware — always use 3001"
```

---

## 15. Integration Test Checklist

### Safari Automation Services

```bash
curl http://localhost:3001/health  # Instagram DM
curl http://localhost:3003/health  # Twitter DM
curl http://localhost:3102/health  # TikTok DM
curl http://localhost:3105/health  # LinkedIn
curl http://localhost:3004/health  # Threads
curl http://localhost:3005/health  # IG Comments
curl http://localhost:3006/health  # TT Comments
curl http://localhost:3007/health  # TW Comments
curl http://localhost:3106/health  # Market Research
curl http://localhost:3108/health  # Upwork
curl http://localhost:3200/health  # Cloud Sync
```

### Cloud Sync Engine

```bash
# Status + platform health
curl -s http://localhost:3200/api/status | python3 -m json.tool

# Trigger immediate poll
curl -s -X POST http://localhost:3200/api/sync/poll-now | python3 -m json.tool

# Check pending DMs
curl -s "http://localhost:3200/api/dms?limit=5" | python3 -m json.tool

# Get content brief
curl -s "http://localhost:3200/api/analytics/brief" | python3 -m json.tool
```

### ACTP Worker

```bash
# Python client syntax check
cd /Users/isaiahdupree/Documents/Software/actp-worker
python3 -c "import cloud_sync_client; print('OK')"
python3 -c "import market_research_client; print('OK')"
python3 -c "import linkedin_client; print('OK')"
python3 -c "import upwork_client; print('OK')"
python3 -c "import youtube_client; print('OK')"  # after creation
python3 -c "import gmail_client; print('OK')"    # after creation

# Heartbeat
python3 -c "
import asyncio
from heartbeat_agent import run_heartbeat
asyncio.run(run_heartbeat())
"
```

### Cloud Services (Vercel)

```bash
curl https://workflow-engine-7vhmjxq8i-isaiahduprees-projects.vercel.app/api/health
curl https://contentlite-bf8rwf8z6-isaiahduprees-projects.vercel.app/api/health
curl https://researchlite-nvn955oaj-isaiahduprees-projects.vercel.app/api/health
curl https://publishlite-3a2em2vff-isaiahduprees-projects.vercel.app/api/health
curl https://mediaposter-lite-isaiahduprees-projects.vercel.app/api/health
```

### CRM Pipeline

```bash
cd "/Users/isaiahdupree/Documents/Software/Safari Automation"
# Dry-run full suite (no real sends)
python3 scripts/test_crm_e2e.py --dry-run

# Sync + score contacts
python3 scripts/crm_brain.py --sync
python3 scripts/crm_brain.py --score
```

### Upwork

```bash
# Search + score (no submission)
curl -s "http://localhost:3108/api/upwork/jobs/search" \
  -H "Content-Type: application/json" \
  -d '{"keywords":"react developer","limit":5}' | python3 -m json.tool
```

### YouTube (after client created)

```bash
cd /Users/isaiahdupree/Documents/Software/actp-worker
python3 youtube_client.py --test  # prints channel stats
```

### Gmail (after client created)

```bash
cd /Users/isaiahdupree/Documents/Software/actp-worker
python3 gmail_client.py --test  # prints last 5 unread email subjects
```

---

## 16. Operations Runbook

### Starting All Safari Services

```bash
cd "/Users/isaiahdupree/Documents/Software/Safari Automation"
/bin/zsh -l -c "npm run --prefix packages/instagram-dm start:server &"
/bin/zsh -l -c "npm run --prefix packages/twitter-dm start:server &"
/bin/zsh -l -c "npm run --prefix packages/tiktok-dm start:server &"
/bin/zsh -l -c "npm run --prefix packages/linkedin-automation start:server &"
/bin/zsh -l -c "npm run --prefix packages/instagram-comments start:server &"
/bin/zsh -l -c "npm run --prefix packages/tiktok-comments start:server &"
/bin/zsh -l -c "npm run --prefix packages/twitter-comments start:server &"
/bin/zsh -l -c "npm run --prefix packages/threads-comments start:server &"
/bin/zsh -l -c "npm run --prefix packages/market-research start:server &"
```

### Starting Cloud Sync

```bash
cd "/Users/isaiahdupree/Documents/Software/Safari Automation"
source .env && export SUPABASE_URL SUPABASE_ANON_KEY
PORT=3200 npx tsx packages/cloud-sync/src/api/server.ts &
sleep 3 && curl -s -X POST http://localhost:3200/api/sync/start
```

### Starting ACTP Worker

```bash
cd /Users/isaiahdupree/Documents/Software/actp-worker
python3 worker.py
```

### Telegram Bot Control

```
/help          — full command list
/dispatch      — run any ACTP topic
/pipeline      — run CRM pipeline
/agent status  — check all services
/tests         — run test suite
```

### Common Natural Language Commands (via Telegram AI Engine)

- `"check what DMs need replies"` → cloud_sync dms
- `"research tiktok ai automation niche"` → market_research.search
- `"generate tweet about [topic]"` → contentlite + twitter queue
- `"send connection request to [name] on LinkedIn"` → linkedin.connect
- `"search upwork for react native jobs"` → upwork.search
- `"run linkedin prospecting session"` → linkedin_prospecting cron
- `"what's our content strategy for twitter this week"` → feedback_strategy

---

## Appendix: Port Reference

| Port | Service |
|---|---|
| 3001 | Instagram DM |
| 3003 | Twitter DM |
| 3004 | Threads Comments |
| 3005 | Instagram Comments |
| 3006 | TikTok Comments |
| 3007 | Twitter Comments |
| 3102 | TikTok DM |
| 3105 | LinkedIn Automation |
| 3106 | Market Research |
| 3108 | Upwork Automation |
| 3200 | Cloud Sync (platform poller) |
| 8080 | ACTP Worker Health Server |
| 9191 | Hybrid Tool Core (AI tool-calling microservice) |

## Appendix: Cron Job Reference

| Job | Schedule | Purpose |
|---|---|---|
| agent_heartbeat | Every 30min | Check all services, write daily note |
| crm_dm_sync | Every 30min | Sync platform DMs → CRM |
| linkedin_prospecting | 11AM + 3PM weekdays | Search + connect new leads |
| linkedin_campaign_run | 10AM + 2PM weekdays | Run outreach campaigns |
| upwork_job_scan | Every 2h | Scan + score new jobs |
| upwork_applications_check | 9AM + 5PM | Check application statuses |
| twitter_research_weekly | Mon 2AM | Scrape 5K tweets per niche |
| twitter_daily_generation | Daily 5AM | Generate + queue tweets |
| twitter_metrics_collection | Daily 10PM | Collect tweet performance |
| threads_research_weekly | Tue 3AM | Research Threads niche |
| instagram_research_weekly | Wed 3AM | Research IG niche |
| tiktok_research_weekly | Thu 3AM | Research TikTok niche |
| facebook_research_biweekly | Fri 3AM | Research Facebook niche |
| feedback_loop_checkbacks | Every 4h | T+4h metric snapshots |
| feedback_loop_strategy | Daily 6AM | Analyze + update strategy |
| universal_feedback_cycle | Every 6h | All-platform feedback cycle |
| keyword_research_trigger | Every 3h | Keyword watchlist research |
| threads_engagement_session | 3× daily | Post + engage on Threads |
| gmail_poll | Every 15min | Read inbox + classify leads (NEW) |
| youtube_stats_poll | Every 5min | Sync video stats to Supabase (NEW) |
| nightly_consolidation | 3AM | Promote memory candidates |
| morning_briefing | 8AM | Daily status report |
