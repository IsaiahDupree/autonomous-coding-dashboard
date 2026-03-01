# PRD-036: Top Creators & Market Research Pipeline

**Status:** Ready for ACD  
**Priority:** P1  
**Author:** Isaiah Dupree  
**Created:** 2026-03-01  
**Depends on:** Safari Market Research API (port 3106), `actp_platform_research`, `actp_platform_creators`, `crm_contacts`  
**Module:** `growth_orchestrator.py` → `sync_market_research_to_offers()` + `pull_market_research()`  
**Agent CLAUDE.md:** `actp-worker/.claude/agents/creators/CLAUDE.md`

---

## Overview

Understanding top creators in your niche tells you what hooks work, what audiences want, and who potential partners/competitors are. The Market Research pipeline pulls top creators and posts from Twitter, TikTok, Instagram, and Threads via the Safari Automation Market Research API (port 3106), enriches the data against our offer profiles, and surfaces the most actionable intelligence for content strategy and outreach targeting.

---

## Goals

1. Pull top 100 creators and top 1000 posts per niche per platform on a weekly schedule
2. Match creators to our offer profiles (which creators speak to our audience?)
3. Store enriched creator data in `actp_platform_creators` and `crm_contacts`
4. Extract top hooks, post formats, and engagement patterns per niche
5. Surface top 5 creators per niche in Telegram weekly summary
6. Feed creator insights into A/B test content generation (use winning hook patterns)

---

## Market Research API

**Base URL:** `http://localhost:3106`

### Endpoints

```
POST /api/research/twitter/niche
POST /api/research/tiktok/niche
POST /api/research/instagram/niche
POST /api/research/threads/niche

Body: {
  "niche": "ai_automation",
  "config": {
    "creatorsPerNiche": 100,
    "postsPerNiche": 1000,
    "maxScrollsPerSearch": 50
  }
}

Response: {
  "niche": "ai_automation",
  "topCreators": [
    {
      "handle": "username",
      "totalEngagement": 45230,
      "topPost": { "text": "...", "likes": 1200, "views": 45000 },
      "postCount": 18
    }
  ]
}
```

### Full Cross-Platform

```
POST /api/research/all/full
Body: { "niches": ["ai_automation", "saas_growth", ...], "platforms": ["twitter", "tiktok"] }
```

---

## Offer Profiles

```python
OFFER_PROFILES = {
    "safari_automation": {
        "niches": ["ai_automation", "content_creation"],
        "icp_roles": ["developer", "agency owner", "solopreneur"],
        "keywords": ["automation", "workflow", "claude", "n8n", "zapier"],
    },
    "creator_growth": {
        "niches": ["content_creation", "creator_economy"],
        "icp_roles": ["content creator", "youtuber", "coach"],
        "keywords": ["views", "subscribers", "monetize", "audience"],
    },
    "saas_consulting": {
        "niches": ["saas_growth", "digital_marketing"],
        "icp_roles": ["founder", "cto", "product manager"],
        "keywords": ["churn", "mrr", "retention", "growth"],
    },
}
```

---

## Creator Enrichment Flow

```
Market Research API → topCreators[]
    │
    ├── For each creator:
    │     ├── Check if exists in crm_contacts (handle match)
    │     ├── Compute offer_match_score (keyword overlap with bio/posts)
    │     ├── Score ICP fit (role keywords + engagement threshold)
    │     └── UPSERT to actp_platform_creators + crm_contacts (if qualified)
    │
    └── Extract hook patterns:
          top_posts[].text → extract first sentence/clause as hook pattern
          Store in actp_niche_resonance.top_hook_patterns
```

---

## Data Model

### `actp_platform_creators`
```sql
-- EXISTING TABLE
id               uuid PRIMARY KEY
platform         text
handle           text
display_name     text
niche            text
followers        integer
engagement_score numeric
top_post_text    text
top_post_url     text
offer_match      text[]   -- which offers this creator's audience aligns with
icp_fit_score    integer  -- 0-100
last_synced_at   timestamptz
created_at       timestamptz
```

---

## Target Niches & Platforms

```python
RESEARCH_MATRIX = {
    "twitter":   ["ai_automation", "saas_growth", "content_creation"],
    "tiktok":    ["ai_automation", "content_creation", "creator_economy"],
    "threads":   ["content_creation", "personal_brand", "creator_economy"],
    "instagram": ["personal_brand", "creator_economy", "digital_marketing"],
}
```

---

## CLI Interface

```bash
python3 growth_orchestrator.py --research --platform twitter --niche ai_automation
python3 growth_orchestrator.py --market-sync
python3 growth_orchestrator.py --top-creators --platform tiktok --niche content_creation
```

Via dispatch:
```bash
python3 multi_agent_dispatch.py --domain creators --task sync --params '{"platform":"twitter","niche":"ai_automation"}'
python3 multi_agent_dispatch.py --domain creators --task top --params '{"platform":"tiktok","niche":"content_creation"}'
python3 multi_agent_dispatch.py --domain creators --task full-sync
```

---

## Cron Schedule

```python
{
    "name": "market_research_niche_pull",
    "cron": "0 3 * * 1,4",  # Monday + Thursday 3AM
    "module": "growth_orchestrator",
    "function": "_pull_all_niches",   # 5 niches × 3 platforms
},
```

---

## Acceptance Criteria

- [ ] `sync` pulls from Market Research API and upserts creators to `actp_platform_creators`
- [ ] New qualified creators (icp_fit > 60) seeded to `crm_contacts` as `pipeline_stage = 'new'`
- [ ] Offer match computed correctly from keyword overlap against OFFER_PROFILES
- [ ] `top` command returns ranked creator list with engagement_score + offer_match
- [ ] Hook patterns extracted and stored in `actp_niche_resonance.top_hook_patterns`
- [ ] Telegram summary: "🔬 Market Research: 47 new creators found | Top: @aiautomation_pro (45K eng)"
- [ ] `actp_agent_tasks` logged with domain=creators on every run
- [ ] Market Research API unavailable → graceful fallback with logged error

---

## ACD Enhancement Tasks

| ID | Task | Priority |
|----|------|----------|
| CRTR-001 | Creator scoring upgrade: weight by recency of posts (recent = higher score) | P1 |
| CRTR-002 | Partnership detection: identify creators already following our accounts | P2 |
| CRTR-003 | Competitive analysis: creators with > 10K engagement in our exact niches | P2 |
| CRTR-004 | Top post blueprint extraction: structure top posts into hook/body/CTA pattern | P1 |
| CRTR-005 | Creator dedup: match `actp_platform_creators` against `actp_platform_associations` | P1 |
