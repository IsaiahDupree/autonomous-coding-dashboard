# PRD-105: Remotion Renderer Auto-Start & Volume Engine

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **Feature List**: /Users/isaiahdupree/Documents/Software/actp-worker/prd-105-features.json
- **Priority**: P0 (CRITICAL — zero videos = zero views = zero growth)

## Context

The Remotion renderer at localhost:3100 is the bottleneck for the entire content pipeline. There are 11 pending jobs in `actp_gen_jobs` (solopreneur/youtube ×2, solopreneur/threads, content_creation/youtube, content_creation/tiktok, content_creation/threads ×5, email_marketing/youtube, ai_automation/tiktok) that cannot render because the renderer is not running.

Beyond fixing the immediate jam, the Volume Engine must ensure:
- 2–3 videos/day per platform = 10–15 total videos/day output
- Renderer auto-starts on boot and self-heals if it crashes
- Job queue is continuously filled from research → generate → render pipeline
- Rendered videos are immediately handed off to publish pipeline

## Architecture

```
RendererVolumeEngine (renderer_volume_engine.py)
      ├── RendererHealthCheck   — monitor localhost:3100, auto-restart
      ├── JobQueueFiller        — ensure N jobs always queued
      ├── RenderDispatcher      — claim jobs, dispatch to renderer
      ├── OutputHandler         — move rendered files to publish pipeline
      └── VolumeTracker         — track renders/day, alert if < target
```

## Task

### Renderer Health & Auto-Start
1. `RendererHealthCheck.is_running()` — HTTP GET localhost:3100/health, return bool
2. `RendererHealthCheck.start_renderer()` — subprocess launch `npx remotion render` or equivalent daemon command
3. `RendererHealthCheck.stop_renderer()` — graceful shutdown of renderer process
4. `RendererHealthCheck.restart_renderer()` — stop + start with 5s delay
5. `RendererHealthCheck.watch_loop(interval=30)` — asyncio loop: check every 30s, restart if down
6. `RendererHealthCheck.get_renderer_pid()` — return PID of running renderer process
7. `RendererHealthCheck.register_in_agent_spawner()` — register renderer as a managed agent in actp_agent_registry

### Job Queue Management
8. `JobQueueFiller.count_pending_jobs()` — query actp_gen_jobs WHERE status='pending'
9. `JobQueueFiller.get_pending_jobs()` — list all pending jobs with niche, platform, template
10. `JobQueueFiller.fill_queue(target_count=15)` — if pending < target, generate new jobs from top niches
11. `JobQueueFiller.create_job(niche, platform, template_id)` — insert into actp_gen_jobs
12. `JobQueueFiller.prioritize_jobs()` — sort by niche performance score × platform engagement
13. `JobQueueFiller.flush_stale_jobs(max_age_hours=24)` — remove jobs stuck in 'processing' > 24h

### Render Dispatcher
14. `RenderDispatcher.claim_next_job()` — atomic claim: UPDATE actp_gen_jobs SET status='processing' WHERE status='pending' LIMIT 1
15. `RenderDispatcher.dispatch_to_renderer(job)` — POST to localhost:3100/render with job params
16. `RenderDispatcher.poll_render_status(job_id)` — GET localhost:3100/status/:job_id
17. `RenderDispatcher.handle_render_complete(job_id, output_path)` — mark complete, hand off to output handler
18. `RenderDispatcher.handle_render_failed(job_id, error)` — mark failed, increment retry count, re-queue if < 3 retries
19. `RenderDispatcher.run_dispatch_loop()` — asyncio loop: claim → dispatch → poll → complete

### Output Handler
20. `OutputHandler.move_to_publish_queue(output_path, job)` — enqueue rendered video in MPLite queue
21. `OutputHandler.extract_thumbnail(video_path)` — ffmpeg extract frame at 1s as thumbnail
22. `OutputHandler.build_publish_payload(job, output_path, thumbnail)` — assemble platform-ready publish object
23. `OutputHandler.notify_content_agent(job_id)` — trigger content agent to apply hook + adapt for all platforms
24. `OutputHandler.archive_render(output_path, job_id)` — move to /renders/archive/ after publish

### Volume Tracker
25. `VolumeTracker.count_renders_today()` — query actp_gen_jobs WHERE status='complete' AND completed_at >= today
26. `VolumeTracker.count_by_platform(date)` — renders grouped by platform for given date
27. `VolumeTracker.get_daily_velocity()` — 7-day rolling avg renders/day
28. `VolumeTracker.is_on_pace(target_per_day=10)` — bool: today's renders >= target
29. `VolumeTracker.alert_if_behind(target_per_day=10)` — notify orchestrator if pace < target

### Render the 11 Pending Jobs Immediately
30. `flush_pending_jobs()` — one-shot function: start renderer if not running, then dispatch all 11 current pending jobs in actp_gen_jobs
31. Verify actp_gen_jobs has: solopreneur/youtube ×2, solopreneur/threads, content_creation/youtube, content_creation/tiktok, content_creation/threads ×5, email_marketing/youtube, ai_automation/tiktok

### Supabase
32. Add `retry_count` column to actp_gen_jobs if not present
33. Add `completed_at` column to actp_gen_jobs if not present
34. Add `output_path` column to actp_gen_jobs if not present
35. `get_job_stats()` — summary query: total/pending/processing/complete/failed counts

### Health Server Routes
36. `GET /api/renderer/status` — renderer running, jobs pending/processing/complete today
37. `POST /api/renderer/start` — manually start renderer
38. `POST /api/renderer/flush` — dispatch all pending jobs immediately
39. `GET /api/renderer/volume` — renders/day trend, on-pace status

### Tests
40. `test_renderer_health_check_detects_down()` — mock down renderer, verify is_running=False
41. `test_job_queue_filler_creates_jobs()` — verify fill_queue creates rows in actp_gen_jobs
42. `test_dispatch_claims_atomically()` — two concurrent claims only get 1 job each
43. `test_volume_tracker_pace()` — mock 5 renders, target 10, verify is_on_pace=False
44. `test_flush_pending_jobs_dispatches_all()` — mock 11 pending, verify all dispatched

## Key Files
- `renderer_volume_engine.py` (new)
- `worker.py` (boot renderer watch loop + dispatch loop)
- `health_server.py` (add /api/renderer routes)

## Testing
```bash
python3 renderer_volume_engine.py --flush-pending
python3 renderer_volume_engine.py --status
python3 -m pytest tests/test_renderer_volume_engine.py -v
```
