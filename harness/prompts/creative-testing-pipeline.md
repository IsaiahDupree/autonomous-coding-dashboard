# Ad Creative Testing Pipeline (ACTP)

## Purpose
Build an automated ad creative testing pipeline that generates video ads (Sora/Veo3/Remotion), tests them organically on YouTube/TikTok, identifies winners, deploys small ad budgets, and iterates to find winning angles.

## Project Location
`/Users/isaiahdupree/Documents/Software/MediaPoster/Backend/services/creative_testing_pipeline/`

## PRD
`/Users/isaiahdupree/Documents/Software/MediaPoster/Backend/services/creative_testing_pipeline/PRD.md`

## Feature List
`/Users/isaiahdupree/Documents/Software/MediaPoster/Backend/services/creative_testing_pipeline/feature_list.json`

## Tech Stack
- **Language**: Python 3.11+
- **Framework**: FastAPI (extends MediaPoster Backend)
- **Database**: Supabase (PostgreSQL)
- **Video Generation**: OpenAI Sora API, Remotion render queue
- **Publishing**: MediaPoster connectors (YouTube, TikTok, Instagram), Safari automation
- **Ad Platforms**: Meta Marketing API, TikTok Ads API
- **AI**: OpenAI GPT-4o for brief generation, pattern analysis
- **Existing Services**: MediaPoster ad_testing/ (AD-002 through AD-007)

## Key Existing Infrastructure to Integrate

### Remotion Video Pipeline (DO NOT REBUILD)
- `Remotion/python/services/video_generation/full_pipeline.py` — Full pipeline
- `Remotion/python/services/video_providers/sora_provider.py` — Sora API adapter
- `Remotion/python/services/sora_video_pipeline.py` — Multi-clip composition
- `Remotion/src/service/server.ts` — Remotion render-brief queue

### MediaPoster Connectors (DO NOT REBUILD)
- `connectors/youtube/connector.py` — YouTube upload + metrics
- `connectors/tiktok/connector.py` — TikTok publish + analytics
- `automation/safari_tiktok_cli.py` — Safari TikTok automation
- `automation/safari_instagram_poster.py` — Safari Instagram automation

### MediaPoster Ad Testing (DO NOT REBUILD)
- `services/ad_testing/variation_generator.py` (AD-002)
- `services/ad_testing/campaign_deployer.py` (AD-004)
- `services/ad_testing/performance_tracker.py` (AD-005)
- `services/ad_testing/ai_learner.py` (AD-006)
- `services/ad_testing/campaign_manager.py` (AD-007)

## Directory Structure
```
services/creative_testing_pipeline/
├── __init__.py
├── PRD.md
├── feature_list.json
├── orchestrator.py          # Pipeline lifecycle management
├── creative_engine.py       # Video generation bridge
├── organic_publisher.py     # YouTube/TikTok/Instagram posting
├── analytics_collector.py   # Cross-platform metric collection
├── winner_selector.py       # Scoring and ranking algorithms
├── ad_deployer.py           # Ad budget allocation
├── iteration_engine.py      # Variation generation from winners
├── offer_connector.py       # WaitlistLab bridge
├── scheduler.py             # Background task scheduling
├── config.py                # Pipeline configuration
├── models.py                # Pydantic models
├── migrations/              # Database migrations
│   └── 001_create_actp_tables.sql
├── routers/
│   └── actp_router.py       # FastAPI endpoints
└── tests/
    ├── test_orchestrator.py
    ├── test_winner_selector.py
    ├── test_analytics.py
    └── test_creative_engine.py
```

## Commands
```bash
# Run tests
cd /Users/isaiahdupree/Documents/Software/MediaPoster/Backend
python -m pytest services/creative_testing_pipeline/tests/ -v

# Run backend
python -m uvicorn main:app --reload
```

## Important Rules
1. **INTEGRATE, DON'T REBUILD** — Use existing MediaPoster connectors, ad_testing services, and Remotion pipeline. Import and call them.
2. **NO MOCK DATA** — No placeholder APIs, mock providers, or TODO stubs. Use real service integrations.
3. **DATABASE-FIRST** — All state persisted to Supabase. No in-memory-only state for production data.
4. **CONFIGURABLE** — All thresholds, budgets, wait times, and platform selections must be configurable.
5. **ERROR RESILIENT** — Every external call (Sora, YouTube, Meta Ads) must have retry logic and graceful degradation.

## Current Focus
Build the core pipeline: database schema → orchestrator → creative engine (Sora) → organic publisher (YouTube/TikTok) → analytics collector → winner selector → ad deployer → iteration engine. Start with database models and the orchestrator state machine.

## TDD Workflow
1. Write tests for the module under development
2. Implement the module to pass tests
3. Integration test with existing services
4. Mark features as passing in feature_list.json
