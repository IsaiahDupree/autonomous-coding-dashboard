# PRD-050 — Content Recreation from Browser Analysis

**Status:** Draft  
**Priority:** P1  
**Domain:** `content_intelligence`  
**Module:** `actp-worker/content_recreation_agent.py`  
**Supabase Project:** ivhfuhxorppptyuofbgq  
**Related Modules:** `browser_use_agent.py`, `universal_feedback_engine.py`, `remotion_content_producer.py`  
**Related Tables:** `actp_content_analysis`, `actp_recreated_content`, `actp_feedback_strategy`, `actp_gen_jobs`

---

## Overview

Given any URL or batch of URLs (competitor posts, trending content, viral threads), the Content Recreation Agent extracts raw content via the Browser Use Fallback Agent, runs structural analysis (hooks, format, word count, CTA patterns, tone, engagement signals), then uses Claude AI to recreate similar content adapted for the user's brand voice, niche, and platform format — ready to hand off to Remotion for video production or direct publishing.

This closes the full loop: **browser extracts → agent analyzes → Claude recreates → Remotion renders → publish**.

---

## Goals

1. Extract full readable content from any URL via `browser_use_agent.browser_task(action="extract")`.
2. Analyze content structure: hook style, format type, word count, CTA, tone, estimated engagement tier.
3. Score content against `actp_feedback_strategy` patterns to determine if it matches a winning niche pattern.
4. Recreate content using Claude (Sonnet for quality, Haiku for batch) adapted to user's brand voice.
5. Support 6 output formats: `thread`, `caption`, `short_script`, `hook_variants`, `long_form`, `email`.
6. Store analysis + recreated variants in Supabase for downstream Remotion/publish pipeline.
7. Batch mode: analyze top N posts from a keyword search and recreate the top-scoring ones.
8. Expose as `ContentRecreationExecutor` with `task_type = "content_recreate"`.

---

## Architecture

```
ACTP Agent / Workflow / Manual CLI
  └─► content_recreation_agent.recreate_from_url(url, format, niche)
        │
        ├─ 1. browser_use_agent.browser_task(action="extract", url=url)
        │       └─► raw_content (accessibility tree text)
        │
        ├─ 2. ContentAnalyzer.analyze(raw_content)
        │       └─► ContentAnalysis {hook, format_type, word_count, cta_present,
        │                             tone, platform_fit[], engagement_tier,
        │                             winning_patterns[], niche_match_score}
        │
        ├─ 3. ContentRecreator.recreate(analysis, brand_voice, target_format, niche)
        │       └─► Claude Sonnet/Haiku prompt with analysis signals
        │           └─► RecreatedContent {variants[], hook_options[], format,
        │                                  platform, estimated_score, prompt_used}
        │
        ├─ 4. Supabase INSERT → actp_content_analysis + actp_recreated_content
        │
        └─ 5. Optional: queue_for_production() → actp_gen_jobs (Remotion pipeline)
```

---

## Content Analysis Signals

| Signal | Description | How Extracted |
|--------|-------------|---------------|
| `hook` | Opening line / attention-grabber | First sentence extraction |
| `hook_style` | question\|stat\|story\|bold_claim\|list | Claude Haiku classifier |
| `format_type` | thread\|caption\|script\|article\|email | Length + structure heuristic |
| `word_count` | Total words | Count |
| `cta_present` | Does it have a call-to-action? | Keyword + position check |
| `cta_type` | follow\|click\|buy\|comment\|share | Keyword match |
| `tone` | educational\|entertaining\|inspirational\|controversial | Claude classifier |
| `platform_fit` | Which platforms suit this format | Format + length mapping |
| `engagement_tier` | high\|medium\|low (inferred from format signals) | Heuristic scoring |
| `niche_match_score` | 0-100: how well does it fit target niche | Token overlap + Claude |
| `winning_patterns` | Matched patterns from `actp_feedback_strategy` | Strategy table lookup |

---

## Content Recreation Prompt Strategy

### System Prompt
```
You are a content strategist recreating high-performing content in a new brand voice.
Preserve the structural elements that make the original work (hook style, format, flow).
Adapt the content entirely to the target brand voice, niche, and audience.
Never copy the original — create something fresh that applies the same winning principles.
```

### Variables Injected
- `{hook_style}` — preserve the same hook type
- `{format_type}` — match the format structure
- `{tone}` — replicate the tone
- `{winning_patterns}` — patterns from strategy table
- `{brand_voice}` — from `actp_niche_config` for the target niche
- `{target_niche}` — solopreneur\|creator_growth\|safari_automation\|ai_automation
- `{target_platform}` — twitter\|threads\|instagram\|tiktok\|linkedin
- `{target_format}` — thread\|caption\|short_script\|hook_variants\|email

---

## Output Formats

| Format | Description | Platforms | Remotion? |
|--------|-------------|-----------|-----------|
| `thread` | 5–10 tweet thread | Twitter, Threads | No |
| `caption` | Platform caption with hashtags | Instagram, TikTok, LinkedIn | No |
| `short_script` | 30–60s voiceover script | TikTok, YouTube Shorts | Yes |
| `hook_variants` | 5 alternative opening hooks | All | No |
| `long_form` | 800–1200 word article/post | LinkedIn, Threads | No |
| `email` | Email sequence touch | Gmail via Resend | No |

---

## Supabase Tables

### `actp_content_analysis` (new)
```sql
CREATE TABLE actp_content_analysis (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url        text NOT NULL,
  platform          text,
  raw_content       text,
  hook              text,
  hook_style        text,
  format_type       text,
  word_count        int,
  cta_present       bool DEFAULT false,
  cta_type          text,
  tone              text,
  platform_fit      text[],
  engagement_tier   text,
  niche_match_score float,
  winning_patterns  jsonb,
  backend_used      text,
  analysis_model    text,
  created_at        timestamptz DEFAULT now()
);
```

### `actp_recreated_content` (new)
```sql
CREATE TABLE actp_recreated_content (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id      uuid REFERENCES actp_content_analysis(id),
  target_niche     text,
  target_platform  text,
  target_format    text,
  brand_voice      text,
  variants         jsonb NOT NULL,
  hook_options     jsonb,
  estimated_score  float,
  recreation_model text,
  prompt_used      text,
  queued_for_prod  bool DEFAULT false,
  gen_job_id       uuid,
  created_at       timestamptz DEFAULT now()
);
```

---

## Features

### F-050-001 — ContentAnalyzer class
Analyze raw extracted content and return `ContentAnalysis` dataclass. Classify hook style, format, tone via Claude Haiku (single prompt, structured JSON output). Word count, CTA detection via heuristics.

### F-050-002 — Strategy pattern matching
Look up `actp_feedback_strategy` for the target niche+platform and inject `winning_patterns` into analysis. Score `niche_match_score` by comparing content tokens against niche keywords.

### F-050-003 — ContentRecreator class
Claude Sonnet prompt to recreate content from analysis signals. Support all 6 formats. Return list of 2–3 variants per request. Include `prompt_used` in output for debugging.

### F-050-004 — `recreate_from_url()` main entry point
`async def recreate_from_url(url, target_niche, target_platform, target_format, brand_voice=None) → RecreationResult`. Chains: extract → analyze → match_strategy → recreate → store.

### F-050-005 — `recreate_from_batch()` for competitor analysis
Given a list of URLs (or keyword to search), extract and analyze all, rank by `niche_match_score`, recreate only top N. Returns batch `RecreationBatch` result.

### F-050-006 — Supabase migrations
Create `20260301000011_content_analysis.sql` and `20260301000012_recreated_content.sql`.

### F-050-007 — `queue_for_production()` integration
If `target_format == "short_script"`, INSERT into `actp_gen_jobs` for Remotion pipeline pickup. Set `gen_job_id` in `actp_recreated_content`.

### F-050-008 — `ContentRecreationExecutor`
`task_type = "content_recreate"`. Payload: `{url, target_niche, target_platform, target_format, brand_voice?, queue_for_prod?}`. Registered in `init_executors()`.

### F-050-009 — CLI for manual testing
`python3 content_recreation_agent.py --url https://x.com/... --niche solopreneur --platform twitter --format thread`  
`python3 content_recreation_agent.py --batch --keyword "solopreneur" --platform twitter --top 3`

### F-050-010 — Data plane methods
Add to `data_plane.py`: `content_analyze_url()`, `content_recreate()`, `content_recreation_history()`, `content_queue_for_prod()`.

### F-050-011 — Seed `content-recreate-research` workflow
Two-step workflow: step 1 = `browser_use/extract`, step 2 = `content_recreate/recreate`. Output of step 1 (`data`) feeds into step 2 as `raw_content`.

### F-050-012 — Unit tests
`tests/test_content_recreation_agent.py` — mock `browser_task` and Claude API calls, verify analysis signals are correctly parsed, verify recreation prompt includes all signals, verify Remotion queue is only called for `short_script` format.

### F-050-013 — Brand voice config per niche
Read brand voice from `actp_niche_config.prompt_guidelines` column. Fall back to default: `"direct, educational, founder-to-founder, no fluff"`.

### F-050-014 — Trending content discovery mode
`--discover` flag: use `browser_use_agent` search action (DuckDuckGo) for `"{niche} viral post site:x.com"`, extract top 5 URLs, run batch recreation automatically.

---

## Pipeline Integration

```
browser_use_agent (PRD-048)
  └─► ContentRecreationAgent (PRD-050)
        └─► actp_feedback_strategy (universal_feedback_engine — already built)
        └─► actp_gen_jobs (remotion_content_producer — already built)
              └─► Remotion VideoStudio → publish
```

---

## Acceptance Criteria

- [ ] `recreate_from_url("https://x.com/some-viral-tweet", niche="solopreneur", platform="twitter", format="thread")` returns 2+ variants
- [ ] Analysis correctly identifies `hook_style`, `tone`, `format_type` for a sample post
- [ ] `niche_match_score` > 50 for on-niche content, < 30 for off-niche content
- [ ] `short_script` format triggers `actp_gen_jobs` INSERT
- [ ] `actp_content_analysis` and `actp_recreated_content` tables exist and receive rows
- [ ] `ContentRecreationExecutor` visible in `init_executors()` log
- [ ] CLI `--url` and `--batch` modes run without error
- [ ] Unit tests pass: `pytest tests/test_content_recreation_agent.py -v`
