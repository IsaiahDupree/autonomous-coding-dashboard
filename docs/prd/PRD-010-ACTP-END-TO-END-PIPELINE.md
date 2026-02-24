# PRD-010: ACTP End-to-End Pipeline Completion

## Priority: P0 (CRITICAL — enables autonomous content + revenue)
## Target: actp-worker, ContentLite, GenLite, PublishLite, MetricsLite
## Status: PLANNED

---

## Problem Statement

The ACTP (Ad Creative Testing Pipeline) is a 10-service distributed system designed for autonomous content creation, publishing, and optimization. While individual services exist (GenLite, AdLite, MetricsLite, ResearchLite, PublishLite, ContentLite, MPLite, HookLite, ACTPDash, actp-worker), **the end-to-end pipeline has never been executed successfully**. Most Vercel services are scaffolds with no real implementations behind their API routes.

The critical chain that must work:
```
Research → Generate Content → Render Video → AI Review → Publish → Track Metrics → Feedback Loop → Repeat
```

Currently: Research works (Safari Automation), publishing works (Blotato/MPLite), feedback tracking works (Twitter). But the middle steps (generate, render, review) are disconnected.

## What Exists Today

| Service | Status | Reality |
|---------|--------|---------|
| **actp-worker** | ✅ LIVE | Python daemon, 17 executors, 121 topics, 33 crons |
| **MPLite** | ✅ LIVE | Publishing queue, platform routing |
| **Safari Automation** | ✅ LIVE | 12 microservices, research, posting, DMs |
| **Blotato** | ✅ LIVE | Direct API publishing to 9 platforms |
| **Twitter Feedback** | ✅ LIVE | Checkbacks, classification, strategy generation |
| **GenLite** | ⚠️ SCAFFOLD | API routes exist, no real generation logic |
| **ContentLite** | ⚠️ SCAFFOLD | Routes exist, no Claude/GPT integration |
| **MetricsLite** | ⚠️ SCAFFOLD | Routes exist, no scoring engine |
| **AdLite** | ⚠️ SCAFFOLD | Routes exist, no Meta/TikTok ad integration |
| **ResearchLite** | ⚠️ SCAFFOLD | Routes exist, no real data collection |
| **PublishLite** | ⚠️ SCAFFOLD | Routes exist, no Thompson Sampling |
| **HookLite** | ⚠️ SCAFFOLD | Routes exist, no webhook processing |
| **ACTPDash** | ⚠️ SCAFFOLD | UI exists, no real data connections |

## Requirements

### R1: Content Generation Pipeline (MUST HAVE)
- ContentLite: `POST /api/generate/from-blueprint` — accept blueprint JSON, return video script + captions
- ContentLite: `POST /api/generate/tweets` — accept niche + strategy, return 10 tweets
- ContentLite: `POST /api/generate/tweet-analysis` — analyze tweet performance data
- ContentLite: `POST /api/generate/twitter-playbook` — generate living strategy document
- Use Claude Haiku via Anthropic API (not CLI) for cloud service calls
- Cost target: <$0.01 per generation

### R2: Video Generation Pipeline (MUST HAVE)
- GenLite: `POST /api/jobs` — submit video gen job (Remotion template + props)
- GenLite: `POST /api/cron/process-jobs` — poll pending jobs, dispatch to worker
- actp-worker: remotion_runner claims jobs, renders via `npx remotion render`
- Job lifecycle: pending → claimed → rendering → succeeded/failed
- 3 Remotion templates seeded: text-overlay, split-screen, countdown

### R3: Publishing Pipeline (MUST HAVE)
- Unified publish function: `publish_content(content, platforms)`
- Twitter → Safari Automation (direct posting via osascript)
- TikTok/Instagram/YouTube/Threads → Blotato API (direct upload)
- Facebook → Blotato API (with pageId)
- All publishes registered in feedback loop automatically

### R4: Metrics & Scoring (SHOULD HAVE)
- MetricsLite: `POST /api/scores` — calculate engagement scores per post
- MetricsLite: `GET /api/winners` — return top N posts by score
- MetricsLite: `GET /api/timing` — engagement matrix by day×hour
- Scoring formula: (likes×1 + comments×3 + shares×5 + saves×2) / impressions × 1000

### R5: Workflow Orchestration (MUST HAVE)
- Workflow Engine: `research-to-blotato` workflow runs end-to-end
- 7 steps: research → extract → generate → render → save → expand → publish
- Each step has clear input/output contract
- Failure at any step → retry 2x, then mark failed + alert

### R6: Closed-Loop Feedback (MUST HAVE)
- Published content auto-registered in `actp_twitter_feedback`
- Checkbacks at 1hr/4hr/24hr via Safari Automation
- Classification: viral (top 5%), strong (top 20%), average, weak, flop
- Strategy generation from performance data → feeds next content generation
- Memory: daily notes written to Obsidian vault

## Implementation Plan

### Phase 1: ContentLite Real Implementation (Week 1)
1. Add Anthropic SDK to ContentLite (`@anthropic-ai/sdk`)
2. Implement `/api/generate/from-blueprint` — Claude Haiku generates video script
3. Implement `/api/generate/tweets` — generate 10 tweets from strategy + niche
4. Implement `/api/review` — rubric-based content scoring (7 dimensions)
5. Add env vars: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### Phase 2: GenLite + Remotion Integration (Week 1)
1. Implement `/api/jobs` POST — insert into `actp_gen_jobs` table
2. Implement `/api/cron/process-jobs` — find pending jobs, mark as claimed
3. actp-worker remotion_runner already works — verify it claims and renders
4. Add job completion callback: worker → GenLite `/api/jobs/{id}/complete`

### Phase 3: Publish Pipeline Unification (Week 2)
1. Implement `publish_content()` in actp-worker that routes by platform
2. Twitter → `safari_comments_client.post_tweet()`
3. Other platforms → `blotato_client.full_publish()`
4. Auto-register each publish in feedback loop
5. Add `actp_published_content` table (from PRD-007)

### Phase 4: MetricsLite Scoring Engine (Week 2)
1. Implement scoring formula in MetricsLite
2. Pull metrics from `actp_twitter_feedback` + platform APIs
3. Build winners archive: top posts by score, filterable by platform/niche
4. Thompson Sampling for optimal posting times

### Phase 5: End-to-End Workflow Test (Week 3)
1. Trigger `research-to-blotato` workflow via Workflow Engine
2. Verify each step executes and passes data forward
3. Verify published content appears on platforms
4. Verify metrics collection starts automatically
5. Document the full flow with timing data

## Success Criteria

| Metric | Target |
|--------|--------|
| ContentLite generates real content | ✅ Working |
| GenLite dispatches Remotion jobs | ✅ Working |
| Remotion renders complete | ✅ Working |
| Content published to ≥3 platforms | ✅ Working |
| Feedback loop auto-registers publishes | ✅ Working |
| Checkbacks collect metrics at 1hr/4hr/24hr | ✅ Working |
| End-to-end workflow completes | ✅ Working |
| Time from research to publish | ≤30 minutes |

## Files to Modify

### ContentLite (`/Users/isaiahdupree/Documents/Software/contentlite/`)
- `app/api/generate/from-blueprint/route.ts` — real Claude implementation
- `app/api/generate/tweets/route.ts` — tweet generation
- `app/api/generate/tweet-analysis/route.ts` — performance analysis
- `app/api/review/route.ts` — content quality scoring
- `lib/generators/` — shared generation utilities

### GenLite (`/Users/isaiahdupree/Documents/Software/genlite/`)
- `app/api/jobs/route.ts` — job CRUD
- `app/api/cron/process-jobs/route.ts` — job dispatcher

### MetricsLite (`/Users/isaiahdupree/Documents/Software/metricslite/`)
- `app/api/scores/route.ts` — scoring engine
- `app/api/winners/route.ts` — winners archive
- `app/api/timing/route.ts` — timing optimization

### actp-worker (`/Users/isaiahdupree/Documents/Software/actp-worker/`)
- `workflow_task_poller.py` — publish_content unification
- `service_registry.py` — new topics for pipeline orchestration

## Supabase Tables Needed

- `actp_published_content` — rendered content + platform descriptions + publish results
- `actp_content_scores` — per-post engagement scores over time
- `actp_content_winners` — graduated winners archive

## Dependencies

- Anthropic API key for ContentLite cloud calls
- Remotion installed on local machine
- Safari Automation running (12 microservices)
- Blotato API key configured
- Workflow Engine deployed and running
