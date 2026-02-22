# PRD-003: Safari Research Pipeline

## Status: Draft
## Author: Isaiah Dupree
## Created: 2026-02-22
## Priority: P1 — First step in the content automation loop
## Depends On: PRD-001 (Workflow Engine), PRD-002 (Local Agent Daemon v2)

---

## 1. Problem Statement

Market research is the foundation of the ACTP loop — you can't generate winning content without knowing what's working in the market. Currently, ResearchLite has cron endpoints for collecting hashtags and ads, but:

1. **No automated browsing** — The crons call APIs (Meta Ad Library, etc.) but can't browse TikTok/Instagram/YouTube as a real user would
2. **Limited data sources** — API-only research misses trending organic content, comment sentiment, visual patterns, audio trends
3. **No Safari integration** — The local machine has Safari but no pipeline connects it to the cloud research system
4. **Manual trigger only** — Research happens when the worker fires a cron, not as part of a coordinated workflow

The Safari Research Pipeline automates: **Cloud triggers research task → Local Safari browses platforms → Extracts structured data → Uploads to cloud → ResearchLite processes into blueprints.**

---

## 2. Solution Overview

A pipeline that uses macOS Safari automation (via `osascript` AppleScript + JavaScript injection) to:
- Browse TikTok trending/search pages and extract video metadata
- Browse Instagram explore/hashtag pages and extract post metadata
- Browse YouTube Shorts trending and extract video metadata
- Extract engagement signals (views, likes, comments, shares)
- Capture visual patterns (thumbnail style, text overlay, hook timing)
- Feed structured research data back to ResearchLite for blueprint extraction

---

## 3. Architecture

```
Cloud (Workflow Engine)                    Local (Agent Daemon)
─────────────────────                      ────────────────────
                                           
1. Trigger: cron/manual                    
     │                                     
2. Create workflow task                    
   (type: safari_research)                 
     │                                     
     ├──── actp_workflow_tasks ────────►  3. Poller claims task
     │                                        │
     │                                   4. SafariResearchExecutor
     │                                        │
     │                                   5. Build AppleScript for platform
     │                                        │
     │                                   6. osascript drives Safari:
     │                                      - Navigate to platform
     │                                      - Scroll/paginate
     │                                      - Extract DOM data via JS
     │                                      - Screenshot key frames
     │                                        │
     │                                   7. Parse + structure results
     │                                        │
     │                                   8. Upload screenshots to
     │                                      Supabase Storage
     │                                        │
9. Task completed ◄──── output_data ────  9. Complete task with results
     │                                     
10. Workflow advances:                     
    ResearchLite processes                 
    items into blueprints                  
```

---

## 4. Research Types

### 4.1 Competitor Content Research
**Goal**: Find what's working organically in your niche

```json
{
  "research_type": "competitor_content",
  "params": {
    "platforms": ["tiktok", "instagram", "youtube"],
    "niches": ["digital marketing", "saas tools", "AI automation"],
    "keywords": ["ai tool", "automation hack", "marketing tip"],
    "min_engagement": 10000,
    "max_items_per_platform": 20,
    "lookback_days": 7
  }
}
```

**Safari Actions (TikTok)**:
1. Navigate to `tiktok.com/search?q={keyword}`
2. Wait for results to load (DOM selector: `[data-e2e="search-card-desc"]`)
3. Scroll to load 20 results
4. For each result, extract:
   - Video URL, creator handle, description/caption
   - View count, like count, comment count, share count
   - Video duration, thumbnail URL
   - Hashtags used, sounds/audio used
   - Post date
5. Navigate to top 5 videos by engagement, extract:
   - First 3 seconds hook text/visual description
   - Comment sentiment (top 10 comments)
   - Creator follower count

**Safari Actions (Instagram)**:
1. Navigate to `instagram.com/explore/tags/{hashtag}`
2. Extract grid of top/recent posts
3. For each post: media URL, caption, like count, comment count, post date
4. For Reels: view count, audio name, duration

**Safari Actions (YouTube Shorts)**:
1. Navigate to `youtube.com/results?search_query={keyword}&sp=EgQQARgG` (Shorts filter)
2. Extract: title, view count, channel name, thumbnail
3. For top results: comment count, like ratio

### 4.2 Ad Library Research
**Goal**: See what competitors are running as paid ads

```json
{
  "research_type": "ad_library",
  "params": {
    "platforms": ["meta"],
    "search_terms": ["ai tool", "saas", "automation"],
    "countries": ["US"],
    "active_only": true,
    "max_items": 30
  }
}
```

**Safari Actions (Meta Ad Library)**:
1. Navigate to `facebook.com/ads/library/?active_status=active&ad_type=all&q={term}&country=US`
2. Scroll to load results
3. For each ad: advertiser name, ad creative (image/video URL), ad copy, CTA, start date, platforms shown on
4. Flag ads running for > 7 days (likely profitable)

### 4.3 Trending Audio Research
**Goal**: Find trending sounds to use in content

```json
{
  "research_type": "trending_audio",
  "params": {
    "platforms": ["tiktok", "instagram"],
    "max_items": 15
  }
}
```

### 4.4 Hashtag Performance Research
**Goal**: Find high-performing hashtags in your niche

```json
{
  "research_type": "hashtag_performance",
  "params": {
    "seed_hashtags": ["aitools", "automation", "saas"],
    "platforms": ["tiktok", "instagram"],
    "depth": 2
  }
}
```

---

## 5. Data Model

### Research Output Schema

Each research item follows this structure, stored in `actp_market_items`:

```json
{
  "source_platform": "tiktok",
  "source_url": "https://tiktok.com/@creator/video/123",
  "research_type": "competitor_content",
  "content_type": "video",
  "creator": {
    "handle": "@creatorname",
    "follower_count": 125000,
    "platform": "tiktok"
  },
  "metrics": {
    "views": 1500000,
    "likes": 85000,
    "comments": 3200,
    "shares": 12000,
    "engagement_rate": 0.067
  },
  "content": {
    "caption": "This AI tool changed everything...",
    "hashtags": ["#aitools", "#automation", "#fyp"],
    "duration_seconds": 32,
    "audio_name": "original sound - creator",
    "hook_text": "Stop scrolling if you use AI",
    "cta_type": "link_in_bio"
  },
  "visual_analysis": {
    "has_text_overlay": true,
    "text_overlay_content": "AI Tool That Does X",
    "thumbnail_style": "face_with_text",
    "screenshot_urls": [
      "https://storage.supabase.co/research/screenshot-001.png"
    ]
  },
  "collected_at": "2026-02-22T16:00:00Z",
  "post_date": "2026-02-20T12:00:00Z"
}
```

---

## 6. AppleScript / JavaScript Injection Pattern

### Core Pattern: Drive Safari via osascript

```applescript
-- safari_research_tiktok.scpt
tell application "Safari"
    activate
    open location "https://www.tiktok.com/search?q=ai+tools"
    delay 3

    -- Wait for content to load
    set pageLoaded to false
    repeat 30 times
        set pageLoaded to (do JavaScript "
            document.querySelectorAll('[data-e2e=\"search-card-desc\"]').length > 0
        " in current tab of window 1)
        if pageLoaded then exit repeat
        delay 1
    end repeat

    -- Scroll to load more results
    repeat 5 times
        do JavaScript "window.scrollBy(0, window.innerHeight)" in current tab of window 1
        delay 2
    end repeat

    -- Extract structured data via injected JavaScript
    set resultJSON to (do JavaScript "
        JSON.stringify(
            Array.from(document.querySelectorAll('[data-e2e=\"search-card-desc\"]'))
            .slice(0, 20)
            .map(el => ({
                caption: el.textContent.trim(),
                link: el.closest('a')?.href || '',
                // ... additional extraction
            }))
        )
    " in current tab of window 1)
end tell

return resultJSON
```

### Anti-Detection Measures

1. **Realistic timing** — Random delays between 2-5 seconds per action
2. **Human-like scrolling** — Smooth scroll with variable speed
3. **Session persistence** — Use existing Safari cookies/sessions (user is logged in)
4. **Rate limiting** — Max 1 platform per 5 minutes, max 3 research sessions per hour
5. **User-Agent** — Safari's native UA (not spoofed)
6. **No headless mode** — Full Safari window (avoids detection)

### Screenshot Capture

```applescript
-- Capture screenshot of current Safari tab
do shell script "screencapture -l $(osascript -e '
    tell application \"Safari\" to id of window 1
') /tmp/research_screenshot.png"
```

---

## 7. Cloud Integration

### ResearchLite Endpoint Enhancement

ResearchLite needs a new endpoint to receive structured research data:

```
POST /api/research/ingest
Authorization: Bearer rlk_...
Content-Type: application/json

{
  "source": "safari_research",
  "workflow_execution_id": "...",
  "items": [ ... array of research items ... ],
  "research_type": "competitor_content",
  "platforms_scraped": ["tiktok", "instagram"],
  "scraped_at": "2026-02-22T16:00:00Z"
}
```

Response:
```json
{
  "ingested": 42,
  "duplicates_skipped": 3,
  "items_stored": 39,
  "blueprint_extraction_queued": true
}
```

### Deduplication

Before storing, check `actp_market_items` for existing items with same `source_url`. Update metrics if item exists (views/likes may have changed).

---

## 8. Error Handling

| Error | Detection | Mitigation |
|-------|-----------|------------|
| Safari not running | osascript returns error | Start Safari via `open -a Safari`; retry |
| Platform blocks access | Page shows CAPTCHA or login wall | Abort gracefully; report; wait 1 hour |
| DOM selectors changed | Extraction returns empty | Fall back to generic extraction; flag for human review |
| Rate limited by platform | HTTP 429 or empty results | Exponential backoff; switch to next platform |
| Safari tab crashes | osascript timeout | Kill tab; restart; retry |
| Network timeout | Page never loads | Retry with 30s timeout; fail after 3 attempts |
| Login session expired | Redirect to login page | Detect login URL; pause research; alert user |

---

## 9. Rate Limits & Scheduling

| Platform | Max Sessions/Hour | Items/Session | Cooldown |
|----------|-------------------|---------------|----------|
| TikTok | 3 | 20 | 5 min between sessions |
| Instagram | 2 | 15 | 10 min between sessions |
| YouTube | 4 | 20 | 3 min between sessions |
| Meta Ad Library | 2 | 30 | 10 min between sessions |

Default workflow schedule: **Once daily at 6am** (before content generation pipeline runs at 8am).

---

## 10. Privacy & Compliance

- Research collects **publicly available data only**
- No scraping of private/friends-only content
- No storage of personal user data beyond public creator handles
- Research data used internally for content strategy only
- Respects robots.txt and platform ToS rate limits
- All screenshots stored in private Supabase Storage bucket with 30-day TTL

---

## 11. Success Metrics

| Metric | Target |
|--------|--------|
| Research items collected per run | > 30 per platform |
| Data extraction accuracy | > 90% fields populated |
| Research-to-blueprint conversion rate | > 60% of items produce blueprints |
| Pipeline failure rate | < 10% |
| Time per research session | < 15 minutes |
| Platform detection/block rate | < 5% |

---

## 12. Implementation Plan

| Phase | Scope | Estimate |
|-------|-------|----------|
| Phase 1 | TikTok search scraper (AppleScript + JS extraction) | 2 days |
| Phase 2 | Instagram explore/hashtag scraper | 2 days |
| Phase 3 | YouTube Shorts search scraper | 1 day |
| Phase 4 | Meta Ad Library scraper | 1 day |
| Phase 5 | Screenshot capture + Supabase Storage upload | 1 day |
| Phase 6 | ResearchLite `/api/research/ingest` endpoint | 1 day |
| Phase 7 | Workflow definition + scheduling | 0.5 day |
| Phase 8 | Anti-detection tuning + rate limit enforcement | 1 day |
