# AI Video Platform Autonomous Coding Session

You are working on the **AI Video Platform**, a comprehensive video generation system with AI-powered editing, effects, and rendering capabilities.

## Project Location
`/Users/isaiahdupree/Documents/Software/ai-video-platform`

## PRD Reference
- **Main PRD**: `/Users/isaiahdupree/Documents/Software/ai-video-platform/docs/PRD-Video-Generation-Platform.md`
- **Feature List**: `/Users/isaiahdupree/Documents/Software/ai-video-platform/feature_list.json`

## Product Overview
AI-powered video generation platform that creates professional-quality videos from text prompts, images, and templates. Integrates with multiple AI providers for video generation, voice synthesis, and visual effects.

## Core Capabilities
- **Text-to-Video:** Generate videos from natural language prompts
- **Image-to-Video:** Animate static images into video sequences
- **Template System:** Pre-built video templates with variable substitution
- **Voice Synthesis:** AI voice generation and cloning for narration
- **Caption Generation:** Automatic captions with multiple styles
- **Effects Pipeline:** Transitions, overlays, music, SFX
- **Batch Rendering:** Queue-based rendering for high volume

## Tech Stack
- **Frontend:** Next.js, React, TailwindCSS
- **Backend:** Node.js API
- **Video Engine:** ffmpeg, Remotion
- **AI Providers:** OpenAI, ElevenLabs, LTX-Video
- **Storage:** S3/R2 for video assets
- **Queue:** Background job processing for renders
- **Database:** Supabase (PostgreSQL)

## Key Directories
- `/src/components/` - React UI components
- `/src/lib/` - Core logic and utilities
- `/src/api/` - API route handlers
- `/src/templates/` - Video template definitions
- `/src/providers/` - AI provider integrations

## Feature Categories (106 features)
| Category | Description |
|----------|-------------|
| Core Platform | Project setup, auth, dashboard |
| Video Generation | Text-to-video, image-to-video, rendering |
| Templates | Template library, customization, variables |
| Voice & Audio | TTS, voice cloning, music, SFX |
| Captions | Auto-generate, style, positioning |
| Effects | Transitions, overlays, filters |
| Batch Processing | Queue management, parallel renders |
| Export & Distribution | Format options, CDN delivery |
| Analytics | Render stats, usage tracking |
| Admin | User management, billing, moderation |

## Development Priority
1. **P0:** Core rendering pipeline (ffmpeg + Remotion)
2. **P0:** Template system with variable substitution
3. **P1:** AI provider integrations (OpenAI, ElevenLabs)
4. **P1:** Caption generation and overlay
5. **P2:** Voice cloning and custom voices
6. **P2:** Batch rendering and queue management
7. **P3:** Analytics, admin, distribution

## Integration Points
- **Remotion VideoStudio:** Shares rendering engine
- **MediaPoster:** Consumes generated videos for publishing
- **Content Factory:** Uses for TikTok/social content
- **PCT:** Uses for video ad generation

## Commands
```bash
cd /Users/isaiahdupree/Documents/Software/ai-video-platform
npm run dev     # Start dev server
npm test        # Run tests
npm run build   # Production build
```

## CRITICAL: Remove TODO Stubs and Fake Data from Production

The following files contain TODO stubs with no real implementation and hardcoded fake data:
- `src/app/cpp/page.tsx:78,105,127,165,209` → 5x "TODO: Replace with actual API call" — replace with real Supabase queries
- `src/app/ads/review/page.tsx:42` → TODO stub + hardcoded fake emails (john@example.com, jane@example.com)
- `src/app/ads/review/components/ReviewItemCard.tsx:45` → TODO stub + hardcoded admin@example.com
- `src/app/review/page.tsx:46` → TODO stub + hardcoded fake emails
- `src/app/screenshots/page.tsx:23` → via.placeholder.com URL
- `src/app/screenshots/captions/page.tsx:30` → via.placeholder.com URL
- `src/app/screenshots/editor/page.tsx:528` → via.placeholder.com URL

**Action:** Replace all TODO API call stubs with real Supabase queries. Replace hardcoded emails with auth context user data. Replace via.placeholder.com URLs with empty state UI or real Supabase Storage URLs.

## Critical Rules
- All video processing must happen server-side
- Never block the main thread with ffmpeg operations
- Use streaming responses for large file downloads
- Respect AI provider rate limits and quotas
- Cache rendered results to avoid redundant processing
- Update `feature_list.json` with `"passes": true` when features complete
- **NEVER use TODO stubs with fake return values, hardcoded emails, or placeholder URLs in production code**
