# Upwork Autonomous Builder — Proposal Factory + Vercel Deploy Gate

## Context

Isaiah Dupree's business goal is $5K/month revenue from AI automation consulting. The target ICP is
software founders $500K–$5M ARR needing AI automation. Upwork is a high-intent channel where buyers
post detailed job requirements — the perfect signal for inbound proposals.

This PRD builds an autonomous Upwork proposal pipeline that:
1. Searches Upwork for relevant AI/automation/SaaS jobs via their RSS feeds + web scraping
2. Scores each job against the ICP and offer catalogue (AI Automation Audit+Build $2,500, Social Growth System $500/mo)
3. Generates a tailored proposal using Claude AI
4. Routes for approval via Telegram before submitting
5. Tracks proposals and outcomes in Supabase

## Target Directory

`/Users/isaiahdupree/Documents/Software/Safari Automation/packages/upwork-hunter`

## What to Build

### Package Setup

```
packages/upwork-hunter/
  package.json          (name: @safari-automation/upwork-hunter, port: 3107)
  tsconfig.json
  src/
    api/
      server.ts         (Express :3107)
      job-scraper.ts    (Upwork RSS + search)
      proposal-gen.ts   (Claude AI proposal writer)
      telegram-gate.ts  (Telegram approval bot)
    lib/
      supabase.ts
      anthropic.ts      (Claude API client)
    types/index.ts
  tests/
    upwork-hunter.test.ts
```

### Upwork Job Discovery (`src/api/job-scraper.ts`)

**RSS feed scraping** (public, no auth needed):
```
https://www.upwork.com/ab/feed/jobs/rss?q={query}&sort=recency&paging=0;10
```

Query strings to cycle through:
- `"ai automation" "saas"`
- `"claude" OR "openai" integration`
- `"workflow automation" "founder"`
- `"scraping" OR "browser automation"`
- `"n8n" OR "zapier" OR "make" integration`

Parse RSS XML: extract `title`, `link`, `description`, `pubDate`, `budget` from each `<item>`.

**Job scoring** (0–100):
- Keywords in title/description: `ai`, `automation`, `saas`, `claude`, `openai`, `workflow`, `founder`, `startup` = +10 each (cap 40)
- Budget signals: `$1000+` = +20, `$500–$1000` = +10, no budget = 0
- Job type: `fixed price` = +5, `hourly` = +10
- Recency: posted < 4h ago = +15, < 24h = +10
- Excluded: `wordpress`, `shopify themes`, `data entry`, `logo design` = score = 0

Minimum score to queue for proposal: 50

**Rate limit**: max 10 RSS fetches per hour. Cache results in memory for 30 minutes.

### Proposal Generator (`src/api/proposal-gen.ts`)

Use the Anthropic API (claude-haiku-4-5-20251001 for cost efficiency) to write proposals:

```typescript
async function generateProposal(job: UpworkJob, offer: string): Promise<string>
```

System prompt:
```
You are Isaiah Dupree, an AI automation consultant helping software founders ($500K-$5M ARR)
build custom AI workflows. Your offers:
- AI Automation Audit+Build ($2,500): 2-week engagement, deliver N8n/custom automation
- Social Growth System ($500/mo): automated prospect discovery + DM outreach using Safari automation

Write a compelling Upwork proposal that:
1. Opens with a specific insight about their problem (not "I saw your post...")
2. Shows relevant experience (Instagram automation, CRM sync, Claude API integration)
3. Proposes a concrete solution with 3 bullet points
4. Ends with a specific question about their timeline/stack
Keep it under 300 words. No fluff. No "I'm perfect for this" phrases.
```

User message: `Job title: {title}\nJob description: {description}\nBudget: {budget}`

Store generated proposals in Supabase `upwork_proposals` table (create if not exists).

### Supabase Schema

Create table `upwork_proposals`:
```sql
CREATE TABLE IF NOT EXISTS upwork_proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id TEXT UNIQUE NOT NULL,          -- Upwork job URL hash
  job_title TEXT NOT NULL,
  job_url TEXT NOT NULL,
  job_description TEXT,
  budget TEXT,
  score INTEGER NOT NULL,
  proposal_text TEXT,
  status TEXT DEFAULT 'pending',        -- pending, approved, rejected, submitted, won, lost
  offer_type TEXT,                      -- audit_build | social_growth
  telegram_message_id INTEGER,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Apply this migration via Supabase client on server startup (idempotent).

### Telegram Approval Gate (`src/api/telegram-gate.ts`)

Use the Telegram Bot API (token from `TELEGRAM_BOT_TOKEN` env, chat ID from `TELEGRAM_CHAT_ID` env).

**On new proposal ready for review**:
1. Send Telegram message with proposal preview:
```
🎯 NEW UPWORK JOB — Score: 72/100
Title: "Build AI automation for SaaS onboarding"
Budget: $1,500 fixed
URL: https://upwork.com/jobs/...

PROPOSAL PREVIEW:
[first 200 chars of proposal]...

Reply: /approve_{job_id} | /reject_{job_id} | /view_{job_id}
```

2. Listen for webhook replies (use long-polling if webhook not configured):
- `/approve_{id}` → update status to 'approved', log "Proposal approved via Telegram"
- `/reject_{id}` → update status to 'rejected'
- `/view_{id}` → send full proposal text back

**If `TELEGRAM_BOT_TOKEN` not set**: skip Telegram gate, auto-approve all proposals with score >= 70.

### REST API Endpoints (port 3107)

```
GET  /health                         — { status: 'ok', service: 'upwork-hunter' }
GET  /api/jobs/search                — trigger RSS fetch + score all jobs, return top 10
GET  /api/jobs/pending               — list jobs with status='pending' from Supabase
GET  /api/proposals/:jobId           — full proposal text for a job
POST /api/proposals/generate         — generate proposal: body { jobId, offerType }
POST /api/proposals/approve/:jobId   — manually approve (for testing without Telegram)
POST /api/proposals/reject/:jobId    — manually reject
GET  /api/proposals/stats            — { pending, approved, rejected, submitted, won }
POST /api/scan                       — full pipeline: search → score → generate → telegram
```

### Autonomous Scan Loop

On server start, schedule a scan every 4 hours:
```typescript
setInterval(runFullScan, 4 * 60 * 60 * 1000);
```

`runFullScan()`:
1. Fetch RSS for all 5 query strings
2. Deduplicate by job URL (check Supabase for existing job_id)
3. Score all new jobs
4. For jobs score >= 50: generate proposal via Claude API
5. Send to Telegram for approval
6. Log: `[scan] Found N new jobs, M above threshold, K proposals generated`

### Test Suite (`tests/upwork-hunter.test.ts`)

- Layer 1: GET /health, GET /api/proposals/stats (no external deps)
- Layer 2: GET /api/jobs/search (fetches real Upwork RSS — requires internet)
- Layer 3: POST /api/proposals/generate with a fixture job (requires ANTHROPIC_API_KEY)
- Layer 4: POST /api/scan full pipeline (requires all env vars)

Layer 3+ skip gracefully if `ANTHROPIC_API_KEY` not set.

### Environment Variables Required

```
ANTHROPIC_API_KEY         — Claude API key
TELEGRAM_BOT_TOKEN        — Telegram bot token (optional, auto-approve if missing)
TELEGRAM_CHAT_ID          — Telegram chat ID (optional)
SUPABASE_URL              — https://ivhfuhxorppptyuofbgq.supabase.co
SUPABASE_SERVICE_ROLE_KEY — Supabase service role key
```

## Acceptance Criteria

- `GET http://localhost:3107/health` returns `{ status: 'ok' }` (server starts)
- `GET /api/jobs/search` returns ≥1 job with score > 0 (requires internet)
- `GET /api/proposals/stats` returns correct shape from Supabase (requires SUPABASE_*)
- `POST /api/proposals/generate` with valid jobId returns proposal_text length > 100 (requires ANTHROPIC_API_KEY)
- `POST /api/scan` completes without throwing (runs full pipeline)
- `npm run build` passes with no TypeScript errors
- All Layer 1 vitest tests pass (no external deps)

## Rules

- No hardcoded API keys — all from environment variables
- No mock returns in production proposal-gen.ts — must call real Claude API
- Anthropic client: use `import Anthropic from '@anthropic-ai/sdk'` (already in workspace deps)
- Supabase: same project `ivhfuhxorppptyuofbgq`, same service role key
- Telegram: graceful degradation if bot token missing
- Port 3107 is reserved for this service
- All fetch calls use `node-fetch` or native fetch with 10s timeout
- Follow `[endpoint-name]` log prefix convention
