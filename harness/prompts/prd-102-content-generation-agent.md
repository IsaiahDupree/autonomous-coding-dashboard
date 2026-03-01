# PRD-102: Content Generation Agent

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **Feature List**: /Users/isaiahdupree/Documents/Software/actp-worker/prd-102-features.json
- **Priority**: P0 (CRITICAL — drives 1M followers + 100K views goal)

## Context

The Content Generation Agent is a specialized autonomous agent responsible for the full content production pipeline: research → batch generate → quality gate → platform adapt → publish → track → optimize. It must produce 2–3 posts per day per platform (TikTok, Instagram, YouTube, Twitter/X, Threads) with ≥100K average views and drive toward 1M followers per platform.

Key constraints:
- Batch generate ≥10 pieces per AI call (cost efficiency, $400/month AI ceiling)
- Every piece passes HookLite rubric gate (top 5% hook score required)
- Feedback loop: viral/strong/average/weak/flop classification at 1hr/4hr/24hr
- Winners get re-run with variation; losers are killed immediately
- Remotion renderer integration for short-form video production
- Thompson Sampling for optimal posting time selection

## Architecture

```
ContentGenerationAgent (content_generation_agent.py)
      ├── TrendResearcher     — scrapes top-performing content per niche
      ├── BatchGenerator      — generates 10+ pieces per Claude call
      ├── HookGate            — enforces top-5% hook score before publish
      ├── PlatformAdapter     — adapts content per platform (aspect ratio, caption, hashtags)
      ├── PublishRouter       — routes to Blotato/MPLite/Safari automation
      └── ViralFeedbackLoop   — classifies, learns, re-runs winners
```

## Task

### Core Module: `content_generation_agent.py`
1. `ContentGenerationAgent.__init__()` — init with niche configs, platform targets, API clients
2. `ContentGenerationAgent.run_cycle()` — full research→generate→gate→publish→track cycle
3. `ContentGenerationAgent.run_as_daemon()` — asyncio loop, runs cycles on schedule
4. `ContentGenerationAgent.get_status()` — returns posts today, views today, follower delta

### Trend Researcher
5. `TrendResearcher.get_top_niches()` — query actp_content_performance for top niches by views
6. `TrendResearcher.scrape_platform_trends(platform, niche)` — call market research API
7. `TrendResearcher.extract_winning_hooks(posts)` — pull top hooks from viral posts
8. `TrendResearcher.build_research_brief(niche)` — compile trend data into content brief
9. `TrendResearcher.get_competitor_formats(niche)` — identify format patterns (list, story, hook)
10. `TrendResearcher.cache_results(niche, data)` — cache to Supabase, TTL 4 hours

### Batch Generator
11. `BatchGenerator.generate_batch(brief, count=10)` — single Claude call → 10+ content pieces
12. `BatchGenerator.build_batch_prompt(brief, count)` — prompt engineered for batch output
13. `BatchGenerator.parse_batch_response(raw)` — extract N pieces from Claude JSON response
14. `BatchGenerator.generate_video_scripts(brief, count=10)` — batch video scripts
15. `BatchGenerator.generate_captions(scripts, platform)` — platform-adapted captions batch
16. `BatchGenerator.generate_hooks_only(niche, count=20)` — cheap hook generation for A/B testing
17. `BatchGenerator.estimate_cost(count, model)` — compute estimated token cost before calling

### Hook Gate (Quality Filter)
18. `HookGate.score_hook(hook_text)` — LLM-as-judge: rate hook on 10 criteria (0–100)
19. `HookGate.score_batch(pieces)` — score all pieces in one LLM call
20. `HookGate.passes_threshold(score)` — True if score ≥ 85 (top 5%)
21. `HookGate.filter_batch(pieces)` — return only pieces that pass threshold
22. `HookGate.get_rejection_reason(piece)` — explain why piece failed gate
23. `HookGate.iterate_until_pass(brief, max_attempts=3)` — regenerate until ≥1 piece passes

### Platform Adapter
24. `PlatformAdapter.adapt_for_tiktok(piece)` — max 4000 chars, trending sounds note, vertical video
25. `PlatformAdapter.adapt_for_instagram(piece)` — reel format, 2200 char caption, 30 hashtags
26. `PlatformAdapter.adapt_for_youtube(piece)` — title ≤100 chars, description 1000+, tags
27. `PlatformAdapter.adapt_for_twitter(piece)` — ≤280 chars, thread option for long-form
28. `PlatformAdapter.adapt_for_threads(piece)` — ≤500 chars, no hashtags
29. `PlatformAdapter.adapt_all(piece)` — return dict with all 5 platform variants
30. `PlatformAdapter.get_optimal_post_time(platform)` — query Thompson Sampling bandit

### Publish Router
31. `PublishRouter.route(platform_piece)` — select Blotato / MPLite / Safari based on platform + config
32. `PublishRouter.publish_to_blotato(piece, platform, account_id)` — direct Blotato API publish
33. `PublishRouter.enqueue_mplite(piece, platform)` — add to MPLite queue for local machine
34. `PublishRouter.publish_via_safari(piece, platform)` — Safari automation for Twitter/Threads
35. `PublishRouter.schedule_multi_platform(pieces)` — schedule all 5 platforms for a piece
36. `PublishRouter.register_post_for_tracking(post_id, platform, piece)` — store in feedback tables

### Viral Feedback Loop
37. `ViralFeedbackLoop.run_checkbacks()` — check 1hr/4hr/24hr metrics for all tracked posts
38. `ViralFeedbackLoop.classify_post(post_id)` — viral(>100K)/strong(>10K)/average/weak/flop(<1K)
39. `ViralFeedbackLoop.extract_winning_patterns(viral_posts)` — hooks, topics, formats, lengths
40. `ViralFeedbackLoop.kill_flops(flop_post_ids)` — mark as do-not-reuse, update strategy
41. `ViralFeedbackLoop.rerun_winner(post_id, variation_count=3)` — generate 3 variants of viral piece
42. `ViralFeedbackLoop.update_niche_strategy(niche, patterns)` — persist winning patterns to Supabase
43. `ViralFeedbackLoop.generate_optimized_prompt(niche)` — build next-gen prompt from winners

### Follower Growth Tracker
44. `FollowerTracker.get_current_followers(platform)` — query latest from actp_platform_metrics
45. `FollowerTracker.compute_daily_delta(platform)` — followers gained today
46. `FollowerTracker.project_days_to_goal(platform, target=1_000_000)` — ETA to 1M followers
47. `FollowerTracker.alert_if_declining(platform)` — notify orchestrator if followers drop

### Health Server Routes
48. `GET /api/content-agent/status` — posts today, views today, avg hook score
49. `GET /api/content-agent/followers` — current followers per platform + ETA to 1M
50. `POST /api/content-agent/generate` — trigger manual content generation cycle

## Key Files
- `content_generation_agent.py` (new)
- `batch_generator.py` (new — extracted for reuse)
- `hook_gate.py` (new — quality filter)
- `viral_feedback_loop.py` (new — extends universal_feedback_engine.py)
- `health_server.py` (add routes)

## Testing
```bash
python3 -m pytest tests/test_content_generation_agent.py -v
python3 content_generation_agent.py --run-cycle --niche solopreneur
python3 content_generation_agent.py --status
```
