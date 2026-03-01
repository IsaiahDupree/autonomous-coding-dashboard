# PRD-039 — Threads Research Agent

**Status:** Draft  
**Priority:** P1  
**Domain:** `threads_research`  
**Module:** `actp-worker/threads_research_agent.py`  
**Supabase Project:** ivhfuhxorppptyuofbgq  
**Safari Automation Service:** port 3004 (threads-comments / threads-researcher)

---

## Overview

The Threads Research Agent is a Claude Code–dispatchable domain module that drives all Threads-platform intelligence: niche post scraping, top-creator identification, content framework extraction, engagement analysis, cross-niche comparison, and ingestion of structured results into Supabase. It wraps the existing `ThreadsResearcher` TypeScript class via the Safari Automation API running on port 3004, and exposes a clean Python CLI used by `multi_agent_dispatch.py`.

---

## Goals

1. Collect 1,000+ posts per niche query from Threads, deduplicated and engagement-scored.
2. Identify and enrich the top 100 creators per niche with follower count, bio, and top posts.
3. Detect content frameworks (hooks, formats, CTA patterns) that drive high engagement on Threads.
4. Store all results in Supabase (`actp_threads_research`, `actp_threads_creators`, `actp_threads_frameworks`).
5. Surface actionable niche intelligence for content production, DM targeting, and offer validation.
6. Run on a scheduled cadence (Tue 3 AM) and on-demand via dispatch CLI.
7. Send Telegram summary after each niche sweep with top post/creator stats.

---

## Architecture

```
multi_agent_dispatch.py
  └─► threads_research_agent.py
        ├─► POST http://localhost:3004/api/research/threads/niche   (ThreadsResearcher.researchNiche)
        ├─► POST http://localhost:3004/api/research/threads/search  (keyword search)
        ├─► POST http://localhost:3004/api/research/threads/creators (creator enrichment)
        └─► Supabase (actp_threads_research, actp_threads_creators, actp_threads_frameworks)
```

**ThreadsPost schema (from TypeScript):**
```typescript
{ id, url, text, author, authorDisplayName, isVerified, likes, replies, reposts,
  engagementScore, hasMedia, timestamp, niche, collectedAt }
```

**ThreadsCreator schema:**
```typescript
{ handle, displayName, isVerified, followers, following, bio,
  postCount, totalLikes, totalReplies, totalReposts, totalEngagement,
  avgEngagement, topPostUrl, topPostEngagement, topPosts[], niche }
```

---

## Target Niches (5 primary)

| Niche | Query Terms |
|-------|-------------|
| `ai_automation` | "ai automation", "claude", "no-code ai" |
| `saas_growth` | "saas", "build in public", "founder" |
| `content_creation` | "content strategy", "grow on threads" |
| `digital_marketing` | "marketing", "lead gen", "conversion" |
| `creator_economy` | "creator", "audience building", "monetize" |

---

## Supabase Tables

### `actp_threads_research`
```sql
CREATE TABLE actp_threads_research (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id         TEXT NOT NULL,
  url             TEXT UNIQUE,
  text            TEXT,
  author_handle   TEXT,
  author_name     TEXT,
  is_verified     BOOLEAN DEFAULT false,
  likes           INTEGER DEFAULT 0,
  replies         INTEGER DEFAULT 0,
  reposts         INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  has_media       BOOLEAN DEFAULT false,
  niche           TEXT,
  source_platform TEXT DEFAULT 'threads',
  scraped_at      TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON actp_threads_research(niche, engagement_score DESC);
CREATE INDEX ON actp_threads_research(author_handle);
```

### `actp_threads_creators`
```sql
CREATE TABLE actp_threads_creators (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  handle          TEXT NOT NULL,
  display_name    TEXT,
  is_verified     BOOLEAN DEFAULT false,
  followers       INTEGER DEFAULT 0,
  following       INTEGER DEFAULT 0,
  bio             TEXT,
  post_count      INTEGER DEFAULT 0,
  total_engagement INTEGER DEFAULT 0,
  avg_engagement  NUMERIC(10,2) DEFAULT 0,
  top_post_url    TEXT,
  top_post_engagement INTEGER DEFAULT 0,
  niche           TEXT,
  source_platform TEXT DEFAULT 'threads',
  last_scraped_at TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(handle, niche)
);
CREATE INDEX ON actp_threads_creators(niche, total_engagement DESC);
```

### `actp_threads_frameworks`
```sql
CREATE TABLE actp_threads_frameworks (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  pattern         TEXT,
  example_post_url TEXT,
  avg_engagement  NUMERIC(10,2),
  niche           TEXT,
  hook_type       TEXT,   -- question | bold_claim | story | list | contrarian
  format_type     TEXT,   -- thread | single | carousel
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, niche)
);
```

---

## CLI Interface

```bash
python3 threads_research_agent.py --search "ai automation"     # keyword search, 200 posts
python3 threads_research_agent.py --niche ai_automation        # full niche sweep, 1000 posts
python3 threads_research_agent.py --all-niches                 # all 5 niches
python3 threads_research_agent.py --creators ai_automation     # enrich top 10 creators
python3 threads_research_agent.py --frameworks ai_automation   # extract content frameworks
python3 threads_research_agent.py --top-posts ai_automation    # show top posts by engagement
python3 threads_research_agent.py --compare                    # cross-niche engagement comparison
python3 threads_research_agent.py --status                     # row counts per niche
python3 threads_research_agent.py --full                       # all-niches + creators + frameworks
```

### Dispatch Integration
```python
AGENTS["threads_research"] = {
    "search":    ("threads_research_agent.py", ["--search"]),
    "niche":     ("threads_research_agent.py", ["--niche", "ai_automation"]),
    "all":       ("threads_research_agent.py", ["--all-niches"]),
    "creators":  ("threads_research_agent.py", ["--creators", "ai_automation"]),
    "frameworks":("threads_research_agent.py", ["--frameworks", "ai_automation"]),
    "status":    ("threads_research_agent.py", ["--status"]),
}
```

---

## Cron Schedule

| Job | Schedule | Action |
|-----|----------|--------|
| `threads_research_niche` | Tue 3 AM | `--all-niches` |
| `threads_creator_enrich`  | Tue 4 AM | `--creators` for each niche |
| `threads_frameworks`      | Tue 5 AM | `--frameworks` for top niche |
| `threads_research_weekly` | Mon 3 AM | existing in cron_definitions.py |

---

## Telegram Alert Format

```
🧵 Threads Research Complete
Niche: ai_automation
Posts: 1,043 collected
Top creator: @handle (avg 847 engagement)
Top post: 2,341 engagement — "Nobody talks about this..."
Frameworks: 4 extracted
Tables updated: actp_threads_research, actp_threads_creators
```

---

## Feature Map (150 features → see multi-agent-features-batch2.json)

- THRD-001 to THRD-150: research pipeline, creator enrichment, framework extraction, trend detection, cross-niche comparison, Supabase ingestion, Telegram alerts, cron scheduling, CLI, error handling, retry logic, deduplication, engagement scoring, niche config, Safari service health checks, rate limiting, output formatting, data quality validation, conflict resolution, incremental updates.

---

## Acceptance Criteria

- [ ] `--search "ai automation"` returns ≥ 50 posts with engagement scores
- [ ] `--niche ai_automation` collects ≥ 500 posts and upserts to `actp_threads_research`
- [ ] `--creators ai_automation` enriches top 10 handles with follower/bio data
- [ ] `--frameworks` extracts ≥ 3 named framework patterns from top posts
- [ ] `--all-niches` completes all 5 niches and sends Telegram summary
- [ ] `--status` prints row counts per niche from Supabase
- [ ] Duplicate posts are skipped on re-run (UNIQUE url constraint)
- [ ] Service health check: port 3004 is reachable before scraping
- [ ] All data persists to Supabase with correct schema (no missing columns)
- [ ] Dispatch: `multi_agent_dispatch.py --domain threads_research --task all` runs cleanly

---

## ACD Enhancement Tasks

1. Implement `threads_research_agent.py` with all CLI flags above
2. Create Supabase migration for the 3 new tables
3. Add framework extraction logic: cluster top posts by hook pattern using Claude
4. Add cross-niche comparison: rank niches by avg_engagement, produce `threads_niche_report`
5. Wire into `business_signal_engine.py` to trigger when Threads niche trends spike
6. Add `--since DAYS` flag to only fetch posts newer than N days
7. Add creator profile enrichment retry with 3-attempt backoff
8. Add Telegram alert delivery after `--all-niches` sweep
