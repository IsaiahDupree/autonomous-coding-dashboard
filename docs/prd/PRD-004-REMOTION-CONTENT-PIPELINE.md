# PRD-004: Remotion Content Generation Pipeline

## Status: Draft
## Author: Isaiah Dupree
## Created: 2026-02-22
## Priority: P1 — Core content production step
## Depends On: PRD-001 (Workflow Engine), PRD-002 (Local Agent Daemon v2)

---

## 1. Problem Statement

Content generation is the bridge between research insights and published content. The current system has:

- **GenLite** (cloud) — manages a job queue (`actp_gen_jobs`) for video generation
- **ContentLite** (cloud) — generates text content (scripts, captions, blog posts) from blueprints
- **Remotion** (local) — renders video compositions to MP4
- **actp-worker** — polls `actp_gen_jobs` and runs `npx remotion render`

But these components are **not connected as a pipeline**:

1. ContentLite generates a video script, but nobody automatically feeds it to Remotion
2. GenLite creates a job row, but the props (script, template, visual assets) must be manually assembled
3. Remotion renders a video, but the result isn't automatically uploaded to cloud storage and linked back to the creative
4. There's no template selection logic — which Remotion composition fits this content?
5. No asset pipeline — if the script calls for stock footage or generated images, nobody fetches them

**This PRD defines the end-to-end pipeline**: Cloud generates content spec → assembles Remotion props → dispatches to local → local renders → uploads to cloud storage → links video to creative record.

---

## 2. Solution Overview

A workflow pipeline that:
1. Takes a creative blueprint (from ResearchLite) or direct content request
2. Uses ContentLite + AI to generate a video script with shot-by-shot breakdown
3. Selects the best Remotion composition template for the content
4. Assembles complete Remotion input props (script, visuals, audio, text overlays)
5. Dispatches render task to local worker via `actp_workflow_tasks`
6. Local Remotion renders MP4
7. Uploads finished video to Supabase Storage
8. Links video URL back to the `actp_creatives` record
9. Advances workflow to the next step (AI Review — PRD-005)

---

## 3. Architecture

```
Cloud                                          Local
─────                                          ─────

1. Blueprint arrives (from PRD-003)
     │
2. ContentLite: generate video script
   POST /api/generate/video-script
     │
   Returns: {
     hook, body, cta,
     shot_list, text_overlays,
     suggested_template,
     duration_target
   }
     │
3. Template Selector: pick Remotion composition
     │
4. Asset Assembler: resolve all assets
   - Stock footage URLs
   - Generated images (via AI)
   - Audio/music track
   - Brand assets (logo, colors, fonts)
     │
5. Props Builder: construct Remotion inputProps
     │
6. GenLite: create actp_gen_jobs row
   (status=pending, provider=remotion)
     │
7. Workflow Engine: create task
   (type=remotion_render)                    8. Agent claims task
     │                                            │
     ├──── actp_workflow_tasks ──────────►   9. RemotionRenderExecutor
     │                                            │
     │                                       10. npx remotion render
     │                                           --composition={id}
     │                                           --props={props.json}
     │                                            │
     │                                       11. Upload MP4 to Supabase Storage
     │                                            │
12. Task complete ◄── output_data ──────    12. Return { video_url, file_size, duration }
     │
13. Update actp_creatives.video_url
14. Update actp_gen_jobs.status = succeeded
15. Advance workflow → AI Review (PRD-005)
```

---

## 4. Remotion Template Registry

### Template Catalog

Each Remotion composition is registered in Supabase so the cloud can select templates:

```sql
CREATE TABLE actp_remotion_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  composition_id  TEXT UNIQUE NOT NULL,     -- Remotion composition name
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL,            -- hook_video | tutorial | testimonial | ugc_style | product_demo
  aspect_ratio    TEXT NOT NULL,            -- 9:16 | 16:9 | 1:1
  duration_range  INT4RANGE,               -- e.g. [15,60] seconds
  platforms       TEXT[] NOT NULL,          -- ['tiktok', 'instagram', 'youtube']
  required_props  JSONB NOT NULL,          -- schema of required inputProps
  optional_props  JSONB,
  preview_url     TEXT,                    -- thumbnail/preview of this template
  performance_score FLOAT DEFAULT 0,       -- updated from MetricsLite winner data
  enabled         BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### Example Templates

| composition_id | Category | Aspect | Platforms | Duration |
|---------------|----------|--------|-----------|----------|
| `HookTextVideo` | hook_video | 9:16 | tiktok, instagram, youtube | 15-30s |
| `TutorialSteps` | tutorial | 9:16 | tiktok, instagram | 30-60s |
| `ProductShowcase` | product_demo | 9:16 | tiktok, instagram | 15-45s |
| `UGCStyleReview` | ugc_style | 9:16 | tiktok, instagram | 20-45s |
| `TextOnlyHook` | hook_video | 9:16 | tiktok | 8-15s |
| `SplitScreenCompare` | tutorial | 9:16 | tiktok, instagram | 15-30s |
| `WideProductDemo` | product_demo | 16:9 | youtube | 30-120s |

### Template Selection Algorithm

```python
def select_template(blueprint: dict, platform: str) -> str:
    """Select best Remotion template for content + platform."""

    candidates = query_templates(
        category=blueprint.get("content_category"),
        platform=platform,
        duration_range_contains=blueprint.get("target_duration", 30)
    )

    if not candidates:
        # Fallback to generic hook video
        return "HookTextVideo"

    # Score candidates by:
    # 1. Historical performance score (from MetricsLite winner data)
    # 2. Match between blueprint visual style and template category
    # 3. Duration fit (prefer templates whose sweet spot matches target)
    scored = []
    for t in candidates:
        score = t.performance_score * 0.5
        score += style_match_score(blueprint, t) * 0.3
        score += duration_fit_score(blueprint.get("target_duration"), t.duration_range) * 0.2
        scored.append((score, t))

    scored.sort(reverse=True)
    return scored[0][1].composition_id
```

---

## 5. Props Assembly

### Video Script → Remotion Props

ContentLite generates a structured video script:

```json
{
  "hook": "Stop scrolling if you use AI for content",
  "hook_duration_seconds": 3,
  "body": [
    { "shot": 1, "text": "This tool automates your entire pipeline", "visual": "screen_recording", "duration": 5 },
    { "shot": 2, "text": "Just paste your research and it generates", "visual": "demo_clip", "duration": 5 },
    { "shot": 3, "text": "I generated 50 videos last week", "visual": "results_screenshot", "duration": 4 }
  ],
  "cta": "Link in bio for free trial",
  "cta_duration_seconds": 3,
  "total_duration_seconds": 20,
  "text_overlays": [
    { "text": "AI Content Tool", "position": "top_center", "start": 0, "end": 3 },
    { "text": "50 videos/week", "position": "center", "start": 13, "end": 17 }
  ],
  "suggested_audio": "upbeat_electronic",
  "target_platform": "tiktok"
}
```

The **Props Builder** transforms this into Remotion `inputProps`:

```json
{
  "composition": "HookTextVideo",
  "inputProps": {
    "hookText": "Stop scrolling if you use AI for content",
    "hookDuration": 90,
    "shots": [
      {
        "text": "This tool automates your entire pipeline",
        "mediaUrl": "https://storage.supabase.co/assets/screen-recording-001.mp4",
        "durationInFrames": 150
      }
    ],
    "ctaText": "Link in bio for free trial",
    "ctaDuration": 90,
    "textOverlays": [
      { "text": "AI Content Tool", "x": "center", "y": 100, "startFrame": 0, "endFrame": 90 }
    ],
    "audioTrack": "https://storage.supabase.co/audio/upbeat-electronic.mp3",
    "brandColors": { "primary": "#6366f1", "secondary": "#f59e0b" },
    "logoUrl": "https://storage.supabase.co/brand/logo.png",
    "fps": 30,
    "width": 1080,
    "height": 1920
  }
}
```

### Asset Resolution

The Props Builder resolves abstract asset references to concrete URLs:

| Script Reference | Resolution Method |
|-----------------|-------------------|
| `"visual": "screen_recording"` | Query `actp_assets` table for matching recordings |
| `"visual": "demo_clip"` | Generate via AI image API or use stock footage |
| `"visual": "results_screenshot"` | Screenshot from Safari research data |
| `"suggested_audio"` | Match from `actp_audio_library` table |
| Brand assets | From `actp_brand_config` table |

---

## 6. Render Execution Details

### Local Render Process

```python
class RemotionRenderExecutor(TaskExecutor):
    async def execute(self, input_data: dict) -> dict:
        composition = input_data["composition"]
        props = input_data["inputProps"]
        output_id = uuid4().hex[:12]
        output_path = self.output_dir / f"{output_id}.mp4"

        # Write props to temp file (Remotion reads from file for large props)
        props_file = self.temp_dir / f"{output_id}-props.json"
        props_file.write_text(json.dumps(props))

        # Determine codec/quality based on platform
        platform = props.get("targetPlatform", "tiktok")
        codec_args = self._codec_for_platform(platform)

        cmd = [
            "npx", "remotion", "render",
            composition,
            str(output_path),
            "--props", str(props_file),
            "--codec", codec_args["codec"],
            "--crf", str(codec_args["crf"]),
            "--log", "verbose",
            "--timeout", "120000"   # 2 minute timeout per frame
        ]

        # Run with progress tracking
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=str(self.remotion_project_dir),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env={**os.environ, "REMOTION_PROPS_FILE": str(props_file)}
        )

        stdout, stderr = await proc.communicate()

        if proc.returncode != 0:
            error_msg = stderr.decode()[-500:]  # Last 500 chars of error
            raise RuntimeError(f"Remotion render failed (exit {proc.returncode}): {error_msg}")

        if not output_path.exists():
            raise RuntimeError("Render completed but output file not found")

        # Get video metadata
        file_size = output_path.stat().st_size
        duration = await self._get_video_duration(output_path)

        # Upload to Supabase Storage
        video_url = await self._upload_to_storage(
            output_path,
            bucket="actp-videos",
            path=f"renders/{output_id}.mp4"
        )

        # Generate thumbnail
        thumbnail_path = self.temp_dir / f"{output_id}-thumb.jpg"
        await self._extract_thumbnail(output_path, thumbnail_path, at_second=1)
        thumbnail_url = await self._upload_to_storage(
            thumbnail_path,
            bucket="actp-videos",
            path=f"thumbnails/{output_id}.jpg"
        )

        # Cleanup local files
        output_path.unlink(missing_ok=True)
        props_file.unlink(missing_ok=True)
        thumbnail_path.unlink(missing_ok=True)

        return {
            "video_url": video_url,
            "thumbnail_url": thumbnail_url,
            "file_size_bytes": file_size,
            "duration_seconds": duration,
            "composition": composition,
            "render_id": output_id
        }

    def _codec_for_platform(self, platform: str) -> dict:
        """Platform-optimized encoding settings."""
        if platform in ("tiktok", "instagram"):
            return {"codec": "h264", "crf": 18}  # High quality, reasonable size
        elif platform == "youtube":
            return {"codec": "h264", "crf": 15}  # Higher quality for YouTube
        return {"codec": "h264", "crf": 20}
```

---

## 7. Cloud Storage Strategy

### Supabase Storage Buckets

| Bucket | Purpose | Retention |
|--------|---------|-----------|
| `actp-videos` | Rendered video files | 90 days |
| `actp-thumbnails` | Video thumbnails | 90 days |
| `actp-assets` | Reusable assets (logos, audio, stock) | Permanent |
| `actp-research` | Research screenshots | 30 days |

### Upload from Local Worker

```python
async def _upload_to_storage(self, local_path: Path, bucket: str, path: str) -> str:
    """Upload file to Supabase Storage from local worker."""
    with open(local_path, "rb") as f:
        file_data = f.read()

    # Use Supabase REST API directly (worker has service role key)
    url = f"{self.supabase_url}/storage/v1/object/{bucket}/{path}"
    headers = {
        "Authorization": f"Bearer {self.service_role_key}",
        "Content-Type": "video/mp4" if path.endswith(".mp4") else "image/jpeg"
    }

    async with httpx.AsyncClient() as client:
        resp = await client.put(url, content=file_data, headers=headers, timeout=120)
        resp.raise_for_status()

    return f"{self.supabase_url}/storage/v1/object/public/{bucket}/{path}"
```

---

## 8. Creative Record Linking

After render completes, the Workflow Engine updates the creative record:

```sql
-- Update actp_creatives with rendered video
UPDATE actp_creatives
SET video_url = $video_url,
    thumbnail_url = $thumbnail_url,
    file_size_bytes = $file_size,
    duration_seconds = $duration,
    render_status = 'completed',
    rendered_at = now()
WHERE id = $creative_id;

-- Update actp_gen_jobs
UPDATE actp_gen_jobs
SET status = 'succeeded',
    output_url = $video_url,
    completed_at = now()
WHERE id = $job_id;
```

---

## 9. Failure Modes

| Failure | Detection | Mitigation |
|---------|-----------|------------|
| Remotion composition not found | Exit code 1 + "composition not found" | Validate composition exists before dispatch |
| Props schema mismatch | Remotion type error | Validate props against template `required_props` before dispatch |
| Render OOM (large video) | Exit code 137 (SIGKILL) | Reduce quality/resolution; split into segments |
| Render timeout | Task exceeds `timeout_minutes` | Cancel process; retry with simpler template |
| Missing assets (broken URL) | Remotion fetch error during render | Pre-validate all asset URLs before dispatch |
| Storage upload fails | HTTP error from Supabase | Retry 3x with exponential backoff; keep local file |
| Disk space full | Write error during render | Check disk space before starting; alert if < 5GB |
| Remotion not installed | `npx remotion` not found | Detect at capability registration; reject tasks |

---

## 10. Performance Optimization

- **Template caching** — Keep Remotion webpack bundle warm; don't rebuild between renders
- **Asset pre-fetching** — Download all remote assets before starting render
- **Parallel renders** — If worker has capacity, render multiple videos simultaneously (memory permitting)
- **Output compression** — Use H.264 CRF tuning per platform (TikTok tolerates higher compression)
- **Thumbnail extraction** — Use `ffmpeg -ss 1 -frames:v 1` instead of full decode
- **Cleanup policy** — Delete local files immediately after upload; 0 local retention

---

## 11. Success Metrics

| Metric | Target |
|--------|--------|
| Render success rate | > 95% |
| Avg render time (30s video) | < 90 seconds |
| Storage upload success rate | > 99% |
| Props validation pass rate | > 98% |
| Template selection relevance | > 80% (human review) |
| End-to-end (script → uploaded video) | < 5 minutes |

---

## 12. Implementation Plan

| Phase | Scope | Estimate |
|-------|-------|----------|
| Phase 1 | `actp_remotion_templates` table + seed data | 0.5 day |
| Phase 2 | Template selection algorithm | 1 day |
| Phase 3 | Props Builder (script → Remotion inputProps) | 2 days |
| Phase 4 | RemotionRenderExecutor (render + upload) | 2 days |
| Phase 5 | Supabase Storage upload + creative record linking | 1 day |
| Phase 6 | Asset resolution pipeline | 2 days |
| Phase 7 | ContentLite `/api/generate/video-script` enhancement | 1 day |
| Phase 8 | Workflow definition + integration with PRD-001 | 1 day |
