---
slug: growth-intelligence-system
title: Growth Intelligence System — Closed-Loop Content + Revenue Engine
status: planning
priority: high
target_path: /Users/isaiahdupree/Documents/Software
---

# PRD: Growth Intelligence System

## Vision
A closed-loop system that turns every content asset, product, repo, and social post into a
measurable input→output signal. Every day it ingests data from YouTube, retail, social platforms,
and owned web properties, normalises it into a shared warehouse, correlates inputs to outputs,
and surfaces ranked recommendations for what to change, test, or double down on.

The system feeds Floyd (research enrichment), ACTP (content testing), and the repo/agent
marketplace pipeline. It answers: which keyword clusters, content patterns, and product pairings
drive the best outcomes — and does so automatically.

---

## Phase 1 — Data Ingestion + Warehouse (build first)

### GIS-001: YouTube Playlist + Video Sync
**Service**: `youtube-intelligence` (new, port 3120)
Ingests: playlist items, video metadata, transcripts, public stats.
- `GET /api/youtube/playlists` — list all playlists with item counts
- `GET /api/youtube/playlist/:id/videos` — video list with title, publishedAt, duration
- `POST /api/youtube/sync` — pull latest stats for all tracked videos
  Uses YouTube Data API v3: `playlistItems.list` (1 quota unit), `videos.list` for stats.
- `POST /api/youtube/transcript/:videoId` — fetch + store transcript (via youtube-transcript or yt-dlp)
- `GET /api/youtube/analytics/:videoId` — views, watchTime, avgViewDuration, ctr, impressions
  Uses YouTube Analytics API with dimensions: `video`, metrics: `views,estimatedMinutesWatched,averageViewDuration,annotationClickThroughRate`.

**Supabase tables**:
```sql
yt_videos (id, playlist_id, title, description, published_at, duration_sec, thumbnail_url, tags, synced_at)
yt_stats  (video_id, date, views, watch_time_min, avg_view_duration_sec, impressions, ctr, likes, comments, scraped_at)
yt_transcripts (video_id, language, transcript_text, word_count, extracted_at)
yt_keywords    (video_id, keyword, frequency, tfidf_score, extracted_at)
```

Passes: sync runs, ≥1 playlist + videos stored, stats have non-null views.

### GIS-002: Keyword Extraction from Transcripts
After transcript sync, run keyword extraction:
- Strip filler words + stopwords
- TF-IDF scoring across all transcripts
- Cluster by semantic similarity into `keyword_clusters`
- Store top 50 keywords per video in `yt_keywords`
- Store clusters in `keyword_clusters (cluster_id, label, keywords[], centroid_embedding)`

Tool: use Claude Haiku for cluster labelling (cheap, fast).
Passes: `yt_keywords` has rows; `keyword_clusters` has ≥5 clusters with human-readable labels.

### GIS-003: Retail / Product Data Sync
**If Shopify**: use GraphQL Admin API `orders` + `products` queries.
**If not Shopify**: ingest from whatever source is available (CSV, Gumroad, Stripe).

**Supabase tables**:
```sql
products    (id, title, category, price, url, active)
orders      (id, product_id, amount, currency, created_at, source_utm, source_content_id)
page_views  (product_id, date, sessions, pageviews, bounce_rate, avg_time_sec)
```

UTM convention: all product links from content carry `?utm_content={asset_id}&utm_campaign={campaign_id}`.
Passes: ≥1 product synced; orders joinable back to content_id where UTM present.

### GIS-004: GA4 + Search Console Sync
**GA4**: use Data API — `runReport` with dimensions `[pagePath, sessionSource, date]`,
metrics `[sessions, screenPageViews, bounceRate, averageSessionDuration, conversions]`.
**Search Console**: `searchanalytics.query` — dimensions `[query, page, date]`,
metrics `[clicks, impressions, ctr, position]`.

**Supabase tables**:
```sql
ga4_pages     (page_path, date, sessions, pageviews, bounce_rate, avg_session_sec)
gsc_queries   (query, page, date, clicks, impressions, ctr, position)
```

Passes: data flows into both tables for last 30 days.

### GIS-005: Social Post Performance Sync
Extend existing ACTP/MPLite data:
- Pull `publish_queue` outcomes: platform, content_id, posted_at, views, likes, comments, shares
- Map back to `content_assets` via content_id

**Supabase table**:
```sql
post_performance (asset_id, platform, post_id, posted_at, views, likes, comments, shares, saves, synced_at)
```

Passes: at least one platform's post metrics in table linked to an asset.

---

## Phase 2 — Normalisation + Correlation Engine

### GIS-006: Canonical Content Asset Registry
Every piece of content gets a persistent ID that survives across systems.

```sql
content_assets (
  asset_id TEXT PRIMARY KEY,   -- e.g. "yt_dQw4w9WgXcQ"
  source_platform TEXT,        -- youtube, medium, tiktok, twitter, instagram, linkedin
  source_id TEXT,              -- native platform ID
  title TEXT,
  transcript_id TEXT,
  keyword_cluster_id TEXT,
  topic_id TEXT,
  product_ids TEXT[],
  campaign_id TEXT,
  experiment_id TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

Passes: all YouTube videos, Medium posts, and social posts have an asset_id; tables join correctly.

### GIS-007: Lag-Window Correlation Analysis
Daily job that computes correlations between content publish events and downstream outcomes.

Windows: 0-24h, 1-3d, 3-7d, 7-14d, 14-28d.

For each window, compute:
- Content publish → YouTube view velocity (views/day in window)
- Content publish → site session lift (GA4 sessions vs baseline)
- Content publish → product page views lift
- Content publish → order conversions (where UTM present)
- Keyword cluster → avg view velocity
- Keyword cluster → avg conversion rate

Store results in:
```sql
correlation_results (
  asset_id, metric_name, window_days,
  value NUMERIC, baseline NUMERIC, lift_pct NUMERIC,
  computed_at TIMESTAMPTZ
)
```

Passes: at least 3 correlations computed with non-null lift values.

### GIS-008: Repeat Read / Re-engagement Tracking
For Medium posts and product pages:
- Track repeat page views per session_id (GA4 custom dimension)
- Identify "high affinity" content: read ≥2 times by ≥10% of visitors
- Store in `content_affinity (asset_id, repeat_read_rate, avg_reads_per_visitor, date)`

Passes: at least one asset with repeat_read_rate > 0.

### GIS-009: Cross-Platform Keyword Performance
Join `yt_keywords` → `gsc_queries` → `post_performance` on normalised keyword text.

Output view:
```sql
CREATE VIEW keyword_performance AS
SELECT
  kc.label AS cluster,
  AVG(ys.views)         AS avg_yt_views,
  AVG(gq.clicks)        AS avg_search_clicks,
  AVG(gq.ctr)           AS avg_search_ctr,
  AVG(pp.likes)         AS avg_social_likes,
  COUNT(DISTINCT ca.asset_id) AS asset_count
FROM keyword_clusters kc
JOIN yt_keywords yk ON yk.keyword = ANY(kc.keywords)
...
GROUP BY kc.label
ORDER BY avg_yt_views DESC;
```

Passes: view returns ≥5 rows with non-null values.

---

## Phase 3 — Intelligence + Recommendations

### GIS-010: Floyd Research Enrichment Worker
**File**: `harness/floyd-enrichment.js`
**Trigger**: new video transcript or content asset synced.
**Process**:
1. Send transcript + asset metadata to Claude Haiku
2. Extract: problems solved, tools mentioned, audience signals, desired outcomes, objections
3. Cross-reference against `keyword_clusters` and recent `gsc_queries` (what people are searching)
4. Generate: 3 content angle suggestions, 1 agent product idea, 1 repo/tool pitch
5. Store in `floyd_enrichments (asset_id, angles[], agent_idea, tool_pitch, generated_at)`

Passes: at least one enrichment per video; angles are non-generic (mention specific keywords from transcript).

### GIS-011: Recommendation Engine (Daily Job)
Runs every morning. Outputs ranked list of recommended actions.

Inputs: correlation_results, keyword_performance, floyd_enrichments, experiment_registry.
Outputs:
```sql
recommendations (
  id, type TEXT, priority INT,
  title TEXT, rationale TEXT,
  evidence JSONB,      -- cited correlation values
  action JSONB,        -- specific action to take
  experiment_id TEXT,  -- links to test if applicable
  generated_at TIMESTAMPTZ, acted_on_at TIMESTAMPTZ
)
```

Types: `repost`, `keyword_pivot`, `product_angle`, `repo_pitch`, `agent_offer`, `paywall`, `cta_change`.

Passes: at least 5 recommendations generated with non-null evidence.

### GIS-012: Experiment Registry
Every controlled change tracked with before/after:
```sql
experiments (
  experiment_id TEXT PRIMARY KEY,
  type TEXT,
  hypothesis TEXT,
  control JSONB,
  variant JSONB,
  success_metric TEXT,
  success_threshold NUMERIC,
  start_date DATE,
  end_date DATE,
  result TEXT,    -- pending, winner, inconclusive
  lift_pct NUMERIC
)
```

No recommendation executes without an experiment record.
Passes: at least one experiment tracked with a defined success metric.

### GIS-013: Repo + Tool Commercialisation Pipeline
For each repo:
- Auto-generate landing page copy from README + Floyd enrichment
- Assign: one promise, one audience, one price hypothesis, one CTA
- Track: impressions, CTR, signups, purchases per experiment_id
- Store in `repo_offers (repo_id, title, promise, audience, price_cents, landing_url, experiment_id)`

Passes: at least 3 repos have offer records; at least one has impression/CTR data.

### GIS-014: Agent Marketplace Generator
From `floyd_enrichments.agent_idea`:
- Generate marketplace description + use cases
- Create Supabase row in `agent_offers (asset_id, name, description, use_cases[], price_cents, marketplace_url, experiment_id)`
- Publish to relevant marketplace (Agentive, Claude.ai skills, custom storefront)

Passes: at least one agent offer generated with description + use cases from Floyd.

---

## Phase 4 — Feedback Loop + Continuous Improvement

### GIS-015: Feedback Check Test Suite (runs daily)
Automated test suite that validates the whole pipeline:

**Ingestion tests**:
- YouTube API auth valid
- Latest stats pulled within 24h
- GSC data within 24h
- GA4 data within 24h

**Freshness tests**:
- `yt_stats` has rows for today or yesterday
- `post_performance` has rows within 48h
- `correlation_results` computed within 24h

**Reconciliation tests**:
- `yt_videos` count matches YouTube API count for each playlist
- `post_performance` row count matches MPLite published count within 5%

**Attribution tests**:
- All published posts have asset_id in content_assets
- Orders with UTM source join back to content_assets

**Decision tests**:
- Every recommendation has non-null evidence
- No experiment without success_metric and start_date

Passes: all checks pass; failures sent to Telegram via bot.

### GIS-016: Telegram Daily Intelligence Report
Every morning at 8am, Telegram bot sends:
```
📊 Growth Intelligence — {date}

Top performing content (7d):
• {title} — {views} views, +{lift}% vs baseline

Best keyword clusters:
• {cluster} — {avg_views} avg views, {ctr}% search CTR

Recommended actions today:
1. {recommendation_1}
2. {recommendation_2}
3. {recommendation_3}

Active experiments: {n}
Pending actions: {n}
```

Passes: report sent at 8am with real data.

---

## Unified Data Architecture

### Shared entity IDs
| Entity | ID format | Example |
|--------|-----------|---------|
| YouTube video | `yt_{videoId}` | `yt_dQw4w9WgXcQ` |
| Medium post | `med_{postId}` | `med_abc123` |
| Social post | `{platform}_{postId}` | `tw_1234567890` |
| Product | `prod_{sku}` | `prod_ai-audit-v1` |
| Keyword cluster | `kc_{uuid}` | `kc_a1b2c3` |
| Experiment | `exp_{slug}-{date}` | `exp_jungle-hook-20260307` |

### Lag window schema
All correlation results store `window_days` so you can query any window independently.
Default dashboard view: 7-day window (best signal/noise for most content types).

---

## Services Summary

| Service | Port | Purpose |
|---------|------|---------|
| youtube-intelligence | 3120 | YouTube data sync + analytics |
| floyd-enrichment | daemon | Research + angle generation |
| correlation-engine | daemon | Daily correlation jobs |
| recommendation-engine | daemon | Daily recommendation generation |
| experiment-registry | via Supabase | Track all A/B tests |
| gis-dashboard | 3121 | Web UI: correlations, recommendations, experiments |

---

## Build Order
1. GIS-001 (YouTube sync) — foundation, everything else depends on video data
2. GIS-003 (retail sync) — needed for conversion correlation
3. GIS-004 (GA4/GSC) — needed for search + site signal
4. GIS-006 (asset registry) — normalise IDs across all sources
5. GIS-002 (keyword extraction) — unlocks cluster analysis
6. GIS-007 (correlation engine) — first intelligence layer
7. GIS-005 (social performance) — close the content loop
8. GIS-010 (Floyd enrichment) — agent/product generation
9. GIS-011 (recommendations) — daily action list
10. GIS-015 (feedback tests) — reliability guarantee
11. GIS-016 (Telegram report) — daily closed loop
12. GIS-012–014 (experiments, repos, agents) — commercialisation layer
