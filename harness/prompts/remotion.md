# Remotion VideoStudio - Autonomous Agent Prompt

## Purpose
You are an autonomous coding agent working on Remotion VideoStudio, an AI-powered video generation platform built on Remotion.

## Project Location
`/Users/isaiahdupree/Documents/Software/Remotion`

## PRD References
- Main PRD: `docs/PRD.md`
- Video Generation Platform: `docs/PRD-Video-Generation-Platform.md`
- HeyGen Alternative: `docs/PRD-HeyGen-Alternative.md`
- SFX System: `docs/PRD-SFX-System.md`
- Audio Video System v2: `docs/PRD-Audio-Video-System-v2.md`
- Text-to-Video Modal: `docs/PRD-Text-to-Video-Modal.md`
- InfiniteTalk: `docs/PRD_InfiniteTalk_Video_Generation.md`
- EverReach Ads: `docs/everreach/PRD_EVERREACH_ADS.md`

## Feature List
`feature_list.json` (120 features across 15 categories)

## Current Phase Priority
1. **Video Core** - Content brief schema, scene templates, animations
2. **Voice & Captions** - IndexTTS-2, Whisper timestamps, TikTok captions
3. **SFX System** - Manifest, audio events, FFmpeg mixer
4. **Modal Deployment** - LTX-Video, talking avatars on serverless GPU

## Tech Stack
- **Video Engine**: Remotion 4.x
- **Language**: TypeScript, Python 3
- **AI**: OpenAI GPT-4o, DALL-E 3, Whisper
- **Voice Clone**: Hugging Face IndexTTS-2
- **TTS/SFX**: ElevenLabs
- **Stock Media**: Pexels, Pixabay, NASA, Freesound
- **GPU Platform**: Modal (serverless)

## Key Files
- `src/Root.tsx` - Remotion compositions
- `src/compositions/BriefComposition.tsx` - Main brief renderer
- `scripts/generate-explainer.ts` - Topic → Video pipeline
- `scripts/generate-audio.ts` - Voice & SFX generation
- `scripts/modal_text_to_video.py` - Modal T2V deployment
- `public/assets/sfx/manifest.json` - SFX library index

## Important Rules
1. Always validate briefs against schema before rendering
2. Use fallback chain for voice: IndexTTS-2 → OpenAI TTS → skip
3. Track attribution for all stock media
4. Run timeline QA gate before final render
5. Keep audio events engine-agnostic (Remotion + Motion Canvas)

## Commands
```bash
# Development
npm run dev                    # Start Remotion Studio

# Generation
npm run generate:explainer -- --topic "Topic"
npm run generate:audio -- --tts "Text" --voice voices/ref.wav
npm run generate:audio -- --sfx "epic whoosh"

# Rendering
npm run render:brief data/briefs/my_brief.json output.mp4
npm run render:static-ads      # Batch static ads

# QA
npm run qa:timeline           # Timeline pacing check
npm run validate data/briefs/my_brief.json
```

## Session Goal
Implement features from feature_list.json, starting with P0 priorities. Focus on:
- Brief schema validation
- Scene template components
- Voice cloning pipeline
- Caption generation
- SFX layer integration

## First Tasks
1. Check `feature_list.json` for next pending P0 feature
2. Implement the feature following PRD specifications
3. Update feature `passes: true` when complete
4. Run relevant QA checks
5. Commit with descriptive message
