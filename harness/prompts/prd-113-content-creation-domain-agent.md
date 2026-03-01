# PRD-113: Content Creation Domain Agent (Native Tool Calling)

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **Feature List**: /Users/isaiahdupree/Documents/Software/actp-worker/prd-113-features.json
- **Depends On**: PRD-111 (NativeToolAgent base), PRD-105 (renderer), PRD-106 (hook gate), PRD-107 (adaptation)
- **Priority**: P0 — zero videos = zero views, this agent drives the entire content pipeline

## Context

This agent is the **viral content specialist** for EverReach OS. It extends `NativeToolAgent` and owns the full pipeline: research → batch generate → gate → render → adapt → publish. Claude decides autonomously when to research, generate a batch, score hooks, trigger renders, and kick off cross-platform adaptation. The constraint: **batch 10+ pieces per AI call, cap AI cost at $400/month**.

Key facts about current state:
- 11 Remotion jobs stuck pending (solopreneur/youtube ×2, content_creation ×5, email_marketing, ai_automation)
- Top niche: solopreneur × 26.3M views
- HookLite gate: score >= 85 required (top 5% = top 5 percentile of 0-100 scale)
- Renderer: localhost:3100 (auto-start via PRD-105 RendererHealthCheck)
- GenLite: https://actp-genlite-bj9s9aswy-isaiahduprees-projects.vercel.app

## Domain System Prompt

```
You are a viral content creation specialist for EverReach OS. Your goal is to:
1. Research trending niches (solopreneur, content_creation, ai_automation)
2. Generate batches of 10+ video scripts per AI call (never 1 at a time)
3. Gate every script through HookLite — only publish if score >= 85
4. Trigger Remotion renders for all passing scripts
5. After render, trigger cross-platform adaptation (9:16/1:1/16:9 + 5 platform captions)
6. After adaptation, trigger thumbnail generation
7. Publish to all 5 platforms via MPLite queue
8. Track performance and classify every post (viral/strong/average/weak/flop)

Niche priority (by total views): solopreneur > content_creation > email_marketing > ai_automation
Format priority: youtube_shorts > tiktok > instagram_reels > threads > twitter

Quality rules:
- NEVER publish with hook score < 85
- Always regenerate up to 3x if score fails
- Viral threshold: 100K views in 24h
- Batch size minimum: 10 scripts per generation call
- AI cost cap: use claude-haiku-4-5 for generation, opus only for analysis

Remotion renderer: http://localhost:3100
HookLite: https://hooklite-hrvcbd155-isaiahduprees-projects.vercel.app
ContentLite: https://contentlite-bf8rwf8z6-isaiahduprees-projects.vercel.app
MPLite: https://mediaposter-lite-isaiahduprees-projects.vercel.app
GenLite: https://actp-genlite-bj9s9aswy-isaiahduprees-projects.vercel.app
```

## Architecture

```
ContentCreationDomainAgent (content_agent.py)
    extends NativeToolAgent (PRD-111)
    tools (22):
        ├── research_top_niches       — actp_content_performance DB query
        ├── get_niche_blueprints      — researchlite /api/blueprints
        ├── generate_batch_scripts    — ContentLite /api/generate/from-blueprint (10+ per call)
        ├── score_hook                — HookLite /api/review (single)
        ├── score_hooks_batch         — HookLite (batch all scripts in one call)
        ├── regenerate_script         — ContentLite with improvement prompt (max 3x)
        ├── check_renderer_health     — GET localhost:3100/health
        ├── start_renderer            — subprocess: launch Remotion dev server
        ├── trigger_render            — POST GenLite /api/render with script + template
        ├── get_render_status         — GET actp_gen_jobs WHERE id=X
        ├── get_pending_renders       — SELECT actp_gen_jobs WHERE status='pending'
        ├── flush_stuck_renders       — bulk re-queue the 11 stuck jobs
        ├── trigger_adaptation        — call VideoTranscoder.transcode_all() via PRD-107
        ├── trigger_thumbnail         — call ThumbnailGenerator.generate() via PRD-108
        ├── enqueue_to_mplite         — POST MPLite /api/queue with adapted payload
        ├── get_publish_status        — GET MPLite /api/queue/stats
        ├── get_post_performance      — SELECT actp_post_checkbacks for recent posts
        ├── classify_post             — classify viral/strong/average/weak/flop
        ├── save_viral_template       — store high-scoring hook as template in actp_viral_templates
        ├── get_viral_templates       — fetch top performing templates for reuse
        ├── get_daily_volume_status   — check actp_volume_tracker: rendered_today vs 10/day target
        └── get_gate_pass_rate        — query actp_gate_stats: today's pass rate
```

## Task

### Tool Implementations
1. `tool_research_top_niches(platform=None, days=7)` — SELECT niche, avg(views), count(*) FROM actp_content_performance GROUP BY niche ORDER BY avg(views) DESC LIMIT 10
2. `tool_get_niche_blueprints(niche)` — GET ContentLite /api/generate/from-blueprint context for niche
3. `tool_generate_batch_scripts(niche, platform, count=10)` — POST ContentLite /api/generate/from-blueprint with count=10, return scripts array
4. `tool_score_hook(script_text, platform)` — POST HookLite /api/review, return score 0-100 + rejection_reasons
5. `tool_score_hooks_batch(scripts_list, platform)` — batch POST to HookLite, return list of scores
6. `tool_regenerate_script(original_script, rejection_reasons, attempt_num)` — POST ContentLite with fix-focused prompt
7. `tool_check_renderer_health()` — GET localhost:3100/health, return up/down + latency
8. `tool_start_renderer()` — subprocess.Popen to start Remotion dev server if down
9. `tool_trigger_render(job_id, script, template_id, niche, platform)` — POST GenLite /api/render
10. `tool_get_render_status(job_id)` — SELECT status, output_path FROM actp_gen_jobs WHERE id=job_id
11. `tool_get_pending_renders(limit=20)` — SELECT FROM actp_gen_jobs WHERE status='pending' ORDER BY created_at ASC
12. `tool_flush_stuck_renders()` — UPDATE actp_gen_jobs SET status='queued', retry_count=0 WHERE status='pending' AND created_at < now()-1hr — flushes the 11 stuck jobs
13. `tool_trigger_adaptation(job_id, output_path, raw_caption, niche)` — call AdaptedPayloadBuilder.adapt_all()
14. `tool_trigger_thumbnail(job_id, output_path, script)` — call ThumbnailGenerator.generate()
15. `tool_enqueue_to_mplite(platform, video_path, caption, thumbnail_url, metadata)` — POST MPLite /api/queue
16. `tool_get_publish_status()` — GET MPLite /api/queue/stats, return queued/publishing/complete counts
17. `tool_get_post_performance(days=7)` — SELECT from actp_post_checkbacks grouped by classification
18. `tool_classify_post(views_24hr)` — return viral>100K / strong>10K / average>1K / weak>100 / flop else
19. `tool_save_viral_template(hook_text, niche, platform, hook_score)` — INSERT into actp_viral_templates
20. `tool_get_viral_templates(niche, limit=5)` — SELECT top performing hooks as starting point
21. `tool_get_daily_volume_status()` — SELECT rendered_today, target FROM actp_volume_tracker WHERE date=today
22. `tool_get_gate_pass_rate()` — SELECT passed, total FROM actp_gate_stats WHERE date=today

### Agent Orchestration
23. `ContentCreationDomainAgent.__init__()` — super().__init__() + register all 22 tools
24. `ContentCreationDomainAgent.get_system_prompt()` — return domain system prompt with all URLs + rules
25. `ContentCreationDomainAgent.run_daily_pipeline(niche=None)` — preset goal: "Generate 10 scripts for top niche, gate, render, adapt, publish all 5 platforms"
26. `ContentCreationDomainAgent.flush_and_publish_pending()` — preset goal: "Flush 11 stuck renders, adapt, and publish each one"
27. `ContentCreationDomainAgent.run_viral_analysis()` — preset goal: "Analyze last 30 posts, save top 5 as viral templates"

### Self-Healing
28. If renderer is down: Claude calls `start_renderer()` tool, waits 10s, retries
29. If HookLite unreachable: agent pauses generation, reports service error, tries again in 5min
30. If all 10 scripts score < 85: Claude calls `save_viral_templates()` for context, tries new niche
31. Circuit breaker: if 3 consecutive render failures → set actp_gen_jobs to 'error', report to orchestrator

### Cron Integration
32. APScheduler: `run_daily_pipeline()` daily at 06:00 (fires as part of morning routine)
33. APScheduler: `flush_and_publish_pending()` every 2hr (catches any stuck jobs)
34. APScheduler: `run_viral_analysis()` weekly Sunday 21:00

### Supabase Tables
35. Migration: `actp_viral_templates` — id, hook_text, niche, platform, hook_score, views_24hr, created_at
36. `save_batch_run(agent_run_id, niche, scripts_generated, scripts_passed, renders_triggered)` — insert batch stats

### Health Routes
37. `GET /api/agents/content/status` — agent health, renderer status, daily volume, gate pass rate
38. `GET /api/agents/content/pipeline` — current pipeline state: pending renders, queued in MPLite
39. `POST /api/agents/content/flush` — manually trigger flush_and_publish_pending

### Tests
40. `test_generate_batch_returns_10()` — mock ContentLite, verify count=10 in request
41. `test_gate_blocks_low_score()` — mock HookLite score=70, verify script NOT enqueued
42. `test_flush_stuck_renders_updates_11_rows()` — seed 11 stuck jobs, verify all set to queued
43. `test_renderer_auto_restart()` — mock health check down, verify start_renderer called
44. `test_viral_template_saved_on_100k_views()` — seed 100K views post, verify template saved
45. `test_daily_pipeline_full_flow()` — mock all tools, verify research→gate→render→adapt→enqueue sequence

## Key Files
- `content_agent.py` (new)
- `native_tool_agent.py` (from PRD-111)
- `worker.py` — start ContentCreationDomainAgent daemon

## Environment Variables
- `ENABLE_CONTENT_AGENT=true`
- `REMOTION_URL=http://localhost:3100`
- `HOOKLITE_URL=https://hooklite-hrvcbd155-isaiahduprees-projects.vercel.app`
- `CONTENTLITE_URL=https://contentlite-bf8rwf8z6-isaiahduprees-projects.vercel.app`
- `GENLITE_URL=https://actp-genlite-bj9s9aswy-isaiahduprees-projects.vercel.app`
