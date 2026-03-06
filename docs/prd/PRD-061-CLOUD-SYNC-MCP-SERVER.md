# PRD-061: Cloud Sync MCP Server

## Status: Draft
## Author: Isaiah Dupree
## Created: 2026-02-22
## Priority: P1 — Enables agents to directly observe and control the cross-platform sync engine

---

## 1. Problem Statement

The Cloud Sync service (port 3200) is the **central nervous system** of the Safari Automation stack. It:
- Polls all 5 platforms for DMs, notifications, and post stats every 30–300s
- Writes everything to Supabase (platform_dms, platform_notifications, post_stats, content_learnings)
- Maintains a cloud action queue that local pollers execute
- Runs AI-powered analytics to generate content briefs and winning patterns

Today this service has **no MCP server**. Claude and agents must reach it via Python ACTP worker (`cloud_sync_client.py`). Direct agent visibility into the live data stream — "what DMs came in since last check?", "what are our top posts this week?", "queue a follow-up comment action" — requires roundabout API calls or waiting for a Python cron.

**The gap**: No MCP surface means agents cannot:
- Query pending DMs and notifications in real time
- Queue cloud actions during a conversation
- Get content briefs / learnings to inform next content piece
- Start/stop/poll the sync engine programmatically

---

## 2. Solution Overview

Create `packages/cloud-sync/src/api/mcp-server.ts` — a standalone JSON-RPC 2.0 MCP server over stdio that exposes Cloud Sync controls and data queries via the REST API (`:3200`).

Follows the HTTP-delegation pattern:
- `readline` stdio transport
- `api()` helper with 30s timeout + structured error handling
- 15 tools covering status, sync control, data queries, action queue, and analytics
- `formatMcpError()` with `platform: 'cloud-sync'`
- `startMCPServer()` export + auto-start guard

---

## 3. Tools (15 total)

| Tool | Method | Endpoint | Required Args |
|---|---|---|---|
| `cloud_sync_is_ready` | GET | `:3200/health` | — |
| `cloud_sync_status` | GET | `/api/status` | — |
| `cloud_sync_start` | POST | `/api/sync/start` | — |
| `cloud_sync_stop` | POST | `/api/sync/stop` | — |
| `cloud_sync_poll` | POST | `/api/sync/poll-now` | `dataType?`, `platform?` |
| `cloud_sync_get_notifications` | GET | `/api/notifications` | `platform?`, `limit?` |
| `cloud_sync_action_notification` | POST | `/api/notifications/:id/action` | `id`, `action?` |
| `cloud_sync_get_dms` | GET | `/api/dms` | `platform?`, `limit?` |
| `cloud_sync_mark_dm_replied` | POST | `/api/dms/:id/replied` | `id` |
| `cloud_sync_get_posts` | GET | `/api/posts` | `platform?`, `limit?` |
| `cloud_sync_get_top_posts` | GET | `/api/posts/top` | `platform?`, `limit?` |
| `cloud_sync_queue_action` | POST | `/api/actions/queue` | `platform`, `action_type`, `target_username?`, `target_post_url?`, `params?`, `priority?` |
| `cloud_sync_analytics_brief` | GET | `/api/analytics/brief` | `platform?` |
| `cloud_sync_dashboard` | GET | `/api/analytics/dashboard` | — |
| `cloud_sync_learnings` | GET | `/api/analytics/learnings` | `platform?` |

### Tool Details

#### `cloud_sync_is_ready`
- Description: Check if the Cloud Sync service (:3200) is reachable. Call before any operation.
- Returns: `{ ready: boolean, url: string, latencyMs: number }`

#### `cloud_sync_status`
- Description: Get the full sync engine status including platform health, poll state, and dashboard summary stats.
- Returns: `{ engine: SyncEngineStatus, health: PlatformHealth, dashboard: DashboardStats }`

#### `cloud_sync_start` / `cloud_sync_stop`
- Description: Start or stop the background sync engine (DM poller, notification poller, stats poller, action processor).

#### `cloud_sync_poll`
- Description: Trigger an immediate manual poll without waiting for the next scheduled interval.
- `dataType` enum: `dms | notifications | post_stats` (omit to run all)
- `platform` enum: `instagram | twitter | tiktok | threads | linkedin` (omit for all platforms)

#### `cloud_sync_get_notifications`
- Description: Get unactioned platform notifications (likes, comments, mentions, follows). Filter by platform.
- `platform` enum: `instagram | twitter | tiktok | threads | linkedin`
- `limit` default: 50
- Returns: `{ notifications: PlatformNotification[], count }`

#### `cloud_sync_action_notification`
- Description: Mark a notification as actioned (replied, acknowledged, etc.).
- `action` default: `acknowledged`

#### `cloud_sync_get_dms`
- Description: Get unreplied DMs across all platforms. Filter by platform. Use this to see what messages need follow-up.
- `limit` default: 50
- Returns: `{ dms: PlatformDM[], count }`

#### `cloud_sync_mark_dm_replied`
- Description: Mark a DM record as replied in Supabase so it doesn't appear in the unreplied queue.

#### `cloud_sync_get_posts`
- Description: Get synced post stats from Supabase. Filter by platform.
- Returns: `{ posts: PostStats[], count }` — includes views, likes, comments, shares per post.

#### `cloud_sync_get_top_posts`
- Description: Get top performing posts ranked by engagement score. Use this to identify what content is working.
- `limit` default: 10

#### `cloud_sync_queue_action`
- Description: Queue a cloud action for the local worker to execute. Actions include: comment, dm, like, follow, research.
- `action_type` — e.g. `comment`, `send_dm`, `like`, `follow`, `research`
- `priority` default: 5 (1=highest, 10=lowest)
- Returns: `{ success: boolean, action_id: string }`

#### `cloud_sync_analytics_brief`
- Description: Get an AI-generated content brief for a platform based on recent performance data and content learnings. Use this before creating new content.
- Returns brief with `top_themes`, `recommended_formats`, `best_times`, `winning_hooks`

#### `cloud_sync_dashboard`
- Description: Get dashboard summary stats: total DMs synced, notifications, posts, pending actions, recent learnings count.

#### `cloud_sync_learnings`
- Description: Get active content learnings — AI-extracted patterns about what content performs best per platform/niche.
- Returns: `{ learnings: ContentLearning[], count }` — each with `platform`, `niche`, `learning_type`, `value`

---

## 4. Architecture

```
Claude (MCP client)
       │ JSON-RPC 2.0 over stdio
       ▼
packages/cloud-sync/src/api/mcp-server.ts   ← NEW
  - SERVER_NAME: 'cloud-sync-safari-automation'
  - SERVER_VERSION: '1.0.0'
  - SYNC_BASE: 'http://localhost:3200'
  - TIMEOUT_MS: 30_000
       │ HTTP fetch
       ▼
packages/cloud-sync/src/api/server.ts (port 3200)
       │
       ├─ SyncEngine (polls all platforms)
       ├─ PostAnalytics (content briefs)
       └─ CloudSupabase (DMs, notifications, posts, actions, learnings)
```

---

## 5. Implementation Details

### File structure
```
packages/cloud-sync/
  src/
    api/
      server.ts          ← existing REST API (port 3200)
      mcp-server.ts      ← NEW: MCP stdio server
```

### Error handling
```typescript
formatMcpError(e, platform = 'cloud-sync')
// SERVICE_DOWN: :3200 is not running → start with PORT=3200 npx tsx packages/cloud-sync/src/api/server.ts
// RATE_LIMITED: unlikely but handle 429
// API_ERROR: surface HTTP status + truncated body
```

### `api()` helper
Path params (notifications/:id/action, dms/:id/replied) are interpolated before calling `api()`:
```typescript
case 'cloud_sync_action_notification':
  result = await api(SYNC_BASE, 'POST', `/api/notifications/${args.id}/action`, { action: args.action ?? 'acknowledged' });
```

### Start command
```
PORT=3200 npx tsx packages/cloud-sync/src/api/server.ts   # start REST service
npx tsx packages/cloud-sync/src/api/mcp-server.ts         # start MCP server
```

### MCP config entry (to be added after implementation)
```json
{
  "cloud-sync": {
    "command": "npx",
    "args": ["tsx", "packages/cloud-sync/src/api/mcp-server.ts"],
    "cwd": "/Users/isaiahdupree/Documents/Software/Safari Automation"
  }
}
```

---

## 6. Acceptance Criteria

- [ ] `mcp-server.ts` compiles cleanly (`npx tsc --noEmit` passes in `packages/cloud-sync`)
- [ ] `initialize` returns `serverInfo: { name: 'cloud-sync-safari-automation', version: '1.0.0' }`
- [ ] `tools/list` returns all 15 tools with correct inputSchema
- [ ] `cloud_sync_is_ready` returns `{ ready: true }` when :3200 is up
- [ ] `cloud_sync_status` returns engine state object
- [ ] `cloud_sync_get_dms` returns `{ dms: [], count: 0 }` or populated data
- [ ] `cloud_sync_queue_action` with `{ platform: 'twitter', action_type: 'comment', target_post_url: '...' }` returns action_id
- [ ] `cloud_sync_analytics_brief` returns content brief structure
- [ ] All tools return `SERVICE_DOWN` when :3200 is not running
- [ ] `npm run build` in `packages/cloud-sync` succeeds

---

## 7. Dependencies

- Service running: `PORT=3200 npx tsx packages/cloud-sync/src/api/server.ts`
- Supabase tables exist: `platform_dms`, `platform_notifications`, `post_stats`, `cloud_action_queue`, `content_learnings` (project: ivhfuhxorppptyuofbgq)
- No new npm packages required
