# PRD-008: Autonomous Twitter/X Research & Posting Pipeline

## Status: Draft
## Author: Isaiah Dupree
## Created: 2026-02-22
## Priority: P0 — Core growth engine for Twitter/X presence
## Depends On: PRD-001 (Workflow Engine), PRD-002 (Local Agent Daemon), PRD-003 (Safari Research Pipeline)

---

## 1. Problem Statement

Twitter/X is an untapped distribution channel in the ACTP loop. The current system handles video content (TikTok, YouTube, Instagram) but has no pipeline for text-first platforms. Twitter/X requires a fundamentally different approach:

1. **No market intelligence** — We don't know what tweets perform well in our niches
2. **No creator graph** — We haven't mapped the top 50-100 creators per niche
3. **No living research doc** — No evolving knowledge base of winning patterns, frameworks, and hooks
4. **No tweet generation** — No pipeline to create niche-relevant tweets backed by research + offer + creator personality
5. **No engagement automation** — No system to reply to relevant tweets with offer-aligned responses
6. **No creator input integration** — No way to incorporate the creator's saved inspiration (YouTube playlists, Messenger notes, Telegram saves)

**Vision**: An autonomous AI tweeting bot backed by deep market research, creator personality, and product offers — publishing original tweets and strategic replies on a scheduled cadence.

---

## 2. Solution Overview

A 5-phase pipeline that continuously:

1. **Research** — Safari automation scrapes 5,000+ tweets (1,000 per niche) across 5 niches
2. **Analyze** — Rank by performance, extract frameworks, identify winning patterns
3. **Map Creators** — Find 50-100 top creators per niche, track their output
4. **Generate** — Create tweets backed by research + offer + creator voice + saved inspiration
5. **Publish & Engage** — Schedule tweet drops + strategic replies to high-value threads

---

## 3. Architecture

```
Phase 1: RESEARCH (Safari → ResearchLite)
──────────────────────────────────────────
Safari browses twitter.com/search for each niche keyword
  → Extract 1,000 tweets per niche (5 niches = 5,000 tweets)
  → For each tweet: text, author, views, likes, replies, retweets, quotes, bookmarks
  → Upload structured data to ResearchLite /api/research/ingest
  → Store in actp_twitter_research table

Phase 2: ANALYZE (ContentLite → ResearchLite)
─────────────────────────────────────────────
ContentLite AI analysis on collected tweets:
  → Rank tweets by composite engagement score
  → Identify hook patterns (first line analysis)
  → Map to known frameworks (AIDA, PAS, storytelling, contrarian, thread-based)
  → Discover NEW frameworks from data
  → Tag tweets by: framework, emotion, CTA type, content type
  → Build niche-specific playbooks
  → Store analysis in actp_twitter_frameworks table

Phase 3: CREATOR MAPPING (Safari → CRMLite)
────────────────────────────────────────────
From top-performing tweets, extract unique authors:
  → Visit each author's profile
  → Extract: bio, follower count, following, post frequency, avg engagement
  → Rank authors by influence score (engagement × consistency × niche-relevance)
  → Select top 50-100 per niche
  → Store in crm_contacts with tag "twitter_influencer_{niche}"
  → Track their new tweets for ongoing research updates

Phase 4: GENERATE (ContentLite + Creator Input)
────────────────────────────────────────────────
Generate tweets combining:
  A. Market research (what works in the niche)
  B. Offer alignment (product/service being promoted)
  C. Creator voice (writing style, personality, values)
  D. Saved inspiration sources:
     - YouTube playlists annotated as inspirational
     - Messenger/Telegram saved messages
     - iOS Notes or clipboard captures
     - Manual input via chat interface
  → ContentLite /api/generate/tweet with full context
  → AI Review Gate (PRD-005) for quality check
  → Store approved tweets in actp_twitter_queue

Phase 5: PUBLISH & ENGAGE (Safari → Twitter/X)
───────────────────────────────────────────────
Scheduled publishing:
  → Tweet drops on optimal schedule (Thompson Sampling timing from PublishLite)
  → 3-8 original tweets per day
  → 5-15 strategic replies per day to high-value threads
  → Reply selection based on: niche relevance, author influence, recency, offer alignment
  → Track performance via Safari scraping of own tweet metrics
  → Feed results back to Phase 2 for continuous improvement
```

---

## 4. Data Model

### 4.1 `actp_twitter_research` — Raw tweet data from Safari scraping

```sql
CREATE TABLE actp_twitter_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id TEXT UNIQUE NOT NULL,
  author_handle TEXT NOT NULL,
  author_display_name TEXT,
  author_follower_count INTEGER,
  tweet_text TEXT NOT NULL,
  tweet_url TEXT,
  niche TEXT NOT NULL,
  search_keyword TEXT,
  
  -- Engagement metrics
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  retweets INTEGER DEFAULT 0,
  quotes INTEGER DEFAULT 0,
  bookmarks INTEGER DEFAULT 0,
  engagement_score FLOAT GENERATED ALWAYS AS (
    (likes * 1.0 + replies * 3.0 + retweets * 5.0 + quotes * 7.0 + bookmarks * 2.0) / GREATEST(views, 1) * 1000
  ) STORED,
  
  -- Analysis
  framework_tags TEXT[] DEFAULT '{}',
  hook_type TEXT,
  content_type TEXT, -- original, thread, reply, quote
  emotion_tags TEXT[] DEFAULT '{}',
  cta_type TEXT,
  has_media BOOLEAN DEFAULT FALSE,
  media_type TEXT, -- image, video, gif, none
  
  -- Metadata
  tweet_date TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  research_batch_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_twitter_research_niche ON actp_twitter_research(niche);
CREATE INDEX idx_twitter_research_engagement ON actp_twitter_research(engagement_score DESC);
CREATE INDEX idx_twitter_research_author ON actp_twitter_research(author_handle);
```

### 4.2 `actp_twitter_frameworks` — Discovered content frameworks

```sql
CREATE TABLE actp_twitter_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  niche TEXT,
  
  -- Pattern definition
  hook_pattern TEXT, -- regex or description of the opening line pattern
  structure TEXT, -- e.g. "hook → insight → proof → CTA"
  example_tweet_ids TEXT[] DEFAULT '{}',
  avg_engagement_score FLOAT,
  
  -- Usage stats
  times_used INTEGER DEFAULT 0,
  avg_performance_when_used FLOAT,
  
  -- Discovery
  discovered_by TEXT DEFAULT 'ai_analysis', -- ai_analysis, manual, known_framework
  confidence FLOAT DEFAULT 0.5,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.3 `actp_twitter_creators` — Top creators per niche

```sql
CREATE TABLE actp_twitter_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  niche TEXT NOT NULL,
  
  -- Profile metrics
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  tweet_count INTEGER DEFAULT 0,
  avg_engagement_rate FLOAT DEFAULT 0,
  post_frequency_per_week FLOAT DEFAULT 0,
  
  -- Ranking
  influence_score FLOAT DEFAULT 0,
  rank_in_niche INTEGER,
  
  -- Tracking
  last_scraped_at TIMESTAMPTZ,
  is_tracked BOOLEAN DEFAULT TRUE,
  crm_contact_id UUID, -- FK to crm_contacts if linked
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_twitter_creators_niche ON actp_twitter_creators(niche, influence_score DESC);
```

### 4.4 `actp_twitter_queue` — Tweets awaiting publication

```sql
CREATE TABLE actp_twitter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_type TEXT NOT NULL, -- original, reply, quote, thread
  tweet_text TEXT NOT NULL,
  
  -- Context
  niche TEXT,
  framework_used TEXT,
  offer_alignment TEXT, -- how this connects to the product/offer
  inspiration_source TEXT, -- research, creator_input, youtube_playlist, messenger, etc.
  
  -- Reply/Quote context
  reply_to_tweet_id TEXT,
  reply_to_author TEXT,
  quote_tweet_id TEXT,
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  priority INTEGER DEFAULT 5, -- 1=highest, 10=lowest
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, approved, scheduled, published, failed
  review_score FLOAT,
  review_decision TEXT,
  
  -- Published
  published_tweet_id TEXT,
  published_at TIMESTAMPTZ,
  published_url TEXT,
  
  -- Performance (scraped after publishing)
  post_views INTEGER DEFAULT 0,
  post_likes INTEGER DEFAULT 0,
  post_replies INTEGER DEFAULT 0,
  post_retweets INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_twitter_queue_status ON actp_twitter_queue(status, scheduled_at);
```

### 4.5 `actp_creator_inputs` — Creator's saved inspiration sources

```sql
CREATE TABLE actp_creator_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL, -- youtube_playlist, messenger, telegram, ios_notes, manual, clipboard
  source_id TEXT, -- playlist ID, conversation ID, etc.
  content TEXT NOT NULL,
  
  -- Processing
  extracted_themes TEXT[] DEFAULT '{}',
  extracted_hooks TEXT[] DEFAULT '{}',
  sentiment TEXT,
  relevance_score FLOAT,
  
  -- Usage
  used_in_tweet_ids TEXT[] DEFAULT '{}',
  times_referenced INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Research Configuration

### 5.1 Niche Definitions

```json
{
  "niches": [
    {
      "name": "ai_automation",
      "keywords": ["AI automation", "AI tools", "automate with AI", "AI workflow", "AI agent"],
      "hashtags": ["#AIautomation", "#AItools", "#nocode"],
      "target_tweets": 1000,
      "target_creators": 100
    },
    {
      "name": "saas_growth",
      "keywords": ["SaaS growth", "micro SaaS", "indie hacker", "build in public", "SaaS marketing"],
      "hashtags": ["#SaaS", "#indiehacker", "#buildinpublic"],
      "target_tweets": 1000,
      "target_creators": 100
    },
    {
      "name": "content_creation",
      "keywords": ["content strategy", "viral content", "content creator tips", "social media growth"],
      "hashtags": ["#contentcreator", "#socialmedia", "#growthhacking"],
      "target_tweets": 1000,
      "target_creators": 50
    },
    {
      "name": "digital_marketing",
      "keywords": ["digital marketing", "marketing strategy", "paid ads", "funnel optimization"],
      "hashtags": ["#digitalmarketing", "#marketing", "#funnels"],
      "target_tweets": 1000,
      "target_creators": 50
    },
    {
      "name": "creator_economy",
      "keywords": ["creator economy", "monetize audience", "personal brand", "newsletter growth"],
      "hashtags": ["#creatoreconomy", "#personalbrand", "#newsletter"],
      "target_tweets": 1000,
      "target_creators": 50
    }
  ]
}
```

### 5.2 Engagement Scoring Formula

```
engagement_score = (
  likes × 1.0 +
  replies × 3.0 +       # replies signal conversation
  retweets × 5.0 +      # retweets signal share-worthiness
  quotes × 7.0 +        # quotes signal thought-provocation
  bookmarks × 2.0       # bookmarks signal save-worthy
) / max(views, 1) × 1000
```

### 5.3 Creator Influence Score

```
influence_score = (
  avg_engagement_rate × 0.4 +
  log10(follower_count) × 0.2 +
  post_frequency_normalized × 0.2 +
  niche_relevance × 0.2
)
```

---

## 6. Safari Scraping Specification

### 6.1 Tweet Search Scraping

```javascript
// Safari JavaScript injection for twitter.com/search
// Target: twitter.com/search?q={keyword}&src=typed_query&f=top

const tweets = [];
const tweetElements = document.querySelectorAll('[data-testid="tweet"]');

for (const el of tweetElements) {
  const authorEl = el.querySelector('[data-testid="User-Name"]');
  const textEl = el.querySelector('[data-testid="tweetText"]');
  const metricsEls = el.querySelectorAll('[data-testid$="count"]');
  
  tweets.push({
    author_handle: authorEl?.querySelector('a[href^="/"]')?.href?.split('/').pop(),
    author_display_name: authorEl?.querySelector('span')?.textContent,
    tweet_text: textEl?.textContent,
    tweet_url: el.querySelector('a[href*="/status/"]')?.href,
    metrics: {
      replies: parseMetric(metricsEls[0]),
      retweets: parseMetric(metricsEls[1]),
      likes: parseMetric(metricsEls[2]),
      views: parseMetric(metricsEls[3]),
      bookmarks: parseMetric(metricsEls[4])
    },
    has_media: !!el.querySelector('[data-testid="tweetPhoto"], video'),
    media_type: el.querySelector('video') ? 'video' : el.querySelector('[data-testid="tweetPhoto"]') ? 'image' : 'none'
  });
}

function parseMetric(el) {
  if (!el) return 0;
  const text = el.textContent.trim();
  if (text.endsWith('K')) return parseFloat(text) * 1000;
  if (text.endsWith('M')) return parseFloat(text) * 1000000;
  return parseInt(text.replace(/,/g, '')) || 0;
}
```

### 6.2 Creator Profile Scraping

```javascript
// Safari JavaScript injection for twitter.com/{handle}
const profile = {
  handle: window.location.pathname.replace('/', ''),
  display_name: document.querySelector('[data-testid="UserName"]')?.textContent,
  bio: document.querySelector('[data-testid="UserDescription"]')?.textContent,
  follower_count: parseMetric(document.querySelector('a[href$="/followers"] span')),
  following_count: parseMetric(document.querySelector('a[href$="/following"] span')),
  // Recent tweets for engagement rate calculation
  recent_tweets: [] // populated by scrolling
};
```

### 6.3 Anti-Detection Measures

- **Realistic timing**: 2-5 second delays between scrolls, 5-15 seconds between page navigations
- **Session persistence**: Use existing logged-in Safari session, no cookie manipulation
- **Rate limits**: Max 100 pages per hour, max 500 tweets per session
- **Scroll patterns**: Randomized scroll distances (300-800px), occasional pauses
- **Break periods**: 5-minute break every 30 minutes of scraping
- **User-agent**: Native Safari UA (no spoofing needed — it IS Safari)

---

## 7. Tweet Generation System

### 7.1 Generation Prompt Template

```
You are a Twitter/X content strategist creating tweets for {creator_name}.

CONTEXT:
- Niche: {niche}
- Offer: {offer_description}
- Creator voice: {voice_profile}
- Top-performing frameworks in this niche:
  {top_frameworks_with_examples}

INSPIRATION SOURCES:
- Research insights: {recent_research_themes}
- Creator's saved notes: {creator_inputs}
- Trending topics: {trending_in_niche}
- Top creator posts this week: {top_creator_posts}

TASK: Generate {count} tweets that:
1. Use a proven framework from the research
2. Align with the creator's offer without being salesy
3. Match the creator's authentic voice and values
4. Provide genuine value to the niche audience
5. Are under 280 characters (or structured as a thread if needed)

For each tweet, specify:
- framework_used
- hook_type (question, contrarian, statistic, story, list)
- offer_alignment (direct, indirect, none)
- optimal_post_time (based on engagement data)
```

### 7.2 Reply Generation

```
CONTEXT: You're replying to a tweet in {niche} to add value and build authority.

ORIGINAL TWEET:
Author: @{author} ({follower_count} followers)
Text: "{tweet_text}"
Engagement: {views} views, {likes} likes, {replies} replies

REPLY STRATEGY:
- Add a unique insight the author didn't mention
- Share a relevant personal experience or data point
- Ask a thought-provoking follow-up question
- Keep it under 280 characters
- DO NOT pitch — build genuine rapport
- Reference the creator's expertise naturally if relevant

OFFER CONTEXT (for subtle alignment only):
{offer_description}
```

---

## 8. Scheduling Strategy

### 8.1 Daily Cadence

| Time Slot | Type | Count | Strategy |
|-----------|------|-------|----------|
| 7:00-8:00 AM | Original | 1-2 | Morning insight, motivational |
| 10:00-11:00 AM | Reply | 3-5 | Engage with morning posts |
| 12:00-1:00 PM | Original | 1 | Midday value post |
| 2:00-3:00 PM | Reply | 3-5 | Afternoon engagement |
| 5:00-6:00 PM | Original | 1-2 | End-of-day thread or insight |
| 8:00-9:00 PM | Reply | 2-3 | Evening engagement |
| 10:00 PM | Original | 1 | Late-night thought-provoker |

### 8.2 Thompson Sampling Optimization

Use PublishLite's Thompson Sampling to optimize:
- **Best day of week** per niche
- **Best time of day** per content type
- **Best framework** per engagement metric
- Continuously adjust based on actual performance data

---

## 9. Living Research Document

### 9.1 `actp_twitter_playbook` — Ever-evolving strategy doc

The system maintains a living document (stored in Supabase + synced to Obsidian vault) that includes:

1. **Niche Landscape** — Current state of each niche, trending topics, sentiment
2. **Framework Catalog** — All discovered frameworks with performance data and examples
3. **Creator Leaderboard** — Top creators per niche with recent activity
4. **Hook Library** — Collection of proven hooks categorized by type and performance
5. **Offer Integration Playbook** — Best practices for weaving offers into content
6. **Weekly Performance Report** — What worked, what didn't, adjustments needed
7. **Emerging Trends** — New patterns detected in the latest research batch

This document is regenerated weekly by ContentLite AI analysis and stored in:
- `~/.memory/vault/TWITTER-PLAYBOOK.md` (Obsidian)
- `actp_twitter_playbook` table (Supabase, versioned)

---

## 10. Workflow Definition

```json
{
  "slug": "twitter-research-to-publish",
  "name": "Twitter/X Research → Generate → Publish Pipeline",
  "description": "Autonomous Twitter pipeline: research 5K tweets, map creators, generate content, publish tweets + replies",
  "steps": [
    {
      "slug": "research-tweets",
      "name": "Safari Tweet Research",
      "type": "local_task",
      "task_type": "safari_twitter_research",
      "config": {
        "niches": 5,
        "tweets_per_niche": 1000,
        "platforms": ["twitter"]
      },
      "timeout_seconds": 7200,
      "max_retries": 2
    },
    {
      "slug": "analyze-tweets",
      "name": "AI Tweet Analysis & Framework Discovery",
      "type": "cloud_api",
      "service": "contentlite",
      "endpoint": "/api/generate/tweet-analysis",
      "depends_on": ["research-tweets"],
      "timeout_seconds": 300
    },
    {
      "slug": "map-creators",
      "name": "Safari Creator Profile Scraping",
      "type": "local_task",
      "task_type": "safari_twitter_creators",
      "depends_on": ["research-tweets"],
      "config": {
        "top_n_per_niche": 100
      },
      "timeout_seconds": 3600,
      "max_retries": 2
    },
    {
      "slug": "update-playbook",
      "name": "Regenerate Living Research Document",
      "type": "cloud_api",
      "service": "contentlite",
      "endpoint": "/api/generate/twitter-playbook",
      "depends_on": ["analyze-tweets", "map-creators"],
      "timeout_seconds": 120
    },
    {
      "slug": "generate-tweets",
      "name": "Generate Original Tweets + Replies",
      "type": "cloud_api",
      "service": "contentlite",
      "endpoint": "/api/generate/tweets",
      "depends_on": ["update-playbook"],
      "config": {
        "original_count": 7,
        "reply_count": 15,
        "days_ahead": 1
      },
      "timeout_seconds": 120
    },
    {
      "slug": "review-tweets",
      "name": "AI Content Review Gate",
      "type": "cloud_api",
      "service": "contentlite",
      "endpoint": "/api/review",
      "depends_on": ["generate-tweets"],
      "condition": "generated_count >= 1",
      "timeout_seconds": 60
    },
    {
      "slug": "schedule-tweets",
      "name": "Schedule Approved Tweets",
      "type": "cloud_api",
      "service": "publishlite",
      "endpoint": "/api/publish/schedule",
      "depends_on": ["review-tweets"],
      "condition": "review_decision != 'REJECT'",
      "timeout_seconds": 30
    },
    {
      "slug": "publish-tweets",
      "name": "Safari Publishes Tweets to Twitter/X",
      "type": "local_task",
      "task_type": "safari_twitter_publish",
      "depends_on": ["schedule-tweets"],
      "config": {
        "use_scheduled_times": true,
        "include_replies": true
      },
      "timeout_seconds": 1800,
      "max_retries": 3
    },
    {
      "slug": "track-performance",
      "name": "Scrape Tweet Performance Metrics",
      "type": "local_task",
      "task_type": "safari_twitter_metrics",
      "depends_on": ["publish-tweets"],
      "config": {
        "delay_hours": 24,
        "scrape_own_tweets": true
      },
      "timeout_seconds": 600
    }
  ],
  "schedule": {
    "research": "0 2 * * 1",
    "daily_generation": "0 5 * * *",
    "metrics_collection": "0 22 * * *"
  }
}
```

---

## 11. Creator Input Integration

### 11.1 Supported Input Sources

| Source | Method | Data Extracted |
|--------|--------|----------------|
| YouTube Playlists | Safari scrape playlist page | Video titles, descriptions, themes |
| Messenger | API webhook or manual paste | Saved messages, links, notes |
| Telegram | Bot API or manual export | Saved messages, forwarded content |
| iOS Notes | Shortcut → webhook | Note text, embedded links |
| Manual Input | Chat interface / CLI | Free-form text, topics, angles |
| Clipboard | macOS clipboard monitor | Copied text, URLs |

### 11.2 Processing Pipeline

```
Input arrives → actp_creator_inputs table
  → ContentLite extracts themes, hooks, angles
  → Tags with niche relevance score
  → Available as context in tweet generation prompt
  → Usage tracked (which inputs inspired which tweets)
```

---

## 12. Success Metrics

| Metric | Target (Month 1) | Target (Month 3) |
|--------|-------------------|-------------------|
| Tweets researched | 5,000 | 20,000 |
| Creators mapped | 350 | 500 |
| Frameworks discovered | 15 | 50 |
| Tweets published/day | 5 | 8 |
| Replies published/day | 10 | 15 |
| Avg engagement rate | 0.5% | 2.0% |
| Follower growth/month | 500 | 5,000 |
| Profile visits from replies | 50/day | 200/day |
| Offer link clicks | 10/day | 100/day |

---

## 13. Implementation Phases

### Phase 1: Research Foundation (Week 1-2)
- [ ] Create `actp_twitter_research` table
- [ ] Create `actp_twitter_creators` table
- [ ] Create `actp_twitter_frameworks` table
- [ ] Build `SafariTwitterResearchExecutor` in actp-worker
- [ ] Implement tweet search scraping (5 niches × 1,000 tweets)
- [ ] Implement creator profile scraping
- [ ] Upload research data to ResearchLite

### Phase 2: Analysis & Playbook (Week 2-3)
- [ ] Build ContentLite `/api/generate/tweet-analysis` endpoint
- [ ] Build ContentLite `/api/generate/twitter-playbook` endpoint
- [ ] Implement framework discovery AI
- [ ] Generate initial living research document
- [ ] Sync playbook to Obsidian vault

### Phase 3: Tweet Generation (Week 3-4)
- [ ] Create `actp_twitter_queue` table
- [ ] Create `actp_creator_inputs` table
- [ ] Build ContentLite `/api/generate/tweets` endpoint
- [ ] Integrate creator input sources
- [ ] Implement AI review gate for tweets
- [ ] Build tweet scheduling with Thompson Sampling

### Phase 4: Publishing & Engagement (Week 4-5)
- [ ] Build `SafariTwitterPublishExecutor` in actp-worker
- [ ] Implement tweet publishing via Safari
- [ ] Implement reply publishing via Safari
- [ ] Build performance tracking scraper
- [ ] Create `twitter-research-to-publish` workflow definition

### Phase 5: Continuous Optimization (Ongoing)
- [ ] Weekly research refresh (new tweets, new creators)
- [ ] Framework performance tracking
- [ ] Engagement rate optimization
- [ ] Creator input integration (YouTube, Messenger, Telegram)
- [ ] A/B testing of frameworks and hooks
- [ ] Expand to additional niches based on performance
