# Content Factory Database Schema

## Entity Relationship Diagram

```
┌──────────────────────────┐
│ cf_product_dossiers      │
│ ────────────────────────│
│ id (PK)                  │
│ slug (UNIQUE)            │
│ name                     │
│ benefits []              │
│ pain_points []           │
│ proof_types []           │
│ target_audience          │
│ category                 │
│ niche                    │
│ price                    │
│ tiktok_shop_url          │
│ affiliate_link           │
│ status                   │
│ created_at               │
│ updated_at               │
└────────┬─────────────────┘
         │
         │ (1:N)
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│ cf_generated_images      │  │ cf_scripts               │
│ ────────────────────────│  │ ────────────────────────│
│ id (PK)                  │  │ id (PK)                  │
│ dossier_id (FK)          │  │ dossier_id (FK)          │
│ type                     │  │ awareness_level (1-5)    │
│ prompt                   │  │ market_sophistication    │
│ model                    │  │ hook                     │
│ image_url                │  │ body                     │
│ remotion_job_id          │  │ cta                      │
│ status                   │  │ full_script (GENERATED)  │
│ metadata                 │  │ estimated_duration       │
│ created_at               │  │ created_at               │
└────────┬─────────────────┘  └────────┬─────────────────┘
         │                              │
         │ (1:N)                        │
         ▼                              │
┌──────────────────────────┐            │
│ cf_generated_videos      │            │
│ ────────────────────────│            │
│ id (PK)                  │            │
│ dossier_id (FK)          │            │
│ source_image_id (FK)     │            │
│ type                     │            │
│ prompt                   │            │
│ model                    │            │
│ duration                 │            │
│ aspect_ratio             │            │
│ video_url                │            │
│ remotion_job_id          │            │
│ status                   │            │
│ metadata                 │            │
│ created_at               │            │
└────────┬─────────────────┘            │
         │                              │
         │ (M:N)                        │ (1:N)
         └────────────┬─────────────────┘
                      ▼
         ┌──────────────────────────┐
         │ cf_assembled_content     │
         │ ────────────────────────│
         │ id (PK)                  │
         │ dossier_id (FK)          │
         │ script_id (FK)           │
         │ video_ids []             │
         │ image_ids []             │
         │ platform                 │
         │ caption                  │
         │ hashtags []              │
         │ compliance_disclosure    │
         │ remotion_render_id       │
         │ final_video_url          │
         │ status                   │
         │ metadata                 │
         │ created_at               │
         └────────┬─────────────────┘
                  │
                  │ (1:N)
                  ▼
         ┌──────────────────────────┐
         │ cf_published_content     │
         │ ────────────────────────│
         │ id (PK)                  │
         │ assembled_content_id (FK)│
         │ platform                 │
         │ platform_post_id         │
         │ platform_url             │
         │ promotion_budget         │
         │ promotion_status         │
         │ promotion_started_at     │
         │ promotion_ended_at       │
         │ published_at             │
         └────────┬─────────────────┘
                  │
                  │ (1:N)
                  ▼
         ┌──────────────────────────┐
         │ cf_performance_metrics   │
         │ ────────────────────────│
         │ id (PK)                  │
         │ published_content_id (FK)│
         │ date                     │
         │ views                    │
         │ likes                    │
         │ comments                 │
         │ shares                   │
         │ saves                    │
         │ clicks                   │
         │ conversions              │
         │ spend                    │
         │ engagement_rate (GEN)    │
         │ ctr (GENERATED)          │
         │ created_at               │
         └──────────────────────────┘

┌──────────────────────────┐
│ cf_scoring_config        │
│ ────────────────────────│
│ id (PK)                  │
│ name                     │
│ weights (JSONB)          │
│ min_views_threshold      │
│ active                   │
│ created_at               │
└──────────────────────────┘

┌──────────────────────────┐
│ cf_ab_tests              │
│ ────────────────────────│
│ id (PK)                  │
│ name                     │
│ variants (JSONB[])       │
│ status                   │
│ winner_id (FK)           │
│ confidence               │
│ created_at               │
│ completed_at             │
└──────────────────────────┘
```

---

## Table Definitions

### cf_product_dossiers

Central table for product information. All content generation starts here.

```sql
CREATE TABLE cf_product_dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  benefits TEXT[] DEFAULT '{}',
  pain_points TEXT[] DEFAULT '{}',
  proof_types TEXT[] DEFAULT '{before_after}',
  target_audience TEXT,
  category TEXT,
  niche TEXT,
  price DECIMAL(10,2),
  tiktok_shop_url TEXT,
  affiliate_link TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_dossiers_status ON cf_product_dossiers(status);
CREATE INDEX idx_dossiers_category ON cf_product_dossiers(category);
CREATE INDEX idx_dossiers_slug ON cf_product_dossiers(slug);
CREATE INDEX idx_dossiers_created_at ON cf_product_dossiers(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_dossier_updated_at
  BEFORE UPDATE ON cf_product_dossiers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Fields:**
- `id`: UUID primary key
- `slug`: URL-friendly identifier (auto-generated from name)
- `name`: Product name (e.g., "Acne Patch")
- `benefits`: Array of benefit statements
- `pain_points`: Array of pain points the product solves
- `proof_types`: Types of proof needed (`before_after`, `testimonial`, `demo`)
- `target_audience`: Target demographic (e.g., "Women 18-35 with acne")
- `category`: Product category (e.g., "Beauty", "Fitness")
- `niche`: More specific niche (e.g., "Skincare", "Weight Loss")
- `price`: Product price in USD
- `tiktok_shop_url`: TikTok Shop product link
- `affiliate_link`: Affiliate link (Amazon, etc.)
- `status`: Workflow status (`draft`, `active`, `archived`)

**Status Flow:**
```
draft → active → archived
```

---

### cf_generated_images

Stores AI-generated images via Remotion → Nano Banana.

```sql
CREATE TABLE cf_generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES cf_product_dossiers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('before', 'after', 'product', 'lifestyle')),
  prompt TEXT NOT NULL,
  model TEXT DEFAULT 'nano-banana',
  image_url TEXT,
  remotion_job_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_images_dossier ON cf_generated_images(dossier_id);
CREATE INDEX idx_images_type ON cf_generated_images(type);
CREATE INDEX idx_images_status ON cf_generated_images(status);
CREATE INDEX idx_images_remotion_job ON cf_generated_images(remotion_job_id) WHERE remotion_job_id IS NOT NULL;

-- Partial index for pending jobs
CREATE INDEX idx_images_pending ON cf_generated_images(created_at) WHERE status = 'pending';
```

**Fields:**
- `type`: Image type
  - `before`: Problem state (acne, clutter, etc.)
  - `after`: Solution state (clear skin, organized)
  - `product`: Product showcase
  - `lifestyle`: Product in use
- `prompt`: Full prompt sent to Nano Banana
- `model`: AI model used (currently `nano-banana`)
- `image_url`: CDN URL of generated image
- `remotion_job_id`: Remotion API job ID for status polling
- `status`: Generation status
- `metadata`: Remotion response data (dimensions, format, etc.)

**Status Flow:**
```
pending → generating → completed
                    ↘ failed
```

---

### cf_generated_videos

Stores AI-generated videos via Remotion → Veo 3.1.

```sql
CREATE TABLE cf_generated_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES cf_product_dossiers(id) ON DELETE CASCADE,
  source_image_id UUID REFERENCES cf_generated_images(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('reveal', 'demo', 'transition', 'testimonial')),
  prompt TEXT NOT NULL,
  model TEXT DEFAULT 'veo-3.1',
  duration INTEGER CHECK (duration > 0),
  aspect_ratio TEXT DEFAULT '9:16' CHECK (aspect_ratio IN ('9:16', '16:9', '1:1', '4:5')),
  video_url TEXT,
  remotion_job_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_videos_dossier ON cf_generated_videos(dossier_id);
CREATE INDEX idx_videos_source_image ON cf_generated_videos(source_image_id);
CREATE INDEX idx_videos_type ON cf_generated_videos(type);
CREATE INDEX idx_videos_status ON cf_generated_videos(status);
CREATE INDEX idx_videos_remotion_job ON cf_generated_videos(remotion_job_id) WHERE remotion_job_id IS NOT NULL;
```

**Fields:**
- `type`: Video type
  - `reveal`: Before→after whip-pan reveal
  - `demo`: Product demonstration
  - `transition`: Transition clip between scenes
  - `testimonial`: User testimonial
- `source_image_id`: Starting image for image-to-video generation
- `duration`: Video length in seconds
- `aspect_ratio`: Platform-specific ratio
  - `9:16`: TikTok, Instagram Reels
  - `16:9`: YouTube, Facebook
  - `1:1`: Instagram Feed
  - `4:5`: Instagram Story/Feed
- `video_url`: CDN URL of generated video

---

### cf_scripts

Stores scripts based on Eugene Schwartz's 5 awareness levels.

```sql
CREATE TABLE cf_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES cf_product_dossiers(id) ON DELETE CASCADE,
  awareness_level INTEGER NOT NULL CHECK (awareness_level BETWEEN 1 AND 5),
  market_sophistication INTEGER CHECK (market_sophistication BETWEEN 1 AND 5),
  hook TEXT NOT NULL,
  body TEXT NOT NULL,
  cta TEXT NOT NULL,
  full_script TEXT GENERATED ALWAYS AS (hook || E'\n\n' || body || E'\n\n' || cta) STORED,
  estimated_duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_scripts_dossier ON cf_scripts(dossier_id);
CREATE INDEX idx_scripts_awareness ON cf_scripts(awareness_level);
CREATE UNIQUE INDEX idx_scripts_dossier_awareness ON cf_scripts(dossier_id, awareness_level, market_sophistication);
```

**Fields:**
- `awareness_level`: Eugene Schwartz framework (1-5)
  - 1: **Unaware** - POV/meme, no product mention
  - 2: **Problem Aware** - Call out pain
  - 3: **Solution Aware** - Compare options
  - 4: **Product Aware** - Review style
  - 5: **Most Aware** - Urgency, direct CTA
- `market_sophistication`: Market maturity (1-5)
  - 1: Direct claim
  - 2: Improvement claim
  - 3: Mechanism explanation
  - 4: Enhanced mechanism
  - 5: Experience/identity
- `hook`: Opening line (first 3 seconds)
- `body`: Main content
- `cta`: Call to action
- `full_script`: Computed field combining hook + body + cta
- `estimated_duration`: Script reading time in seconds

**Unique Constraint:**
Only one script per (dossier_id, awareness_level, market_sophistication) combination.

---

### cf_assembled_content

Final content ready for publishing, assembled via Remotion templates.

```sql
CREATE TABLE cf_assembled_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES cf_product_dossiers(id) ON DELETE CASCADE,
  script_id UUID REFERENCES cf_scripts(id) ON DELETE SET NULL,
  video_ids UUID[] DEFAULT '{}',
  image_ids UUID[] DEFAULT '{}',
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'facebook', 'youtube')),
  caption TEXT,
  hashtags TEXT[] DEFAULT '{}',
  compliance_disclosure TEXT,
  remotion_render_id TEXT,
  final_video_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'rendering', 'ready', 'published', 'failed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_assembled_dossier ON cf_assembled_content(dossier_id);
CREATE INDEX idx_assembled_script ON cf_assembled_content(script_id);
CREATE INDEX idx_assembled_status ON cf_assembled_content(status);
CREATE INDEX idx_assembled_platform ON cf_assembled_content(platform);
CREATE INDEX idx_assembled_remotion ON cf_assembled_content(remotion_render_id) WHERE remotion_render_id IS NOT NULL;
```

**Fields:**
- `video_ids`: Array of `cf_generated_videos.id` used in assembly
- `image_ids`: Array of `cf_generated_images.id` used in assembly
- `platform`: Target platform determines aspect ratio, max duration
- `caption`: Platform caption with emojis
- `hashtags`: Array of hashtags (no `#` prefix)
- `compliance_disclosure`: FTC/platform-required disclosures
- `remotion_render_id`: Remotion template render job ID
- `final_video_url`: Final assembled video URL
- `metadata`: Render settings, dimensions, duration, file size

**Status Flow:**
```
draft → rendering → ready → published
                 ↘ failed
```

---

### cf_published_content

Tracks content published to platforms.

```sql
CREATE TABLE cf_published_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembled_content_id UUID NOT NULL REFERENCES cf_assembled_content(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'facebook', 'youtube')),
  platform_post_id TEXT,
  platform_url TEXT,
  promotion_budget DECIMAL(10,2) CHECK (promotion_budget >= 0),
  promotion_status TEXT CHECK (promotion_status IN ('none', 'pending', 'active', 'completed', 'failed')),
  promotion_started_at TIMESTAMPTZ,
  promotion_ended_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_published_assembled ON cf_published_content(assembled_content_id);
CREATE INDEX idx_published_platform ON cf_published_content(platform);
CREATE INDEX idx_published_platform_post ON cf_published_content(platform, platform_post_id);
CREATE INDEX idx_published_promotion_status ON cf_published_content(promotion_status);
CREATE INDEX idx_published_date ON cf_published_content(published_at DESC);
```

**Fields:**
- `platform_post_id`: Platform's unique post ID
  - TikTok: Video ID (e.g., `7234567890123456789`)
  - Instagram: Media ID
- `platform_url`: Direct link to post
- `promotion_budget`: Budget for paid promotion (e.g., $5.00 for TikTok Promote)
- `promotion_status`: Promotion campaign status
  - `none`: No promotion
  - `pending`: Scheduled
  - `active`: Currently running
  - `completed`: Finished
  - `failed`: Failed to start

---

### cf_performance_metrics

Daily performance metrics for published content.

```sql
CREATE TABLE cf_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  published_content_id UUID NOT NULL REFERENCES cf_published_content(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0 CHECK (views >= 0),
  likes INTEGER DEFAULT 0 CHECK (likes >= 0),
  comments INTEGER DEFAULT 0 CHECK (comments >= 0),
  shares INTEGER DEFAULT 0 CHECK (shares >= 0),
  saves INTEGER DEFAULT 0 CHECK (saves >= 0),
  clicks INTEGER DEFAULT 0 CHECK (clicks >= 0),
  conversions INTEGER DEFAULT 0 CHECK (conversions >= 0),
  spend DECIMAL(10,2) DEFAULT 0 CHECK (spend >= 0),
  engagement_rate DECIMAL(5,4) GENERATED ALWAYS AS (
    CASE WHEN views > 0
    THEN (likes + comments + shares + saves)::DECIMAL / views
    ELSE 0 END
  ) STORED,
  ctr DECIMAL(5,4) GENERATED ALWAYS AS (
    CASE WHEN views > 0
    THEN clicks::DECIMAL / views
    ELSE 0 END
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_metrics_unique ON cf_performance_metrics(published_content_id, date);
CREATE INDEX idx_metrics_published ON cf_performance_metrics(published_content_id);
CREATE INDEX idx_metrics_date ON cf_performance_metrics(date DESC);

-- Partial indexes for high-performers
CREATE INDEX idx_metrics_high_engagement ON cf_performance_metrics(engagement_rate DESC)
  WHERE views > 1000;
CREATE INDEX idx_metrics_high_ctr ON cf_performance_metrics(ctr DESC)
  WHERE views > 1000;
```

**Computed Fields:**
- `engagement_rate`: (likes + comments + shares + saves) / views
- `ctr`: clicks / views

**Unique Constraint:**
One metrics record per (published_content_id, date).

---

### cf_scoring_config

Configurable scoring weights for winner identification.

```sql
CREATE TABLE cf_scoring_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  weights JSONB NOT NULL,
  min_views_threshold INTEGER DEFAULT 1000,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_scoring_active ON cf_scoring_config(active) WHERE active = true;
```

**Fields:**
- `weights`: JSON object with metric weights (must sum to 1.0)
  ```json
  {
    "engagement": 0.4,
    "ctr": 0.3,
    "conversions": 0.3
  }
  ```
- `min_views_threshold`: Minimum views to be considered for scoring
- `active`: Only one active config at a time

**Example Configs:**
```sql
-- Engagement-focused
INSERT INTO cf_scoring_config (name, weights) VALUES
('Engagement Focus', '{"engagement": 0.7, "ctr": 0.2, "conversions": 0.1}');

-- Conversion-focused
INSERT INTO cf_scoring_config (name, weights) VALUES
('Conversion Focus', '{"engagement": 0.2, "ctr": 0.3, "conversions": 0.5}');
```

---

### cf_ab_tests

A/B test tracking for content variants.

```sql
CREATE TABLE cf_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  variants JSONB[] NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'cancelled')),
  winner_id UUID REFERENCES cf_published_content(id),
  confidence DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_tests_status ON cf_ab_tests(status);
CREATE INDEX idx_tests_winner ON cf_ab_tests(winner_id);
```

**Fields:**
- `variants`: Array of variant objects
  ```json
  [
    {
      "label": "POV Hook",
      "assembled_content_id": "uuid",
      "published_content_id": "uuid",
      "budget": 5.00
    }
  ]
  ```
- `winner_id`: Reference to winning `cf_published_content` entry
- `confidence`: Statistical confidence (0.90 = 90%)

---

## Migrations

### Migration 001: Create Core Tables

```sql
-- Create product dossiers table
CREATE TABLE cf_product_dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  benefits TEXT[] DEFAULT '{}',
  pain_points TEXT[] DEFAULT '{}',
  proof_types TEXT[] DEFAULT '{before_after}',
  target_audience TEXT,
  category TEXT,
  niche TEXT,
  price DECIMAL(10,2),
  tiktok_shop_url TEXT,
  affiliate_link TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dossiers_status ON cf_product_dossiers(status);
CREATE INDEX idx_dossiers_category ON cf_product_dossiers(category);

-- Create images table
CREATE TABLE cf_generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES cf_product_dossiers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  model TEXT DEFAULT 'nano-banana',
  image_url TEXT,
  remotion_job_id TEXT,
  status TEXT DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_images_dossier ON cf_generated_images(dossier_id);
CREATE INDEX idx_images_status ON cf_generated_images(status);

-- Create videos table
CREATE TABLE cf_generated_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES cf_product_dossiers(id) ON DELETE CASCADE,
  source_image_id UUID REFERENCES cf_generated_images(id),
  type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  model TEXT DEFAULT 'veo-3.1',
  duration INTEGER,
  aspect_ratio TEXT DEFAULT '9:16',
  video_url TEXT,
  remotion_job_id TEXT,
  status TEXT DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_videos_dossier ON cf_generated_videos(dossier_id);
CREATE INDEX idx_videos_status ON cf_generated_videos(status);

-- Create scripts table
CREATE TABLE cf_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES cf_product_dossiers(id) ON DELETE CASCADE,
  awareness_level INTEGER NOT NULL,
  market_sophistication INTEGER,
  hook TEXT NOT NULL,
  body TEXT NOT NULL,
  cta TEXT NOT NULL,
  full_script TEXT GENERATED ALWAYS AS (hook || E'\n\n' || body || E'\n\n' || cta) STORED,
  estimated_duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scripts_dossier ON cf_scripts(dossier_id);
CREATE INDEX idx_scripts_awareness ON cf_scripts(awareness_level);
```

### Migration 002: Create Publishing Tables

```sql
-- Create assembled content table
CREATE TABLE cf_assembled_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES cf_product_dossiers(id) ON DELETE CASCADE,
  script_id UUID REFERENCES cf_scripts(id),
  video_ids UUID[] DEFAULT '{}',
  image_ids UUID[] DEFAULT '{}',
  platform TEXT NOT NULL,
  caption TEXT,
  hashtags TEXT[] DEFAULT '{}',
  compliance_disclosure TEXT,
  remotion_render_id TEXT,
  final_video_url TEXT,
  status TEXT DEFAULT 'draft',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assembled_dossier ON cf_assembled_content(dossier_id);
CREATE INDEX idx_assembled_status ON cf_assembled_content(status);

-- Create published content table
CREATE TABLE cf_published_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembled_content_id UUID NOT NULL REFERENCES cf_assembled_content(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_post_id TEXT,
  platform_url TEXT,
  promotion_budget DECIMAL(10,2),
  promotion_status TEXT,
  promotion_started_at TIMESTAMPTZ,
  promotion_ended_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_published_assembled ON cf_published_content(assembled_content_id);
CREATE INDEX idx_published_platform ON cf_published_content(platform, platform_post_id);
```

### Migration 003: Create Metrics & Scoring Tables

```sql
-- Create metrics table
CREATE TABLE cf_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  published_content_id UUID NOT NULL REFERENCES cf_published_content(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  engagement_rate DECIMAL(5,4) GENERATED ALWAYS AS (
    CASE WHEN views > 0
    THEN (likes + comments + shares + saves)::DECIMAL / views
    ELSE 0 END
  ) STORED,
  ctr DECIMAL(5,4) GENERATED ALWAYS AS (
    CASE WHEN views > 0
    THEN clicks::DECIMAL / views
    ELSE 0 END
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_metrics_unique ON cf_performance_metrics(published_content_id, date);
CREATE INDEX idx_metrics_date ON cf_performance_metrics(date DESC);

-- Create scoring config table
CREATE TABLE cf_scoring_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  weights JSONB NOT NULL,
  min_views_threshold INTEGER DEFAULT 1000,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config
INSERT INTO cf_scoring_config (name, weights) VALUES
('Default', '{"engagement": 0.4, "ctr": 0.3, "conversions": 0.3}');
```

---

## Common Queries

### Get dossier with all assets

```sql
SELECT
  d.*,
  (SELECT COUNT(*) FROM cf_generated_images WHERE dossier_id = d.id) AS image_count,
  (SELECT COUNT(*) FROM cf_generated_videos WHERE dossier_id = d.id) AS video_count,
  (SELECT COUNT(*) FROM cf_scripts WHERE dossier_id = d.id) AS script_count,
  (SELECT COUNT(*) FROM cf_assembled_content WHERE dossier_id = d.id) AS assembled_count
FROM cf_product_dossiers d
WHERE d.id = $1;
```

### Find winners (high-performing content)

```sql
SELECT
  pc.id,
  pc.platform_url,
  s.awareness_level,
  SUM(pm.views) AS total_views,
  AVG(pm.engagement_rate) AS avg_engagement,
  AVG(pm.ctr) AS avg_ctr,
  SUM(pm.conversions) AS total_conversions
FROM cf_published_content pc
JOIN cf_performance_metrics pm ON pm.published_content_id = pc.id
JOIN cf_assembled_content ac ON ac.id = pc.assembled_content_id
JOIN cf_scripts s ON s.id = ac.script_id
GROUP BY pc.id, pc.platform_url, s.awareness_level
HAVING SUM(pm.views) > 1000
ORDER BY avg_engagement DESC
LIMIT 10;
```

### Get pending generation jobs

```sql
-- Pending images
SELECT id, dossier_id, type, created_at
FROM cf_generated_images
WHERE status = 'pending'
ORDER BY created_at ASC;

-- Pending videos
SELECT id, dossier_id, type, created_at
FROM cf_generated_videos
WHERE status = 'pending'
ORDER BY created_at ASC;
```

### Get content ready to publish

```sql
SELECT
  ac.id,
  d.name AS product_name,
  s.awareness_level,
  ac.platform,
  ac.final_video_url
FROM cf_assembled_content ac
JOIN cf_product_dossiers d ON d.id = ac.dossier_id
LEFT JOIN cf_scripts s ON s.id = ac.script_id
WHERE ac.status = 'ready'
  AND NOT EXISTS (
    SELECT 1 FROM cf_published_content pc
    WHERE pc.assembled_content_id = ac.id
  )
ORDER BY ac.created_at ASC;
```

---

## Data Types

### JSONB Structure Examples

**cf_generated_images.metadata**:
```json
{
  "width": 1080,
  "height": 1920,
  "format": "png",
  "fileSize": 245000,
  "remotionVersion": "4.0.0",
  "generationTime": 12.5
}
```

**cf_generated_videos.metadata**:
```json
{
  "width": 1080,
  "height": 1920,
  "fps": 30,
  "codec": "h264",
  "bitrate": "5000k",
  "fileSize": 8500000,
  "duration": 8.2
}
```

**cf_assembled_content.metadata**:
```json
{
  "template": "before-after-v2",
  "captionStyle": "tiktok-yellow",
  "fontFamily": "Inter",
  "musicTrack": "upbeat-pop-01",
  "renderSettings": {
    "codec": "h264",
    "quality": "high"
  }
}
```

**cf_scoring_config.weights**:
```json
{
  "engagement": 0.4,
  "ctr": 0.3,
  "conversions": 0.3
}
```

---

## Constraints & Validations

### Check Constraints

```sql
-- Awareness level must be 1-5
ALTER TABLE cf_scripts ADD CONSTRAINT check_awareness_level
  CHECK (awareness_level BETWEEN 1 AND 5);

-- Market sophistication must be 1-5
ALTER TABLE cf_scripts ADD CONSTRAINT check_market_sophistication
  CHECK (market_sophistication BETWEEN 1 AND 5);

-- Status values
ALTER TABLE cf_product_dossiers ADD CONSTRAINT check_status
  CHECK (status IN ('draft', 'active', 'archived'));

-- Positive metrics
ALTER TABLE cf_performance_metrics ADD CONSTRAINT check_views_positive
  CHECK (views >= 0);
```

### Foreign Key Constraints

All foreign keys use `ON DELETE CASCADE` or `ON DELETE SET NULL`:
- Deleting a dossier cascades to all related images, videos, scripts
- Deleting a published_content cascades to all metrics
- Deleting an image sets `source_image_id` to NULL in videos

---

## Indexes Strategy

### Performance Indexes

```sql
-- High-read tables
CREATE INDEX idx_dossiers_status ON cf_product_dossiers(status);
CREATE INDEX idx_images_status ON cf_generated_images(status);
CREATE INDEX idx_videos_status ON cf_generated_videos(status);

-- Join optimization
CREATE INDEX idx_images_dossier ON cf_generated_images(dossier_id);
CREATE INDEX idx_videos_dossier ON cf_generated_videos(dossier_id);
CREATE INDEX idx_scripts_dossier ON cf_scripts(dossier_id);

-- Unique constraints
CREATE UNIQUE INDEX idx_dossiers_slug ON cf_product_dossiers(slug);
CREATE UNIQUE INDEX idx_metrics_unique ON cf_performance_metrics(published_content_id, date);
```

### Partial Indexes

```sql
-- Index only pending jobs for faster polling
CREATE INDEX idx_images_pending ON cf_generated_images(created_at)
  WHERE status = 'pending';

-- Index high-performers for analytics
CREATE INDEX idx_metrics_high_engagement ON cf_performance_metrics(engagement_rate DESC)
  WHERE views > 1000;
```

---

## Backup & Maintenance

### Backup Strategy

```bash
# Full database backup
pg_dump -h localhost -U postgres -d content_factory -F c -f cf_backup_$(date +%Y%m%d).dump

# Tables-only backup
pg_dump -h localhost -U postgres -d content_factory -t 'cf_*' -F c -f cf_tables_backup.dump

# Restore
pg_restore -h localhost -U postgres -d content_factory cf_backup.dump
```

### Vacuum & Analyze

```sql
-- Analyze all CF tables
ANALYZE cf_product_dossiers;
ANALYZE cf_generated_images;
ANALYZE cf_generated_videos;
ANALYZE cf_performance_metrics;

-- Vacuum bloated tables
VACUUM FULL cf_performance_metrics;
```

---

## Security

### Row-Level Security (Supabase)

```sql
-- Enable RLS on all tables
ALTER TABLE cf_product_dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cf_generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE cf_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own dossiers
CREATE POLICY "Users can view own dossiers"
  ON cf_product_dossiers
  FOR SELECT
  USING (auth.uid() = user_id);
```

### Audit Logging

```sql
-- Create audit log table
CREATE TABLE cf_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger function
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO cf_audit_log (table_name, record_id, action, old_data, new_data)
  VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to sensitive tables
CREATE TRIGGER audit_dossiers
  AFTER INSERT OR UPDATE OR DELETE ON cf_product_dossiers
  FOR EACH ROW EXECUTE FUNCTION log_audit();
```

---

## Performance Considerations

### Query Optimization

- Use `EXPLAIN ANALYZE` for slow queries
- Add indexes on frequently filtered columns
- Use partial indexes for status-based queries
- Denormalize metrics aggregations for dashboards

### Scaling

- Partition `cf_performance_metrics` by month for large datasets
- Use connection pooling (PgBouncer)
- Consider read replicas for analytics queries
- Cache frequently accessed data (Redis)

---

## Schema Version

**Current Version**: 1.0.0
**Last Updated**: 2026-03-01
**Migration Tool**: Prisma Migrate
