# 3 Meta Ads AI Systems
**Video**: https://www.youtube.com/watch?v=JDjxeB-UEoc  
**Stack**: N8N + Airtable + Replicate + Apify + Facebook Graph API + Google Slides  
**Researched**: 2026-03-01

---

## Executive Summary

Three production-ready Meta Ads automation systems used by AI agencies and sold to ecom/SaaS businesses. Each system addresses a real time-sink in Meta ad management. Deployed together, they form a complete ad intelligence and production pipeline.

---

## System 1: Automatic Product Ad Generator

**Problem**: Companies run 100s of ad variants manually. Brief → creative takes days.

**Solution**: Product image → AI ad variations (Replicate) + ad copy (LLM + Perplexity research) → Airtable in minutes.

### Architecture
- **Trigger**: New Airtable product record
- **5 N8N workflows**: product-only, product-variations, reference-style, reference-variations, ad-copy
- **Image gen**: Replicate SDXL (~$0.01-0.05/image)
- **Copy gen**: LLM (3 length variants: short/medium/long per image)
- **Product research**: Perplexity API → enriches ad copy with real product context
- **Output**: Art table in Airtable with images + copy, status = "ready_for_review"

### Key Pattern: Reference Image
The reference image path is the most powerful feature. Pass a competitor's winning ad image as reference → Replicate generates your product in that proven creative style. Combines with System 2 (spy tool identifies winning competitor ads → use as reference in System 1).

### Cost
~$0.02-0.05 per complete ad variant (5 images + 15 copy variations ≈ $0.15-0.25 total)

---

## System 2: Meta Ad Spy Tool

**Problem**: Competitive ad research is manual and time-consuming. Agencies miss competitor strategy shifts.

**Solution**: Weekly scrape of competitor Facebook Ad Libraries → LLM analysis of each ad → automated strategy reports.

### Architecture
- **Trigger**: N8N weekly schedule (Sunday 3AM recommended)
- **Scraping**: Apify Facebook Ad Library actor (~$0.50 per 100 ads)
- **Processing**: Per-ad LLM analysis (hook, offer, CTA, effectiveness score 1-10)
- **Reports**: Weekly LLM-generated strategy report per competitor
- **Storage**: Airtable (Competitors + Ads + Weekly Reports tables)

### Finding Ad Library URLs
All public. Go to brand page → About → See all → Ad Library. Or direct: `facebook.com/ads/library/?q=[BRAND]`

### Bridge to System 1
Flag competitor ads with effectiveness ≥ 8 as `reference_candidate`. Use those images as reference_image in System 1 to generate your own ads in the proven style.

---

## System 3: Automatic Meta Ad Campaign Reporting

**Problem**: Agencies spend hours building weekly/monthly client reports manually. Copy data from Ads Manager → format → slides.

**Solution**: Facebook Graph API → Google Sheets (data store) → auto-generated Google Slides with charts, breakdowns, and LLM-written conclusions.

### Architecture
- **Trigger**: N8N monthly schedule (1st of month, 9AM)
- **Data**: Facebook Graph API (campaign, platform, placement, demographic breakdowns)
- **Storage**: Google Sheets (5 tabs, append-only for trend analysis)
- **Output**: Google Slides — 7-slide report (executive summary → conclusions)
- **LLM**: Conclusions slide — top 3 wins, issues, recommended actions

### OAuth Complexity
Google Slides + Sheets require Google OAuth2 setup (Cloud Console project, consent screen, credentials). This is the only technically complex setup step — budget 30 minutes for first-time setup.

### Multi-client Agency Pattern
Duplicate N8N workflow per client. Replace ad account ID, Google Slides template ID, and recipient email. One master branded template → copy for each client report.

---

## ACTP Integration Mapping

| System | ACTP Entry Point | Notes |
|--------|-----------------|-------|
| Ad Generator output | AdLite `/api/creatives` | Upload generated images for campaign use |
| Ad Spy insights | Market research pipeline | Competitor intel feeds content strategy |
| Campaign data | MetricsLite dashboard | Performance tracking alongside organic metrics |

### Potential New Executor
A `MetaAdsExecutor` in `workflow_executors.py` could wrap all three systems:
- `action: "generate"` → trigger System 1 via N8N webhook
- `action: "spy"` → trigger System 2 for a competitor
- `action: "report"` → trigger System 3 for current period
- `action: "spy_report"` → get latest weekly report for a competitor

---

## Key Quotes

> "Many companies run hundreds of ad variations. This is a great system for agencies or businesses running Meta ads."

> "If there's an ad that stands out [from competitors], it can also be used as a reference ad in the previous system I showed to generate some ads for yourself."

> "Agencies spend a lot of time on campaign reporting to their clients — this creates these graphs, visuals and conclusions automatically."

> "Templates are great but generally need to be customized a bit to each specific use case or client."

---

## Files Created

- `skills/meta-ads/SKILL.md`
- `skills/meta-ads/justfile`
- `skills/meta-ads/sub-agents/ad-generator.md`
- `skills/meta-ads/sub-agents/ad-spy.md`
- `skills/meta-ads/sub-agents/campaign-reporter.md`
- `docs/research/meta-ads/01-meta-ads-ai-systems-JDjxeB-UEoc.md`
- Updated `AGENTS.md` — meta-ads skill registered
