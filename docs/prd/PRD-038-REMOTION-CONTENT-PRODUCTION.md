# PRD-038: Remotion Content Production Pipeline

**Status:** Ready for ACD  
**Priority:** P2  
**Author:** Isaiah Dupree  
**Created:** 2026-03-01  
**Depends on:** Remotion MCP (localhost:3100), `actp_niche_resonance`, `actp_gen_jobs`, `actp_remotion_templates`, Anthropic Claude API, MediaPoster/Blotato  
**Module:** `remotion_content_producer.py`  
**Agent CLAUDE.md:** `actp-worker/.claude/agents/remotion/CLAUDE.md`

---

## Overview

The Remotion Content Production Pipeline closes the loop between research intelligence (what niches perform best) and actual content output (video produced and distributed). It reads the niche resonance matrix to identify the highest-ROI content opportunity, generates a Claude-crafted content brief (hook, script, overlays, CTA, hashtags), queues a Remotion render job, monitors render completion, and then distributes the finished video to the appropriate platforms via MediaPoster/Blotato.

This pipeline converts "we know ai_automation educational content on TikTok performs best" into a publishable video in one automated run.

---

## Goals

1. Read `actp_niche_resonance` to find the best niche × content_type × platform opportunity
2. Generate a complete content brief using Claude (hook, 3-act script, visual overlays, CTA, hashtags)
3. Queue a Remotion render job in `actp_gen_jobs`
4. Poll job status every 5 minutes; on completion, trigger multi-platform distribution
5. Distribute via Blotato `blotato_multi_publish` workflow task
6. Log all jobs to `actp_agent_tasks` with domain=remotion
7. Telegram alert on render complete + distribution queued

---

## Pipeline Flow

```
pick_best_opportunity(platform)
    │  Reads: actp_niche_resonance
    │  Filters: sample_count >= 3, last_updated within 30 days
    │  Ranks: avg_views × avg_engagement × recency_weight
    │  Returns: {niche, content_type, platform, avg_views, top_hook_patterns}
    │
    ▼
generate_content_brief(niche, content_type, platform)
    │  Claude prompt: craft hook from top_hook_patterns,
    │                 write 3-act 60-sec script, visual overlays,
    │                 platform CTA, hashtags
    │  Returns: ContentBrief{hook, script, overlays, cta, hashtags, duration}
    │
    ▼
queue_render_job(brief, platform)
    │  INSERT actp_gen_jobs:
    │    model='remotion', executor='template_selector',
    │    brief=jsonb, status='queued', platform=platform
    │  Returns: job_id
    │
    ▼
[Remotion MCP renders job]  ← polled every 5min by remotion_job_poll cron
    │  GET http://localhost:3100/api/jobs/{job_id}
    │  status: queued → rendering → complete | failed
    │
    ▼
distribute_to_platforms(job_id)
    │  Read actp_gen_jobs.output_url (rendered video URL)
    │  Queue workflow task: blotato_multi_publish
    │    platforms: [tiktok, instagram, twitter, threads]
    │    account_ids: {tiktok: 710, instagram: 807, twitter: 4151, threads: 173}
    │  UPDATE actp_gen_jobs.status = 'distributing'
    │
    ▼
Telegram: "🎬 Remotion render complete | ai_automation × TikTok
           Hook: 'This AI automation saves 40hrs/week'
           Distributing to 4 platforms via Blotato"
```

---

## Remotion MCP Integration

**Service URL:** `http://localhost:3100`

```
GET  /api/health                    → { "status": "ok" }
POST /api/render                    → { "jobId": "..." }
GET  /api/jobs/{jobId}              → { "status": "rendering|complete|failed", "outputUrl": "..." }
GET  /api/templates                 → list available Remotion templates
POST /api/templates/select          → select best template for format/duration
```

**Remotion Project Path:** `/Users/isaiahdupree/Documents/Software/remotion/`

---

## Content Brief Format

```python
@dataclass
class ContentBrief:
    niche:          str           # "ai_automation"
    content_type:   str           # "educational"
    platform:       str           # "tiktok"
    duration_secs:  int           # 60
    hook:           str           # "This AI workflow saves 40 hours every week"
    script:         list[str]     # ["Act 1: ...", "Act 2: ...", "Act 3: ..."]
    overlays:       list[str]     # ["Text: The Problem", "B-roll: screen recording"]
    cta:            str           # "Follow for more automation tips"
    hashtags:       list[str]     # ["#aiautomation", "#claudeai", "#workflow"]
    offer_tag:      str           # "safari_automation"
    generated_by:   str           # "claude" | "template"
```

---

## Claude Content Brief Prompt

```python
BRIEF_PROMPT = """
You are a viral short-form video content strategist for Isaiah Dupree, an AI automation expert.

Niche: {niche}
Content type: {content_type}
Platform: {platform} (target duration: {duration}s)
Top performing hooks from past content: {top_hooks}
Offer to promote (subtly): {offer}
Target audience: solopreneurs, agency owners, developers

Generate a complete content brief:
1. HOOK (first 3 seconds — must match or improve on top_hooks style)
2. ACT 1 (problem/tension, 10s)
3. ACT 2 (solution reveal, 30s)
4. ACT 3 (result/CTA, 10s)
5. VISUAL OVERLAYS (3-4 text overlays with timing)
6. CTA (platform-appropriate call to action)
7. HASHTAGS (8-10 hashtags for {platform})

Return as JSON matching the ContentBrief schema.
"""
```

---

## Distribution Platform Mapping

| Platform | Blotato Account ID | Formats |
|----------|-------------------|---------|
| TikTok | 710 | vertical video, 15–60s |
| Instagram | 807 | Reels, 15–60s |
| Twitter | 4151 | up to 2:20 video |
| Threads | 173 | video post |
| YouTube | 228 | Shorts ≤ 60s |

---

## Data Model

### `actp_gen_jobs`
```sql
-- EXISTING TABLE
id           uuid PRIMARY KEY
model        text DEFAULT 'remotion'
executor     text   -- template name used
brief        jsonb  -- ContentBrief as JSON
status       text   -- 'queued'|'rendering'|'complete'|'failed'|'distributing'|'distributed'
output_url   text   -- rendered video URL
platform     text   -- primary platform
error        text
created_at   timestamptz
updated_at   timestamptz
```

---

## CLI Interface

```bash
python3 remotion_content_producer.py --pipeline --platform tiktok --niche ai_automation
python3 remotion_content_producer.py --brief --niche content_creation --platform instagram
python3 remotion_content_producer.py --queue                  # List pending render jobs
python3 remotion_content_producer.py --status                 # All job statuses
python3 remotion_content_producer.py --distribute JOB_ID      # Trigger distribution
```

Via dispatch:
```bash
python3 multi_agent_dispatch.py --domain remotion --task pipeline --params '{"platform":"tiktok"}'
python3 multi_agent_dispatch.py --domain remotion --task check-jobs
python3 multi_agent_dispatch.py --domain remotion --task distribute --params '{"job_id":"uuid"}'
```

---

## Cron Schedule

```python
{
    "name": "remotion_content_pipeline",
    "cron": "0 6 * * 2,4",   # Tuesday + Thursday 6AM
    "module": "remotion_content_producer",
    "function": "run_pipeline",
},
{
    "name": "remotion_job_poll",
    "cron": "*/5 * * * *",    # Every 5min — poll render status
    "module": "remotion_content_producer",
    "function": "poll_and_distribute",
},
```

---

## Real Data Results

- **1 job queued:** ai_automation × tiktok  
- **Hook generated:** "Nobody talks about this ai automation shortcut"  
- **Status:** queued (Remotion MCP offline during test)

---

## Acceptance Criteria

- [ ] `--pipeline` reads real `actp_niche_resonance` data to select opportunity
- [ ] Claude generates a valid `ContentBrief` JSON matching the schema
- [ ] Job inserted into `actp_gen_jobs` with status=queued
- [ ] Poll detects completed job and triggers `distribute_to_platforms()`
- [ ] Distribution queues workflow task for each target platform with correct account IDs
- [ ] Telegram alert fires on render complete with hook + platforms
- [ ] `actp_agent_tasks` logged with domain=remotion on every run
- [ ] Graceful handling when Remotion MCP is offline (status=pending, retry next poll)

---

## ACD Enhancement Tasks

| ID | Task | Priority |
|----|------|----------|
| REMO-001 | Template auto-selection: pick Remotion template based on content_type + duration | P1 |
| REMO-002 | B-roll suggestion: Claude suggests screen recordings or stock footage keywords | P2 |
| REMO-003 | Caption generation: auto-generate SRT captions from script | P2 |
| REMO-004 | Render retry: auto-retry failed jobs up to 3 times | P1 |
| REMO-005 | A/B video test: render 2 hooks for same niche, A/B test via ab_post_tester | P2 |
| REMO-006 | YouTube Shorts variant: auto-generate 60s version alongside full video | P2 |
| REMO-007 | Performance tracking: register distributed video in `actp_content_performance` for resonance feedback | P1 |
