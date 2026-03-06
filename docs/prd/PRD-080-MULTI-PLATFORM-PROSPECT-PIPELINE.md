# PRD-080: Multi-Platform Prospect Pipeline
**Priority:** P0 | **Target:** $5K/mo revenue | **Owner:** ACD Agent

## Goal
Find 500+ qualified ICP prospects per week across Instagram, TikTok, Twitter, and Threads using the same Safari automation infrastructure already built. Feed all prospects into CRMLite with dedup.

## ICP
SaaS founders, $500K–$5M ARR, needing AI automation. Pain: manual execution work, no time to build systems.

## Method (per platform)
1. **Keyword search** → find top posts in niche (ai_automation, saas_growth, content_creation)
2. **Top posts** → extract top creators (>1K engagement)
3. **Top creator profiles** → crawl their follower list (or "following" list)
4. **Followers** → score against ICP rubric (10-point: tech/AI/founder/company/growth signals)
5. **Qualified (≥6)** → CRMLite upsert + local DM approval queue

## Platform Details

### Instagram (port 3005 — comments, port 3100 — DM)
- Search hashtags: `#aiautomation #saasfounder #startuplife #buildinpublic`
- GET `/api/instagram/search/hashtag` → posts
- GET `/api/instagram/profile/{username}/followers` → follower list
- Score each follower bio against ICP rubric
- CRMLite sync → local IG DM queue → human approval

### TikTok (port 3006 — comments, port 3102 — DM)
- Search: `#aitools #saasbuilder #techfounder`
- GET `/api/tiktok/search/keyword` → videos
- Extract creator profiles from top videos
- GET `/api/tiktok/profile/{username}/followers`
- Same scoring → CRMLite → DM queue

### Twitter/X (port 3007 — comments, port 3003 — DM)
- Search: `"AI automation" OR "SaaS founder" OR "building in public"` filter:verified min_faves:100
- GET `/api/twitter/search` → tweets
- Extract authors from top tweets
- GET `/api/twitter/profile/{username}/followers`
- Same scoring → DM queue

### Threads (port 3004)
- Search posts in AI/SaaS niches
- Extract top post authors
- GET `/api/threads/profile/{username}/followers`

## Files to Create
- `harness/prospect-pipeline.js` — unified pipeline daemon (all 4 platforms)
- `harness/launch-prospect-pipeline.sh` — start/stop/status
- `harness/prospect-scores.json` — scoring cache
- Backend routes: `GET /api/prospects/status|queue` + `POST /api/prospects/queue/approve`
- Dashboard panel in Queue tab: Prospect Pipeline section

## Architecture
```
ProspectPipeline Daemon (30 min cycle)
├── rotate platforms (IG → TT → TW → Threads)
├── for each platform: keyword → top posts → creators → followers
├── score followers (ICP rubric)
├── dedup vs CRMLite
├── CRMLite upsert
└── add to platform-specific DM approval queue
```

## Success Metrics
- 500+ new prospects/week across all platforms
- 20%+ ICP qualification rate
- All qualified prospects in CRMLite within 5 min of discovery
- Zero auto-sent DMs (human approval required)

## Dependencies
- Safari Automation services running (ports 3003, 3004, 3005, 3006, 3007, 3100, 3102)
- CRMLite API key from actp-worker/.env
- business-goals.json for ICP criteria
