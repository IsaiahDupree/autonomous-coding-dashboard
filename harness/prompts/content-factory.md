# Content Factory - AI Content Generation Pipeline

## Project Overview
Build an AI-powered content generation system for social commerce (TikTok Shop, Instagram, Facebook) using Google Veo 3.1 for video and Nano Banana (Gemini) for images. The system generates before/after content, scripts at 5 awareness levels, and runs $5 micro-tests to identify winners.

## Reference Documents
- PRD: `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/PRD-Content-Factory.md`
- Feature List: `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/feature_list_content_factory.json`
- Architecture: `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/UNIFIED_PLATFORM_ARCHITECTURE.md`

## Core Pipeline

```
PRODUCT DOSSIER (Input)
├── Product name, benefits, pain points
├── TikTok Shop / affiliate links
└── Category and niche

IMAGE GENERATION (Nano Banana)
├── Before images (3-5 variants) - problem state
├── After images (3-5 variants) - solution state
└── Product variations

VIDEO GENERATION (Veo 3.1)
├── Before→After reveal clips (8s)
├── Product demo clips
└── Whip-pan transitions

SCRIPT GENERATION (5 Awareness Levels)
├── Level 1: Unaware (POV/meme style)
├── Level 2: Problem Aware
├── Level 3: Solution Aware
├── Level 4: Product Aware
└── Level 5: Most Aware (urgency)

ASSEMBLY (Remotion Integration)
├── Combine clips + script
├── Add captions (TikTok style)
├── Add compliance disclosures
└── Export for platform

PUBLISH + TEST
├── Post to TikTok/Instagram
├── Run $5 Promote tests
├── Collect metrics
└── Score and rank variants

ITERATE
├── Identify winning angles
├── Generate more like winners
└── Archive losers
```

## Integration Architecture

### Remotion Integration (CRITICAL)
Content Factory does NOT render videos itself. It calls Remotion API:

```typescript
// All video/image generation goes through Remotion
const remotionClient = new RemotionClient(REMOTION_API_URL);

// Image generation
await remotionClient.post('/api/ai/nano-banana', {
  prompt: beforePrompt,
  type: 'before',
  variants: 3
});

// Video generation
await remotionClient.post('/api/ai/veo', {
  imageUrl: sourceImage,
  prompt: 'whip-pan reveal',
  duration: 8,
  aspectRatio: '9:16'
});

// Final assembly
await remotionClient.post('/api/templates/before-after', {
  beforeImageUrl,
  afterImageUrl,
  transitionStyle: 'whip-pan'
});
```

### TikTok API Integration
Content Factory owns TikTok publishing:
- OAuth authentication
- Video upload
- Commercial content disclosure
- TikTok Promote for $5 tests
- Metrics collection

## Key Frameworks (Eugene Schwartz)

### 5 Awareness Levels for Scripts
1. **Unaware** - POV/meme, relatable scenario, no product mention
2. **Problem Aware** - Call out pain, hint at solution category
3. **Solution Aware** - Compare options, "this is what I use"
4. **Product Aware** - Review style, honest pros/cons
5. **Most Aware** - Urgency, limited offer, direct CTA

## Database Schema

### Primary Tables
- `cf_product_dossiers` - Product info + links
- `cf_generated_images` - Nano Banana outputs
- `cf_generated_videos` - Veo 3.1 outputs
- `cf_scripts` - 5 awareness level scripts
- `cf_assembled_content` - Final content pieces
- `cf_published_content` - Platform posts
- `cf_performance_metrics` - Daily metrics
- `cf_angle_tests` - $5 test tracking
- `cf_scoring_config` - Winner algorithm weights

## Current Focus: MVP Features

### Phase 1: Core Generation (P0)
1. Product dossier CRUD
2. Nano Banana image generation (via Remotion)
3. Veo 3.1 video generation (via Remotion)
4. 5 awareness-level script generation
5. Before/After template (via Remotion)

### Phase 2: Assembly (P1)
1. Content assembly UI
2. Caption generation
3. Compliance disclosure automation
4. Platform preview

### Phase 3: Publishing (P1)
1. TikTok API integration
2. $5 Promote test automation
3. Metrics collection
4. Scoring algorithm

### Phase 4: Iteration (P2)
1. Winner identification
2. "More like winner" generation
3. Analytics dashboard

## Technical Stack
- Frontend: React/Next.js + TailwindCSS
- Backend: Next.js API routes
- AI Images: Nano Banana via Remotion API
- AI Videos: Veo 3.1 via Remotion API
- Video Rendering: Remotion (external service)
- TikTok: TikTok API (owned by Content Factory)
- Database: Supabase (shared)

## Compliance Requirements
- TikTok commercial content disclosure ON
- Clear affiliate disclosure text
- No exaggerated transformation claims
- "Results may vary" for before/after

## Success Metrics
- 50+ content pieces generated per day
- <30 min from dossier to published
- >90% test completion rate
- <$1 cost per content piece

## Instructions for Development
1. Read the full PRD before starting any feature
2. ALL image/video generation goes through Remotion API
3. Content Factory only handles: dossiers, scripts, TikTok API, testing
4. Follow feature list priorities (CF-001 → CF-065)
5. Ensure compliance disclosures on all affiliate content
6. Track all generation parameters for iteration analysis
