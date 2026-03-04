# LinkedIn Safari Automation — Scale & Reliability Fixes

## Project
/Users/isaiahdupree/Documents/Software/Safari Automation/packages/linkedin-automation

## Context
LI-001 through LI-007 (native click, msgOverlay, compose fix, new-compose endpoint, waitForCondition, force flag, via-google nav) are already implemented.
This batch addresses the next tier: scale bottlenecks, fragile selectors, reply detection, and session monitoring.

## Instructions
- Implement each feature exactly as specified
- After EACH feature: run `npx tsc --noEmit` from the package root
- At the end: run `npm run build` and create a git commit
- Update `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/linkedin-safari-scale-features.json` after completing each feature — set `"passes": true, "status": "completed"`

---

## LS-001: Multi-tab SafariDriver + Playwright integration for parallel scraping

**Problem**: Everything runs through one Safari tab, locked with `withSafariLock`. At 50+ prospects/day this creates an hour-long queue.

**Fix**:
1. In `safari-driver.ts`, add a `tabPool` concept: a `Map<string, {windowIndex, tabIndex}>` keyed by purpose (e.g. `"auth"`, `"scrape-1"`, `"scrape-2"`).
2. Add `acquireTab(purpose: string): Promise<void>` and `releaseTab(purpose: string): void` methods on `SafariDriver`.
3. Add a `POST /api/linkedin/tabs/open` endpoint in `server.ts` that opens a new Safari tab and registers it in the pool, accepting `{ purpose: string }`.
4. Add a `GET /api/linkedin/tabs/list` endpoint that returns the current tab pool status.
5. Optionally, if `PLAYWRIGHT_ENABLED=true` env var is set, add a `playwright-driver.ts` in the automation folder that wraps Playwright Chromium for public-profile scraping (no auth needed). Keep it behind the env flag so it doesn't break existing behavior.

---

## LS-002: MutationObserver DOM change detection replacing fixed sleep polls

**Problem**: Every wait is `waitForCondition()` polling every 500ms. LinkedIn is a SPA that fires real DOM mutation events.

**Fix**:
1. In `safari-driver.ts`, add an `injectMutationWatcher(selector: string, timeoutMs: number): Promise<boolean>` method.
2. The method injects a script into the page that sets up a `MutationObserver` watching `document.body` for subtree changes, resolves when the selector appears, and cleans itself up.
3. The injected script uses `window.__mcpWatcher_{id}` as a namespace so multiple watchers can coexist.
4. Add a `waitForSelector(selector: string, timeoutMs?: number): Promise<boolean>` wrapper on `SafariDriver` that uses `injectMutationWatcher`.
5. In `server.ts`, add `POST /api/linkedin/debug/wait-for-selector` endpoint accepting `{ selector: string, timeoutMs?: number }` for testing.
6. Update the `sendMessageToProfile` flow to use `waitForSelector` instead of fixed `wait()` calls where the target selector is known.

---

## LS-003: Semantic selector system with health-check endpoint on startup

**Problem**: LinkedIn uses obfuscated class names. One deploy breaks all selectors silently.

**Fix**:
1. In `types.ts` (or a new `selectors.ts`), define a `LINKEDIN_SELECTORS` object with semantic names:
```typescript
export const LINKEDIN_SELECTORS = {
  messageOverlay: '[data-test-id="overlay-module"], [class*="msg-overlay"]',
  composeInput: '[role="textbox"][contenteditable="true"], .msg-form__contenteditable',
  sendButton: 'button[type="submit"][class*="send"], button[aria-label*="Send"]',
  profileMessageButton: 'a[href*="msgOverlay"], button[aria-label*="Message"]',
  connectButton: 'button[aria-label*="Connect"]',
  notificationBadge: '[aria-label*="notification"]',
};
```
2. Replace all hardcoded selector strings in `dm-operations.ts` and `server.ts` with references to `LINKEDIN_SELECTORS`.
3. Add a `GET /api/linkedin/debug/selector-health` endpoint that:
   - Iterates all keys in `LINKEDIN_SELECTORS`
   - Runs `document.querySelector(selector) !== null` for each
   - Returns `{ healthy: boolean, results: Record<string, boolean> }`
4. On server startup (in `server.ts`), call the selector health check after a 3-second delay and `console.warn` any broken selectors.

---

## LS-004: Background reply watcher with Supabase webhook

**Problem**: No reply detection between outreach cycle runs. A reply sits invisible until the next manual cycle.

**Fix**:
1. In `server.ts`, add a background interval (configurable via `REPLY_POLL_INTERVAL_MS` env, default `300000` = 5 min).
2. The watcher calls `listConversations()`, compares against a local in-memory snapshot (`Map<conversationId, lastMessageTimestamp>`), and detects new messages.
3. When a new reply is detected:
   - If `SUPABASE_URL` and `SUPABASE_ANON_KEY` env vars exist, insert into table `linkedin_replies` with `{ conversation_id, sender_handle, message_preview, detected_at }`.
   - Log `[REPLY WATCHER] New reply from @{handle}` to stdout.
4. Add `GET /api/linkedin/replies/unread` endpoint that returns the current in-memory list of undetected replies since last check.
5. Add `POST /api/linkedin/replies/watcher/start` and `/stop` endpoints to control the watcher.
6. Export a `startReplyWatcher()` and `stopReplyWatcher()` function.

---

## LS-005: Hybrid clipboard + character-by-character keystroke fallback for typing

**Problem**: `typeViaClipboard` pastes the whole message at once — LinkedIn sometimes rejects clipboard paste on the compose input as suspicious.

**Fix**:
1. In `safari-driver.ts`, add a `typeCharByChar(text: string, delayMs?: number): Promise<void>` method that uses AppleScript `keystroke` in a loop.
2. Modify `typeViaClipboard(text: string, selector: string): Promise<boolean>` to:
   - Attempt clipboard paste (existing behavior)
   - After paste, wait 500ms and check if the contenteditable has the text via `textContent.trim().length > 0`
   - If empty (paste was rejected), fall back to `typeCharByChar(text, 30)` (30ms per character)
   - Return `{ success: boolean, method: 'clipboard' | 'keystroke' }`
3. Update `sendMessage()` in `dm-operations.ts` to log which method was used.
4. Add `POST /api/linkedin/debug/type-test` endpoint that accepts `{ text: string }` and attempts typing into the currently focused input, returning the method used.

---

## LS-006: Session health heartbeat monitor with Supabase flag + console alert

**Problem**: If Safari logs out of LinkedIn, every automation silently fails. Nothing alerts.

**Fix**:
1. In `safari-driver.ts`, add an `isLoggedIn(): Promise<boolean>` method that checks:
   - Current URL contains `linkedin.com` (not `linkedin.com/authwall` or `linkedin.com/login`)
   - `document.querySelector('[data-test-id="nav-settings-profileName"], .global-nav__me-photo')` is not null
2. In `server.ts`, add a health heartbeat interval (default 30 min, configurable via `SESSION_HEALTH_INTERVAL_MS` env var).
3. The heartbeat:
   - Calls `isLoggedIn()`
   - If false: sets an in-memory `sessionHealthy = false` flag, logs `[SESSION HEALTH] ⚠️ LinkedIn session expired`, and if Supabase is configured, upserts `{ service: 'linkedin', healthy: false, checked_at: now() }` into a `service_health` table.
   - If true: sets `sessionHealthy = true`.
4. Add `GET /api/linkedin/health/session` endpoint that returns `{ healthy: boolean, lastChecked: string, loginUrl: string }`.
5. Add `GET /api/linkedin/health/full` endpoint that returns session health + selector health + tab pool status in one call.
