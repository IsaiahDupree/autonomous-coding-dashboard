# PRD-034: YouTube Analytics MPLite Ingest Pipeline

**Status:** Ready for ACD  
**Priority:** P2  
**Author:** Isaiah Dupree  
**Created:** 2026-03-01  
**Depends on:** `youtube_video_stats`, `actp_content_performance`, `actp_niche_resonance`, Anthropic Claude API, MPLite  
**Module:** `youtube_mplite_ingest.py`  
**Agent CLAUDE.md:** `actp-worker/.claude/agents/youtube-analytics/CLAUDE.md`

---

## Overview

We have 35+ YouTube videos with performance data in `youtube_video_stats` (views, likes, comments, watch_time). Without a classification layer, this data is raw numbers with no strategic meaning. This PRD defines a pipeline that:

1. Pulls all YouTube video stats from Supabase
2. Uses Claude (batch of 20) or heuristic fallback to tag each video: niche, content_type, offer_tags, topic_tags
3. Writes tagged data to `actp_content_performance` for the content mix tracker
4. Aggregates into a niche resonance matrix (`actp_niche_resonance`) to answer "which niche × content type gets most engagement on YouTube?"
5. Feeds this intelligence back to the content mix agent, remotion producer, and posting scheduler

---

## Goals

1. Tag 100% of YouTube videos with niche, content_type, offer_tags within one run
2. Classify using Claude API in batches (20 videos per API call for efficiency)
3. Fall back to keyword heuristics if Claude unavailable
4. Compute `actp_niche_resonance` matrix after classification
5. Surface top-performing niche × content_type in Telegram weekly summary
6. Make classification incremental: only tag new/untagged videos each run

---

## Pipeline Flow

```
youtube_video_stats (raw)
    │
    ├── Filter: only untagged videos (external_id not in actp_content_performance)
    │
    ├── Batch 20 → Claude API
    │     Prompt: "Given these YouTube video titles, classify each by:
    │               niche (ai_automation/saas_growth/content_creation/digital_marketing/creator_economy/personal_brand/other)
    │               content_type (educational/inspirational/entertainment/thought_leadership/case_study/product_demo)
    │               offer_tags (list of: safari_automation/creator_growth/saas_consulting/digital_agency/none)
    │               topic_tags (2-4 specific topic keywords)"
    │
    ├── Write to actp_content_performance:
    │     external_id, platform='youtube', niche, content_type, offer_tags[],
    │     topic_tags[], views, likes, comments_count, watch_time_minutes,
    │     engagement_score, title, published_at
    │
    └── Aggregate → actp_niche_resonance:
          GROUP BY (platform, niche, offer_tag, content_type)
          → avg_views, avg_engagement, avg_watch_time,
             top_hook_patterns (top 3 titles), sample_count
```

---

## Classification Prompt (Claude)

```python
CLASSIFY_PROMPT = """
You are a content strategist. Classify each YouTube video by its title.

Niches: ai_automation, saas_growth, content_creation, digital_marketing, creator_economy, personal_brand, other
Content types: educational, inspirational, entertainment, thought_leadership, case_study, product_demo
Offer tags: safari_automation, creator_growth, saas_consulting, digital_agency, none (can be multiple)
Topic tags: 2-4 specific keywords

Return ONLY valid JSON array:
[{"index": 0, "niche": "...", "content_type": "...", "offer_tags": [...], "topic_tags": [...], "method": "claude"}, ...]

Videos:
{videos_json}
"""
```

---

## Heuristic Fallback

```python
NICHE_KEYWORDS = {
    "ai_automation": ["claude", "gpt", "ai", "automation", "n8n", "zapier", "workflow", "agent"],
    "saas_growth":   ["saas", "churn", "mrr", "product", "retention", "growth", "startup"],
    "content_creation": ["youtube", "video", "hook", "edit", "thumbnail", "content", "creator"],
    "digital_marketing": ["ads", "funnel", "seo", "email", "marketing", "campaign", "conversion"],
    "creator_economy": ["monetize", "brand deal", "sponsor", "audience", "subscriber"],
    "personal_brand": ["story", "journey", "behind", "day in", "vlog", "life"],
}
```

---

## Data Model

### Real column mapping (confirmed from Supabase):

**`youtube_video_stats`** (source):
- `video_id`, `title`, `views`, `likes`, `comments_count`, `watch_time_minutes`, `published_at`

**`actp_content_performance`** (destination):
- `external_id` ← `video_id`
- `comments_count` ← `comments_count`
- `watch_time_minutes` ← `watch_time_minutes`
- `offer_tags` ← array (not single text)
- No `classification_method`, no `updated_at`

**`actp_niche_resonance`** (aggregated):
- `avg_watch_time` (not `avg_watch_time_minutes`)
- `top_hook_patterns` (not `top_hooks`)
- `offer_tag` (singular, derived from modal offer in group)
- `last_updated` (not `updated_at`)
- UNIQUE: `(platform, niche, offer_tag, content_type)`

---

## CLI Interface

```bash
python3 youtube_mplite_ingest.py --analyze              # Tag untagged videos
python3 youtube_mplite_ingest.py --resonance            # Compute resonance matrix
python3 youtube_mplite_ingest.py --summary              # Show top niche × content_type
python3 youtube_mplite_ingest.py --full                 # Analyze + resonance + summary
```

Via dispatch:
```bash
python3 multi_agent_dispatch.py --domain youtube --task analyze
python3 multi_agent_dispatch.py --domain youtube --task resonance
python3 multi_agent_dispatch.py --domain youtube --task summary
```

---

## Cron Schedule

```python
{
    "name": "youtube_content_analyze",
    "cron": "0 4 * * *",      # Daily 4AM — incremental (new videos only)
    "module": "youtube_mplite_ingest",
    "function": "analyze_videos",
},
{
    "name": "youtube_mplite_ingest_weekly",
    "cron": "0 3 * * 0",      # Sunday 3AM — full recompute resonance
    "module": "youtube_mplite_ingest",
    "function": "run_full",
},
```

---

## Real Data Results

- **35 videos** in `youtube_video_stats`
- **11 niche resonance groups** computed after classification
- **Top performer:** `email_marketing / entertainment` — 241 avg views
- **Second:** `personal_brand / educational`
- Hook pattern example: "Nobody talks about this ai automation shortcut"

---

## Acceptance Criteria

- [ ] `--analyze` tags all untagged videos without re-tagging already-classified ones
- [ ] Claude batch classification processes 20 videos per API call
- [ ] Heuristic fallback works when `ANTHROPIC_API_KEY` not set
- [ ] `actp_content_performance` rows use `external_id`, `offer_tags[]`, `comments_count`, `watch_time_minutes`
- [ ] `actp_niche_resonance` upsert uses `(platform, niche, offer_tag, content_type)` conflict key
- [ ] `--summary` prints top 10 resonance rows sorted by avg_views
- [ ] Telegram alert after `--full` with top niche, top hook pattern, count of videos tagged
- [ ] `actp_agent_tasks` logged with domain=youtube on every run

---

## ACD Enhancement Tasks

| ID | Task | Priority |
|----|------|----------|
| YTUB-001 | MPLite integration: pull YouTube stats directly from MPLite analytics API | P1 |
| YTUB-002 | Thumbnail analysis: use Claude Vision to classify thumbnail style | P3 |
| YTUB-003 | Chapter marker extraction: detect topics from YouTube chapter titles | P2 |
| YTUB-004 | Subscriber spike detection: flag videos that caused unusual sub growth | P2 |
| YTUB-005 | Cross-platform repurpose tracker: detect TikTok/Shorts versions of YT videos | P2 |
| YTUB-006 | Watch time heatmap: identify avg view duration vs. video length ratio | P2 |
