# PRD-007: Research → Render → Expand → Publish (Blotato) Pipeline

## Overview

A fully automated closed-loop content pipeline that:
1. Scrapes trending content from TikTok/Instagram via Safari Automation
2. Extracts creative blueprints via ResearchLite (cloud)
3. Generates video scripts via ContentLite (cloud)
4. Renders video via Remotion (local)
5. Saves content + metadata + render params to DB
6. Expands descriptions per platform (TikTok, YouTube, Instagram, Facebook) at ≤20% of each platform's max field length
7. Publishes to all 4 platforms via Blotato (local)

## Workflow Definition: `research-to-blotato`

```
research → extract-blueprints → generate-content → render-video → save-content → expand-descriptions → publish-blotato
```

### Step Definitions

| # | Slug | Executor | Service | Status |
|---|------|----------|---------|--------|
| 1 | `research` | local_task | Safari Automation | ✅ Ready |
| 2 | `extract-blueprints` | cloud_api | ResearchLite | ✅ Ready |
| 3 | `generate-content` | cloud_api | ContentLite | ✅ Ready |
| 4 | `render-video` | local_task | Remotion | ✅ Ready |
| 5 | `save-content` | db_query | Supabase | 🔨 Needs table + RPC |
| 6 | `expand-descriptions` | cloud_api | ContentLite | 🔨 Needs new endpoint |
| 7 | `publish-blotato` | local_task | Blotato API | 🔨 Needs multi-platform executor |

## Gap 1: `actp_published_content` Table

Stores rendered content with full metadata for audit trail and re-use.

```sql
CREATE TABLE actp_published_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid REFERENCES actp_workflow_executions(id),
  video_url text NOT NULL,
  thumbnail_url text,
  duration_seconds integer,
  template_id text,
  render_params jsonb DEFAULT '{}',    -- Remotion props used to render
  script_text text,                     -- Video script/narration
  blueprint_id text,                    -- Source blueprint reference
  research_summary jsonb DEFAULT '{}',  -- Summary of research that inspired this
  base_description text,                -- General description of the content
  platform_descriptions jsonb DEFAULT '{}', -- Per-platform expanded descriptions
  status text DEFAULT 'rendered',       -- rendered | described | published | failed
  published_at timestamptz,
  publish_results jsonb DEFAULT '{}',   -- Per-platform post URLs and IDs
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RPC to insert and return the row
CREATE OR REPLACE FUNCTION save_published_content(
  p_execution_id uuid,
  p_video_url text,
  p_thumbnail_url text DEFAULT NULL,
  p_duration_seconds integer DEFAULT NULL,
  p_template_id text DEFAULT NULL,
  p_render_params jsonb DEFAULT '{}',
  p_script_text text DEFAULT NULL,
  p_blueprint_id text DEFAULT NULL,
  p_research_summary jsonb DEFAULT '{}',
  p_base_description text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  result jsonb;
BEGIN
  INSERT INTO actp_published_content (
    execution_id, video_url, thumbnail_url, duration_seconds,
    template_id, render_params, script_text, blueprint_id,
    research_summary, base_description
  ) VALUES (
    p_execution_id, p_video_url, p_thumbnail_url, p_duration_seconds,
    p_template_id, p_render_params, p_script_text, p_blueprint_id,
    p_research_summary, p_base_description
  ) RETURNING to_jsonb(actp_published_content.*) INTO result;
  RETURN result;
END;
$$;
```

## Gap 2: Platform Description Expansion Endpoint

**Service:** ContentLite  
**Endpoint:** `POST /api/generate/platform-descriptions`

Takes a base description + video metadata and generates platform-specific captions that use ≤20% of each platform's maximum field length.

### Platform Limits

| Platform | Field | Max Chars | 20% Target |
|----------|-------|-----------|------------|
| TikTok | Caption | 4,000 | 800 |
| YouTube | Description | 5,000 | 1,000 |
| Instagram | Caption | 2,200 | 440 |
| Facebook | Post text | 63,206 | 12,641 |

### Request Body
```json
{
  "base_description": "A short video showing...",
  "script_text": "The video script...",
  "video_duration": 15,
  "content_type": "short_form_video",
  "platforms": ["tiktok", "youtube", "instagram", "facebook"],
  "tone": "engaging",
  "include_hashtags": true,
  "include_cta": true
}
```

### Response
```json
{
  "descriptions": {
    "tiktok": {
      "caption": "...",
      "hashtags": ["#trending", "#fyp"],
      "char_count": 650,
      "max_chars": 4000,
      "usage_pct": 16.25
    },
    "youtube": {
      "title": "...",
      "description": "...",
      "tags": ["trending", "content"],
      "char_count": 850,
      "max_chars": 5000,
      "usage_pct": 17.0
    },
    "instagram": {
      "caption": "...",
      "hashtags": ["#reels", "#explore"],
      "char_count": 380,
      "max_chars": 2200,
      "usage_pct": 17.3
    },
    "facebook": {
      "post_text": "...",
      "char_count": 1200,
      "max_chars": 63206,
      "usage_pct": 1.9
    }
  }
}
```

## Gap 3: Multi-Platform Blotato Publish Executor

The existing `BlotatoUploadExecutor` handles one platform at a time. We need a `blotato_multi_publish` task type that:

1. Accepts video_url + platform_descriptions from context
2. Iterates over each platform (TikTok, YouTube, Instagram, Facebook)
3. Uploads media once to Blotato CDN
4. Creates posts for each platform with their specific descriptions
5. Returns post URLs and IDs for all platforms

### Input Data
```json
{
  "video_url": "/path/to/video.mp4",
  "platforms": ["tiktok", "youtube", "instagram", "facebook"],
  "descriptions": { ... },  // from expand-descriptions step
  "content_id": "uuid"       // from save-content step
}
```

### Output Data
```json
{
  "published": [
    {"platform": "tiktok", "post_url": "...", "post_id": "..."},
    {"platform": "youtube", "post_url": "...", "post_id": "..."},
    {"platform": "instagram", "post_url": "...", "post_id": "..."},
    {"platform": "facebook", "post_url": "...", "post_id": "..."}
  ],
  "publish_count": 4,
  "failed_platforms": []
}
```

## Implementation Plan

1. **DB Migration** — Create `actp_published_content` table + `save_published_content` RPC
2. **ContentLite** — Add `POST /api/generate/platform-descriptions` endpoint using Claude Haiku
3. **ACTP Worker** — Add `BlotatoMultiPublishExecutor` (task_type: `blotato_multi_publish`)
4. **Workflow Engine** — Seed `research-to-blotato` workflow definition with all 7 steps
5. **Test** — Trigger workflow, verify full pipeline execution

## Timeline Estimate

- DB migration: 5 min
- ContentLite endpoint: 30 min
- Multi-publish executor: 20 min
- Workflow definition: 10 min
- Testing: 15 min
- **Total: ~1.5 hours**
