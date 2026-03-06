# Instagram Prospect Pipeline — End-to-End Integration Test + CRM/DM Loop

## Context

The Instagram automation stack at `/Users/isaiahdupree/Documents/Software/Safari Automation/packages/instagram-dm`
is running on port 3100 with a full prospect discovery pipeline that:
1. Scrapes hashtag pages → ranks top creators by engagement
2. Scrapes top creator follower modals → ICP-scored prospects
3. Stores prospects in Supabase `suggested_actions` table (CRMLite)
4. Sends personalized DMs via Safari automation

This PRD asks you to build a comprehensive integration test suite that validates the complete flow end-to-end,
plus adds missing pieces: a `/api/prospect/run-pipeline` orchestrator endpoint, a prospect review CLI,
and automated DM scheduling from the pipeline output.

## Target Directory

`/Users/isaiahdupree/Documents/Software/Safari Automation/packages/instagram-dm`

## What to Build

### 1. End-to-End Pipeline Test (`tests/ig-e2e-pipeline.test.ts`)

A 4-stage integration test that runs the real pipeline against live Instagram:

**Stage 1 — Discovery** (real Safari, no mocks):
- Call `POST /api/prospect/discover` with `sources: ['hashtag'], keywords: ['buildinpublic', 'saasfounder']`
- Assert ≥3 candidates returned with `score > 30` and `username` not in `IG_BLOCKED_PATHS`
- Assert each candidate has `followers > 1000`

**Stage 2 — CRM Storage**:
- Call `POST /api/prospect/store-batch` with discovered candidates
- Assert each stored prospect appears in Supabase `suggested_actions` with `status: 'suggested'`
- Assert dedup: calling store-batch again returns `{ skipped: N, stored: 0 }` for same batch

**Stage 3 — Score Endpoint**:
- Call `GET /api/prospect/score/:username` for each discovered prospect username
- Assert response has `{ username, score, signals, icp }` shape
- Assert `icp.qualifies` matches whether `score >= 40`

**Stage 4 — DM Readiness**:
- Call `GET /api/prospect/pipeline-status`
- Assert response has `{ total_suggested, total_dm_ready, next_batch_at }` shape
- Assert `total_suggested >= 3` (from Stage 1+2)

Test file: `tests/ig-e2e-pipeline.test.ts`
Framework: vitest with 300s timeout per stage

### 2. Pipeline Orchestrator Endpoint (`POST /api/prospect/run-pipeline`)

Add to `src/api/server.ts`:

```typescript
POST /api/prospect/run-pipeline
body: {
  keywords?: string[],       // default: ['buildinpublic', 'saasfounder', 'aiautomation']
  sources?: string[],        // default: ['hashtag', 'top_accounts', 'followers']
  maxProspects?: number,     // default: 30
  minScore?: number,         // default: 35
  dryRun?: boolean           // default: false — if true, discover but don't store
}
response: {
  discovered: number,
  stored: number,
  skipped_low_score: number,
  skipped_duplicate: number,
  top_prospects: Array<{ username, score, signals, icp }>
}
```

Log each step with `[run-pipeline]` prefix. Return 200 even on partial success.

### 3. Prospect Status Endpoint (`GET /api/prospect/pipeline-status`)

Add to `src/api/server.ts`:

```typescript
GET /api/prospect/pipeline-status
response: {
  total_suggested: number,         // from Supabase suggested_actions where status='suggested'
  total_dm_ready: number,          // score >= 40 and not yet DMed
  total_contacted: number,         // status = 'sent'
  last_discovery_at: string|null,  // ISO timestamp of most recent suggested_actions row
  next_batch_at: string,           // 6 hours after last_discovery_at or 'now'
}
```

Query the Supabase `suggested_actions` table where `platform = 'instagram'`.

### 4. DM Auto-Scheduler (`POST /api/prospect/schedule-batch`)

Add to `src/api/server.ts`:

```typescript
POST /api/prospect/schedule-batch
body: {
  limit?: number,        // max DMs to schedule (default: 5)
  template?: string,     // template name from template-engine (default: 'cold_outreach_founder')
  dryRun?: boolean
}
response: {
  scheduled: Array<{ username, message_preview, scheduled_for }>,
  skipped: number,
  reason?: string
}
```

Logic:
1. Query `suggested_actions` where `status='suggested' AND platform='instagram'` ordered by `priority DESC, icp_score DESC`
2. For each prospect (up to `limit`), call `generatePersonalizedMessage(prospect, template)`
3. Insert each into `crm_message_queue` with `scheduled_for = now + random(5, 30) minutes`
4. Update `suggested_actions` row to `status='queued'`
5. If `dryRun`, skip DB writes and return previews only

### 5. Prospect Review CLI (`src/cli/prospect-review.ts`)

A small interactive CLI to review and action prospects from the terminal:

```bash
npx ts-node src/cli/prospect-review.ts [--limit 10] [--min-score 40]
```

Output format:
```
PROSPECT REVIEW — 2026-03-05 (12 suggested)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1] @marshallhaas  score=72  followers=8.4K  "Indie hacker building AI tools"
    Signals: bio_saas, follower_range_ok, high_engagement
    → (d)m  (s)kip  (q)uit

[2] @levelsio  score=68  followers=450K  ...
```

Accept single-key input: `d` = schedule DM, `s` = skip (mark skipped in DB), `q` = quit.
After each action, print confirmation and move to next prospect.

Uses readline for key input. No external dependencies beyond what's already in package.json.

## Acceptance Criteria

- All 4 stages of `ig-e2e-pipeline.test.ts` pass with real Instagram data
- `POST /api/prospect/run-pipeline` returns correct counts (not all zeros)
- `GET /api/prospect/pipeline-status` returns correct Supabase counts
- `POST /api/prospect/schedule-batch?dryRun=true` returns ≥1 prospect with `message_preview` non-empty
- `prospect-review.ts` CLI starts, displays prospects, accepts `q` to quit cleanly
- `npm run build` (tsc --noEmit) passes with no type errors
- All tests pass: `npx vitest run tests/ig-e2e-pipeline.test.ts`

## Rules

- No mock data, no stub API calls — all tests hit real Safari + real Supabase
- Use existing `supabaseClient` from `src/lib/supabase.ts`
- Use existing `generatePersonalizedMessage` and `queueOutreachAction` from `src/utils/template-engine.ts`
- Extend existing server.ts — do not create a new server file
- Follow the same logging pattern: `console.log('[endpoint-name] ...')`
- All vitest tests must have per-test timeouts: Safari ops 30000ms, Supabase ops 10000ms
