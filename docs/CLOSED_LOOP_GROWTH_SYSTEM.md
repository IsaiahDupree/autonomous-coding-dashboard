# Closed-Loop Growth System Architecture
## Capability Mapping to ACTP Ecosystem

**Version:** 1.0  
**Date:** February 2026  
**Status:** Architecture Blueprint + Gap Analysis

---

## Executive Summary

This document maps a **closed-loop autonomous growth system** onto the existing ACTP microservice ecosystem. The system publishes content to social media, collects performance metrics, performs market research, extracts "winning creative DNA," generates high-accuracy content variants, tests them, and routes winners into ads, email, blog/SEO — creating an ever-improving feedback loop optimizing for conversions.

The existing ACTP ecosystem already covers ~40% of the required capabilities. This document identifies exact gaps, proposes new modules, and defines where each capability lives.

---

## 1. Capability Inventory: What's Required

| # | Capability | Description |
|---|-----------|-------------|
| C1 | **Organic Social Publishing** | Upload content to FB Pages, Instagram (feed/reels/stories) |
| C2 | **Platform Metrics Collection** | Pull post-level insights (reach, impressions, engagement, watch time) |
| C3 | **Market Research — Hashtag Radar** | IG hashtag top/recent media sampling for trend detection |
| C4 | **Market Research — Ad Library Radar** | Meta Ad Library/Ads Archive API for competitor ad analysis |
| C5 | **Market Research — Own Winners Archive** | Historical best-performing content as baseline reference |
| C6 | **Blueprint Extraction ("Creative DNA")** | Analyze any post/ad → extract format, hook, pacing, structure, visual layout, CTA pattern |
| C7 | **Content Bucketing** | Classify content as video / image / carousel and route to appropriate pipeline |
| C8 | **Content Generation — Video** | Generate video content from blueprints (scripts + shot lists + asset prompts + captions) |
| C9 | **Content Generation — Image/Carousel** | Generate image/carousel content from blueprints (copy + layout + image prompts) |
| C10 | **Content Generation — Email/Newsletter** | Draft newsletter emails from winning content in required format |
| C11 | **Content Generation — Blog/SEO** | Draft blog posts in required format with SEO optimization |
| C12 | **Experiment Engine** | Test 3–8 variants/week, Thompson Sampling for time slots, automatic winner promotion |
| C13 | **Timing Optimization** | Per-account day×hour engagement matrix, bandit-based slot allocation |
| C14 | **Conversion Attribution** | UTM tracking, Meta Pixel, app install events, email→site→conversion chains |
| C15 | **Retargeting + Paid Scaling** | Graduate organic winners into retargeting, app install, conversion campaigns |
| C16 | **SEO Tracking** | Track blog/email engagement and conversions back to the offer |
| C17 | **Closed-Loop Feedback** | All metrics feed back into content scoring, blueprint refinement, and generation decisions |

---

## 2. Mapping to Existing ACTP Services

### Service-by-Service Analysis

#### GenLite (Video Generation)
**Current:** Submits video gen jobs to Sora, Veo3, Banana (Remotion). Manages job queue, polling, completion.  
**Covers:** C8 (partially — raw video generation, but no blueprint-driven generation)  
**Gaps:**
- No blueprint→script→shot-list pipeline
- No caption generation
- No image/carousel generation
- No awareness-level targeting

**Proposed Extensions:**
- Add `POST /api/generate-from-blueprint` — accepts a `creative_blueprint` JSON, produces video script + asset prompts
- Add image generation provider (Nano Banana / DALL-E)
- Add carousel copy generation

#### AdLite (Ad Deployment & Management)
**Current:** Deploys ads to Meta + TikTok Ads. Manages budget pacing, spend caps, fatigue checks, ad actions.  
**Covers:** C15 (partially — paid ad deployment exists)  
**Gaps:**
- No **organic** publishing (only paid ads)
- No retargeting audience creation
- No app install campaign management
- No winner→ad graduation pipeline

**Proposed Extensions:**
- Add organic publishing module: `lib/publishers/meta-organic.ts`, `lib/publishers/instagram-organic.ts`
- Add `POST /api/publish/organic` endpoint
- Add `POST /api/graduate-winner` — takes an organic winner and creates a paid campaign

#### MetricsLite (Metrics Collection)
**Current:** Collects organic + ad metrics from platforms (Meta, TikTok, YouTube, Instagram). Threshold alerts.  
**Covers:** C2 (fully), C5 (partially — collects metrics but doesn't score/rank winners)  
**Gaps:**
- No content scoring algorithm
- No per-post engagement rate calculations over time series
- No "winners archive" with scoring
- No timing analysis (best day×hour matrix)

**Proposed Extensions:**
- Add `lib/scoring.ts` — content scoring engine with configurable weights
- Add `POST /api/cron/score-content` — periodic scoring of all recent content
- Add `GET /api/timing-matrix` — per-account optimal posting times
- Add `GET /api/winners` — top-performing content with blueprint extraction hooks

#### HookLite (Webhook Ingestion)
**Current:** Receives webhooks from Meta, TikTok, Stripe, MPLite. Validates signatures, logs events, triggers handlers.  
**Covers:** C14 (partially — receives conversion events via webhooks)  
**Gaps:**
- No UTM redirect endpoint for attribution
- No app install event tracking
- No email click webhook handling
- No blog engagement webhook handling

**Proposed Extensions:**
- Add `POST /api/hooks/attribution` — UTM redirect tracking endpoint
- Add email provider webhook handler (Resend/SendGrid)
- Add `POST /api/hooks/seo-events` — blog engagement tracking

#### ACTPDash (Dashboard)
**Current:** Campaign management, creatives, rounds, winner selection, analytics overview, system health monitoring.  
**Covers:** C5 (partially — winner tracking), C12 (partially — rounds/experiments), C17 (partially — analytics dashboard)  
**Gaps:**
- No market research UI
- No blueprint viewer
- No email/blog management UI
- No timing optimization display
- No conversion funnel visualization

**Proposed Extensions:**
- Add market research pages: `/research/hashtags`, `/research/ad-library`, `/research/blueprints`
- Add content calendar page: `/calendar`
- Add conversion funnel page: `/analytics/funnel`
- Add email/blog management pages

#### actp-worker (Background Processing)
**Current:** Remotion job polling, MPLite polling, metrics polling, heartbeat.  
**Covers:** C8 (partially — Remotion rendering)  
**Gaps:**
- No market research polling loop
- No blueprint extraction worker
- No email/blog generation worker
- No content scoring worker
- No timing optimization worker

**Proposed Extensions:**
- Add `research_loop` — periodic market research collection
- Add `blueprint_loop` — extract creative DNA from market items
- Add `scoring_loop` — score content and update winner rankings
- Add `publishing_loop` — scheduled organic post publishing

---

## 3. New Services/Modules Required

### NEW: ResearchLite (Market Research Engine)
**Purpose:** IG hashtag trend sampling, Meta Ad Library competitor analysis, blueprint extraction  
**Type:** Next.js API service (same pattern as other Lite services)

**Core Modules:**
```
researchlite/
├── lib/
│   ├── api-helpers.ts          # Shared auth, response helpers
│   ├── auth.ts                 # API key management
│   ├── supabase.ts             # DB client
│   ├── collectors/
│   │   ├── hashtag-collector.ts    # IG Hashtag Top/Recent Media
│   │   ├── ad-library-collector.ts # Meta Ads Archive API
│   │   └── competitor-monitor.ts   # Track specific competitor accounts
│   ├── extractors/
│   │   ├── blueprint-extractor.ts  # Analyze post → creative_blueprint JSON
│   │   ├── video-analyzer.ts       # Transcript + shot detection + on-screen text
│   │   ├── image-analyzer.ts       # OCR + layout heuristics
│   │   └── caption-analyzer.ts     # Caption pattern extraction
│   └── scoring/
│       ├── trend-scorer.ts         # Score market items by trending velocity
│       └── similarity-scorer.ts    # Score how similar a blueprint is to winners
├── app/api/
│   ├── health/route.ts
│   ├── research/
│   │   ├── hashtags/route.ts       # GET: trending hashtag results
│   │   ├── ad-library/route.ts     # GET: competitor ad results
│   │   └── blueprints/route.ts     # GET: extracted blueprints
│   ├── cron/
│   │   ├── collect-hashtags/route.ts
│   │   ├── collect-ads/route.ts
│   │   └── extract-blueprints/route.ts
│   └── blueprints/
│       ├── route.ts                # GET: list, POST: manual extraction
│       └── [id]/route.ts           # GET: single blueprint detail
└── tests/
```

**Key Database Tables:**
```sql
-- Market research items (hashtag posts + ad library ads)
CREATE TABLE actp_market_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,           -- 'ig_hashtag_top', 'ig_hashtag_recent', 'ad_library'
  platform TEXT NOT NULL,         -- 'instagram', 'facebook', 'tiktok'
  external_id TEXT,               -- Platform post/ad ID
  
  -- Content
  content_type TEXT NOT NULL,     -- 'video', 'image', 'carousel', 'story'
  caption TEXT,
  media_url TEXT,
  thumbnail_url TEXT,
  
  -- Context
  hashtag TEXT,                   -- For hashtag-sourced items
  advertiser_name TEXT,           -- For ad library items
  keyword TEXT,                   -- Search keyword that found this
  
  -- Metrics (at time of collection)
  likes INT,
  comments INT,
  shares INT,
  views INT,
  
  -- Analysis
  blueprint_id UUID,             -- Link to extracted blueprint
  trend_score FLOAT,
  
  -- Meta
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Creative blueprints ("DNA" of winning content)
CREATE TABLE actp_creative_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,     -- 'market_item', 'own_content', 'manual'
  source_id UUID,                -- actp_market_items.id or actp_creatives.id
  
  -- Format Classification
  content_type TEXT NOT NULL,    -- 'video', 'image', 'carousel'
  format TEXT NOT NULL,          -- 'talking_head', 'pov', 'carousel_text', 'meme', 'screen_record', 'ugc_testimonial', 'before_after', 'demo'
  
  -- Hook Pattern
  hook_pattern TEXT,             -- "If you're X, stop doing Y…"
  hook_type TEXT,                -- 'question', 'pov', 'controversial', 'statistic', 'curiosity'
  
  -- Structure
  structure JSONB,               -- {beats: [{type: 'hook', duration_sec: 2}, {type: 'problem', duration_sec: 3}, ...]}
  pacing JSONB,                  -- {shot_count: 5, avg_shot_duration: 2.5, cut_pattern: 'fast'}
  
  -- Visual Layer
  visual_style JSONB,            -- {text_density: 'high', font_feel: 'bold_sans', broll_types: ['product_close', 'lifestyle'], overlays: true}
  
  -- Caption Pattern
  caption_pattern JSONB,         -- {length: 'medium', first_line_style: 'hook_question', emoji_density: 'low', cta_placement: 'end', hashtag_count: 5}
  
  -- Offer Angle
  offer_angle JSONB,             -- {type: 'pain', mechanism: 'speed', proof_type: 'demo', objection: 'price'}
  
  -- Full Analysis
  full_analysis JSONB DEFAULT '{}',
  
  -- Scoring
  performance_score FLOAT,       -- How well content from this blueprint performs
  usage_count INT DEFAULT 0,     -- How many times this blueprint has been used
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blueprint usage tracking (which blueprints generated which content)
CREATE TABLE actp_blueprint_lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES actp_creative_blueprints(id),
  creative_id UUID NOT NULL,     -- actp_creatives.id
  variation_type TEXT NOT NULL,  -- 'exact_remake', 'baseline_adjacent', 'exploration'
  performance_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### NEW: PublishLite (Organic Social Publishing)
**Purpose:** Publish organic content to FB Pages + Instagram (separate from AdLite paid ads)  
**Type:** Next.js API service

**Core Modules:**
```
publishlite/
├── lib/
│   ├── api-helpers.ts
│   ├── auth.ts
│   ├── supabase.ts
│   ├── publishers/
│   │   ├── instagram.ts            # IG Content Publishing API (feed/reels/stories)
│   │   ├── facebook.ts             # FB Page feed publishing
│   │   └── scheduling.ts           # Post scheduling + timing optimization
│   ├── timing/
│   │   ├── bandit.ts               # Thompson Sampling for time slot allocation
│   │   └── matrix.ts               # Per-account day×hour engagement matrix
│   └── buckets/
│       ├── classifier.ts           # Classify content → video | image | carousel
│       └── router.ts               # Route to appropriate publishing pipeline
├── app/api/
│   ├── health/route.ts
│   ├── publish/
│   │   ├── route.ts                # POST: publish content to platform
│   │   └── schedule/route.ts       # POST: schedule future publish
│   ├── accounts/
│   │   └── route.ts                # GET: connected social accounts
│   ├── calendar/
│   │   └── route.ts                # GET: publishing calendar
│   ├── cron/
│   │   ├── publish-scheduled/route.ts
│   │   └── update-timing/route.ts
│   └── timing/
│       └── route.ts                # GET: optimal timing matrix
└── tests/
```

**Key Database Tables:**
```sql
-- Connected social accounts
CREATE TABLE actp_social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,         -- 'instagram', 'facebook', 'tiktok'
  account_type TEXT NOT NULL,     -- 'page', 'business', 'creator'
  
  -- Platform IDs
  platform_account_id TEXT NOT NULL,
  page_id TEXT,                   -- FB Page ID
  ig_user_id TEXT,                -- IG Business Account ID
  
  -- Auth
  access_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  
  -- Info
  name TEXT,
  username TEXT,
  followers_count INT,
  
  -- Config
  posting_limits JSONB DEFAULT '{"max_per_day": 25}',
  auto_publish BOOLEAN DEFAULT false,
  
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Published organic posts
CREATE TABLE actp_organic_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES actp_social_accounts(id),
  creative_id UUID,               -- Link to actp_creatives
  
  -- Content
  content_type TEXT NOT NULL,     -- 'video', 'image', 'carousel', 'story', 'reel'
  caption TEXT,
  hashtags TEXT[],
  media_urls TEXT[],
  
  -- Platform
  platform TEXT NOT NULL,
  platform_post_id TEXT,
  post_url TEXT,
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  
  -- Timing Decision
  timing_slot JSONB,             -- {day: 'tuesday', hour: 14, confidence: 0.72, method: 'thompson_sampling'}
  
  -- Experiment
  experiment_id UUID,
  blueprint_id UUID,
  variation_type TEXT,            -- 'exact_remake', 'baseline_adjacent', 'exploration'
  
  -- Status
  status TEXT DEFAULT 'draft',   -- 'draft', 'scheduled', 'publishing', 'published', 'failed'
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post metrics (time-series snapshots)
CREATE TABLE actp_post_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES actp_organic_posts(id),
  
  -- Snapshot timing
  snapshot_type TEXT NOT NULL,    -- 't1h', 't6h', 't24h', 't72h', 't7d'
  
  -- Engagement
  reach INT DEFAULT 0,
  impressions INT DEFAULT 0,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  saves INT DEFAULT 0,
  
  -- Video-specific
  video_views INT,
  watch_time_seconds INT,
  avg_watch_percentage FLOAT,
  three_second_views INT,
  
  -- Actions
  profile_visits INT DEFAULT 0,
  link_clicks INT DEFAULT 0,
  
  -- Calculated
  engagement_rate FLOAT,
  hold_rate FLOAT,               -- 3s views / impressions
  
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(post_id, snapshot_type)
);

-- Timing optimization matrix
CREATE TABLE actp_timing_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES actp_social_accounts(id),
  
  day_of_week INT NOT NULL,      -- 0=Sunday, 6=Saturday
  hour INT NOT NULL,             -- 0-23
  
  -- Thompson Sampling parameters
  alpha FLOAT DEFAULT 1.0,       -- Success count + prior
  beta FLOAT DEFAULT 1.0,        -- Failure count + prior
  
  -- Stats
  posts_in_slot INT DEFAULT 0,
  avg_engagement_rate FLOAT,
  avg_reach INT,
  
  -- Confidence
  confidence FLOAT DEFAULT 0.0,  -- 0-1, based on sample size
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(account_id, day_of_week, hour)
);
```

---

### NEW: ContentLite (Content Generation from Blueprints)
**Purpose:** Generate content variants from blueprints — video scripts, image prompts, carousel copy, email, blog  
**Type:** Next.js API service  
**Note:** This extends GenLite's raw generation with blueprint-aware intelligence

**Core Modules:**
```
contentlite/
├── lib/
│   ├── api-helpers.ts
│   ├── auth.ts
│   ├── supabase.ts
│   ├── generators/
│   │   ├── video-generator.ts      # Blueprint → video script + shot list + asset prompts
│   │   ├── image-generator.ts      # Blueprint → image prompts + layout spec
│   │   ├── carousel-generator.ts   # Blueprint → carousel copy + card specs
│   │   ├── email-generator.ts      # Winner → newsletter in required format
│   │   ├── blog-generator.ts       # Winner → SEO blog post in required format
│   │   └── caption-generator.ts    # Generate platform-native captions
│   ├── strategies/
│   │   ├── exact-remake.ts         # Same beats/timing/layout, new wording/visuals
│   │   ├── baseline-adjacent.ts    # Same structure, different angle
│   │   └── exploration.ts          # Different structure, same topic/ICP
│   └── templates/
│       ├── email-templates.ts      # Newsletter format schemas
│       └── blog-templates.ts       # Blog post format schemas
├── app/api/
│   ├── health/route.ts
│   ├── generate/
│   │   ├── from-blueprint/route.ts # POST: generate content from blueprint
│   │   ├── video/route.ts          # POST: generate video script + assets
│   │   ├── image/route.ts          # POST: generate image content
│   │   ├── email/route.ts          # POST: generate newsletter email
│   │   ├── blog/route.ts           # POST: generate SEO blog post
│   │   └── variants/route.ts       # POST: generate N variants of a winner
│   ├── cron/
│   │   ├── generate-variants/route.ts  # Auto-generate variants of winners
│   │   └── generate-content/route.ts   # Process generation queue
│   └── templates/
│       └── route.ts                # GET: available generation templates
└── tests/
```

**Key Database Tables:**
```sql
-- Generated content variants
CREATE TABLE actp_content_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID REFERENCES actp_creative_blueprints(id),
  
  -- Source
  source_creative_id UUID,        -- Winner creative this is based on
  variation_type TEXT NOT NULL,    -- 'exact_remake', 'baseline_adjacent', 'exploration'
  
  -- Content Type
  content_type TEXT NOT NULL,     -- 'video', 'image', 'carousel', 'email', 'blog'
  bucket TEXT NOT NULL,           -- 'video_bucket', 'image_bucket', 'email_bucket', 'seo_bucket'
  
  -- Generated Content
  title TEXT,
  body JSONB NOT NULL,            -- Structure depends on content_type
  -- For video: {script, shot_list, asset_prompts, caption, duration_target}
  -- For image: {layout_spec, image_prompts, caption, alt_text}
  -- For carousel: {cards: [{headline, body, image_prompt}], caption}
  -- For email: {subject, preview_text, sections: [{type, content}], cta}
  -- For blog: {title, meta_description, sections: [{h2, paragraphs, faqs}], internal_links}
  
  -- Generation metadata
  model_used TEXT,
  prompt_used TEXT,
  generation_params JSONB DEFAULT '{}',
  
  -- Status
  status TEXT DEFAULT 'draft',    -- 'draft', 'approved', 'published', 'archived'
  
  -- Performance (after publishing)
  performance_score FLOAT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email campaigns
CREATE TABLE actp_email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID REFERENCES actp_content_variants(id),
  
  -- Email
  subject TEXT NOT NULL,
  preview_text TEXT,
  html_body TEXT NOT NULL,
  plain_text_body TEXT,
  
  -- Targeting
  list_id TEXT,                   -- Email list/segment
  
  -- Tracking
  tracking_utm JSONB,            -- {source, medium, campaign, content}
  
  -- Delivery
  sent_at TIMESTAMPTZ,
  total_sent INT DEFAULT 0,
  total_opened INT DEFAULT 0,
  total_clicked INT DEFAULT 0,
  total_converted INT DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'draft',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog posts
CREATE TABLE actp_blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID REFERENCES actp_content_variants(id),
  
  -- Content
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  meta_description TEXT,
  html_body TEXT NOT NULL,
  
  -- SEO
  target_keywords TEXT[],
  internal_links TEXT[],
  canonical_url TEXT,
  
  -- Tracking
  tracking_utm JSONB,
  
  -- Metrics
  page_views INT DEFAULT 0,
  unique_visitors INT DEFAULT 0,
  avg_time_on_page_seconds INT,
  bounce_rate FLOAT,
  conversions INT DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'draft',   -- 'draft', 'published', 'archived'
  published_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### NEW: AttributionLite (Conversion Attribution)
**Purpose:** Track conversions across all channels back to content source  
**Type:** Module within HookLite (not a separate service — extends existing webhook infrastructure)

**Extensions to HookLite:**
```
hooklite/
├── lib/
│   ├── handlers/
│   │   ├── ... (existing)
│   │   ├── email-handler.ts        # NEW: Email open/click/convert events
│   │   └── seo-handler.ts          # NEW: Blog engagement events
│   ├── attribution/
│   │   ├── utm-tracker.ts          # UTM parameter extraction + storage
│   │   ├── funnel-builder.ts       # Build conversion funnels from events
│   │   └── attribution-model.ts    # Multi-touch attribution scoring
│   └── validators/
│       ├── ... (existing)
│       ├── email-validator.ts      # NEW: Email webhook signature validation
│       └── seo-validator.ts        # NEW: SEO event validation
├── app/api/
│   ├── hooks/
│   │   ├── ... (existing)
│   │   ├── email/route.ts          # NEW: Email provider webhooks
│   │   └── seo/route.ts            # NEW: Blog tracking events
│   ├── attribution/
│   │   ├── route.ts                # GET: attribution data
│   │   └── funnel/route.ts         # GET: conversion funnel visualization
│   └── redirect/
│       └── [code]/route.ts         # GET: UTM redirect endpoint (/r/abc → tracked redirect)
```

**Key Database Tables:**
```sql
-- Attribution events (conversion chain tracking)
CREATE TABLE actp_attribution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source
  source_type TEXT NOT NULL,     -- 'organic_post', 'paid_ad', 'email', 'blog', 'direct'
  source_id UUID,                -- post_id, deployment_id, email_campaign_id, blog_post_id
  
  -- UTM
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  
  -- Event
  event_type TEXT NOT NULL,      -- 'click', 'page_view', 'email_open', 'email_click', 'signup', 'trial_start', 'purchase', 'app_install'
  event_value_cents INT,         -- Revenue if applicable
  
  -- User
  visitor_id TEXT,               -- Anonymous visitor tracking
  user_id UUID,                  -- If authenticated
  
  -- Context
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  landing_page TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Redirect links (for UTM tracking)
CREATE TABLE actp_redirect_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,     -- Short code: /r/abc123
  destination_url TEXT NOT NULL,
  
  -- UTM auto-applied
  utm_params JSONB NOT NULL,
  
  -- Source tracking
  source_type TEXT,              -- What generated this link
  source_id UUID,
  
  -- Stats
  click_count INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Complete Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                          CLOSED-LOOP GROWTH SYSTEM                                           │
│                                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              RESEARCH LAYER                                              │ │
│  │                                                                                           │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                       │ │
│  │  │  ResearchLite    │  │  ResearchLite    │  │  MetricsLite     │                       │ │
│  │  │  (Hashtag Radar) │  │  (Ad Library)    │  │  (Winners Archive│                       │ │
│  │  │  C3              │  │  C4              │  │  C5              │                       │ │
│  │  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘                       │ │
│  │           │                     │                     │                                   │ │
│  │           ▼                     ▼                     ▼                                   │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐                    │ │
│  │  │              ResearchLite — Blueprint Extraction (C6)            │                    │ │
│  │  │  Video: transcript + shot detection + on-screen text + tempo    │                    │ │
│  │  │  Image: OCR + layout heuristics + color analysis                │                    │ │
│  │  │  Output: creative_blueprint JSON                                │                    │ │
│  │  └──────────────────────────────┬───────────────────────────────────┘                    │ │
│  └─────────────────────────────────┼───────────────────────────────────────────────────────┘ │
│                                    │                                                          │
│                                    ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                            GENERATION LAYER                                              │ │
│  │                                                                                           │ │
│  │  ┌──────────────────┐  Content Bucketing (C7)                                            │ │
│  │  │  ContentLite     │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │ │
│  │  │  (Blueprint→     │  │  Video   │ │  Image   │ │  Email   │ │  Blog    │              │ │
│  │  │   Content)       │──│  Bucket  │ │  Bucket  │ │  Bucket  │ │  Bucket  │              │ │
│  │  │  C8,C9,C10,C11   │  │  (C8)    │ │  (C9)    │ │  (C10)   │ │  (C11)   │              │ │
│  │  └──────────────────┘  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │ │
│  │                                                                                           │ │
│  │  ┌──────────────────┐  Variation Strategies:                                             │ │
│  │  │  GenLite         │  • Exact Remake (same beats, new wording)                          │ │
│  │  │  (Raw Video Gen) │  • Baseline Adjacent (same structure, different angle)             │ │
│  │  │  Sora/Veo3/      │  • Exploration (different structure, same topic)                   │ │
│  │  │  Banana/Remotion │                                                                    │ │
│  │  └──────────────────┘                                                                    │ │
│  └─────────────────────────────────┬───────────────────────────────────────────────────────┘ │
│                                    │                                                          │
│                                    ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                          DISTRIBUTION LAYER                                              │ │
│  │                                                                                           │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                       │ │
│  │  │  PublishLite      │  │  AdLite          │  │  ContentLite     │                       │ │
│  │  │  (Organic Posts)  │  │  (Paid Ads)      │  │  (Email + Blog)  │                       │ │
│  │  │  FB + IG          │  │  Meta + TikTok   │  │  Newsletter +SEO │                       │ │
│  │  │  C1               │  │  C15             │  │  C10, C11        │                       │ │
│  │  └────────┬──────────┘  └────────┬─────────┘  └────────┬─────────┘                       │ │
│  │           │                     │                     │                                   │ │
│  │           │     ┌───────────────┼─────────────────────┘                                   │ │
│  │           │     │               │                                                         │ │
│  │           ▼     ▼               ▼                                                         │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐                    │ │
│  │  │         Timing Optimization Engine (C13)                         │                    │ │
│  │  │  Thompson Sampling · Per-account day×hour matrix                 │                    │ │
│  │  │  Explore/exploit balance · Confidence-weighted scheduling        │                    │ │
│  │  └──────────────────────────────────────────────────────────────────┘                    │ │
│  └─────────────────────────────────┬───────────────────────────────────────────────────────┘ │
│                                    │                                                          │
│                                    ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                           MEASUREMENT LAYER                                              │ │
│  │                                                                                           │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                       │ │
│  │  │  MetricsLite     │  │  HookLite        │  │  HookLite        │                       │ │
│  │  │  (Platform       │  │  (Webhook        │  │  (Attribution)   │                       │ │
│  │  │   Metrics) C2    │  │   Events)        │  │  C14, C16        │                       │ │
│  │  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘                       │ │
│  │           │                     │                     │                                   │ │
│  │           ▼                     ▼                     ▼                                   │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐                    │ │
│  │  │              Content Scoring Engine (C12, C17)                    │                    │ │
│  │  │  Configurable weights · Winner selection · Blueprint feedback     │                    │ │
│  │  │  Organic: save/share rate, watch-time %, profile clicks          │                    │ │
│  │  │  Conversion: email click → site → install → signup               │                    │ │
│  │  └──────────────────────────────┬───────────────────────────────────┘                    │ │
│  └─────────────────────────────────┼───────────────────────────────────────────────────────┘ │
│                                    │                                                          │
│                                    ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                        OPTIMIZATION LAYER                                                │ │
│  │                                                                                           │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                       │ │
│  │  │  Experiment       │  │  Winner          │  │  Graduation       │                       │ │
│  │  │  Engine (C12)     │  │  Archive (C5)    │  │  Pipeline (C15)   │                       │ │
│  │  │  ACTPDash rounds  │  │  Feed back into  │  │  Organic winner → │                       │ │
│  │  │  3-8 variants/wk  │  │  ResearchLite    │  │  Paid campaign    │                       │ │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘                       │ │
│  │                                                                                           │ │
│  │                    ◄──── CLOSED LOOP: Winners feed back to Research Layer ────►           │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                           DASHBOARD (ACTPDash)                                           │ │
│  │  Market Research │ Blueprints │ Content Calendar │ Experiments │ Funnel │ Winners │ SEO  │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Service Inventory: Before & After

### Before (Current — 6 services)
| Service | Role |
|---------|------|
| **GenLite** | Raw video generation (Sora, Veo3, Banana) |
| **AdLite** | Paid ad deployment (Meta, TikTok) |
| **MetricsLite** | Platform metrics collection |
| **HookLite** | Webhook ingestion |
| **ACTPDash** | Dashboard + campaign management |
| **actp-worker** | Background job processing |

### After (Proposed — 9 services + extended existing)
| Service | Role | Status |
|---------|------|--------|
| **GenLite** | Raw video/image generation + blueprint-aware generation | Extended |
| **AdLite** | Paid ads + organic→paid graduation pipeline | Extended |
| **MetricsLite** | Metrics + content scoring + timing analysis + winners archive | Extended |
| **HookLite** | Webhooks + attribution tracking + email/SEO event handlers | Extended |
| **ACTPDash** | Dashboard + research UI + calendar + funnel + SEO pages | Extended |
| **actp-worker** | Jobs + research polling + blueprint extraction + scoring loops | Extended |
| **ResearchLite** | Market research + blueprint extraction | **NEW** |
| **PublishLite** | Organic social publishing + timing optimization | **NEW** |
| **ContentLite** | Blueprint→content generation (video/image/email/blog) | **NEW** |

---

## 6. Data Flow: End-to-End Example

### Flow: "Discover trending fitness hook on Instagram → Generate content → Publish → Measure → Scale winner"

```
1. ResearchLite cron collects IG hashtag #homefitness top media
   → Stores in actp_market_items (source='ig_hashtag_top', content_type='video')

2. ResearchLite blueprint extractor analyzes the video:
   → Transcribes audio (Whisper)
   → Detects shots (5 shots, avg 2.5s each)
   → Extracts on-screen text ("3 exercises you're doing WRONG")
   → Identifies format: talking_head, hook_type: controversial
   → Stores creative_blueprint JSON

3. ContentLite generates 3 variants from the blueprint:
   a) Exact remake: same 5-beat structure, new script about our offer
   b) Baseline adjacent: same talking_head format, different hook angle
   c) Exploration: POV format (different structure), same fitness topic
   → Each gets: script + shot list + asset prompts + caption
   → Stores in actp_content_variants (bucket='video_bucket')

4. GenLite processes the video generation queue:
   → Submits to Sora/Veo3 for raw footage generation
   → actp-worker renders with Remotion (captions, overlays)
   → Final video URLs stored

5. PublishLite scheduling engine picks optimal times:
   → Thompson Sampling selects Tuesday 2pm, Wednesday 7pm, Thursday 12pm
   → Posts queued in actp_organic_posts with timing_slot metadata

6. PublishLite cron publishes at scheduled times:
   → IG Content Publishing API for each post
   → platform_post_id stored for metrics tracking

7. MetricsLite collects snapshots at t+1h, t+6h, t+24h, t+72h:
   → Views, likes, saves, shares, watch time, profile visits
   → Stores in actp_post_metrics

8. MetricsLite scoring cron scores all 3 variants:
   → hold_rate×0.3 + watch_time×0.25 + engagement×0.2 + clicks×0.15 + conversion×0.1
   → Variant (a) scores highest → marked as winner

9. ContentLite generates email + blog from winner:
   → Newsletter: weekly digest featuring winning content angle
   → Blog: SEO-optimized article expanding on the fitness topic
   → Both include tracked links (/r/abc123 → landing page)

10. HookLite attribution tracks the full funnel:
    → Blog reader clicks tracked link → UTM captured
    → Visits landing page → page_view event
    → Signs up → signup event
    → Attribution chain: blog_post → click → signup (attributed to variant_a blueprint)

11. AdLite graduation pipeline:
    → Winner organic post → create retargeting campaign for engaged users
    → Winner angle → create lookalike campaign with $50/day budget
    → Performance tracked back through MetricsLite

12. ResearchLite updates blueprint performance score:
    → Blueprint that generated winner gets score boost
    → Future generation prioritizes this blueprint pattern
    → CLOSED LOOP COMPLETE
```

---

## 7. Meta API Guardrails

### Publishing Limits
- **Instagram API**: ~25 API-published posts per 24h (enforce in PublishLite)
- **Facebook Page**: Similar limits, enforce via rate limiter
- **IG Hashtag Search**: 30 unique hashtags per rolling 7 days (enforce in ResearchLite)

### Content Safety
- Never exact-duplicate market research content — recreate format + mechanics, not verbatim
- Human approval step for "scale" creatives until system is stable
- Compliance disclosure automation for affiliate/sponsored content
- FTC-compliant disclosure in captions

### Account Protection
- Automated posting gradual ramp-up (start slow, increase over 2 weeks)
- Automated pause if engagement rate drops below threshold (possible shadowban detection)
- Content diversity enforcement (don't post same format 5x in a row)

---

## 8. Blueprint JSON Schema

```typescript
interface CreativeBlueprint {
  id: string;
  source: {
    type: 'market_item' | 'own_content' | 'manual';
    id: string;
    platform: string;
    url?: string;
  };
  
  // Classification
  content_type: 'video' | 'image' | 'carousel';
  format: 'talking_head' | 'pov' | 'carousel_text' | 'meme' | 'screen_record' | 
          'ugc_testimonial' | 'before_after' | 'demo' | 'lifestyle' | 'tutorial';
  
  // Hook
  hook: {
    pattern: string;       // "If you're X, stop doing Y…"
    type: 'question' | 'pov' | 'controversial' | 'statistic' | 'curiosity' | 'command';
    first_words: string;   // First 5-10 words
    estimated_hold_rate: number;
  };
  
  // Structure (for video)
  structure: {
    beats: Array<{
      type: 'hook' | 'problem' | 'agitate' | 'mechanism' | 'proof' | 'cta' | 'reveal';
      duration_seconds: number;
      description: string;
    }>;
    total_duration_seconds: number;
  };
  
  // Pacing (for video)
  pacing: {
    shot_count: number;
    avg_shot_duration: number;
    cut_pattern: 'fast' | 'medium' | 'slow' | 'mixed';
    energy_curve: 'build' | 'steady' | 'peak_early' | 'wave';
  };
  
  // Visual Layer
  visual: {
    text_density: 'none' | 'low' | 'medium' | 'high';
    font_feel: 'bold_sans' | 'handwritten' | 'minimal' | 'retro';
    broll_types: string[];   // ['product_close', 'lifestyle', 'screen_recording']
    overlays: boolean;
    color_mood: 'bright' | 'muted' | 'dark' | 'warm' | 'cool';
  };
  
  // Caption Pattern
  caption: {
    length: 'short' | 'medium' | 'long';  // <50 | 50-150 | 150+ words
    first_line_style: 'hook_question' | 'bold_claim' | 'story_start' | 'emoji_attention';
    emoji_density: 'none' | 'low' | 'medium' | 'high';
    cta_placement: 'end' | 'middle' | 'both';
    hashtag_strategy: 'none' | 'few' | 'moderate' | 'max';
    hashtag_count: number;
  };
  
  // Offer Angle
  angle: {
    type: 'pain' | 'desire' | 'identity' | 'outcome' | 'enemy' | 'objection_handling';
    mechanism: string;       // "speed", "ease", "cost", "results"
    proof_type: 'demo' | 'testimonial' | 'comparison' | 'before_after' | 'statistic';
    awareness_level: 1 | 2 | 3 | 4 | 5;  // 1=unaware → 5=most aware
  };
  
  // Performance
  performance: {
    score: number;
    usage_count: number;
    best_performing_variant_id?: string;
    avg_engagement_rate?: number;
  };
}
```

---

## 9. Email Newsletter Schema

```typescript
interface NewsletterIssue {
  id: string;
  subject: string;
  preview_text: string;
  
  // Required format sections
  sections: Array<{
    type: 'hero_content' | 'trending_topic' | 'winner_spotlight' | 'quick_tips' | 'cta_block';
    heading: string;
    body: string;
    image_url?: string;
    link_url?: string;  // Tracked via /r/ redirect
    link_text?: string;
  }>;
  
  // Personalization
  personalization: {
    first_name_fallback: string;
    segment?: string;
  };
  
  // Tracking
  tracking: {
    utm_source: 'newsletter';
    utm_medium: 'email';
    utm_campaign: string;
  };
}
```

---

## 10. SEO Blog Post Schema

```typescript
interface SEOBlogPost {
  id: string;
  title: string;
  slug: string;
  meta_description: string;  // 150-160 chars
  
  // Required format
  sections: Array<{
    h2: string;
    paragraphs: string[];
    image_url?: string;
    image_alt?: string;
  }>;
  
  // SEO
  target_keyword: string;
  secondary_keywords: string[];
  internal_links: Array<{ text: string; url: string }>;
  
  // FAQ (for rich snippets)
  faqs: Array<{ question: string; answer: string }>;
  
  // CTA
  cta: {
    heading: string;
    body: string;
    button_text: string;
    button_url: string;  // Tracked via /r/ redirect
  };
  
  // Tracking
  tracking: {
    utm_source: 'blog';
    utm_medium: 'organic';
    utm_campaign: string;
  };
}
```

---

## 11. Implementation Priority

### Phase 1: Extend Existing Services (Week 1-2)
- [ ] **MetricsLite**: Add content scoring engine + winners archive endpoint
- [ ] **MetricsLite**: Add timing analysis (day×hour engagement matrix)
- [ ] **HookLite**: Add attribution tracking module + UTM redirect endpoint
- [ ] **ACTPDash**: Add market research UI placeholder pages
- [ ] **actp-worker**: Add scoring loop

### Phase 2: ResearchLite MVP (Week 3-4)
- [ ] Create ResearchLite service (same pattern as other Lite services)
- [ ] IG Hashtag collector (Top + Recent Media)
- [ ] Meta Ad Library collector
- [ ] Basic blueprint extractor (caption analysis + format classification)
- [ ] Blueprint API endpoints

### Phase 3: PublishLite MVP (Week 5-6)
- [ ] Create PublishLite service
- [ ] Instagram Content Publishing (feed + reels)
- [ ] Facebook Page publishing
- [ ] Basic scheduling (manual time selection)
- [ ] Post metrics collection integration with MetricsLite

### Phase 4: ContentLite MVP (Week 7-8)
- [ ] Create ContentLite service
- [ ] Blueprint → video script generator
- [ ] Blueprint → image prompt generator
- [ ] Blueprint → caption generator
- [ ] Variation strategies (exact remake, adjacent, exploration)

### Phase 5: Email + Blog Generation (Week 9-10)
- [ ] ContentLite: Email newsletter generator
- [ ] ContentLite: SEO blog post generator
- [ ] HookLite: Email webhook handler
- [ ] Attribution funnel tracking

### Phase 6: Timing Optimization + Closed Loop (Week 11-12)
- [ ] PublishLite: Thompson Sampling scheduler
- [ ] MetricsLite: Auto-score → auto-promote winners
- [ ] AdLite: Organic→Paid graduation pipeline
- [ ] ResearchLite: Blueprint performance feedback loop

---

## 12. Environment Variables (New Services)

```bash
# ResearchLite
RESEARCHLITE_MASTER_KEY=rlk_...
IG_GRAPH_API_TOKEN=...
META_AD_LIBRARY_ACCESS_TOKEN=...
OPENAI_API_KEY=...               # For blueprint extraction LLM analysis

# PublishLite
PUBLISHLITE_MASTER_KEY=plk_...
IG_BUSINESS_ACCOUNT_ID=...
IG_ACCESS_TOKEN=...
FB_PAGE_ID=...
FB_PAGE_ACCESS_TOKEN=...

# ContentLite
CONTENTLITE_MASTER_KEY=clk_...
OPENAI_API_KEY=...               # For content generation
```

---

*Last Updated: February 2026*
*Companion Documents: UNIFIED_PLATFORM_ARCHITECTURE.md, PRD-Content-Factory.md, PRD-Programmatic-Creative-Testing.md*
