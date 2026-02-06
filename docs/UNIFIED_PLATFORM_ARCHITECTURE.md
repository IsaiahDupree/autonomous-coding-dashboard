# Unified Platform Architecture
## Master Integration Plan for All ACD Targets

**Version:** 1.0  
**Date:** February 2026  
**Status:** Architecture Blueprint

---

## Executive Summary

This document maps all 18 repo-queue projects, identifies overlapping capabilities, and defines a unified architecture where **Remotion serves as the central video/creative engine** while other specialized systems handle their domains.

---

## Project Inventory

### Tier 1: Core Infrastructure (Shared Services)

| Project | Features | Primary Capability |
|---------|----------|-------------------|
| **Remotion** | 153 | Video generation, voice cloning, static ads, avatars |
| **WaitlistLab** | ~200 | Meta Marketing API, lead capture, ads autopilot |
| **MediaPoster** | 538 | Multi-platform publishing, Safari automation, content ops |
| **Portal28** | 263 | Course platform, auth, payments, Stripe |

### Tier 2: Product Applications

| Project | Features | Primary Capability |
|---------|----------|-------------------|
| **SoftwareHub** | 120 | Software licensing, downloads, course delivery |
| **GapRadar** | ~80 | Market research, Reddit/ad analysis |
| **BlogCanvas** | ~50 | Blog CMS, vendor platform |
| **CanvasCast** | ~60 | YouTube automation |

### Tier 3: Specialized Tools

| Project | Features | Primary Capability |
|---------|----------|-------------------|
| **ShortsLinker** | ~40 | YouTube Shorts ↔ Long-form linking |
| **VelloPad** | ~50 | Book writing + print-on-demand |
| **VelvetHold** | ~80 | Date reservation platform |
| **SteadyLetters** | ~40 | Physical mail via Thanks.io |
| **EverReach** | ~100 | CRM + mobile app |

### Tier 4: New Systems (From ChatGPT Conversation)

| Project | Features | Primary Capability |
|---------|----------|-------------------|
| **Content Factory** | 65 | Veo 3 + Nano Banana content generation |
| **Lead Form Management** | 25 | Meta lead form reliability |
| **Programmatic Creative Testing** | 68 | Facebook ad testing framework |

---

## Capability Matrix: Who Does What?

### Video & Creative Generation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    VIDEO & CREATIVE CAPABILITY MATRIX                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CAPABILITY              │ OWNER        │ CONSUMERS                         │
│  ────────────────────────┼──────────────┼───────────────────────────────── │
│  Video Rendering         │ Remotion     │ All video needs                  │
│  Voice Cloning           │ Remotion     │ Content Factory, MediaPoster     │
│  Static Ad Generation    │ Remotion     │ PCT, WaitlistLab                 │
│  Caption Generation      │ Remotion     │ Content Factory, MediaPoster     │
│  Talking Avatars         │ Remotion     │ Content Factory                  │
│  Before/After Videos     │ Remotion*    │ Content Factory                  │
│  Veo 3.1 Videos          │ Remotion*    │ Content Factory                  │
│  Nano Banana Images      │ Remotion*    │ Content Factory                  │
│                                                                              │
│  * = New capability to add                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Platform Publishing

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PUBLISHING CAPABILITY MATRIX                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PLATFORM         │ OWNER           │ API TYPE       │ CONSUMERS            │
│  ─────────────────┼─────────────────┼────────────────┼──────────────────── │
│  Meta (Ads)       │ WaitlistLab     │ Marketing API  │ PCT, Content Factory│
│  Meta (Pixel)     │ WaitlistLab     │ CAPI           │ All products        │
│  TikTok           │ Content Factory │ TikTok API     │ MediaPoster         │
│  Instagram        │ MediaPoster     │ Graph API      │ Content Factory     │
│  YouTube          │ MediaPoster     │ Data API       │ ShortsLinker        │
│  X/Twitter        │ MediaPoster     │ API v2         │ -                   │
│  Threads          │ MediaPoster     │ API            │ -                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### AI Services

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI SERVICES MATRIX                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SERVICE              │ PROVIDER      │ OWNER        │ CONSUMERS            │
│  ─────────────────────┼───────────────┼──────────────┼──────────────────── │
│  Text Generation      │ OpenAI GPT-4  │ Shared       │ All                  │
│  Image Generation     │ DALL-E 3      │ Remotion     │ All creative         │
│  Image Generation     │ Nano Banana*  │ Remotion     │ Content Factory      │
│  Video Generation     │ LTX-Video     │ Remotion     │ MediaPoster          │
│  Video Generation     │ Veo 3.1*      │ Remotion     │ Content Factory      │
│  Voice Cloning        │ IndexTTS-2    │ Remotion     │ All video            │
│  TTS Fallback         │ OpenAI TTS    │ Remotion     │ All video            │
│  Speech-to-Text       │ Whisper       │ Remotion     │ All captions         │
│  SFX Generation       │ ElevenLabs    │ Remotion     │ All video            │
│                                                                              │
│  * = New provider to add                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Unified Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              UNIFIED PLATFORM ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                           USER-FACING PRODUCTS                                   │   │
│  │                                                                                   │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │Software │ │VelloPad │ │Velvet   │ │Steady   │ │Blog     │ │Gap      │       │   │
│  │  │Hub      │ │         │ │Hold     │ │Letters  │ │Canvas   │ │Radar    │       │   │
│  │  │(Courses)│ │(Books)  │ │(Dating) │ │(Mail)   │ │(CMS)    │ │(Market) │       │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │   │
│  │       │           │           │           │           │           │             │   │
│  └───────┼───────────┼───────────┼───────────┼───────────┼───────────┼─────────────┘   │
│          │           │           │           │           │           │                  │
│          ▼           ▼           ▼           ▼           ▼           ▼                  │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                         SHARED INFRASTRUCTURE LAYER                              │   │
│  │                                                                                   │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │   │
│  │  │   Portal28      │  │    Supabase     │  │     Stripe      │                  │   │
│  │  │   (Auth Base)   │  │   (Database)    │  │   (Payments)    │                  │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘                  │   │
│  │                                                                                   │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                          CONTENT GENERATION LAYER                                │   │
│  │                                                                                   │   │
│  │  ┌───────────────────────────────────────────────────────────────────────────┐  │   │
│  │  │                         REMOTION (Central Engine)                          │  │   │
│  │  │                                                                             │  │   │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │  │   │
│  │  │  │   Video     │ │   Static    │ │   Voice     │ │   Avatar    │          │  │   │
│  │  │  │   Render    │ │   Ads       │ │   Clone     │ │   Gen       │          │  │   │
│  │  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘          │  │   │
│  │  │                                                                             │  │   │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │  │   │
│  │  │  │  Captions   │ │    SFX      │ │   Themes    │ │  Templates  │          │  │   │
│  │  │  │  (Whisper)  │ │  (ElevenL)  │ │             │ │             │          │  │   │
│  │  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘          │  │   │
│  │  │                                                                             │  │   │
│  │  │  NEW MODULES TO ADD:                                                        │  │   │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                           │  │   │
│  │  │  │  Veo 3.1    │ │ Nano Banana │ │Before/After │                           │  │   │
│  │  │  │  Provider   │ │  Provider   │ │  Template   │                           │  │   │
│  │  │  └─────────────┘ └─────────────┘ └─────────────┘                           │  │   │
│  │  │                                                                             │  │   │
│  │  └─────────────────────────────────────────────────────────┬─────────────────┘  │   │
│  │                                                             │                    │   │
│  │           ┌─────────────────────────────────────────────────┼──────────┐        │   │
│  │           ▼                                                 ▼          ▼        │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │   │
│  │  │Content Factory  │  │       PCT       │  │  MediaPoster    │                  │   │
│  │  │(TikTok/Social)  │  │ (FB Ad Testing) │  │ (Multi-Platform)│                  │   │
│  │  │                 │  │                 │  │                 │                  │   │
│  │  │- 5 awareness    │  │- USP/Angles     │  │- Safari auto    │                  │   │
│  │  │- $5 micro tests │  │- Hook gen       │  │- Sora videos    │                  │   │
│  │  │- TikTok Promote │  │- Template ads   │  │- 25 templates   │                  │   │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘                  │   │
│  │           │                    │                    │                            │   │
│  └───────────┼────────────────────┼────────────────────┼────────────────────────────┘   │
│              │                    │                    │                                 │
│              ▼                    ▼                    ▼                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                          DISTRIBUTION LAYER                                      │   │
│  │                                                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐    │   │
│  │  │                    WaitlistLab (Meta API Hub)                            │    │   │
│  │  │                                                                           │    │   │
│  │  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │    │   │
│  │  │  │  Marketing   │ │    Pixel     │ │  Lead Form   │ │    Ads       │    │    │   │
│  │  │  │    API       │ │    CAPI      │ │  Management* │ │  Autopilot   │    │    │   │
│  │  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘    │    │   │
│  │  │                                                                           │    │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘    │   │
│  │                                                                                   │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │   │
│  │  │   TikTok     │ │  Instagram   │ │   YouTube    │ │   X/Twitter  │            │   │
│  │  │   (Content   │ │  (Media      │ │  (Shorts     │ │  (Media      │            │   │
│  │  │   Factory)   │ │   Poster)    │ │   Linker)    │ │   Poster)    │            │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘            │   │
│  │                                                                                   │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Specifications

### 1. Remotion API Interface

Remotion should expose a REST API for other systems to consume:

```typescript
// Remotion API Endpoints for Integration

// Video Generation
POST /api/render/video
Body: { briefJson, outputFormat, quality }
Returns: { jobId, status, outputUrl }

// Static Ad Generation  
POST /api/render/static
Body: { template, props, sizes[] }
Returns: { images: [{ size, url }] }

// Voice Cloning
POST /api/audio/clone
Body: { text, voiceReference, emotion }
Returns: { audioUrl, duration }

// Caption Generation
POST /api/captions/generate
Body: { audioUrl, style }
Returns: { words: [{ word, start, end }] }

// NEW: Veo 3.1 Video Generation
POST /api/ai/veo
Body: { imageUrl, prompt, duration, aspectRatio }
Returns: { jobId, status, videoUrl }

// NEW: Nano Banana Image Generation
POST /api/ai/nano-banana
Body: { prompt, type: 'before'|'after'|'product', variants }
Returns: { images: [{ url, type }] }

// NEW: Before/After Video Template
POST /api/templates/before-after
Body: { beforeImageUrl, afterImageUrl, transitionStyle, duration }
Returns: { jobId, videoUrl }
```

### 2. Content Factory → Remotion Integration

```typescript
// Content Factory uses Remotion for all rendering

class ContentFactoryRemotionClient {
  
  async generateBeforeAfterImages(dossier: ProductDossier) {
    // Use Remotion's Nano Banana endpoint
    const before = await remotion.post('/api/ai/nano-banana', {
      prompt: this.buildBeforePrompt(dossier),
      type: 'before',
      variants: 3
    });
    
    const after = await remotion.post('/api/ai/nano-banana', {
      prompt: this.buildAfterPrompt(dossier),
      type: 'after', 
      variants: 3
    });
    
    return { before: before.images, after: after.images };
  }
  
  async generateRevealVideo(beforeUrl: string, afterUrl: string) {
    // Use Remotion's before/after template
    return remotion.post('/api/templates/before-after', {
      beforeImageUrl: beforeUrl,
      afterImageUrl: afterUrl,
      transitionStyle: 'whip-pan',
      duration: 8
    });
  }
  
  async assembleWithCaptions(videoUrl: string, script: Script) {
    // Use Remotion for caption overlay
    const captions = await remotion.post('/api/captions/generate', {
      text: script.fullScript,
      style: 'tiktok'
    });
    
    return remotion.post('/api/render/video', {
      briefJson: this.buildBrief(videoUrl, captions),
      outputFormat: '9:16'
    });
  }
}
```

### 3. PCT → Remotion Integration

```typescript
// PCT uses Remotion for static ads and video ads

class PCTRemotionClient {
  
  async generateStaticAds(hook: Hook, template: Template, images: string[]) {
    return remotion.post('/api/render/static', {
      template: template.id,
      props: {
        hookText: hook.text,
        productImage: images[0],
        ctaText: hook.cta
      },
      sizes: ['1080x1080', '1080x1920', '1200x628']
    });
  }
  
  async generateMiniVSL(script: VideoScript, voiceRef: string) {
    // Voice clone the script
    const audio = await remotion.post('/api/audio/clone', {
      text: script.fullText,
      voiceReference: voiceRef,
      emotion: 'explaining'
    });
    
    // Generate captions
    const captions = await remotion.post('/api/captions/generate', {
      audioUrl: audio.audioUrl,
      style: 'tiktok'
    });
    
    // Render final video
    return remotion.post('/api/render/video', {
      briefJson: this.buildMiniVSLBrief(script, audio, captions)
    });
  }
}
```

### 4. MediaPoster → Remotion Integration

```typescript
// MediaPoster already integrates with Remotion
// Add new capabilities:

class MediaPosterRemotionClient {
  
  async generateFromTemplate(templateId: string, variables: Record<string, any>) {
    // Use Remotion's 25 AI templates
    return remotion.post('/api/render/video', {
      template: templateId,
      variables,
      outputFormat: this.getPlatformFormat()
    });
  }
  
  // Leverage Remotion's Sora integration when available
  async generateSoraVideo(prompt: string) {
    return remotion.post('/api/ai/sora', { prompt });
  }
}
```

### 5. WaitlistLab as Meta API Hub

All Meta API calls should route through WaitlistLab:

```typescript
// WaitlistLab Meta API Hub

// Used by: PCT, Content Factory, MediaPoster
class MetaAPIHub {
  
  // Campaign Management
  async createCampaign(params: CampaignParams) { ... }
  async createAdSet(params: AdSetParams) { ... }
  async createAd(params: AdParams) { ... }
  
  // Lead Forms (with preflight)
  async createLeadForm(template: LeadFormTemplate) {
    const preflight = await this.runPreflight(template);
    if (!preflight.canProceed) throw new PreflightError(preflight.errors);
    return this.postToMetaAPI(template);
  }
  
  // Asset Upload
  async uploadAsset(file: Buffer, type: 'image' | 'video') { ... }
  async waitForAssetReady(assetId: string) { ... }
  
  // Insights
  async getInsights(objectId: string, metrics: string[]) { ... }
  
  // Pixel
  async sendEvent(event: PixelEvent) { ... }
}
```

---

## Shared Database Schema

All projects should share core tables in Supabase:

```sql
-- =============================================
-- SHARED IDENTITY (used by all products)
-- =============================================

-- Already exists in Portal28, extend for all products
CREATE TABLE shared_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product entitlements across all apps
CREATE TABLE shared_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES shared_users(id),
  product TEXT NOT NULL, -- 'softwarehub', 'vellopad', 'gapradar', etc.
  plan TEXT DEFAULT 'free',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product)
);

-- =============================================
-- SHARED CREATIVE ASSETS (used by creative apps)
-- =============================================

CREATE TABLE shared_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES shared_users(id),
  
  type TEXT NOT NULL, -- 'image', 'video', 'audio', 'template'
  source TEXT NOT NULL, -- 'remotion', 'dall-e', 'nano-banana', 'veo', 'user-upload'
  
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SHARED ANALYTICS (used by all products)
-- =============================================

CREATE TABLE shared_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES shared_users(id),
  
  product TEXT NOT NULL,
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  
  -- Attribution
  source TEXT,
  campaign TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Feature Ownership Matrix

| Feature Domain | Owner Project | Shared Via |
|----------------|---------------|------------|
| **Authentication** | Portal28 | Supabase shared auth |
| **Payments** | Portal28 | Stripe shared customer |
| **Video Rendering** | Remotion | REST API |
| **Voice Cloning** | Remotion | REST API |
| **Static Ads** | Remotion | REST API |
| **Meta Ads API** | WaitlistLab | REST API |
| **Meta Pixel** | WaitlistLab | JS SDK + CAPI |
| **TikTok API** | Content Factory | REST API |
| **YouTube API** | MediaPoster | REST API |
| **Email Sending** | Portal28 (Resend) | Shared config |
| **File Storage** | All (R2/Supabase) | Direct access |

---

## New Remotion Modules Required

### 1. Veo 3.1 Provider

```typescript
// src/providers/veo.ts

interface VeoConfig {
  projectId: string;
  apiKey: string;
}

interface VeoGenerateParams {
  imageUrl?: string;  // For image-to-video
  prompt: string;
  duration: 8 | 16;
  aspectRatio: '9:16' | '16:9' | '1:1';
}

class VeoProvider {
  async generate(params: VeoGenerateParams): Promise<VeoResult> {
    // Call Google Veo 3.1 API
    // Poll for completion
    // Return video URL
  }
}
```

### 2. Nano Banana Provider

```typescript
// src/providers/nano-banana.ts

interface NanoBananaConfig {
  apiKey: string;
}

interface NanoBananaParams {
  prompt: string;
  negativePrompt?: string;
  variants: number;
  style?: 'realistic' | 'illustration';
}

class NanoBananaProvider {
  async generate(params: NanoBananaParams): Promise<NanoBananaResult> {
    // Call Gemini/Nano Banana API
    // Return image URLs
  }
  
  async generatePair(beforePrompt: string, afterPrompt: string): Promise<{
    before: string[];
    after: string[];
  }> {
    // Generate matching before/after pairs
    // Maintain subject consistency
  }
}
```

### 3. Before/After Template

```typescript
// src/compositions/BeforeAfterReveal.tsx

interface BeforeAfterProps {
  beforeImage: string;
  afterImage: string;
  transition: 'whip-pan' | 'fade' | 'slide' | 'zoom';
  duration: number;
  caption?: string;
}

const BeforeAfterReveal: React.FC<BeforeAfterProps> = (props) => {
  // Remotion composition for before/after reveals
  // 8-second vertical video
  // Whip-pan transition at midpoint
  // Optional caption overlay
};
```

---

## Implementation Priority

### Phase 1: Core Integrations (Week 1-2)

1. **Add Remotion REST API gateway** (if not already exposed)
2. **Add Veo 3.1 provider to Remotion**
3. **Add Nano Banana provider to Remotion**
4. **Create Before/After template in Remotion**

### Phase 2: Content Factory Integration (Week 3-4)

5. **Content Factory calls Remotion for all rendering**
6. **Content Factory calls Remotion for image generation**
7. **Content Factory handles TikTok API independently**

### Phase 3: PCT Integration (Week 5-6)

8. **PCT calls Remotion for static ads**
9. **PCT calls WaitlistLab for Meta API**
10. **PCT calls Remotion for mini-VSL videos**

### Phase 4: Unified Publishing (Week 7-8)

11. **MediaPoster as publishing hub for Instagram/X/YouTube**
12. **WaitlistLab as publishing hub for Meta Ads**
13. **Content Factory as publishing hub for TikTok**

---

## Success Metrics

| Metric | Target |
|--------|--------|
| API response time (Remotion) | <500ms for status, <5min for render |
| Integration adoption | All creative apps use Remotion API |
| Duplicate code eliminated | No video rendering outside Remotion |
| Shared auth coverage | All products use Portal28 auth |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Remotion API bottleneck | Queue system, horizontal scaling |
| API key management | Centralized secrets in ACD config |
| Cross-project dependencies | Clear API contracts, versioning |
| Data consistency | Shared Supabase with RLS |

---

*Last Updated: February 2026*
