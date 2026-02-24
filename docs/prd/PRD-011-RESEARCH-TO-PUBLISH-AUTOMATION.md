# PRD-011: Research-to-Publish Automation Pipeline

## Priority: P0 (CRITICAL — the revenue-generating loop)
## Target: actp-worker, Safari Automation, ContentLite, Workflow Engine
## Status: PLANNED

---

## Problem Statement

The autonomous revenue strategy requires a **daily content engine** that researches trending content, generates optimized posts, publishes across platforms, and tracks performance — all without human intervention. The pieces exist individually (Safari scrapes, Claude generates, Blotato publishes, feedback tracks) but **they are not wired together as an automated pipeline**.

### What We Learned from Research

**From YouTube transcripts (Cole Medin — Agent Harnesses):**
- Long-running agents need **session management** — priming, checkpoints, handoff
- File system as memory (progress.txt, feature_list.json) keeps agents on track
- Regression testing before new work prevents breaking existing functionality
- The harness pattern: initialize → select task → execute → validate → offload

**From Closed-Loop Growth System doc:**
- 17 capabilities needed; ~40% exist today
- Critical gaps: blueprint-driven generation, content scoring, winner graduation
- Thompson Sampling for timing optimization (bandit algorithm)

**From Autonomous Revenue Strategy:**
- 121 ACTP topics already exist and are callable
- Daily routine: 6AM heartbeat → research → generate → publish → track → optimize
- Target: <$400/month AI costs for $5K+ revenue

**From Twitter Feedback Engine (already built):**
- Checkbacks at 1hr/4hr/24hr work
- Classification (viral→flop) works
- Strategy generation from data works
- 5 niches configured: ai_automation, saas_growth, content_creation, digital_marketing, creator_economy

## Requirements

### R1: Research Pipeline (MUST HAVE — Safari Automation)
- Trigger research across 5 platforms: Twitter, Threads, Instagram, TikTok, Facebook
- Per-niche: scrape 1000 posts, 100 creators
- Store in `actp_platform_research` and `actp_platform_creators`
- Extract creative blueprints: hook type, format, topic, length, CTA pattern
- Crons: weekly per-platform research runs (already configured)

### R2: Content Generation Pipeline (MUST HAVE)
- Input: research data + niche strategy + performance feedback
- Output: 10 optimized tweets/posts per niche per day
- Use Claude Haiku for generation (cheap, fast)
- Blueprint-aware: match format/hook/length of top performers
- Store generated content in `actp_twitter_queue` (status: draft → reviewed → scheduled → published)

### R3: AI Content Review Gate (MUST HAVE)
- 7-dimension rubric: hook strength, relevance, clarity, CTA, originality, platform-fit, compliance
- Weighted scoring (0-10 per dimension, weighted average)
- Auto-approve if score ≥7.0, auto-reject if ≤4.0, manual review if between
- Store reviews in `actp_content_reviews`

### R4: Multi-Platform Publishing (MUST HAVE)
- Twitter: Safari Automation (osascript typing into browser)
- TikTok/Instagram/YouTube/Threads: Blotato API
- Facebook: Blotato API with pageId
- Scheduled posting with Thompson Sampling optimal times
- Rate limits respected per platform
- All publishes auto-registered in feedback loop

### R5: Performance Tracking & Feedback (MUST HAVE)
- Auto-register every publish in `actp_twitter_feedback`
- Checkbacks via Safari Automation at 1hr, 4hr, 24hr
- Classify: viral (top 5%), strong (top 20%), average, weak, flop
- Extract winning patterns: best hooks, topics, formats, posting times
- Update niche strategy in `actp_twitter_strategy`
- Feed performance data back into next generation cycle

### R6: Living Playbook (SHOULD HAVE)
- Per-niche strategy document updated weekly
- Top 10 hooks that worked, top 5 topics, optimal posting schedule
- Stored in `actp_twitter_playbook`
- Claude generates updated playbook from latest data

### R7: Daily Automation Cron (MUST HAVE)
```
06:00  system.heartbeat           → verify all services
06:05  research.twitter           → scan overnight trends (5 niches)
06:10  twitter.strategy           → update strategies from latest data
06:30  twitter.generate           → batch 10 posts × 5 niches = 50 posts
06:35  content.review             → AI review gate (auto-approve ≥7.0)
07:00  publish.schedule           → schedule approved posts across day
08:00  linkedin.prospect          → morning prospecting
09:00  dm.process_outreach        → outreach queue
12:00  feedback.checkbacks        → midday metrics
15:00  twitter.generate           → afternoon batch
18:00  metrics.winners            → identify day's winners
18:30  feedback.analysis          → AI analysis
19:00  memory.write_daily         → daily learnings to Obsidian
19:30  feedback.generate_prompt   → optimize tomorrow's prompts
```

## Implementation Plan

### Phase 1: Wire Research → Generation (Week 1)
1. Create `trigger_daily_content_generation()` in `workflow_task_poller.py`
2. Pull latest research + strategy for each niche from Supabase
3. Call Claude Haiku to generate 10 tweets per niche
4. Store in `actp_twitter_queue` with status=draft
5. Run AI review gate, auto-approve score ≥7.0

### Phase 2: Wire Generation → Publishing (Week 1)
1. Create `trigger_scheduled_publishing()` in `workflow_task_poller.py`
2. Pull approved content from `actp_twitter_queue` (status=reviewed, score≥7.0)
3. Schedule across day using Thompson Sampling time slots
4. Execute publish: Twitter→Safari, others→Blotato
5. Update status to published, store post URL/ID

### Phase 3: Wire Publishing → Feedback (Week 2)
1. Auto-register each publish in `actp_twitter_feedback`
2. Verify Safari Automation checkbacks fire at 1hr/4hr/24hr
3. Verify classification runs after 24hr checkback
4. Verify strategy updates after classification

### Phase 4: Wire Feedback → Next Generation (Week 2)
1. `twitter.generate_prompt` uses latest strategy + winning patterns
2. Next day's generation uses updated prompts
3. Track improvement: engagement rate trend over 7/14/30 days
4. Alert via Telegram if engagement drops >20%

### Phase 5: Enable Daily Cron (Week 3)
1. Add all crons to `cron_definitions.py`
2. Enable one niche first (ai_automation) as pilot
3. Monitor for 3 days, fix any issues
4. Enable remaining 4 niches
5. Track cost per day (target: <$15/day)

## Success Criteria

| Metric | Target |
|--------|--------|
| Posts generated per day | 50 (10 × 5 niches) |
| Posts passing review | ≥70% (35/50) |
| Posts published per day | ≥30 |
| Platforms covered | ≥3 (Twitter, TikTok, Instagram) |
| Feedback loop completes | 100% of publishes tracked |
| AI cost per day | <$15 |
| Engagement trend | Improving week-over-week |
| Fully autonomous days | 7+ without intervention |

## Files to Modify

### actp-worker
- `workflow_task_poller.py` — new trigger functions for daily pipeline
- `cron_definitions.py` — daily content automation crons
- `twitter_feedback_engine.py` — verify checkback → classify → strategy chain
- `service_registry.py` — new orchestration topics

### Supabase (project: ivhfuhxorppptyuofbgq)
- Verify tables: `actp_twitter_queue`, `actp_content_reviews`, `actp_twitter_playbook`
- Add indexes for queue polling performance
