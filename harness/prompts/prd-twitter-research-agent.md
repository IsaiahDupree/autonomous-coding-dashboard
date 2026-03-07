# PRD: Twitter Tech Research Agent

## Goal

Build an autonomous research agent that scrapes Twitter/X for trending tech topics, runs deep multi-topic searches, synthesizes findings with Claude, and delivers concise structured reports to Telegram and Obsidian on a daily schedule.

## Working Directory

/Users/isaiahdupree/Documents/Software/Safari Automation

## Architecture

### Data Flow
```
watchdog-queue.sh (daily 7am)
  → twitter-research-agent.js (orchestrator)
    → trending-topic-scraper.js (Safari → Twitter Explore → extract top tech topics)
    → multi-topic-search-runner.js (TwitterResearcher per topic → raw tweet batches)
    → research-synthesizer.js (Claude Haiku → cluster, rank, extract signals)
    → report-formatter.js (structured report → Telegram + Obsidian + Supabase)
```

### Existing Assets to Reuse
- `packages/market-research/dist/twitter-comments/src/automation/twitter-researcher.js` — TwitterResearcher class (search + extract)
- `packages/market-research/dist/market-research/src/api/server.js` — market research API (port 3106)
- Twitter Safari tab at window/tab coords tracked by safari-tab-coordinator
- Supabase project: ivhfuhxorppptyuofbgq

## Output Files

All new files go in `packages/market-research/src/research-agent/`:
- `trending-topic-scraper.js` — scrapes Twitter Explore for trending tech topics
- `multi-topic-search-runner.js` — runs TwitterResearcher per topic in sequence
- `research-synthesizer.js` — Claude Haiku synthesis layer
- `report-formatter.js` — formats report + pushes to Telegram + Obsidian
- `twitter-research-agent.js` — orchestrator daemon
- `launch-twitter-research-agent.sh` — start/stop/status/run-now script

Plus Supabase migration:
- `../../harness/migrations/20260307_twitter_research.sql`

---

## Feature Specifications

### Feature 1: Trending Topic Scraper
**File:** `packages/market-research/src/research-agent/trending-topic-scraper.js`

Scrapes Twitter/X Explore page to extract what's trending in tech right now.

**Acceptance Criteria:**
- [ ] Navigates to `https://x.com/explore/tabs/trending` using existing Safari tab (claimed via safari-tab-coordinator on port 3003 or 3007)
- [ ] Extracts trending items: topic name, tweet count/volume label, category tag
- [ ] Filters to tech-relevant topics using keyword list: ai, llm, gpt, claude, openai, anthropic, tech, software, dev, api, saas, startup, crypto, bitcoin, coding, github, programming, framework, model, agent, automation
- [ ] Falls back to manually seeded topic list if scrape yields < 3 results: ["AI agents", "LLM tools", "SaaS growth", "developer tools", "startup funding", "open source AI", "AI automation", "Claude AI", "GPT-5"]
- [ ] Returns array of up to 10 topic strings ranked by trending score
- [ ] Implements retry (max 3) with 5s backoff on scrape failure
- [ ] Logs each topic found to console with source (scraped vs seeded)

### Feature 2: Multi-Topic Search Runner
**File:** `packages/market-research/src/research-agent/multi-topic-search-runner.js`

Runs TwitterResearcher sequentially per topic to collect raw tweet data.

**Acceptance Criteria:**
- [ ] Accepts array of topic strings from trending-topic-scraper
- [ ] For each topic: calls TwitterResearcher with config `{ tweetsPerNiche: 50, scrollPauseMs: 1000, maxScrollsPerSearch: 10, searchTab: 'top' }`
- [ ] Runs topics sequentially (not parallel) — one Safari tab, no conflicts
- [ ] Adds 3s delay between topics to avoid rate limits
- [ ] Collects from each topic: top 20 tweets by engagement (likes + retweets + replies), top 5 accounts by total engagement
- [ ] Deduplicates tweets across topics by URL
- [ ] Returns structured `ResearchBatch`: `{ topics: [{name, tweets: [...], topAccounts: [...]}], totalTweets, collectedAt }`
- [ ] Saves raw batch to `~/Documents/twitter-research/batches/YYYY-MM-DD.json`
- [ ] Handles individual topic failure gracefully (logs warning, skips, continues)

### Feature 3: Research Synthesizer
**File:** `packages/market-research/src/research-agent/research-synthesizer.js`

Uses Claude Haiku API to cluster, rank, and extract business-relevant signals from raw tweet data.

**Acceptance Criteria:**
- [ ] Accepts `ResearchBatch` from multi-topic-search-runner
- [ ] Builds a compact prompt (< 4000 tokens) summarizing top tweets per topic: tweet text, likes, retweets, author handle
- [ ] Calls Claude claude-haiku-4-5-20251001 via Anthropic SDK with system prompt: "You are a tech trend analyst for a B2B SaaS founder targeting $500K-$5M ARR software companies. Extract business-relevant signals from these Twitter trends."
- [ ] Prompt requests structured JSON output with schema:
  ```json
  {
    "date": "YYYY-MM-DD",
    "topTopics": [
      {
        "topic": "string",
        "headline": "one sentence summary",
        "keySignal": "what this means for B2B founders",
        "topTweet": { "text": "...", "author": "...", "engagement": 0 },
        "emergingTools": ["tool1", "tool2"],
        "sentiment": "bullish|bearish|neutral"
      }
    ],
    "founderInsights": ["insight1", "insight2", "insight3"],
    "emergingOpportunities": ["opportunity1", "opportunity2"],
    "toolsToWatch": ["tool1", "tool2"],
    "overallNarrative": "2-3 sentence synthesis"
  }
  ```
- [ ] Returns parsed synthesis object
- [ ] Falls back to basic template if Claude call fails (fill from raw data without AI)
- [ ] Uses ANTHROPIC_API_KEY from env or actp-worker/.env file
- [ ] Saves synthesis JSON to `~/Documents/twitter-research/synthesis/YYYY-MM-DD.json`

### Feature 4: Report Formatter
**File:** `packages/market-research/src/research-agent/report-formatter.js`

Formats synthesis into a readable report and pushes it to Telegram and Obsidian.

**Acceptance Criteria:**
- [ ] Formats synthesis as a Telegram message (< 4096 chars):
  ```
  📊 *Tech Trends Report — {date}*

  {for each top topic}
  🔥 *{topic}*
  {headline}
  Signal: {keySignal}
  Top tweet: "{topTweet.text}" — @{author} ({engagement} eng)
  {#emergingTools} Tools: {tools}

  💡 *Founder Insights*
  • {insight1}
  • {insight2}
  • {insight3}

  🚀 *Opportunities*
  • {opportunity1}
  • {opportunity2}

  🛠 *Tools to Watch*
  {toolsToWatch}

  📝 {overallNarrative}
  ```
- [ ] Sends to Telegram via TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID from env/actp-worker/.env
- [ ] Writes Obsidian note to `~/.memory/vault/RESEARCH/twitter-trends-YYYY-MM-DD.md` with full markdown report including all topics, tweets, and synthesis
- [ ] Obsidian note has frontmatter: `date`, `type: twitter-research`, `topics: [...]`, `tools: [...]`
- [ ] Saves report record to Supabase `twitter_research_reports` table (id, date, topics, synthesis_json, telegram_sent, obsidian_path)
- [ ] Returns `{ telegramSent: bool, obsidianPath: string, supabaseId: string }`
- [ ] Logs success/failure for each output channel independently (one failing doesn't block others)

### Feature 5: Supabase Migration
**File:** `harness/migrations/20260307_twitter_research.sql`

**Acceptance Criteria:**
- [ ] Creates `twitter_research_reports` table:
  ```sql
  create table twitter_research_reports (
    id uuid primary key default gen_random_uuid(),
    report_date date not null,
    topics text[] not null,
    raw_batch_path text,
    synthesis jsonb,
    telegram_sent boolean default false,
    obsidian_path text,
    tweet_count int,
    created_at timestamptz default now()
  );
  create index on twitter_research_reports(report_date desc);
  ```
- [ ] Applied via Supabase MCP tool `mcp__supabase__apply_migration`
- [ ] Migration is idempotent (`CREATE TABLE IF NOT EXISTS`)

### Feature 6: Orchestrator Daemon
**File:** `packages/market-research/src/research-agent/twitter-research-agent.js`

Orchestrates the full pipeline end-to-end.

**Acceptance Criteria:**
- [ ] Imports and calls in sequence: trending-topic-scraper → multi-topic-search-runner → research-synthesizer → report-formatter
- [ ] Accepts CLI flag `--topics "AI agents, LLM tools"` to override scraped topics
- [ ] Accepts CLI flag `--dry-run` to run pipeline but skip Telegram send and Supabase write (still writes local files and Obsidian)
- [ ] Accepts CLI flag `--topics-only` to just print today's trending topics and exit
- [ ] Logs each pipeline stage with timing: `[stage] starting...` / `[stage] done in Xs`
- [ ] On any stage failure: logs error, sends Telegram alert `⚠️ Research agent failed at {stage}: {error}`, exits with code 1
- [ ] On success: logs `✅ Research report complete — {topicCount} topics, {tweetCount} tweets analyzed`
- [ ] Reads ANTHROPIC_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID from process.env or `/Users/isaiahdupree/Documents/Software/actp-worker/.env`
- [ ] Creates output dirs if missing: `~/Documents/twitter-research/batches/`, `~/Documents/twitter-research/synthesis/`

### Feature 7: Launch Script + Watchdog
**File:** `packages/market-research/src/research-agent/launch-twitter-research-agent.sh`

**Acceptance Criteria:**
- [ ] Supports subcommands: `start` (run-now in background), `stop`, `status`, `run-now` (foreground), `dry-run`, `topics-only`
- [ ] `run-now` executes `node twitter-research-agent.js` in foreground and streams output
- [ ] `start` runs once immediately in background, logs to `/tmp/twitter-research-agent.log`
- [ ] `status` shows last run time (from most recent synthesis JSON file), last topics, telegram sent status
- [ ] Uses `/bin/zsh -l` login shell for npx PATH
- [ ] Adds a cron entry comment showing how to schedule daily at 7am: `# 0 7 * * * bash /path/to/launch-twitter-research-agent.sh run-now`
- [ ] Adds `twitter-research-agent` daemon to `harness/watchdog-queue.sh` — runs once at startup (not on loop), with a 24h minimum interval check

### Feature 8: End-to-End Test
**File:** `packages/market-research/src/research-agent/test-research-agent.js`

**Acceptance Criteria:**
- [ ] `--topics-only` test: runs `node twitter-research-agent.js --topics-only` and verifies at least 3 topics returned
- [ ] `--dry-run` test: runs full pipeline with `--dry-run --topics "AI agents"` and verifies:
  - Raw batch JSON written to `~/Documents/twitter-research/batches/`
  - Synthesis JSON written to `~/Documents/twitter-research/synthesis/`
  - Obsidian note written to `~/.memory/vault/RESEARCH/`
  - Telegram NOT sent (dry-run)
- [ ] Synthesis schema test: loads synthesis JSON, validates required fields present (topTopics, founderInsights, emergingOpportunities, toolsToWatch, overallNarrative)
- [ ] Report format test: calls report-formatter directly with mock synthesis, verifies telegram message < 4096 chars
- [ ] All tests pass and print PASS/FAIL per check

---

## Key Constraints

- Always use real Safari browser automation — no mocked browser calls
- Use the existing Safari tab claimed by twitter-dm or twitter-comments service (port 3003 or 3007) — do NOT open a new Safari window
- Run topics sequentially, never in parallel (one Safari instance)
- ANTHROPIC_API_KEY loaded from actp-worker/.env if not in env
- Telegram creds from actp-worker/.env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
- All output files are real (no stubs)
- The Obsidian vault is at `~/.memory/vault/` (symlinked to `/Volumes/My Passport/memory-vault`)
- Supabase project: ivhfuhxorppptyuofbgq — use mcp__supabase__apply_migration for migration
- Do not break existing market-research service on port 3106

## Do NOT do
- Do not auto-send to Telegram without `--dry-run` being absent (dry-run = skip Telegram)
- Do not run parallel Safari sessions
- Do not add mock data or placeholder implementations
- Do not create a new Safari window — use the existing claimed tab
