# TikTok Browser Agent — Safari Automation Port

## Context

The Instagram automation at `/Users/isaiahdupree/Documents/Software/Safari Automation/packages/instagram-dm`
(port 3100) uses Safari via `osascript` + AppleScript to drive the Instagram web UI. The same architecture
works for TikTok since TikTok has a web interface at tiktok.com. This PRD extends the Safari automation
ecosystem with a TikTok package that mirrors the Instagram API surface.

**Existing reference implementation**: `packages/instagram-dm/src/drivers/safari-driver.ts` — use this as the
base for `packages/tiktok-dm/src/drivers/safari-driver.ts`. Copy and adapt.

## Target Directory

`/Users/isaiahdupree/Documents/Software/Safari Automation/packages/tiktok-dm`

## What to Build

### Package Setup

Create a new npm package at `packages/tiktok-dm/`:

```
packages/tiktok-dm/
  package.json          (name: @safari-automation/tiktok-dm, port: 3102)
  tsconfig.json         (copy from instagram-dm)
  src/
    api/
      server.ts         (Express server on :3102)
      tiktok-operations.ts (DOM scrapers for TikTok)
    drivers/
      safari-driver.ts  (copy + adapt from instagram-dm)
    lib/
      supabase.ts       (copy from instagram-dm — same Supabase project)
    types/
      index.ts
  tests/
    tiktok-dm.test.ts
```

### REST API Endpoints (port 3102)

Mirror the Instagram DM package API surface for TikTok:

**Health & Session**:
- `GET /health` — `{ status: 'ok', service: 'tiktok-dm', port: 3102 }`
- `GET /api/status` — `{ isOnTikTok: bool, isLoggedIn: bool, currentUrl: string }`
- `POST /api/inbox/navigate` — navigate Safari to `https://www.tiktok.com/messages`
- `POST /api/session/clear` — reset stale tracked tab

**Profile & Discovery**:
- `GET /api/profile/:username` — scrape TikTok profile: `{ username, displayName, bio, followers, following, likes, verified, isPrivate }`
  - Navigate to `https://www.tiktok.com/@{username}` and extract from DOM
  - Use og:description and header elements
- `GET /api/search?q=:query&type=users` — search TikTok for users matching query
  - Navigate to `https://www.tiktok.com/search/user?q={query}` and scrape results
  - Return array of `{ username, displayName, followers, verified }`

**DM Operations**:
- `GET /api/conversations` — list TikTok DM conversations (navigate to /messages, scrape list)
  - Return array of `{ username, displayName, lastMessage, unread }`
- `POST /api/conversations/open` — open DM with a user by username
- `GET /api/messages?limit=N` — read messages in currently open conversation
- `POST /api/messages/send-to` — send a DM: body `{ username: string, text: string }`

**Prospect Discovery**:
- `POST /api/prospect/discover` — TikTok-specific ICP discovery
  - Body: `{ hashtags: string[], minFollowers: number, maxFollowers: number, maxCandidates: number }`
  - Navigate to each `https://www.tiktok.com/tag/{hashtag}` page
  - Scrape top video creators: username, displayName, followers, video views
  - Return ICP-scored candidates (same scoring logic as Instagram)
- `GET /api/prospect/score/:username` — ICP score for a TikTok profile

### ICP Scoring (adapting Instagram scoring for TikTok)

TikTok ICP criteria for B2B SaaS founders / indie hackers:
- `followers`: 1K–500K = pass (TikTok has higher follower counts)
- `bio_keywords`: same as Instagram — 'founder', 'saas', 'build', 'software', 'ai', 'startup', 'indie', 'developer'
- `engagement_ratio`: likes/followers > 0.05 = signal
- `verified = false` preferred (too big accounts are unresponsive)
- `is_business_account` = bonus signal

Score formula (max 100):
- Bio keyword match: +15 per keyword (max 45)
- Follower range: 1K–50K = +25, 50K–500K = +15, else 0
- Engagement ratio > 0.1: +20
- Not verified: +5
- `qualifies = score >= 50`

### Safari DOM Scraping Patterns

TikTok DOM notes (as of 2026):
- Profile page: `[data-e2e="user-subtitle"]` for follower count, `[data-e2e="user-bio"]` for bio
- Username from URL: `window.location.pathname.replace('/@','')`
- Video grid: `[data-e2e="user-post-item"]` each item has author link
- Message threads: `[data-e2e="message-row"]` in /messages
- Use `document.querySelector` + `getAttribute('data-e2e', ...)` patterns

All DOM scraping must go via the SafariDriver's `executeJS(js: string)` method — same as Instagram.

### Rate Limiting

- Max 20 DMs/day (stored in-memory, reset at midnight)
- Active hours: 9am–9pm local time (same guard as Instagram)
- 30s minimum delay between DMs
- Log all rate limit hits: `[rate-limit] TikTok DM blocked: reason`

### Test Suite (`tests/tiktok-dm.test.ts`)

4-layer vitest tests (same structure as Instagram):
- **Layer 1 — Service health**: GET /health, GET /api/status
- **Layer 2 — Profile API**: GET /api/profile/charlidamelio (public account, known username)
- **Layer 3 — Prospect discovery**: POST /api/prospect/discover with `hashtags: ['buildinpublic']`
- **Layer 4 — DM dry-run**: POST /api/messages/send-to with `dryRun: true`

Layer 3+ require Safari open on TikTok. Skip gracefully if Safari not on TikTok.

### Integration with CRMLite

On `POST /api/messages/send-to` success, sync to CRMLite:
- POST `https://crmlite-isaiahduprees-projects.vercel.app/api/sync/dm`
- Body: `{ platform: "tiktok", conversations: [{ username, display_name, messages: [...] }] }`
- Header: `x-api-key: <CRMLITE_API_KEY from env>`

### package.json scripts

```json
{
  "scripts": {
    "start:server": "tsx src/api/server.ts",
    "test": "vitest run",
    "build": "tsc --noEmit --skipLibCheck"
  }
}
```

## Acceptance Criteria

- `GET http://localhost:3102/health` returns `{ status: 'ok' }` (server starts cleanly)
- `GET /api/status` returns valid shape without crashing
- `GET /api/profile/charlidamelio` returns profile with `followers > 1000000` (large public account)
- `POST /api/prospect/discover` with `hashtags: ['buildinpublic']` returns ≥1 candidate with `score > 0`
- `npm run build` passes with no TypeScript errors
- All Layer 1+2 vitest tests pass (no Safari required)
- `POST /api/messages/send-to` with `dryRun: true` returns `{ success: true, dryRun: true }` without sending

## Rules

- Copy and adapt safari-driver.ts — don't rewrite from scratch
- No mock returns in production code paths — all scraping must execute real JS in Safari
- Same Supabase project (ivhfuhxorppptyuofbgq) for CRM sync
- Port 3102 is reserved for this service (matches watchdog config)
- Follow the `[endpoint-name]` log prefix pattern from instagram-dm
- Use `CRMLITE_API_KEY` from environment — never hardcode keys
