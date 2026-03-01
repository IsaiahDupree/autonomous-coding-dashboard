# PRD-035: Cross-Platform Association Engine & Trend Detection

**Status:** Ready for ACD  
**Priority:** P1  
**Author:** Isaiah Dupree  
**Created:** 2026-03-01  
**Depends on:** `actp_platform_research`, `actp_twitter_research`, `actp_platform_associations`, `actp_cross_platform_trends`, `youtube_video_stats`, `crm_contacts`  
**Module:** `platform_association_engine.py`  
**Agent CLAUDE.md:** `actp-worker/.claude/agents/trends/CLAUDE.md`

---

## Overview

Content that trends on one platform often signals emerging interest across all platforms within 24–72 hours. Creators who appear on multiple platforms simultaneously are higher-value contacts than single-platform presences. This PRD defines an engine that: (1) associates CRM contacts to their handles across Twitter, TikTok, Instagram, Threads, LinkedIn, and YouTube; and (2) detects when a niche is trending on 2+ platforms simultaneously — triggering content creation and outreach opportunities.

---

## Goals

1. Build `actp_platform_associations`: contact × platform → handle, for all CRM contacts
2. Detect niches trending on 2+ platforms using last-7-days research data
3. Write cross-platform trend rows to `actp_cross_platform_trends`
4. Alert via Telegram when 3+ niches are cross-platform trending simultaneously
5. Feed trend data into content mix recommendations and Remotion content queue
6. Run associations daily at 4 AM, re-detecting based on new research data

---

## Association Logic

```
Signal Sources:
  crm_contacts (platform, username)
  actp_platform_research (source_platform, handle, niche)
  actp_twitter_research  (author_handle, niche)
  actp_platform_creators (platform, handle)

Step 1: Build handle index
  For each (platform, handle) pair in research data:
    Squish handle (lowercase, strip @, remove punctuation)
    Match against crm_contacts.username (squished)

Step 2: Multi-platform grouping
  For each squished name matching 2+ contacts across platforms:
    Group into actp_platform_associations rows

Step 3: CRM enrichment
  For each matched contact group:
    UPSERT actp_platform_associations (contact_id, platform, handle, engagement_type)
    engagement_type = 'handle_match' | 'fuzzy_match' | 'crm_match'
```

---

## Trend Detection Algorithm

```python
TREND_LOOKBACK_DAYS = 7
TREND_MIN_PLATFORMS = 2      # Must appear on at least 2 platforms
TREND_MIN_ENGAGEMENT = 50    # Total engagement score sum across platforms

def detect_trends() -> dict:
    """
    1. Pull actp_platform_research + actp_twitter_research for last 7 days
    2. Pull youtube_video_stats (classify niche via _classify_niche(title))
    3. Aggregate: niche → {platform → [engagement_scores]}
    4. Score: trend_strength = avg_engagement × platform_count × log(total_posts)
    5. Filter: platform_count >= 2 AND trend_strength >= threshold
    6. Upsert to actp_cross_platform_trends
    7. Alert if 3+ trends detected
    """
```

---

## Niche Classification (Heuristic)

```python
NICHE_KEYWORDS = {
    "ai_automation":     ["claude", "gpt", "ai", "automation", "n8n", "zapier", "workflow", "agent", "llm"],
    "saas_growth":       ["saas", "churn", "mrr", "arr", "product", "retention", "startup", "b2b"],
    "content_creation":  ["youtube", "video", "hook", "edit", "thumbnail", "content", "creator", "viral"],
    "digital_marketing": ["ads", "funnel", "seo", "email", "marketing", "campaign", "conversion", "ctr"],
    "creator_economy":   ["monetize", "brand deal", "sponsor", "audience", "newsletter", "course"],
    "personal_brand":    ["story", "journey", "behind", "authentic", "day in", "vlog", "mindset"],
}
```

---

## Data Model

### `actp_platform_associations`
```sql
-- EXISTING TABLE — real columns confirmed:
contact_id       uuid REFERENCES crm_contacts(id)
platform         text
handle           text
profile_url      text
followers        integer
first_seen_at    timestamptz
last_active_at   timestamptz
interaction_count integer
engagement_type  text  -- 'handle_match' | 'fuzzy_match' | 'crm_match'
UNIQUE(contact_id, platform)  ← added by migration 20260301
```

### `actp_cross_platform_trends`
```sql
-- NEW TABLE — created by migration 20260301:
id               uuid PRIMARY KEY
niche            text UNIQUE
platforms        text[]
platform_count   integer
total_engagement numeric
avg_engagement   numeric
trend_strength   numeric
top_posts        jsonb
detected_at      timestamptz
updated_at       timestamptz
```

---

## CLI Interface

```bash
python3 platform_association_engine.py --associations    # Build CRM contact associations
python3 platform_association_engine.py --trends          # Detect cross-platform trends
python3 platform_association_engine.py --full            # Run both
python3 platform_association_engine.py --top-trends 5    # Show top 5 trends
```

Via dispatch:
```bash
python3 multi_agent_dispatch.py --domain trends --task detect
python3 multi_agent_dispatch.py --domain trends --task associations
python3 multi_agent_dispatch.py --domain trends --task full
```

---

## Telegram Alert Format

```
🔥 Cross-Platform Trend Detected
• ai_automation — 3 platforms (Twitter × 89 posts, TikTok × 67, YouTube × 12)
  Trend strength: 4.2 | Avg engagement: 312
  Top hook: "This AI automation saves me 40hrs/week"

• content_creation — 2 platforms (Threads × 45, Instagram × 38)
  Trend strength: 2.8 | Avg engagement: 156
```

---

## Acceptance Criteria

- [ ] `--associations` upserts contacts to `actp_platform_associations` with correct `engagement_type`
- [ ] UNIQUE(contact_id, platform) constraint respected — upserts not duplicate inserts
- [ ] `--trends` reads both `actp_platform_research` and `actp_twitter_research` with correct column names (`tweet_text`, `scraped_at`)
- [ ] `youtube_video_stats` enriches trends using `views` (not `view_count`)
- [ ] Trends with platform_count ≥ 2 written to `actp_cross_platform_trends`
- [ ] Telegram alert fires when ≥ 3 cross-platform trends detected
- [ ] `actp_agent_tasks` logged with domain=trends on every run
- [ ] `--full` runs associations then trends in sequence

---

## ACD Enhancement Tasks

| ID | Task | Priority |
|----|------|----------|
| TRND-001 | Real-time trend spike: alert within 2h when engagement jumps 3× baseline | P1 |
| TRND-002 | Trend decay tracking: flag niches that were trending last week but dropped | P2 |
| TRND-003 | Competitor trend overlap: which trends are our top creators also posting about? | P2 |
| TRND-004 | Trend → Content brief auto-trigger: detected trend → queue Remotion job | P1 |
| TRND-005 | Multi-contact association: find contacts appearing across 3+ platforms | P2 |
