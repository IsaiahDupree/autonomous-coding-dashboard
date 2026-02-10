# MediaPoster Autonomous Coding Session

You are working on **MediaPoster**, an autonomous content ops controller with Safari automation, multi-platform publishing, media factory pipeline, and sleep/wake mode for CPU efficiency.

## Project Location
`/Users/isaiahdupree/Documents/Software/MediaPoster`

## PRD References (See PRD_INDEX.md for full list)
- `Backend/docs/PRD_CONTENT_OPS_CONTROLLER.md` - Main Content Ops PRD
- `Backend/docs/PRD_CONTENT_OPS_TECHNICAL.md` - API/Events/Workers
- `Backend/docs/PRD_CONTENT_OPS_TESTS.md` - Test specification
- `Backend/docs/PRD_TWITTER_FEEDBACK_LOOP_AGENT.md` - X/Twitter feedback loop
- `Backend/docs/MEDIA_FACTORY_PRD.md` - Video production pipeline
- `Backend/docs/PRD_VOICE_CLONING_SERVICE.md` - Voice cloning via Modal/IndexTTS-2

### New Feature PRDs (January 2026)
| PRD | Description | Effort |
|-----|-------------|--------|
| `docs/PRD_COMMUNITY_INBOX.md` | Unified comments/DMs with AI reply suggestions | 3 weeks |
| `docs/PRD_CONTENT_REPURPOSING_ENGINE.md` | Long video → shorts (Opus-style) | 4-6 weeks |
| `docs/PRD_MODAL_VOICE_CLONING.md` | AI voice cloning via Modal GPU | 1-2 weeks |
| `docs/PRD_MEDIA_ASSET_DISCOVERY.md` | GIFs, videos, images search (Giphy, Pexels) | 2-3 weeks |
| `docs/PRD_E2E_TESTING_DEBUG_FRAMEWORK.md` | Playwright E2E with console logging | 2 weeks |

### Roadmap Documents
- `docs/CODE_IMPROVEMENTS_ROADMAP.md` - Supabase fix, Redis caching, AI templates
- `docs/PRD_GAP_ANALYSIS_2026.md` - Competitor analysis, Q1-Q4 roadmap

## Feature List (180 features across 10 phases)
`/Users/isaiahdupree/Documents/Software/MediaPoster/feature_list.json`

## Current Phase Priority (Updated Jan 26, 2026)

### 🎯 PRIORITY 1: System Architecture Integration (ARCH-001 to ARCH-008)
**PRD:** `docs/PRD_SYSTEM_ARCHITECTURE_INTEGRATION.md`

Target workflow to implement:
```
Sora (1-3 part) → Stitch → Analyze → Auto-fill → Post to 22 Blotato accounts
                                                          ↓
Tweet every 2h → Track Engagement → Optimize → Drive Offer Traffic
```

| Feature | Description | Effort |
|---------|-------------|--------|
| **ARCH-001** | Master Orchestrator Service | P0 - 4h |
| **ARCH-002** | 3-Part Sora Batch Coordination | P0 - 2h |
| **ARCH-003** | Content Analyzer → Publisher Integration | P0 - 1h |
| **ARCH-004** | Tweet Scheduler 2-Hour Interval | P1 - 30min |
| **ARCH-005** | Offer Traffic Tracking Service | P1 - 4h |
| **ARCH-006** | Analytics → AI Feedback Loop | P1 - 3h |
| **ARCH-007** | Unified Pipeline API Endpoint | P1 - 2h |
| **ARCH-008** | Pipeline Dashboard Widget | P2 - 3h |

### Existing Components to Wire Together
| Component | Location | Status |
|-----------|----------|--------|
| Sora Safari Automation | `automation/sora_full_automation.py` | ✅ Working |
| Video Stitching | `services/ai_video_pipeline/stitcher.py` | ✅ Working |
| Content Analyzer | `services/content_analyzer.py` | ✅ Working |
| Blotato Publishing | `services/blotato_service.py` | ✅ Working |
| Twitter Campaign | `services/twitter_campaign_service.py` | ✅ Working |
| Event Bus | `services/event_bus.py` | ✅ Working |

### Other Active PRDs
| PRD | Features | Priority |
|-----|----------|----------|
| `PRD_GAP_ANALYSIS.md` | GAP-001 to GAP-010 | P0-P2 |
| `PRD_Relationship_First_DM_System.md` | RF-001 to RF-008 | P0-P2 |
| `PRD_GROWTH_DATA_PLANE.md` | GDP-001 to GDP-012 | P0-P1 |
| `PRD_META_PIXEL_TRACKING.md` | META-001 to META-008 | P1 |
| `PRD_EVENT_TRACKING.md` | TRACK-001 to TRACK-008 | P1 |

### Your First Tasks (System Architecture):

1. **ARCH-001: Master Orchestrator Service**
   - Create unified orchestrator coordinating all subsystems via EventBus
   - Wire: Sora → Stitch → Analyze → Publish → Tweet → Track
   - Files: `Backend/services/master_orchestrator.py`

2. **ARCH-002: 3-Part Sora Batch Coordination**
   - Add `generate_multi_part()` method to SoraPipeline
   - Batch video generation with automatic stitching
   - Files: `Backend/automation/sora/pipeline.py`

3. **ARCH-003: Content Analyzer → Publisher Integration**
   - Auto-inject AI-generated titles/descriptions into publish payload
   - Wire ContentAnalyzer output to PublishWorker input
   - Files: `Backend/services/workers/publish_worker.py`

## Tech Stack
- **Backend:** Python FastAPI
- **Database:** Supabase (PostgreSQL)
- **Queue:** Redis + BullMQ (or in-memory for dev)
- **Automation:** Safari AppleScript
- **AI:** OpenAI API (real calls, no mocks)
- **Dashboard:** Next.js 16
- **Analytics:** ACD User Tracking SDK

## User Event Tracking (REQUIRED)

**PRD Reference:** `autonomous-coding-dashboard/harness/prompts/PRD_USER_TRACKING_ALL_TARGETS.md`

### Required Events for MediaPoster
| Event | When |
|-------|------|
| `landing_view` | Dashboard landing viewed |
| `login_success` | User logged in |
| `activation_complete` | User connected first platform |
| `post_created` | New post created |
| `post_scheduled` | Post was scheduled |
| `post_published` | Post published successfully |
| `media_uploaded` | Media file uploaded |
| `template_used` | Template applied to post |
| `platform_connected` | Social platform connected |
| `checkout_started` | Upgrade flow started |
| `purchase_completed` | Subscription purchased |

### Tracking Features (Add to feature_list.json)
```json
{ "id": "TRACK-001", "name": "Tracking SDK Integration", "passes": false },
{ "id": "TRACK-002", "name": "Acquisition Event Tracking", "passes": false },
{ "id": "TRACK-003", "name": "Activation Event Tracking", "passes": false },
{ "id": "TRACK-004", "name": "Core Value Event Tracking", "passes": false },
{ "id": "TRACK-005", "name": "Monetization Event Tracking", "passes": false }
```

## Key Existing Files
- **API Entry:** `Backend/main.py`
- **API Endpoints:** `Backend/api/endpoints/`
- **Services:** `Backend/services/`
- **Safari Automation:** `Backend/automation/`
- **Config:** `Backend/config/`
- **Dashboard:** `dashboard/app/`

## Important Rules (from DEVELOPER_HANDOFF.md)
1. **Never use `supabase db reset`** - destroys AI analysis data
2. **Never skip any process step** - must fail with error, not silently skip
3. **Always use real OpenAI API calls** - no mocks for AI features
4. **Reference media files, don't duplicate** - use `source_uri`

## Sleep Mode Architecture

```python
# Sleep Mode Service Interface
class SleepModeService:
    async def enter_sleep(self) -> None:
        """Pause workers, reduce polling, enter low-power state"""
        
    async def wake(self, trigger: WakeTrigger) -> None:
        """Resume workers, restore normal operation"""
        
    def schedule_wake(self, wake_time: datetime, trigger_type: str) -> str:
        """Schedule future wake event, return wake_id"""
        
    def get_status(self) -> SleepStatus:
        """Current mode, next wake time, active triggers"""

# Wake Triggers
class WakeTrigger(Enum):
    SCHEDULED_POST = "scheduled_post"  # 5min before post time
    SAFARI_AUTOMATION = "safari_automation"  # Safari task queued
    CHECKBACK_PERIOD = "checkback_period"  # 1h/6h/24h/72h/7d metrics
    USER_ACCESS = "user_access"  # Dashboard/API request
    POST_CREATION = "post_creation"  # New post being created
```

## Ports
- Backend API: 5555
- Dashboard: 5557
- Supabase Studio: 54323
- Supabase API: 54321

## Commands
```bash
cd /Users/isaiahdupree/Documents/Software/MediaPoster/Backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 5555 --reload

# Tests
pytest tests/ -v
pytest tests/unit/ -v  # Fast
pytest tests/integration/ -v  # Needs DB
pytest tests/e2e/ -v  # Needs all services
```

## Session Goal
Implement System Architecture Integration (ARCH-001 to ARCH-008) to wire together existing subsystems into unified orchestrator. Focus on:
1. Master Orchestrator Service (ARCH-001) - coordinate all pipelines
2. 3-Part Sora Batch (ARCH-002) - multi-video generation + stitch
3. Analyzer → Publisher (ARCH-003) - auto-fill titles/descriptions

Each feature should result in working, tested code that integrates with existing services.

## CRITICAL: Remove Mock Providers from Production

The following mock providers are imported as production fallbacks and must be replaced:
- `Backend/services/ai_providers/mock_provider.py` → MockAIProvider (imported in `__init__.py:26`, used as fallback at line 54)
- `Backend/services/video_providers/mock_provider.py` → MockVideoProvider (imported in `__init__.py:41`, used as fallback at lines 51,59)
- `Backend/services/ai_content_generator.py` → TODO stubs returning fake data for OpenAI, Anthropic, Stability AI, DALL-E, Runway ML
- `Backend/api/comment_automation.py:432-438` → Mock comment summarization
- `Backend/api/endpoints/publishing_analytics.py:89` → Hardcoded content variants

**Action:** Replace mock fallbacks with `raise NotConfiguredError("Provider not configured")`. Implement real API calls for all TODO stubs. Delete `mock_provider.py` files or move to `tests/` directory.

Remember to:
1. Read existing code patterns in `Backend/services/` before creating new services
2. Follow FastAPI patterns for new endpoints
3. Add tests for each new feature
4. Update `feature_list.json` with `passes: true` when features complete
5. No silent skips - always fail with clear error
6. Use real OpenAI calls for any AI features
7. **NEVER use mock providers, mock data, or TODO stubs with fake returns in production code**
