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

## Current Phase Priority

**Phase 1: Sleep/Wake Mode (SLEEP-001 to SLEEP-012)** - CPU EFFICIENCY
- Core sleep service, wake triggers, worker management

**Phase 2: Content Ops (OPS-001 to OPS-020 + ENTITY-001 to ENTITY-007 + UI-001 to UI-007)**
- FATE scoring, awareness classifier, QA gate, generation pipeline
- Brand → Offer → ICP entities with full traceback
- Dashboard UI for content management

**Phase 3: 25 AI Templates (TPL-001 to TPL-008)**
- Problem-Aware (8), Solution-Aware (7), Product-Aware (6), Most-Aware (4)
- Template forking, CRUD API, variable system

**Phase 4: Platform Adapters (ADAPT-001 to ADAPT-013)**
- X/Twitter, Instagram, TikTok, YouTube, Threads adapters

**Phase 5: Media Factory (MF-001 to MF-008)**
- Script → TTS → Music → Visuals → Remotion → Publish pipeline

**Phase 6: Trend Discovery (TREND-001 to TREND-005)**
- Multi-source trends, scoring, trend → brief conversion

**Phase 7: Multi-Channel (MC-001 to MC-008)**
- Comment loop, DM qualification flow, email sequences

**Phase 8: Autonomy (AUTO-001 to AUTO-008)**
- n8n integration, bandit allocation, auto-fork, approval queue

**Phase 9: Testing (TEST-001 to TEST-022)**
- Full test suite from PRD_CONTENT_OPS_TESTS.md

**Phase 10: Modular Architecture (MOD-001 to MOD-008)**
- Event bus, service registry, health checks

### Your First Tasks (Sleep/Wake Mode):

1. **SLEEP-001: Sleep Mode Core Service**
   - Create service to manage app sleep/wake states
   - Reduce CPU usage when idle (target: <5%)
   - Files: `Backend/services/sleep_mode_service.py`

2. **SLEEP-002: Wake Triggers Registry**
   - Registry of events that wake the system
   - Types: scheduled_post, safari_automation, checkback, user_access, post_creation
   - Files: `Backend/services/wake_triggers.py`

3. **SLEEP-003: Scheduled Post Wake Trigger**
   - Wake system 5 minutes before scheduled post time
   - Integration with scheduler service
   - Files: `Backend/services/scheduler_service.py`

## Tech Stack
- **Backend:** Python FastAPI
- **Database:** Supabase (PostgreSQL)
- **Queue:** Redis + BullMQ (or in-memory for dev)
- **Automation:** Safari AppleScript
- **AI:** OpenAI API (real calls, no mocks)
- **Dashboard:** Next.js 16

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
Implement the sleep/wake mode feature first (SLEEP-001 to SLEEP-012), then move to content ops and testing. Each feature should result in working, tested code.

Remember to:
1. Read existing code patterns in `Backend/services/` before creating new services
2. Follow FastAPI patterns for new endpoints
3. Add tests for each new feature
4. Update `feature_list.json` with `passes: true` when features complete
5. No silent skips - always fail with clear error
6. Use real OpenAI calls for any AI features
