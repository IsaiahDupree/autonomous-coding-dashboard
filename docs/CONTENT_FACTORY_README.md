# Content Factory - AI Content Generation Pipeline

## Overview

Content Factory is an AI-powered content generation system designed for social commerce platforms (TikTok Shop, Instagram, Facebook). It leverages Google Veo 3.1 for video generation and Nano Banana (Gemini) for image generation to create high-performing before/after content, scripts at 5 awareness levels, and runs $5 micro-tests to identify winners.

### Key Features

- **Product Dossier Management**: Centralized product information with benefits, pain points, and links
- **AI Image Generation**: Before/after images using Nano Banana via Remotion API
- **AI Video Generation**: Video clips and transitions using Google Veo 3.1 via Remotion API
- **Script Generation**: 5 awareness-level scripts based on Eugene Schwartz framework
- **Content Assembly**: Combine assets with captions and compliance disclosures
- **Platform Publishing**: TikTok and Instagram publishing with OAuth
- **Micro-Testing**: $5 TikTok Promote tests to identify winning angles
- **Performance Analytics**: Track metrics and identify winners algorithmically

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                     Content Factory                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Dossiers   │  │   Scripts    │  │  Publishing  │     │
│  │   (CRUD)     │  │  (5 levels)  │  │  (TikTok)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Remotion API Integration                   │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │  │
│  │  │ Nano Banana │  │  Veo 3.1    │  │ Templates   │ │  │
│  │  │  (Images)   │  │  (Videos)   │  │ (Assembly)  │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Testing    │  │  Analytics   │  │   Scoring    │     │
│  │ ($5 Promote) │  │   Metrics    │  │   Winners    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Integration Points

**Content Factory Owns:**
- Product dossier management
- Script generation (5 awareness levels)
- TikTok/Instagram API integration
- Publishing and promotion
- Metrics collection
- Scoring and winner identification

**Remotion API Provides:**
- Nano Banana image generation
- Google Veo 3.1 video generation
- Video template rendering
- Before/after assembly
- Caption overlays

### Data Flow

```
1. Create Product Dossier
   ↓
2. Generate Before Images (via Remotion → Nano Banana)
   ↓
3. Generate After Images (via Remotion → Nano Banana)
   ↓
4. Generate Scripts (5 awareness levels)
   ↓
5. Generate Video Clips (via Remotion → Veo 3.1)
   ↓
6. Assemble Content (via Remotion templates)
   ↓
7. Add Captions + Compliance
   ↓
8. Publish to TikTok/Instagram
   ↓
9. Run $5 Promote Test
   ↓
10. Collect Metrics Daily
    ↓
11. Calculate Scores
    ↓
12. Identify Winners
    ↓
13. Generate "More Like Winner"
```

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (via Supabase)
- Remotion API access
- TikTok Developer Account
- Instagram/Facebook Developer Account

### Environment Variables

Create `.env` file in `backend/`:

```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..." # For migrations

# Remotion API
REMOTION_API_URL="https://api.remotion.dev"
REMOTION_API_KEY="your-api-key"

# AI Models (accessed via Remotion)
NANO_BANANA_ENABLED=true
VEO_3_ENABLED=true

# TikTok API
TIKTOK_CLIENT_KEY="your-client-key"
TIKTOK_CLIENT_SECRET="your-client-secret"
TIKTOK_REDIRECT_URI="http://localhost:3000/api/auth/tiktok/callback"

# Instagram API
INSTAGRAM_APP_ID="your-app-id"
INSTAGRAM_APP_SECRET="your-app-secret"

# Feature Flags
ENABLE_VOICE_CLONING=false
ENABLE_AUTO_PUBLISH=false
ENABLE_SMART_BIDDING=false
```

### Installation

```bash
# Install dependencies
npm install

# Run database migrations
cd backend
npx prisma migrate dev

# Seed test data (optional)
npx prisma db seed

# Start development server
npm run dev
```

### First-Time Setup

1. **Configure Remotion API**
   ```bash
   # Test connection
   curl -H "Authorization: Bearer $REMOTION_API_KEY" \
     $REMOTION_API_URL/api/health
   ```

2. **Set up TikTok OAuth**
   - Create app at https://developers.tiktok.com
   - Configure redirect URI
   - Add scopes: `user.info.basic`, `video.upload`, `video.publish`

3. **Create test product dossier**
   ```bash
   curl -X POST http://localhost:3000/api/cf/dossiers \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Acne Patch",
       "benefits": ["Clear skin overnight", "Invisible wear"],
       "painPoints": ["Embarrassing breakouts", "Slow healing"],
       "category": "Beauty",
       "tiktokShopUrl": "https://shop.tiktok.com/..."
     }'
   ```

## Database Schema

### Core Tables

#### `cf_product_dossiers`
```sql
CREATE TABLE cf_product_dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  benefits TEXT[], -- Array of benefit statements
  pain_points TEXT[], -- Array of pain points
  proof_types TEXT[], -- ["before_after", "testimonial", "demo"]
  target_audience TEXT,
  category TEXT,
  niche TEXT,
  price DECIMAL(10,2),
  tiktok_shop_url TEXT,
  affiliate_link TEXT,
  status TEXT DEFAULT 'draft', -- draft, active, archived
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dossiers_status ON cf_product_dossiers(status);
CREATE INDEX idx_dossiers_category ON cf_product_dossiers(category);
```

#### `cf_generated_images`
```sql
CREATE TABLE cf_generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID REFERENCES cf_product_dossiers(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- before, after, product
  prompt TEXT NOT NULL,
  model TEXT DEFAULT 'nano-banana', -- nano-banana, veo-image
  image_url TEXT,
  remotion_job_id TEXT,
  status TEXT DEFAULT 'pending', -- pending, generating, completed, failed
  metadata JSONB, -- Remotion response data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_images_dossier ON cf_generated_images(dossier_id);
CREATE INDEX idx_images_type ON cf_generated_images(type);
CREATE INDEX idx_images_status ON cf_generated_images(status);
```

#### `cf_generated_videos`
```sql
CREATE TABLE cf_generated_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID REFERENCES cf_product_dossiers(id) ON DELETE CASCADE,
  source_image_id UUID REFERENCES cf_generated_images(id),
  type TEXT NOT NULL, -- reveal, demo, transition
  prompt TEXT NOT NULL,
  model TEXT DEFAULT 'veo-3.1',
  duration INTEGER, -- seconds
  aspect_ratio TEXT DEFAULT '9:16',
  video_url TEXT,
  remotion_job_id TEXT,
  status TEXT DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_videos_dossier ON cf_generated_videos(dossier_id);
CREATE INDEX idx_videos_status ON cf_generated_videos(status);
```

#### `cf_scripts`
```sql
CREATE TABLE cf_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID REFERENCES cf_product_dossiers(id) ON DELETE CASCADE,
  awareness_level INTEGER NOT NULL CHECK (awareness_level BETWEEN 1 AND 5),
  market_sophistication INTEGER CHECK (market_sophistication BETWEEN 1 AND 5),
  hook TEXT NOT NULL,
  body TEXT NOT NULL,
  cta TEXT NOT NULL,
  full_script TEXT GENERATED ALWAYS AS (hook || E'\n\n' || body || E'\n\n' || cta) STORED,
  estimated_duration INTEGER, -- seconds
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scripts_dossier ON cf_scripts(dossier_id);
CREATE INDEX idx_scripts_awareness ON cf_scripts(awareness_level);
```

#### `cf_assembled_content`
```sql
CREATE TABLE cf_assembled_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID REFERENCES cf_product_dossiers(id) ON DELETE CASCADE,
  script_id UUID REFERENCES cf_scripts(id),
  video_ids UUID[], -- Array of video IDs used
  image_ids UUID[], -- Array of image IDs used
  platform TEXT NOT NULL, -- tiktok, instagram, facebook
  caption TEXT,
  hashtags TEXT[],
  compliance_disclosure TEXT,
  remotion_render_id TEXT,
  final_video_url TEXT,
  status TEXT DEFAULT 'draft', -- draft, rendering, ready, published
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assembled_dossier ON cf_assembled_content(dossier_id);
CREATE INDEX idx_assembled_status ON cf_assembled_content(status);
```

#### `cf_published_content`
```sql
CREATE TABLE cf_published_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembled_content_id UUID REFERENCES cf_assembled_content(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_post_id TEXT, -- TikTok video ID, Instagram media ID
  platform_url TEXT,
  promotion_budget DECIMAL(10,2), -- $5.00 for micro-tests
  promotion_status TEXT, -- pending, active, completed, failed
  promotion_started_at TIMESTAMPTZ,
  promotion_ended_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_published_assembled ON cf_published_content(assembled_content_id);
CREATE INDEX idx_published_platform ON cf_published_content(platform, platform_post_id);
```

#### `cf_performance_metrics`
```sql
CREATE TABLE cf_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  published_content_id UUID REFERENCES cf_published_content(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0, -- Link clicks
  conversions INTEGER DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  engagement_rate DECIMAL(5,4) GENERATED ALWAYS AS (
    CASE WHEN views > 0
    THEN (likes + comments + shares + saves)::DECIMAL / views
    ELSE 0 END
  ) STORED,
  ctr DECIMAL(5,4) GENERATED ALWAYS AS (
    CASE WHEN views > 0 THEN clicks::DECIMAL / views ELSE 0 END
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_metrics_unique ON cf_performance_metrics(published_content_id, date);
CREATE INDEX idx_metrics_date ON cf_performance_metrics(date);
```

### Scoring Tables

#### `cf_scoring_config`
```sql
CREATE TABLE cf_scoring_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  weights JSONB NOT NULL, -- {"engagement": 0.4, "ctr": 0.3, "conversions": 0.3}
  min_views_threshold INTEGER DEFAULT 1000,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Reference

### Dossiers

#### `GET /api/cf/dossiers`
List all product dossiers with pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `status` (string): Filter by status (draft, active, archived)

**Response:**
```json
{
  "dossiers": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

#### `POST /api/cf/dossiers`
Create a new product dossier.

**Request Body:**
```json
{
  "name": "Acne Patch",
  "benefits": ["Clear skin overnight"],
  "painPoints": ["Embarrassing breakouts"],
  "category": "Beauty",
  "tiktokShopUrl": "https://..."
}
```

#### `GET /api/cf/dossiers/:id`
Get single dossier with counts of generated assets.

#### `PATCH /api/cf/dossiers/:id`
Update dossier fields.

#### `DELETE /api/cf/dossiers/:id`
Archive a dossier (soft delete).

### Image Generation

#### `POST /api/cf/dossiers/:id/generate-before-images`
Generate before images via Remotion → Nano Banana.

**Request Body:**
```json
{
  "variants": 3,
  "style": "realistic"
}
```

#### `POST /api/cf/dossiers/:id/generate-after-images`
Generate after images via Remotion → Nano Banana.

### Video Generation

#### `POST /api/cf/dossiers/:id/generate-reveal-video`
Generate before→after reveal video via Remotion → Veo 3.1.

**Request Body:**
```json
{
  "beforeImageId": "uuid",
  "afterImageId": "uuid",
  "transition": "whip-pan",
  "duration": 8
}
```

### Script Generation

#### `POST /api/cf/dossiers/:id/generate-script`
Generate a single script at specified awareness level.

**Request Body:**
```json
{
  "awarenessLevel": 1,
  "marketSophistication": 3
}
```

#### `POST /api/cf/dossiers/:id/generate-all-scripts`
Generate scripts for all 5 awareness levels.

### Content Assembly

#### `POST /api/cf/assemble`
Assemble final content from scripts, videos, and images.

**Request Body:**
```json
{
  "dossierId": "uuid",
  "scriptId": "uuid",
  "videoIds": ["uuid1", "uuid2"],
  "imageIds": ["uuid3"],
  "platform": "tiktok"
}
```

### Publishing

#### `POST /api/cf/publish/:assembledId`
Publish assembled content to platform.

**Request Body:**
```json
{
  "platform": "tiktok",
  "promotionBudget": 5.00
}
```

#### `GET /api/cf/metrics/:publishedId`
Get performance metrics for published content.

## Development Workflow

### 1. Create Product Dossier
```bash
curl -X POST http://localhost:3000/api/cf/dossiers \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Product", ...}'
```

### 2. Generate Assets
```bash
# Images
curl -X POST http://localhost:3000/api/cf/dossiers/{id}/generate-before-images
curl -X POST http://localhost:3000/api/cf/dossiers/{id}/generate-after-images

# Scripts
curl -X POST http://localhost:3000/api/cf/dossiers/{id}/generate-all-scripts

# Videos
curl -X POST http://localhost:3000/api/cf/dossiers/{id}/generate-reveal-video \
  -d '{"beforeImageId": "...", "afterImageId": "..."}'
```

### 3. Assemble Content
```bash
curl -X POST http://localhost:3000/api/cf/assemble \
  -d '{"dossierId": "...", "scriptId": "...", "platform": "tiktok"}'
```

### 4. Publish & Test
```bash
curl -X POST http://localhost:3000/api/cf/publish/{assembledId} \
  -d '{"platform": "tiktok", "promotionBudget": 5.00}'
```

### 5. Monitor Metrics
```bash
curl http://localhost:3000/api/cf/metrics/{publishedId}
```

## Testing

### Unit Tests
```bash
cd backend
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

### Test Coverage
```bash
npm run test:coverage
```

## Deployment

### Production Checklist

- [ ] Set up production database (Supabase)
- [ ] Configure Remotion API credentials
- [ ] Set up TikTok OAuth app (production)
- [ ] Set up Instagram OAuth app (production)
- [ ] Configure environment variables
- [ ] Run database migrations
- [ ] Set up monitoring (error tracking, metrics)
- [ ] Configure CDN for video/image assets
- [ ] Set up automated backups
- [ ] Configure rate limiting
- [ ] Enable HTTPS
- [ ] Set up CI/CD pipeline

### Deploy to Production

```bash
# Build
npm run build

# Run migrations
npx prisma migrate deploy

# Start production server
npm run start
```

### Monitoring

- **Error Tracking**: Sentry
- **Performance**: New Relic
- **Logs**: CloudWatch / Datadog
- **Uptime**: Pingdom

## Eugene Schwartz Framework

### 5 Awareness Levels

1. **Unaware (Level 1)**
   - POV/meme style content
   - Relatable scenario, no product mention
   - Example: "POV: You wake up and your skin is perfect"

2. **Problem Aware (Level 2)**
   - Call out the pain point
   - Hint at solution category
   - Example: "Struggling with breakouts? Here's what finally worked..."

3. **Solution Aware (Level 3)**
   - Compare options
   - "This is what I use" testimonial style
   - Example: "I tried 5 acne treatments, only this one worked"

4. **Product Aware (Level 4)**
   - Review style content
   - Honest pros/cons
   - Example: "Acne Patch review: 3 weeks later"

5. **Most Aware (Level 5)**
   - Urgency and direct CTA
   - Limited offer, social proof
   - Example: "Last day of sale - link in bio!"

## Compliance

### Required Disclosures

All published content MUST include:

1. **Commercial Content Disclosure**
   - TikTok: Toggle commercial content ON
   - Instagram: Use "Paid Partnership" tag

2. **Affiliate Disclosure**
   - Clear text: "Affiliate link in bio"
   - Visible in first 3 seconds or description

3. **Results Disclaimer**
   - Before/after content: "Results may vary"
   - Health/beauty claims: Follow FTC guidelines

### Platform Policies

- **TikTok**: Community Guidelines, Commercial Content Policy
- **Instagram**: Community Guidelines, Branded Content Policies
- **FTC**: Truth in Advertising, Endorsement Guidelines

## Troubleshooting

### Remotion API Issues

**Problem**: Image generation fails
```
Error: Remotion API returned 500
```

**Solution**:
1. Check API key validity
2. Verify Nano Banana is enabled for your account
3. Check prompt length (max 500 chars)
4. Review Remotion API status page

### TikTok Publishing Fails

**Problem**: OAuth token expired

**Solution**:
```bash
# Re-authenticate via OAuth flow
open http://localhost:3000/api/auth/tiktok
```

### Performance Issues

**Problem**: Slow metric sync

**Solution**:
- Enable metric caching (Redis)
- Reduce sync frequency
- Batch API requests

## Support

- **Documentation**: `/docs` directory
- **Issues**: GitHub Issues
- **Slack**: #content-factory channel

## License

Proprietary - All Rights Reserved
