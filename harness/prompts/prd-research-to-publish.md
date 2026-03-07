# PRD: Research → Content → Publish Loop

## Goal

Close the loop from the Twitter Research Agent's daily synthesis into published content. When the research agent produces a synthesis JSON, this pipeline automatically: generates platform-optimized posts, queues them in MPLite for scheduled publishing, optionally publishes a long-form Medium article, and logs everything to Supabase. Zero manual steps from research insight to published content.

## Working Directory

/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard

## Key Context

- Research synthesis location: `~/Documents/twitter-research/synthesis/YYYY-MM-DD.json`
- MPLite queue API: `https://mediaposter-lite-isaiahduprees-projects.vercel.app/api/queue`
- Blotato publisher (via mp_publish MCP or direct API): `https://backend.blotato.com/v2/posts`
- Blotato account IDs: Twitter=571, Instagram=807, LinkedIn=786, TikTok=710
- BLOTATO_API_KEY in `~/.env` or `actp-worker/.env`
- Medium MCP tools: `mcp__safari-medium__medium_publish`, `mcp__safari-medium__medium_search`
- Content niches: ai_automation, saas_growth, content_creation, digital_marketing
- ICP: software founders $500K–$5M ARR needing AI automation
- Supabase project: ivhfuhxorppptyuofbgq
- ANTHROPIC_API_KEY for Claude content generation: from `actp-worker/.env`
- Content state: `harness/research-to-publish-state.json`

## Output Files

- `harness/research-to-publish.js` — main pipeline script
- `harness/launch-research-to-publish.sh` — start/stop/run-now/dry-run

---

## Feature Specifications

### Feature 1: Supabase Migration — content_publish_log table
**Acceptance Criteria:**
- [ ] Creates table `content_publish_log`:
  ```sql
  CREATE TABLE IF NOT EXISTS content_publish_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    research_date date NOT NULL,
    content_type text NOT NULL, -- 'tweet', 'linkedin_post', 'instagram_caption', 'medium_article'
    platform text NOT NULL,
    content_text text,
    topic text,
    blotato_post_id text,
    mplite_queue_id text,
    medium_url text,
    status text DEFAULT 'queued', -- queued, published, failed
    published_at timestamptz,
    created_at timestamptz DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_content_publish_log_date ON content_publish_log(research_date DESC);
  ```
- [ ] Applied via `mcp__supabase__apply_migration`

### Feature 2: Synthesis Loader + Content Planner
**Acceptance Criteria:**
- [ ] Reads today's synthesis JSON from `~/Documents/twitter-research/synthesis/YYYY-MM-DD.json`
- [ ] Falls back to most recent synthesis file if today's doesn't exist
- [ ] From synthesis, selects up to 3 `topTopics` with highest signal
- [ ] For each topic, plans content: 1 tweet thread (3 tweets), 1 LinkedIn post, 1 Instagram caption
- [ ] For the #1 topic: also plans a Medium article
- [ ] Returns `ContentPlan[]`: `{ topic, topicData, formats: ['tweet_thread', 'linkedin', 'instagram', 'medium'] }`
- [ ] Logs plan to console: `📋 Content plan: 3 topics × 3 platforms + 1 Medium article = N pieces`

### Feature 3: AI Content Generator (Claude Haiku)
**Acceptance Criteria:**
- [ ] Uses `claude-haiku-4-5-20251001` via Anthropic SDK to generate each content piece
- [ ] System prompt: "You are a B2B SaaS content strategist writing for software founders ($500K-$5M ARR). Write punchy, insight-driven content that demonstrates expertise in AI automation. No fluff. Hook-first. Always add one contrarian or non-obvious angle."
- [ ] Per topic, generates:
  - **Tweet thread** (3 tweets, each < 280 chars): Hook tweet → Insight tweet → CTA tweet. Output as array of strings.
  - **LinkedIn post** (< 1300 chars): Problem → Insight → Takeaway → soft CTA. Use line breaks, no hashtag spam (max 3 relevant hashtags).
  - **Instagram caption** (< 2200 chars): Hook line → 3-5 bullet insights → CTA → 10–15 hashtags
  - **Medium article** (top topic only, 600–900 words): Title + 4-6 sections. Markdown format. SEO-friendly. Includes tool recommendations from `toolsToWatch`.
- [ ] Adds 1s delay between API calls
- [ ] Falls back to template-based content if Claude call fails
- [ ] Returns `GeneratedContent`: `{ topic, tweets: string[], linkedin: string, instagram: string, medium?: { title, body } }`

### Feature 4: Platform Queue + Publish
**Acceptance Criteria:**
- [ ] For each generated piece, queues via MPLite POST `/api/queue`:
  ```json
  { "platform": "twitter", "content": "...", "scheduled_for": "<ISO 2h from now>" }
  ```
- [ ] Staggers scheduling: Twitter posts every 2h, LinkedIn every 6h, Instagram every 8h
- [ ] For tweet threads: publishes first tweet now via Blotato `POST /v2/posts` with `account_id=571`, then queues replies as thread continues
- [ ] Records each queued item in `content_publish_log` (status=queued, mplite_queue_id from response)
- [ ] Logs each queue action: `✅ Queued {platform} post for {topic} at {time}`
- [ ] On MPLite queue failure: logs error, marks `status=failed` in Supabase, continues with other pieces

### Feature 5: Medium Article Publisher
**Acceptance Criteria:**
- [ ] For the #1 topic Medium article: calls `mcp__safari-medium__medium_publish` with `{ title, content, tags: [topic, 'AI', 'SaaS', 'Startup', 'Technology'] }`
- [ ] On success: records `medium_url` in `content_publish_log`
- [ ] On failure: logs warning, skips Medium (non-fatal)
- [ ] Sends Telegram notification with Medium URL: `📝 Medium article published: {title}\n{url}`
- [ ] Checks if today's article already published (via `content_publish_log`) — skips if already done

### Feature 6: Completion Report
**Acceptance Criteria:**
- [ ] After all content queued, sends Telegram summary:
  ```
  📣 Content pipeline complete — {date}

  Topics covered: {topic1}, {topic2}, {topic3}

  Queued:
  • Twitter: N tweet threads
  • LinkedIn: N posts
  • Instagram: N captions
  • Medium: {title} ({url or 'skipped'})

  Total pieces: N
  ```
- [ ] Saves `harness/research-to-publish-state.json`: `{ lastRunDate, topicsProcessed, piecesQueued, mediumUrl }`
- [ ] Idempotent: if run again same day, skips already-queued topics (checks `content_publish_log` by research_date + topic)

### Feature 7: Orchestrator Script + Launch
**File:** `harness/research-to-publish.js`

**Acceptance Criteria:**
- [ ] CLI flags: `--dry-run` (generate content + log, no MPLite/Blotato calls), `--date YYYY-MM-DD` (use specific synthesis), `--topics-only` (print planned topics and exit), `--medium-only` (only publish Medium article)
- [ ] Loads env from `actp-worker/.env`
- [ ] Runs pipeline: loader → planner → generator → queue → medium → report
- [ ] Each stage logged with timing
- [ ] On failure: Telegram alert `⚠️ Research-to-publish failed at {stage}: {error}`

**File:** `harness/launch-research-to-publish.sh`
- [ ] Subcommands: `run-now`, `dry-run`, `status`, `logs`
- [ ] `status` shows: last run date, pieces queued, medium URL
- [ ] Registered in `watchdog-queue.sh` as a once-on-startup daemon (runs after twitter-research-agent completes)
- [ ] Uses `/bin/zsh -l` login shell

### Feature 8: End-to-End Test
**Acceptance Criteria:**
- [ ] Creates a mock synthesis JSON in `/tmp/test-synthesis.json` with 2 topics
- [ ] Runs `--dry-run --date` pointing to mock file, verifies:
  - Content generated for each topic (tweets, linkedin, instagram)
  - Medium article body generated
  - No actual MPLite/Blotato calls made
  - Supabase NOT written in dry-run
- [ ] Content quality checks: tweet < 280 chars, LinkedIn < 1300 chars, Instagram has hashtags
- [ ] Idempotency check: running twice same day with same synthesis doesn't duplicate (needs Supabase check)
- [ ] Print PASS/FAIL per check

## Do NOT do
- Do not publish without going through MPLite queue (except Medium via Safari MCP)
- Do not publish duplicate content for the same research_date + topic combo
- Do not use mock content — all content must be AI-generated or template-based fallback
- Do not block on Medium failure — it is always optional
- Do not exceed Blotato API rate limits — use MPLite queue for scheduling
