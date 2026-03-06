# Safari Tab Management — Apply to twitter-dm and tiktok-dm

## Context

The Instagram DM agent (port 3100) has a complete tab management system:
- `TabCoordinator` — cross-process tab claim registry via `/tmp/safari-tab-claims.json`
- `/api/tabs/claim`, `/api/tabs/release`, `/api/tabs/heartbeat`, `/api/tabs/claims` — tab lifecycle
- `/api/session/status`, `/api/session/ensure`, `/api/session/clear` — session management
- `/api/debug/eval` — execute arbitrary JS in the tracked tab (critical for debugging)
- Per-operation tab claiming: every Safari operation claims → executes → releases
- 30s heartbeat interval to keep claims alive

This PRD applies the same pattern to **twitter-dm** (port 3003) and **tiktok-dm** (port 3102).

## Target Directory

`/Users/isaiahdupree/Documents/Software/Safari Automation`

## Reference Implementation

Copy patterns from:
- TabCoordinator: `packages/instagram-dm/src/automation/tab-coordinator.ts`
- Session endpoints: `packages/instagram-dm/src/api/server.ts` lines 257–395
- Debug endpoint: `packages/instagram-dm/src/api/server.ts` lines 1671–1682
- Per-op claim pattern: lines 989–1006 in instagram-dm server.ts

---

## Package 1: twitter-dm (port 3003)

**Status: 90% done — only missing heartbeat interval and /debug/eval**

### Changes needed in `packages/twitter-dm/src/api/server.ts`:

#### 1. Add 30-second heartbeat interval
After server starts (near bottom of file, after `app.listen`):
```typescript
// Refresh all active tab claim heartbeats every 30s
setInterval(async () => {
  for (const [agentId, coord] of activeCoordinators) {
    try {
      await coord.heartbeat();
    } catch {
      activeCoordinators.delete(agentId);
    }
  }
}, 30_000);
```

#### 2. Add `POST /api/debug/eval` endpoint
Add before the server listen call:
```typescript
// POST /api/debug/eval — execute JS in the tracked Safari tab (debugging only)
app.post('/api/debug/eval', async (req: Request, res: Response) => {
  try {
    const { js } = req.body as { js: string };
    if (!js) { res.status(400).json({ error: 'js required' }); return; }
    const result = await getDriver().executeJS(js);
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
```

---

## Package 2: tiktok-dm (port 3102)

**Status: missing TabCoordinator entirely**

The tiktok-dm package was recently created. It has `ensureTikTokSession()` and `/session/status`, `/session/ensure`, `/session/clear` but uses the old driver pattern without TabCoordinator.

### Step 1: Copy tab-coordinator.ts

Copy `packages/instagram-dm/src/automation/tab-coordinator.ts` to
`packages/tiktok-dm/src/automation/tab-coordinator.ts`
(no changes needed — it's platform-agnostic)

### Step 2: Add to `packages/tiktok-dm/src/api/server.ts`

At the top, add imports:
```typescript
import { TabCoordinator } from '../automation/tab-coordinator.js';
```

Add constants (near SERVICE_NAME/SERVICE_PORT if they exist, or add them):
```typescript
const SERVICE_NAME = 'tiktok-dm';
const SERVICE_PORT = 3102;
// SESSION_URL_PATTERN already defined as 'tiktok.com' — keep it

// Active tab coordinators by agentId (in-process map; file is cross-process)
const activeCoordinators = new Map<string, TabCoordinator>();
```

### Step 3: Add all tab + session management endpoints

Add these 7 endpoints (insert before the server listen call):

```typescript
// GET /api/tabs/claims — list all live tab claims across all services
app.get('/api/tabs/claims', async (_req, res) => {
  const claims = await TabCoordinator.listClaims();
  res.json({ claims, count: claims.length });
});

// POST /api/tabs/claim — claim a Safari tab for this service
app.post('/api/tabs/claim', async (req, res) => {
  const { agentId, windowIndex, tabIndex } = req.body as {
    agentId: string; windowIndex?: number; tabIndex?: number;
  };
  if (!agentId) { res.status(400).json({ error: 'agentId required' }); return; }
  try {
    let coord = activeCoordinators.get(agentId);
    if (!coord) {
      coord = new TabCoordinator(agentId, SERVICE_NAME, SERVICE_PORT, SESSION_URL_PATTERN);
      activeCoordinators.set(agentId, coord);
    }
    const claim = await coord.claim(windowIndex, tabIndex);
    getDriver().setTrackedTab(claim.windowIndex, claim.tabIndex, SESSION_URL_PATTERN);
    res.json({ ok: true, claim, message: `Tab ${claim.windowIndex}:${claim.tabIndex} claimed by '${agentId}'` });
  } catch (error) {
    res.status(409).json({ ok: false, error: String(error) });
  }
});

// POST /api/tabs/release — release a tab claim
app.post('/api/tabs/release', async (req, res) => {
  const { agentId } = req.body as { agentId: string };
  if (!agentId) { res.status(400).json({ error: 'agentId required' }); return; }
  const coord = activeCoordinators.get(agentId);
  if (coord) { await coord.release(); activeCoordinators.delete(agentId); }
  res.json({ ok: true, message: `Claim released for '${agentId}'` });
});

// POST /api/tabs/heartbeat — refresh claim TTL
app.post('/api/tabs/heartbeat', async (req, res) => {
  const { agentId } = req.body as { agentId: string };
  if (!agentId) { res.status(400).json({ error: 'agentId required' }); return; }
  const coord = activeCoordinators.get(agentId);
  if (!coord) { res.status(404).json({ error: `No claim for '${agentId}'` }); return; }
  await coord.heartbeat();
  res.json({ ok: true, heartbeat: Date.now() });
});

// POST /api/debug/eval — execute JS in the tracked Safari tab
app.post('/api/debug/eval', async (req, res) => {
  try {
    const { js } = req.body as { js: string };
    if (!js) { res.status(400).json({ error: 'js required' }); return; }
    const result = await getDriver().executeJS(js);
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
```

### Step 4: Add global heartbeat interval (after app.listen)

```typescript
// Refresh all active tab claim heartbeats every 30s
setInterval(async () => {
  for (const [agentId, coord] of activeCoordinators) {
    try { await coord.heartbeat(); }
    catch { activeCoordinators.delete(agentId); }
  }
}, 30_000);
```

### Step 5: Per-operation tab claiming in TikTok DM send

In the `POST /api/messages/send-to` handler (the main DM operation), wrap the Safari operation with a claim:

```typescript
const agentId = `tiktok-dm-${Date.now()}`;
let coord: TabCoordinator | null = null;
try {
  coord = new TabCoordinator(agentId, SERVICE_NAME, SERVICE_PORT, SESSION_URL_PATTERN);
  const claim = await coord.claim();
  getDriver().setTrackedTab(claim.windowIndex, claim.tabIndex, SESSION_URL_PATTERN);
  console.log(`[send-to] Claimed tab w=${claim.windowIndex} t=${claim.tabIndex}`);

  // ... existing DM send logic ...

} finally {
  if (coord) { try { await coord.release(); } catch { /* ignore */ } }
}
```

Apply the same claim/release wrapper to `POST /api/prospect/discover` and any other Safari operation handlers.

---

## Acceptance Criteria

### twitter-dm (:3003)
- `POST http://localhost:3003/api/debug/eval` with `{"js":"return document.title"}` returns `{ result: "..." }` without error
- After 30s of running, `/api/tabs/claims` returns 0 claims (no leak — heartbeat cleans up)
- `GET /api/session/status` still works (no regression)

### tiktok-dm (:3102)
- `GET http://localhost:3102/api/tabs/claims` returns `{ claims: [], count: 0 }`
- `POST /api/tabs/claim` with `{"agentId":"test-001"}` returns `{ ok: true, claim: { windowIndex, tabIndex, ... } }` when a tiktok.com tab is open
- `POST /api/tabs/release` with `{"agentId":"test-001"}` returns `{ ok: true }`
- `POST /api/debug/eval` with `{"js":"return window.location.href"}` returns current URL
- `POST /api/session/clear` returns `{ ok: true }` (already existed — must not regress)
- `npm run build` or `npx tsc --noEmit --skipLibCheck` passes for both packages

## Rules

- Do NOT change any existing DM/prospect business logic — only add the tab management endpoints and heartbeat
- Keep existing SESSION_URL_PATTERN values (`x.com` for twitter, `tiktok.com` for tiktok)
- The `tab-coordinator.ts` copy must be byte-for-byte identical to instagram-dm's version
- No mock returns — all endpoints must call real TabCoordinator methods
- Follow the exact endpoint naming from instagram-dm: `/api/tabs/claim`, `/api/tabs/release`, `/api/tabs/heartbeat`, `/api/tabs/claims`, `/api/debug/eval`
- Restart both servers after changes to verify endpoints respond
