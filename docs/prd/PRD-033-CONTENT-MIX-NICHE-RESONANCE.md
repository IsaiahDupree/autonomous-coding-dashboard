# PRD-033: Content Mix & Niche Resonance Tracker

**Status:** Ready for ACD  
**Priority:** P1  
**Author:** Isaiah Dupree  
**Created:** 2026-03-01  
**Depends on:** `actp_content_performance`, `actp_niche_resonance`, `actp_posting_schedule`, Anthropic Claude API  
**Module:** `growth_orchestrator.py` → `get_content_mix_recommendation()`  
**Agent CLAUDE.md:** `actp-worker/.claude/agents/content-mix/CLAUDE.md`

---

## Overview

Without a systematic content mix, creators default to posting whatever feels relevant — leading to over-representation of one niche, under-serving audiences who want variety, and missing high-engagement topics. This PRD defines the Content Mix & Niche Resonance Tracker: a system that measures actual vs. target content distribution per platform, computes which niche × content_type combinations resonate most (by views + engagement), and generates actionable weekly content recommendations.

The system answers: **"What should we post next week, on which platform, in which niche, in what format, to maximize engagement while maintaining a healthy content mix across our offers?"**

---

## Goals

1. Track actual content distribution per platform across 5 offer categories + personal brand
2. Compute niche resonance matrix: `platform × niche × content_type → avg_views, avg_engagement`
3. Compare actual mix to target mix and identify gaps
4. Generate concrete recommendations: "Post 2 more AI automation educational videos on TikTok this week"
5. Feed recommendations into Remotion content production queue
6. Weekly Telegram summary with top-performing niche and biggest gap

---

## Target Content Mix (Global)

| Category | Target % | Notes |
|----------|----------|-------|
| AI Automation | 35% | Largest niche, highest engagement |
| Personal Brand | 20% | Builds trust, fills pipeline |
| Creator Economy | 20% | Broad appeal, offer bridge |
| SaaS Growth | 15% | Direct ICP targeting |
| Digital Marketing | 10% | Support tier, funnel awareness |

---

## Offer → Content Mapping

| Offer Slug | Niche | Primary Content Type | Primary Platform |
|------------|-------|---------------------|-----------------|
| `safari_automation` | ai_automation | educational, tutorial | TikTok, YouTube |
| `creator_growth` | content_creation | inspirational, case_study | Threads, Instagram |
| `saas_consulting` | saas_growth | thought_leadership, data | Twitter, LinkedIn |
| `digital_agency` | digital_marketing | educational, case_study | YouTube, Twitter |

---

## Resonance Matrix Computation

```
actp_content_performance (per post)
    ↓ GROUP BY platform, niche, content_type
actp_niche_resonance (aggregated)
    columns: platform, niche, offer_tag, content_type,
             avg_views, avg_engagement, avg_watch_time,
             sample_count, top_hook_patterns, last_updated
```

**Update cycle:** YouTube ingest runs weekly (Sunday 3AM), enriching the resonance matrix. Twitter/TikTok research enriches `actp_platform_research` → `sync_market_research_to_offers()` maps those to offers.

---

## Gap Analysis Logic

```python
def get_content_mix_recommendation(platform: str = None) -> dict:
    """
    1. Pull last 30 days of actp_content_performance
    2. Compute actual % per niche
    3. Compare to TARGET_MIX
    4. For each under-represented niche: find best content_type from actp_niche_resonance
    5. Return: list of {niche, content_type, platform, recommended_count, top_hook}
    """
    target = {"ai_automation": 0.35, "personal_brand": 0.20, ...}
    actual = {niche: count/total for niche, count in niche_counts.items()}
    gaps   = {n: target[n] - actual.get(n, 0) for n in target if target[n] > actual.get(n, 0)}
    # Sort by gap size → return top recommendations with resonance data
```

---

## Data Model

### `actp_niche_resonance`
```sql
-- EXISTING TABLE — real columns confirmed:
platform        text
niche           text
offer_tag       text
content_type    text
avg_views       numeric
avg_engagement  numeric
avg_watch_time  numeric
top_hook_patterns text[]
top_post_ids    text[]
sample_count    integer
last_updated    timestamptz
UNIQUE(platform, niche, offer_tag, content_type)
```

---

## Niche Taxonomy

```python
NICHES = [
    "ai_automation",     # Claude, GPT, n8n, Zapier, automation workflows
    "saas_growth",       # SaaS metrics, churn, product-led growth
    "content_creation",  # Video production, hooks, editing, YouTube
    "digital_marketing", # Ads, funnels, email, conversion
    "creator_economy",   # Monetization, sponsorships, audience building
    "personal_brand",    # Story-driven, authenticity, behind-the-scenes
    "other",             # Catch-all, excluded from resonance matrix
]

CONTENT_TYPES = [
    "educational",       # How-to, explainer, tutorial
    "inspirational",     # Story, transformation, testimonial
    "entertainment",     # Humor, trending audio, meme
    "thought_leadership",# Opinion, hot take, prediction
    "case_study",        # Results, before/after, proof
    "product_demo",      # Feature walkthrough, use case
]
```

---

## CLI Interface

```bash
python3 growth_orchestrator.py --content-mix                     # All platforms
python3 growth_orchestrator.py --content-mix --platform tiktok   # Platform-specific
python3 growth_orchestrator.py --market-sync                     # Sync research → offers
```

Via dispatch:
```bash
python3 multi_agent_dispatch.py --domain content-mix --task recommend
python3 multi_agent_dispatch.py --domain content-mix --task gaps --params '{"platform":"tiktok"}'
python3 multi_agent_dispatch.py --domain content-mix --task resonance-summary
```

---

## Acceptance Criteria

- [ ] `recommend` returns at least 3 concrete content recommendations with niche, type, platform, count
- [ ] Recommendations reference real resonance data from `actp_niche_resonance`
- [ ] Gap analysis correctly identifies under-represented niches vs. target mix
- [ ] `resonance-summary` prints top 5 niche × content_type pairs by avg_views
- [ ] Telegram weekly summary includes: "🎯 Top niche: ai_automation (312 avg views) | Gap: need 2 more personal_brand posts on Threads"
- [ ] `actp_agent_tasks` row logged with domain=content-mix on every run
- [ ] Recommendations auto-feed into `remotion_content_producer.py` via `trigger_content_pipeline()`

---

## ACD Enhancement Tasks

| ID | Task | Priority |
|----|------|----------|
| CMIX-001 | Content calendar: 2-week forward planning based on resonance + gaps | P1 |
| CMIX-002 | Per-offer content health score: % target achieved per offer per week | P1 |
| CMIX-003 | Competitive gap analysis: niches where top creators post but we don't | P2 |
| CMIX-004 | Hook template library: extract top_hook_patterns from resonance matrix as reusable templates | P1 |
| CMIX-005 | Auto-brief generation: when gap detected → Claude generates 3 content briefs for top gap | P1 |
