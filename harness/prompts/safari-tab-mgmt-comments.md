# Safari Tab Management — Apply to instagram-comments, twitter-comments, threads-comments, linkedin-automation, market-research

## Context

The reference implementation is `packages/instagram-dm/src/api/server.ts`.
The `TabCoordinator` in `packages/instagram-dm/src/automation/tab-coordinator.ts` is
platform-agnostic — it works for any Safari URL pattern.

This PRD applies the full tab management system to 5 remaining packages:
- `instagram-comments` (:3005) — missing everything
- `twitter-comments` (:3007) — missing everything
- `threads-comments` (:3004) — has TabCoordinator + heartbeat + per-op claim, missing session endpoints + /debug/eval
- `linkedin-automation` (:3105) — missing everything
- `market-research` (:3106) — missing everything

## Target Directory

`/Users/isaiahdupree/Documents/Software/Safari Automation`

## Reference Implementation

`packages/instagram-dm/src/automation/tab-coordinator.ts` — copy verbatim to each package's `src/automation/` folder.

Pattern for each server.ts (adapt SERVICE_NAME, SERVICE_PORT, SESSION_URL_PATTERN per package):

```typescript
// ── Tab coordination constants ──────────────────────────────────────────
const SERVICE_NAME = '<package-name>';
const SERVICE_PORT = <port>;
const SESSION_URL_PATTERN = '<domain>';  // e.g. 'instagram.com', 'x.com'
const activeCoordinators = new Map<string, TabCoordinator>();

// GET /api/tabs/claims
app.get('/api/tabs/claims', async (_req, res) => {
  const claims = await TabCoordinator.listClaims();
  res.json({ claims, count: claims.length });
});

// POST /api/tabs/claim
app.post('/api/tabs/claim', async (req, res) => {
  const { agentId, windowIndex, tabIndex } = req.body;
  if (!agentId) { res.status(400).json({ error: 'agentId required' }); return; }
  try {
    let coord = activeCoordinators.get(agentId);
    if (!coord) {
      coord = new TabCoordinator(agentId, SERVICE_NAME, SERVICE_PORT, SESSION_URL_PATTERN);
      activeCoordinators.set(agentId, coord);
    }
    const claim = await coord.claim(windowIndex, tabIndex);
    getDriver().setTrackedTab(claim.windowIndex, claim.tabIndex, SESSION_URL_PATTERN);
    res.json({ ok: true, claim });
  } catch (error) {
    res.status(409).json({ ok: false, error: String(error) });
  }
});

// POST /api/tabs/release
app.post('/api/tabs/release', async (req, res) => {
  const { agentId } = req.body;
  if (!agentId) { res.status(400).json({ error: 'agentId required' }); return; }
  const coord = activeCoordinators.get(agentId);
  if (coord) { await coord.release(); activeCoordinators.delete(agentId); }
  res.json({ ok: true });
});

// POST /api/tabs/heartbeat
app.post('/api/tabs/heartbeat', async (req, res) => {
  const { agentId } = req.body;
  if (!agentId) { res.status(400).json({ error: 'agentId required' }); return; }
  const coord = activeCoordinators.get(agentId);
  if (!coord) { res.status(404).json({ error: `No claim for '${agentId}'` }); return; }
  await coord.heartbeat();
  res.json({ ok: true, heartbeat: Date.now() });
});

// GET /api/session/status
app.get('/api/session/status', (req, res) => {
  const info = getDriver().getTrackedTabInfo();
  res.json({
    tracked: !!(info?.windowIndex),
    windowIndex: info?.windowIndex ?? null,
    tabIndex: info?.tabIndex ?? null,
    sessionUrlPattern: SESSION_URL_PATTERN,
  });
});

// POST /api/session/ensure
app.post('/api/session/ensure', async (req, res) => {
  try {
    const info = await getDriver().ensureActiveSession(SESSION_URL_PATTERN);
    res.json({
      ok: info.found,
      windowIndex: info.windowIndex,
      tabIndex: info.tabIndex,
      url: info.url,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// POST /api/session/clear
app.post('/api/session/clear', (req, res) => {
  getDriver().clearTrackedSession();
  res.json({ ok: true, message: 'Tracked session cleared' });
});

// POST /api/debug/eval
app.post('/api/debug/eval', async (req, res) => {
  try {
    const { js } = req.body;
    if (!js) { res.status(400).json({ error: 'js required' }); return; }
    const result = await getDriver().executeJS(js);
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Global 30s heartbeat refresh
setInterval(async () => {
  for (const [id, coord] of activeCoordinators) {
    try { await coord.heartbeat(); }
    catch { activeCoordinators.delete(id); }
  }
}, 30_000);
```

---

## Per-Package Details

### 1. instagram-comments (:3005)

**Files to modify:**
- `packages/instagram-comments/src/api/server.ts`

**tab-coordinator.ts**: copy to `packages/instagram-comments/src/automation/tab-coordinator.ts`

**Constants:**
```typescript
const SERVICE_NAME = 'instagram-comments';
const SERVICE_PORT = 3005;
const SESSION_URL_PATTERN = 'instagram.com';
```

**Import to add** (top of server.ts):
```typescript
import { TabCoordinator } from '../automation/tab-coordinator.js';
```

**Note**: instagram-comments uses `getDriver()` from an existing driver module.
Find the driver import (likely `SafariDriver` or similar) and use the same instance.
If the server doesn't have a `getDriver()` function, look for the existing driver variable
(e.g. `const driver = new SafariDriver(...)`) and use that directly.

**Per-operation claiming**: Wrap the `POST /api/instagram/comments/post` handler with claim/release.
This is the highest-risk operation (posting a comment takes real browser time).

---

### 2. twitter-comments (:3007)

**Files to modify:**
- `packages/twitter-comments/src/api/server.ts`

**tab-coordinator.ts**: copy to `packages/twitter-comments/src/automation/tab-coordinator.ts`

**Constants:**
```typescript
const SERVICE_NAME = 'twitter-comments';
const SERVICE_PORT = 3007;
const SESSION_URL_PATTERN = 'x.com';
```

**Note**: twitter-comments currently has no prospect endpoints. Don't add them — this PRD is
only about tab management. Add only the 8 new endpoints + heartbeat interval.

---

### 3. threads-comments (:3004)

**Status**: already has TabCoordinator, heartbeat, per-op claiming. Missing only session endpoints + /debug/eval.

**Files to modify:**
- `packages/threads-comments/src/api/server.ts`

**Add these 4 endpoints** (do NOT re-add TabCoordinator import, activeCoordinators map, or heartbeat interval — those exist):

```typescript
// GET /api/session/status
app.get('/api/session/status', (req, res) => {
  const info = getDriver().getTrackedTabInfo();
  res.json({
    tracked: !!(info?.windowIndex),
    windowIndex: info?.windowIndex ?? null,
    tabIndex: info?.tabIndex ?? null,
    sessionUrlPattern: 'threads.net',
  });
});

// POST /api/session/ensure
app.post('/api/session/ensure', async (req, res) => {
  try {
    const info = await getDriver().ensureActiveSession('threads.net');
    res.json({ ok: info.found, windowIndex: info.windowIndex, tabIndex: info.tabIndex, url: info.url });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// POST /api/session/clear
app.post('/api/session/clear', (req, res) => {
  getDriver().clearTrackedSession();
  res.json({ ok: true, message: 'Tracked session cleared' });
});

// POST /api/debug/eval
app.post('/api/debug/eval', async (req, res) => {
  try {
    const { js } = req.body;
    if (!js) { res.status(400).json({ error: 'js required' }); return; }
    const result = await getDriver().executeJS(js);
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
```

---

### 4. linkedin-automation (:3105)

**Files to modify:**
- `packages/linkedin-automation/src/api/server.ts`

**tab-coordinator.ts**: copy to `packages/linkedin-automation/src/automation/tab-coordinator.ts`

**Constants:**
```typescript
const SERVICE_NAME = 'linkedin-automation';
const SERVICE_PORT = 3105;
const SESSION_URL_PATTERN = 'linkedin.com';
```

**IMPORTANT**: Check which browser driver linkedin-automation uses. If it uses `SafariDriver`,
use the same pattern. If it uses a different driver (CDP/Puppeteer), adapt:
- Replace `getDriver().setTrackedTab(...)` → log a warning that tab claiming is Safari-only
- Still add `/api/session/status` returning `{ tracked: false, reason: 'chrome-driver' }`
- Still add `/api/debug/eval` using whatever executeJS the driver supports
- Still add `/api/tabs/claims` (reads shared file — works cross-driver)

---

### 5. market-research (:3106)

**Files to modify:**
- `packages/market-research/src/api/server.ts`

**tab-coordinator.ts**: copy to `packages/market-research/src/automation/tab-coordinator.ts`

**Constants:**
```typescript
const SERVICE_NAME = 'market-research';
const SERVICE_PORT = 3106;
const SESSION_URL_PATTERN = 'google.com';  // market research typically searches Google
```

**Note**: market-research may not do per-operation Safari tab claiming in the same way —
it might navigate to multiple sites. Just add the session management endpoints and heartbeat.
For per-op claiming: wrap the main `POST /api/research/search` or equivalent endpoint.

---

## Acceptance Criteria (all 5 packages)

For each package, verify after changes:

1. `GET /api/tabs/claims` returns `{ claims: [], count: 0 }` (or live claims if active)
2. `POST /api/session/status` → `GET /api/session/status` returns `{ tracked: bool, windowIndex, tabIndex, sessionUrlPattern }`
3. `POST /api/session/clear` returns `{ ok: true, message: '...' }`
4. `POST /api/debug/eval` with `{"js":"return 1+1"}` returns `{ result: 2 }`
5. `POST /api/tabs/claim` → `POST /api/tabs/release` round-trip works without error
6. `npx tsc --noEmit --skipLibCheck` passes for each package
7. Server restarts cleanly after changes (`GET /health` still responds)

## Rules

- Copy `tab-coordinator.ts` verbatim — no modifications
- Do NOT change any existing business logic (comments posting, DM sending, search)
- Only ADD new endpoints — never remove or modify existing ones
- If a package lacks `getDriver()` as a function, find the actual driver instance name and use that
- If `getTrackedTabInfo()` doesn't exist on the driver, return `{ tracked: false }` for /session/status
- If `ensureActiveSession()` doesn't exist on the driver, implement it as: find first tab matching SESSION_URL_PATTERN via AppleScript
- Keep `getDriver().clearTrackedSession()` — if that method doesn't exist, call `getDriver().clearSession()` or equivalent
- All 5 packages must compile after changes: run `npx tsc --noEmit --skipLibCheck` in each
- Test each endpoint with curl before marking feature complete
