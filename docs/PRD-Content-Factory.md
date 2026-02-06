# PRD: Content Factory
## AI-Powered Content Generation Pipeline for Social Commerce

**Version:** 1.0  
**Date:** February 2026  
**Status:** New Module  
**Integration:** ACD Dashboard + Remotion + PCT

---

## Executive Summary

Content Factory is an AI-powered content generation system that creates before/after images, videos, and scripts optimized for social commerce platforms (TikTok Shop, Instagram, Facebook). It leverages Google's Veo 3 for video generation and Nano Banana (Gemini) for rapid image creation, with built-in awareness-level targeting and micro-budget testing.

---

## Problem Statement

Creators need to:
1. Generate high volumes of test content quickly
2. Target different customer awareness levels
3. Test which angles work with minimal budget ($5 tests)
4. Create TikTok Shop-compliant affiliate content
5. Track which creative parameters drive performance

---

## Core Capabilities

### 1. Image Generation (Nano Banana / Gemini)
- Before/after image pairs
- Product photography variations
- Consistent subject identity across variants
- Batch generation (3-5 variants each)

### 2. Video Generation (Veo 3 / Veo 3.1)
- Photo-to-video conversion
- 8-second clips for assembly
- Vertical (9:16) TikTok format
- Whip-pan transitions
- Realistic phone footage aesthetic

### 3. Script Generation (LLM)
- 5 awareness level scripts per product
- Market sophistication variants
- TikTok-native language
- Compliance-safe copy

### 4. Assembly & Distribution
- Auto-caption generation
- TikTok Shop link integration
- Commercial disclosure compliance
- Batch publishing to platforms

### 5. Micro-Testing Framework
- $5 TikTok Promote tests
- Performance scoring system
- Winner identification
- Iteration recommendations

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CONTENT FACTORY PIPELINE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐                                                        │
│  │ PRODUCT DOSSIER │ ◄── Input: product info, benefits, proof, links       │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ IMAGE GENERATION (Nano Banana)                                       │   │
│  │ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │   │
│  │ │ Before Set  │  │ After Set   │  │ Product     │                   │   │
│  │ │ (3-5 imgs)  │  │ (3-5 imgs)  │  │ Variations  │                   │   │
│  │ └─────────────┘  └─────────────┘  └─────────────┘                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ VIDEO GENERATION (Veo 3.1)                                           │   │
│  │ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │   │
│  │ │ Before→     │  │ Product     │  │ Reveal      │                   │   │
│  │ │ After Clip  │  │ Demo Clip   │  │ Transition  │                   │   │
│  │ └─────────────┘  └─────────────┘  └─────────────┘                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ SCRIPT GENERATION (5 Awareness Levels)                               │   │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │ │ Unaware  │ │ Problem  │ │ Solution │ │ Product  │ │ Most     │   │   │
│  │ │ (POV)    │ │ Aware    │ │ Aware    │ │ Aware    │ │ Aware    │   │   │
│  │ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ASSEMBLY (CapCut / Google Vids / Remotion)                           │   │
│  │ - Combine clips + script                                             │   │
│  │ - Add captions                                                       │   │
│  │ - Add proof elements                                                 │   │
│  │ - Add CTA overlay                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PUBLISH + TEST                                                       │   │
│  │ - Post to TikTok/Instagram                                          │   │
│  │ - Run $5 Promote tests                                              │   │
│  │ - Track metrics                                                      │   │
│  │ - Score and rank                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ LEARN + ITERATE                                                      │   │
│  │ - Identify winning angles                                            │   │
│  │ - Generate more variants of winners                                  │   │
│  │ - Archive losers                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

```sql
-- =============================================
-- PRODUCT DOSSIERS
-- =============================================

CREATE TABLE cf_product_dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Product Info
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  
  -- Links
  tiktok_shop_url TEXT,
  affiliate_link TEXT,
  product_page_url TEXT,
  
  -- Pricing
  price DECIMAL(10,2),
  discount_price DECIMAL(10,2),
  
  -- Content
  benefits JSONB DEFAULT '[]', -- ["Saves 2 hours daily", "Works in 30 seconds"]
  pain_points JSONB DEFAULT '[]',
  proof_types JSONB DEFAULT '[]', -- ["review", "demo", "comparison"]
  target_audience TEXT,
  
  -- Category
  category TEXT, -- home, beauty, fitness, kitchen, tech
  niche TEXT,
  
  -- Status
  status TEXT DEFAULT 'active',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- GENERATED IMAGES
-- =============================================

CREATE TABLE cf_generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES cf_product_dossiers(id),
  
  -- Image Type
  type TEXT NOT NULL, -- 'before', 'after', 'product', 'lifestyle'
  variant_number INT DEFAULT 1,
  
  -- Generation
  prompt TEXT NOT NULL,
  model TEXT DEFAULT 'nano-banana', -- nano-banana, nano-banana-pro
  
  -- Output
  image_url TEXT,
  thumbnail_url TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, generating, complete, failed
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- GENERATED VIDEOS
-- =============================================

CREATE TABLE cf_generated_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES cf_product_dossiers(id),
  
  -- Video Type
  type TEXT NOT NULL, -- 'before_after', 'demo', 'reveal', 'full_ad'
  
  -- Source
  source_image_id UUID REFERENCES cf_generated_images(id),
  
  -- Generation
  prompt TEXT NOT NULL,
  model TEXT DEFAULT 'veo-3.1',
  duration_seconds INT DEFAULT 8,
  aspect_ratio TEXT DEFAULT '9:16', -- 9:16, 1:1, 16:9
  
  -- Output
  video_url TEXT,
  thumbnail_url TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SCRIPTS (5 Awareness Levels)
-- =============================================

CREATE TABLE cf_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES cf_product_dossiers(id),
  
  -- Targeting
  awareness_level INT NOT NULL, -- 1=unaware, 2=problem, 3=solution, 4=product, 5=most
  market_sophistication INT DEFAULT 3, -- 1-5
  
  -- Script Content
  hook TEXT NOT NULL,
  body TEXT NOT NULL,
  cta TEXT NOT NULL,
  full_script TEXT NOT NULL,
  
  -- Metadata
  word_count INT,
  estimated_duration_seconds INT,
  
  -- Generation
  prompt_used TEXT,
  model TEXT DEFAULT 'gpt-4',
  
  -- Performance (after testing)
  performance_score FLOAT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ASSEMBLED CONTENT
-- =============================================

CREATE TABLE cf_assembled_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES cf_product_dossiers(id),
  
  -- Components
  script_id UUID REFERENCES cf_scripts(id),
  video_ids UUID[] DEFAULT '{}',
  image_ids UUID[] DEFAULT '{}',
  
  -- Assembly
  title TEXT,
  caption TEXT,
  hashtags TEXT[],
  
  -- Output
  final_video_url TEXT,
  thumbnail_url TEXT,
  
  -- Platform
  target_platform TEXT DEFAULT 'tiktok', -- tiktok, instagram, facebook
  
  -- Compliance
  has_disclosure BOOLEAN DEFAULT false,
  disclosure_type TEXT, -- 'paid_partnership', 'affiliate', 'sponsored'
  
  -- Status
  status TEXT DEFAULT 'draft', -- draft, ready, published, archived
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PUBLISH + TEST TRACKING
-- =============================================

CREATE TABLE cf_published_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES cf_assembled_content(id),
  
  -- Platform
  platform TEXT NOT NULL, -- tiktok, instagram, facebook
  platform_post_id TEXT,
  post_url TEXT,
  
  -- Promotion
  promoted BOOLEAN DEFAULT false,
  promote_budget_cents INT,
  promote_start_at TIMESTAMPTZ,
  promote_end_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'published', -- published, promoted, completed
  
  published_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cf_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  published_id UUID NOT NULL REFERENCES cf_published_content(id),
  
  -- Date
  date DATE NOT NULL,
  
  -- Metrics
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  saves INT DEFAULT 0,
  
  -- Engagement
  watch_time_seconds INT,
  avg_watch_percentage FLOAT,
  profile_visits INT,
  
  -- Conversion (if trackable)
  link_clicks INT DEFAULT 0,
  add_to_carts INT DEFAULT 0,
  purchases INT DEFAULT 0,
  purchase_value DECIMAL(10,2),
  
  -- Promotion metrics
  spend_cents INT DEFAULT 0,
  reach INT DEFAULT 0,
  
  -- Calculated
  engagement_rate FLOAT,
  cost_per_view FLOAT,
  views_per_dollar FLOAT,
  
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(published_id, date)
);

-- =============================================
-- ANGLE TESTING & SCORING
-- =============================================

CREATE TABLE cf_angle_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES cf_product_dossiers(id),
  
  -- Test Definition
  name TEXT NOT NULL,
  hypothesis TEXT,
  
  -- Variables
  awareness_level INT,
  hook_type TEXT,
  visual_style TEXT,
  
  -- Budget
  budget_per_variant_cents INT DEFAULT 500, -- $5
  total_budget_cents INT,
  
  -- Variants
  variant_ids UUID[] DEFAULT '{}', -- cf_published_content IDs
  
  -- Status
  status TEXT DEFAULT 'draft', -- draft, running, completed
  
  -- Results
  winner_id UUID,
  winner_reason TEXT,
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scoring formula configuration
CREATE TABLE cf_scoring_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  
  -- Weights
  hold_rate_weight FLOAT DEFAULT 0.3,
  watch_time_weight FLOAT DEFAULT 0.25,
  engagement_weight FLOAT DEFAULT 0.2,
  click_rate_weight FLOAT DEFAULT 0.15,
  conversion_weight FLOAT DEFAULT 0.1,
  
  -- Thresholds
  min_views_for_valid INT DEFAULT 100,
  min_spend_cents_for_valid INT DEFAULT 300,
  
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## AI Prompt Templates

### Nano Banana - Before Image
```
Make a before version of [product category] scene:
- Emphasize the problem: [specific pain point]
- Dull, natural lighting
- Slightly messy/cluttered environment
- Realistic phone photo aesthetic
- No brand logos visible
- Keep subject identity consistent for pairing
```

### Nano Banana - After Image
```
Make an after version of the same scene:
- Same composition but improved
- Problem is solved: [specific benefit]
- Brighter, cleaner lighting
- Organized/improved environment
- Product visible but not staged
- Realistic phone photo aesthetic
- Keep subject identity consistent with before image
```

### Veo 3.1 - Before/After Reveal
```
Vertical 9:16, handheld phone footage, 8 seconds.
Start on the "before" scene showing [problem].
Quick whip-pan transition (0.5s).
Reveal "after" scene showing [solution/result].
Subtle camera shake for authenticity.
Natural indoor lighting.
Ambient room sound.
```

### Script - Unaware (POV/Meme Style)
```
Write a 15-second TikTok script for [product].
Target: People who don't know they have this problem yet.
Style: POV/meme/relatable scenario
Structure:
- Hook: Relatable situation (no product mention)
- Build: Escalate the scenario
- Reveal: Subtle solution hint
- CTA: "Link in bio" or soft curiosity driver
Tone: Casual, authentic, not salesy
```

### Script - Problem Aware
```
Write a 15-second TikTok script for [product].
Target: People who know the problem but not solutions.
Structure:
- Hook: Call out the specific pain point
- Agitate: "Here's what's actually causing this..."
- Tease: Hint at solution category
- CTA: "Here's what I found that works"
```

### Script - Solution Aware
```
Write a 15-second TikTok script for [product].
Target: People who know solutions exist, comparing options.
Structure:
- Hook: "3 ways to fix [problem]..."
- Compare: Quick comparison (this one is simplest/fastest)
- Proof: Quick result or testimonial
- CTA: "This is the one I use - link in bio"
```

### Script - Product Aware
```
Write a 15-second TikTok script for [product].
Target: People who know this product but haven't bought.
Structure:
- Hook: "I tried [product] so you don't have to..."
- Review: Honest pros/cons
- Result: Show actual result
- CTA: "If you've been curious - link in bio"
```

### Script - Most Aware
```
Write a 15-second TikTok script for [product].
Target: People ready to buy, just need a push.
Structure:
- Hook: "If you've been on the fence about [product]..."
- Urgency: Limited time/stock/deal
- Reassurance: Risk reversal or guarantee
- CTA: Direct "Get it now - link in bio"
```

---

## Compliance Requirements

### TikTok Shop Affiliate
1. **Commercial Content Disclosure**: Turn ON when promoting products
2. **Clear Affiliate Disclosure**: "Paid partnership" or "Affiliate link"
3. **No Misleading Claims**: Demo-style, not exaggerated transformations
4. **FTC Compliance**: "Material connection" disclosure clear and conspicuous

### Before/After Content
- Keep transformations realistic
- Avoid health/beauty miracle claims
- Use "results may vary" when applicable
- Show realistic timeframes

---

## API Endpoints

### Dossiers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cf/dossiers` | List all product dossiers |
| POST | `/api/cf/dossiers` | Create product dossier |
| GET | `/api/cf/dossiers/:id` | Get dossier with all generated content |
| PUT | `/api/cf/dossiers/:id` | Update dossier |

### Generation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cf/generate/images` | Generate before/after images |
| POST | `/api/cf/generate/videos` | Generate video clips |
| POST | `/api/cf/generate/scripts` | Generate 5 awareness-level scripts |
| POST | `/api/cf/generate/all` | Full content generation pipeline |

### Assembly
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cf/assemble` | Assemble content from components |
| GET | `/api/cf/content/:id/preview` | Preview assembled content |

### Publishing
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cf/publish` | Publish to platform |
| POST | `/api/cf/promote` | Start $5 promotion test |
| GET | `/api/cf/metrics/:id` | Get performance metrics |

### Testing
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cf/tests` | Create angle test |
| GET | `/api/cf/tests/:id` | Get test results |
| POST | `/api/cf/tests/:id/pick-winner` | Mark winner |

---

## Scoring System

### Metrics Collected
1. **Hold Rate**: 3-second views / impressions
2. **Avg Watch Time**: Total watch time / views
3. **Engagement Rate**: (likes + comments + shares + saves) / views
4. **Click Rate**: Link clicks / views
5. **Conversion Rate**: Purchases / clicks (if trackable)

### Winner Selection Algorithm
```typescript
function calculateContentScore(metrics: ContentMetrics, config: ScoringConfig): number {
  const holdRate = metrics.threeSecondViews / metrics.impressions;
  const avgWatchPct = metrics.avgWatchPercentage / 100;
  const engagementRate = (metrics.likes + metrics.comments + metrics.shares + metrics.saves) / metrics.views;
  const clickRate = metrics.linkClicks / metrics.views;
  const conversionRate = metrics.purchases / Math.max(metrics.linkClicks, 1);
  
  return (
    holdRate * config.holdRateWeight +
    avgWatchPct * config.watchTimeWeight +
    engagementRate * config.engagementWeight +
    clickRate * config.clickRateWeight +
    conversionRate * config.conversionWeight
  );
}

function pickWinner(variants: PublishedContent[], config: ScoringConfig): WinnerResult {
  const validVariants = variants.filter(v => 
    v.metrics.views >= config.minViewsForValid &&
    v.metrics.spendCents >= config.minSpendCentsForValid
  );
  
  if (validVariants.length === 0) {
    return { winner: null, reason: 'Insufficient data for all variants' };
  }
  
  const scored = validVariants.map(v => ({
    variant: v,
    score: calculateContentScore(v.metrics, config)
  }));
  
  scored.sort((a, b) => b.score - a.score);
  
  return {
    winner: scored[0].variant,
    reason: `Highest composite score: ${scored[0].score.toFixed(3)}`,
    allScores: scored
  };
}
```

---

## Integration Points

### With Remotion
- Use Remotion for video assembly when Veo output needs editing
- Remotion templates for caption overlay
- Batch rendering for variants

### With PCT (Programmatic Creative Testing)
- Use PCT hooks as video scripts
- Share awareness level targeting
- Unified performance database

### With WaitlistLab
- Publish winning content as ads
- Use lead forms for higher-intent content
- Attribution tracking across platforms

### With SoftwareHub
- Content Factory available as software package
- Course on content creation workflow
- Licensed access to templates

---

## Implementation Phases

### Phase 1: Core Generation (Week 1-2)
- [ ] Product dossier CRUD
- [ ] Nano Banana image generation integration
- [ ] Veo 3.1 video generation integration
- [ ] 5 awareness-level script generation

### Phase 2: Assembly (Week 3-4)
- [ ] Content assembly UI
- [ ] Caption/overlay generation
- [ ] Preview system
- [ ] Export to platforms

### Phase 3: Publishing (Week 5-6)
- [ ] TikTok API integration
- [ ] Instagram API integration
- [ ] Compliance disclosure automation
- [ ] Post scheduling

### Phase 4: Testing Framework (Week 7-8)
- [ ] $5 promote test automation
- [ ] Metrics collection
- [ ] Scoring algorithm
- [ ] Winner identification

### Phase 5: Iteration (Week 9-10)
- [ ] "More like winner" generation
- [ ] Angle performance analytics
- [ ] Automated recommendations
- [ ] Dashboard with insights

---

## Environment Variables

```bash
# Google AI (Gemini/Veo)
GOOGLE_AI_API_KEY=...
GOOGLE_PROJECT_ID=...

# TikTok
TIKTOK_ACCESS_TOKEN=...
TIKTOK_SHOP_ID=...

# Instagram/Meta
INSTAGRAM_ACCESS_TOKEN=...

# OpenAI (for scripts)
OPENAI_API_KEY=...

# Storage
R2_BUCKET_NAME=content-factory
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Content pieces generated per day | 50+ |
| Time from dossier to published | <30 minutes |
| Test completion rate | >90% |
| Winner identification accuracy | Validated by subsequent performance |
| Cost per content piece | <$1 |

---

*Last Updated: February 2026*
