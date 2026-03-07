---
slug: medium-w2-integration
title: Medium Safari W2 Integration
status: ready
priority: high
target_path: /Users/isaiahdupree/Documents/Software/Safari Automation
---

# PRD: Medium Safari W2 Integration

## Goal
Wire Medium automation fully into the Local-to-Cloud Safari W2 profile group so it runs
unattended 24/7 alongside all other Safari automation services. Medium posts, engagement,
and research should be callable from Claude via MCP and auto-started via watchdog.

## Current State
- REST server: running on port 3108, watchdog-managed
- MCP server: written at `packages/medium-automation/src/api/mcp-server.ts`
- MCP registered: `safari-medium` in `~/.claude.json`
- W2 window env: `SAFARI_AUTOMATION_WINDOW=2` added to watchdog EXTRA_ENV[3108]
- Tab coordinator: uses `SAFARI_AUTOMATION_WINDOW` env var already
- Login: Medium tab must exist in Safari Window 2 pointing to `medium.com`

## What Needs Building

### 1. W2 Tab Setup Script
File: `scripts/open-local-to-cloud-tabs.sh`
Ensure Medium tab is included in the W2 tab setup sequence.
Medium tab URL: `https://medium.com` — login state inherited from W2 Safari profile.

### 2. Medium Tab Claim in W2 MCP
File: `packages/safari-w2-mcp/src/mcp-server.ts`
Medium is already in SERVICES array at port 3108.
Verify `safari_w2_setup_tabs` opens medium.com and triggers POST /api/session/ensure.

### 3. Session Ensure Endpoint
File: `packages/medium-automation/src/api/server.ts`
Add `POST /api/session/ensure` endpoint that:
- Finds the medium.com tab in W2 window
- Claims it via TabCoordinator
- Returns `{ claimed: true, windowIndex, tabIndex, url }`

### 4. Health Endpoint with Login Check
Enhance `GET /health` to return:
```json
{
  "status": "ok",
  "service": "medium-automation",
  "port": 3108,
  "window": 2,
  "tab_claimed": true,
  "logged_in": true
}
```
Login detection: check if `medium.com` tab has `/@` or `/me/` in current URL or
that document does NOT contain "Sign in" CTA text.

### 5. Publish Workflow Test
End-to-end test: Claude calls `medium_publish` via MCP →
MCP → REST `POST /api/medium/posts/create` →
`MediumOperations.createPost()` → Safari W2 tab → Medium editor → published post URL returned.

### 6. Watchdog Log
Confirm `SAFARI_AUTOMATION_WINDOW=2` is in the process env when medium-automation starts.
Log line at startup: `[medium] window=${SAFARI_AUTOMATION_WINDOW} port=${MEDIUM_PORT}`.

## Features

### MED-001: Session ensure endpoint
`POST /api/session/ensure` — finds + claims medium.com tab in W2.
Passes: returns `{ claimed: true, windowIndex, tabIndex }` with correct W2 window number.

### MED-002: Health includes login status
`GET /health` returns `logged_in: boolean` derived from tab content.
Passes: returns `true` when Medium account is active, `false` when on login/sign-in page.

### MED-003: Publish via MCP
`medium_publish({ title, body, tags, publish: true })` end-to-end.
Passes: returns `{ status: "published", url: "https://medium.com/..." }`.

### MED-004: Draft via MCP
`medium_publish({ title, body, publish: false })` saves as draft.
Passes: returns `{ status: "draft" }` and post appears in drafts.

### MED-005: Stats via MCP
`medium_stats` returns total views, reads, claps, followers.
Passes: non-null numbers returned.

### MED-006: Story stats via MCP
`medium_story_stats` returns per-post view/read/clap breakdown.
Passes: at least one story with numeric stats.

### MED-007: Research niche via MCP
`medium_research_niche({ niche: "ai automation" })` returns top authors + trending articles.
Passes: ≥3 authors and ≥5 articles returned.

### MED-008: W2 setup_tabs includes Medium
`safari_w2_setup_tabs` opens medium.com tab in W2 if missing.
Passes: after call, W2 has a medium.com tab; health shows `tab_claimed: true`.

### MED-009: Watchdog uses SAFARI_AUTOMATION_WINDOW=2
Passes: `ps aux | grep medium` shows process with `SAFARI_AUTOMATION_WINDOW=2` in env.

### MED-010: Earnings via MCP
`medium_earnings` returns Partner Program earnings.
Passes: returns earnings data (may be 0 if not enrolled).

## Implementation Notes
- `SafariDriver` reads `SAFARI_AUTOMATION_WINDOW` at runtime via `process.env` — no code change needed
- TabCoordinator `getAutomationWindow()` already reads this env var
- Medium editor uses a custom React editor — `createPost` likely needs to navigate to
  `/new-story`, type title, type body, then click Publish. Verify selectors in
  `packages/medium-automation/src/automation/medium-operations.ts`.
- Rate limits: Medium doesn't publish rate limits but be conservative — max 3 posts/day,
  max 20 claps/hour, max 10 follows/hour.

## Acceptance Criteria
All 10 features pass. Medium service shows `logged_in: true` in health check.
`medium_publish` round-trip works from Claude MCP call to live URL returned.
