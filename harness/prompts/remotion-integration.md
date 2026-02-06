# Remotion Integration Features - Central Video Engine Extensions

## Project Overview
Extend Remotion VideoStudio with new AI providers (Google Veo 3.1, Nano Banana) and REST API endpoints to serve as the central video/creative engine for all ACD projects (Content Factory, PCT, MediaPoster).

## Reference Documents
- PRD: `/Users/isaiahdupree/Documents/Software/Remotion/docs/PRD-Video-Generation-Platform.md`
- Feature List: `/Users/isaiahdupree/Documents/Software/Remotion/feature_list.json`
- Architecture: `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/UNIFIED_PLATFORM_ARCHITECTURE.md`

## Current Status
- Remotion has 153 completed features
- 16 new integration features added (VEO-*, NANO-*, TEMPLATE-BA-*, API-*)
- New features are NOT yet implemented (passes: false)

## New Feature Categories

### 1. Google Veo 3.1 Provider (VEO-001 to VEO-003)

```typescript
// src/providers/veo.ts

interface VeoConfig {
  projectId: string;
  apiKey: string;
}

interface VeoGenerateParams {
  imageUrl?: string;       // For image-to-video
  prompt: string;          // Video description
  duration: 8 | 16;        // Seconds
  aspectRatio: '9:16' | '16:9' | '1:1';
}

class VeoProvider {
  constructor(config: VeoConfig) { ... }
  
  async generate(params: VeoGenerateParams): Promise<{ jobId: string }> {
    // Call Google Veo 3.1 API
    // Return job ID for polling
  }
  
  async getStatus(jobId: string): Promise<VeoStatus> {
    // Poll for completion
    // Return status + video URL when ready
  }
  
  async waitForCompletion(jobId: string, timeoutMs = 300000): Promise<string> {
    // Poll until complete or timeout
    // Return video URL
  }
}

export const veoProvider = new VeoProvider({
  projectId: process.env.GOOGLE_PROJECT_ID,
  apiKey: process.env.GOOGLE_AI_API_KEY
});
```

### 2. Nano Banana (Gemini) Image Provider (NANO-001 to NANO-004)

```typescript
// src/providers/nano-banana.ts

interface NanoBananaConfig {
  apiKey: string;
}

interface NanoBananaParams {
  prompt: string;
  negativePrompt?: string;
  variants: number;        // 1-5
  style?: 'realistic' | 'illustration';
}

class NanoBananaProvider {
  constructor(config: NanoBananaConfig) { ... }
  
  async generate(params: NanoBananaParams): Promise<{ images: string[] }> {
    // Call Gemini/Nano Banana API
    // Return image URLs
  }
  
  async generatePair(
    beforePrompt: string, 
    afterPrompt: string,
    variants: number = 3
  ): Promise<{ before: string[], after: string[] }> {
    // Generate matching before/after pairs
    // Maintain subject consistency via prompt engineering
  }
}

// Before prompt template
function buildBeforePrompt(product: ProductDossier): string {
  return `
Make a before version of ${product.category} scene:
- Emphasize the problem: ${product.painPoints[0]}
- Dull, natural lighting
- Slightly messy/cluttered environment
- Realistic phone photo aesthetic
- No brand logos visible
- Keep subject identity consistent for pairing
  `.trim();
}

// After prompt template
function buildAfterPrompt(product: ProductDossier): string {
  return `
Make an after version of the same scene:
- Same composition but improved
- Problem is solved: ${product.benefits[0]}
- Brighter, cleaner lighting
- Organized/improved environment
- Product visible but not staged
- Realistic phone photo aesthetic
- Keep subject identity consistent with before image
  `.trim();
}
```

### 3. Before/After Reveal Template (TEMPLATE-BA-001 to BA-003)

```typescript
// src/compositions/BeforeAfterReveal.tsx

import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from 'remotion';

interface BeforeAfterProps {
  beforeImage: string;
  afterImage: string;
  transition: 'whip-pan' | 'fade' | 'slide' | 'zoom';
  duration: number;        // seconds
  caption?: string;
}

export const BeforeAfterReveal: React.FC<BeforeAfterProps> = ({
  beforeImage,
  afterImage,
  transition,
  duration
}) => {
  const frame = useCurrentFrame();
  const fps = 30;
  const totalFrames = duration * fps;
  const midpoint = totalFrames / 2;
  const transitionDuration = 15; // 0.5s at 30fps
  
  // Whip-pan effect
  const panOffset = interpolate(
    frame,
    [midpoint - transitionDuration/2, midpoint + transitionDuration/2],
    [0, -1920],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Motion blur during transition
  const blur = interpolate(
    frame,
    [midpoint - transitionDuration/2, midpoint, midpoint + transitionDuration/2],
    [0, 20, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  return (
    <AbsoluteFill>
      <div style={{ 
        transform: `translateX(${panOffset}px)`,
        filter: `blur(${blur}px)`,
        display: 'flex',
        width: '200%'
      }}>
        <img src={beforeImage} style={{ width: '50%', objectFit: 'cover' }} />
        <img src={afterImage} style={{ width: '50%', objectFit: 'cover' }} />
      </div>
      
      {/* Handheld camera shake */}
      <CameraShake intensity={0.3} />
    </AbsoluteFill>
  );
};

// Camera shake component for authenticity
const CameraShake: React.FC<{ intensity: number }> = ({ intensity }) => {
  const frame = useCurrentFrame();
  const x = Math.sin(frame * 0.3) * intensity * 3;
  const y = Math.cos(frame * 0.4) * intensity * 2;
  
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      transform: `translate(${x}px, ${y}px)`
    }} />
  );
};
```

### 4. REST API Gateway (API-001 to API-006)

```typescript
// src/api/integration-gateway.ts

import { Router } from 'express';
import { veoProvider } from '../providers/veo';
import { nanoBananaProvider } from '../providers/nano-banana';
import { renderVideo, renderStill } from '../render/remotion-render';

const router = Router();

// Video rendering endpoint
router.post('/api/render/video', async (req, res) => {
  const { briefJson, outputFormat, quality } = req.body;
  
  const jobId = await renderVideo({
    brief: briefJson,
    format: outputFormat,
    quality: quality || 'high'
  });
  
  res.json({ jobId, status: 'queued' });
});

// Static ad rendering endpoint
router.post('/api/render/static', async (req, res) => {
  const { template, props, sizes } = req.body;
  
  const images = await Promise.all(
    sizes.map(size => renderStill({ template, props, size }))
  );
  
  res.json({ images });
});

// Veo 3.1 video generation
router.post('/api/ai/veo', async (req, res) => {
  const { imageUrl, prompt, duration, aspectRatio } = req.body;
  
  const { jobId } = await veoProvider.generate({
    imageUrl,
    prompt,
    duration,
    aspectRatio
  });
  
  res.json({ jobId, status: 'generating' });
});

// Nano Banana image generation
router.post('/api/ai/nano-banana', async (req, res) => {
  const { prompt, type, variants } = req.body;
  
  const { images } = await nanoBananaProvider.generate({
    prompt,
    variants: variants || 3
  });
  
  res.json({ images, type });
});

// Before/After template
router.post('/api/templates/before-after', async (req, res) => {
  const { beforeImageUrl, afterImageUrl, transitionStyle, duration } = req.body;
  
  const jobId = await renderVideo({
    composition: 'BeforeAfterReveal',
    props: {
      beforeImage: beforeImageUrl,
      afterImage: afterImageUrl,
      transition: transitionStyle || 'whip-pan',
      duration: duration || 8
    },
    format: '9:16'
  });
  
  res.json({ jobId, status: 'rendering' });
});

export default router;
```

## Implementation Priority

### P0 (Must Have First)
1. **API-001**: REST API Gateway setup
2. **API-002**: POST /api/render/video endpoint
3. **API-003**: POST /api/render/static endpoint

### P1 (Content Factory Dependencies)
4. **VEO-001**: Veo 3.1 provider
5. **VEO-002**: Image-to-video generation
6. **VEO-003**: Job status polling
7. **NANO-001**: Nano Banana provider
8. **NANO-002**: Before/After pair generation
9. **TEMPLATE-BA-001**: BeforeAfterReveal composition
10. **TEMPLATE-BA-002**: Whip-pan transition

### P2 (Polish)
11. **NANO-003**: Before prompt template
12. **NANO-004**: After prompt template
13. **TEMPLATE-BA-003**: Handheld camera simulation
14. **API-004 to API-006**: Remaining endpoints

## Environment Variables (New)

```bash
# Add to .env.local

# Google AI (Veo 3.1 + Nano Banana)
GOOGLE_AI_API_KEY=...
GOOGLE_PROJECT_ID=...

# API Gateway
REMOTION_API_PORT=8686
REMOTION_API_SECRET=... # For authenticating external consumers
```

## Testing

```bash
# Test Veo provider
npm run test:veo -- --prompt "8 second vertical video of product reveal"

# Test Nano Banana
npm run test:nano-banana -- --prompt "before scene of messy desk"

# Test Before/After template
npm run preview -- --composition BeforeAfterReveal

# Test API endpoints
curl -X POST http://localhost:8686/api/ai/nano-banana \
  -H "Authorization: Bearer $REMOTION_API_SECRET" \
  -d '{"prompt": "clean modern kitchen", "variants": 3}'
```

## Success Metrics
- API response time <500ms for status checks
- Video render time <5 minutes
- 100% uptime for API gateway
- All external consumers (Content Factory, PCT) using API

## Instructions for Development
1. Focus on P0 features first (API gateway)
2. Test each provider independently before integration
3. Add proper error handling and logging
4. Document all API endpoints with examples
5. Ensure job queue handles concurrent requests
6. Add rate limiting for external consumers
