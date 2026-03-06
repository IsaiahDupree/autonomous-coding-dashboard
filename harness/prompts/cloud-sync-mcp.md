# Cloud Sync MCP Server

## Project
/Users/isaiahdupree/Documents/Software/Safari Automation

## PRD
/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/prd/PRD-061-CLOUD-SYNC-MCP-SERVER.md

## Context
The Cloud Sync service (port 3200) is the background sync engine for the entire Safari Automation stack — it polls all 5 platforms for DMs, notifications, and post stats, runs AI analytics, and maintains a cloud action queue. It has a comprehensive REST API but NO MCP server of any kind. Your job is to create `packages/cloud-sync/src/api/mcp-server.ts` using the HTTP-delegation pattern.

Reference files:
- Pattern: `packages/twitter-dm/src/api/mcp-server.ts` (copy `api()`, `formatMcpError()`, `handleRequest()`, `startMCPServer()` structure exactly)
- Target REST API: `packages/cloud-sync/src/api/server.ts` (port 3200) — READ THIS FULLY first

## REST API route map (from server.ts)
- `GET /health` — service health
- `GET /api/status` — engine status + dashboard
- `POST /api/sync/start` — start sync engine
- `POST /api/sync/stop` — stop sync engine
- `POST /api/sync/poll-now` body: `{ platform?, dataType? }` — manual poll trigger
- `GET /api/notifications` query: `?platform=&limit=` — unactioned notifications
- `POST /api/notifications/:id/action` body: `{ action }` — mark notification actioned
- `GET /api/dms` query: `?platform=&limit=` — unreplied DMs
- `POST /api/dms/:id/replied` — mark DM replied
- `GET /api/posts` query: `?platform=&limit=` — post stats
- `GET /api/posts/top` query: `?platform=&limit=` — top posts
- `GET /api/actions/pending` query: `?limit=` — pending cloud actions
- `POST /api/actions/queue` body: `{ platform, action_type, target_username?, target_post_url?, params?, priority? }`
- `POST /api/actions/process` — process action queue now
- `POST /api/analytics/run` body: `{ platform? }` — run analytics
- `GET /api/analytics/learnings` query: `?platform=` — content learnings
- `GET /api/analytics/brief` query: `?platform=` — content brief
- `GET /api/analytics/dashboard` — dashboard stats

## Instructions
1. Read `packages/cloud-sync/src/api/server.ts` fully to confirm all route paths
2. Create `packages/cloud-sync/src/api/mcp-server.ts`
3. SERVER_NAME: `'cloud-sync-safari-automation'`, SERVER_VERSION: `'1.0.0'`
4. SYNC_BASE: `'http://localhost:3200'`, TIMEOUT_MS: `30_000`
5. Implement these 15 tools:
   - `cloud_sync_is_ready` — GET /health, returns `{ ready, url, latencyMs }`
   - `cloud_sync_status` — GET /api/status
   - `cloud_sync_start` — POST /api/sync/start
   - `cloud_sync_stop` — POST /api/sync/stop
   - `cloud_sync_poll` — POST /api/sync/poll-now `{ dataType?, platform? }` where dataType: 'dms'|'notifications'|'post_stats'
   - `cloud_sync_get_notifications` — GET /api/notifications `{ platform?, limit? }`
   - `cloud_sync_action_notification` — POST /api/notifications/:id/action `{ id, action? }` (interpolate id in path)
   - `cloud_sync_get_dms` — GET /api/dms `{ platform?, limit? }`
   - `cloud_sync_mark_dm_replied` — POST /api/dms/:id/replied `{ id }` (interpolate id in path)
   - `cloud_sync_get_posts` — GET /api/posts `{ platform?, limit? }`
   - `cloud_sync_get_top_posts` — GET /api/posts/top `{ platform?, limit? }`
   - `cloud_sync_queue_action` — POST /api/actions/queue `{ platform, action_type, target_username?, target_post_url?, params?, priority? }`
   - `cloud_sync_analytics_brief` — GET /api/analytics/brief `{ platform? }`
   - `cloud_sync_dashboard` — GET /api/analytics/dashboard
   - `cloud_sync_learnings` — GET /api/analytics/learnings `{ platform? }`

6. Path parameter interpolation — for tools with `:id` in the path, interpolate before calling `api()`:
   ```typescript
   case 'cloud_sync_action_notification':
     result = await api(SYNC_BASE, 'POST', `/api/notifications/${args.id}/action`, { action: args.action ?? 'acknowledged' });
     break;
   case 'cloud_sync_mark_dm_replied':
     result = await api(SYNC_BASE, 'POST', `/api/dms/${args.id}/replied`);
     break;
   ```

7. Query param handling — for GET endpoints with filters, build query strings:
   ```typescript
   case 'cloud_sync_get_dms': {
     const params = new URLSearchParams();
     if (args.platform) params.set('platform', args.platform as string);
     if (args.limit) params.set('limit', String(args.limit));
     const qs = params.toString();
     result = await api(SYNC_BASE, 'GET', `/api/dms${qs ? '?' + qs : ''}`);
     break;
   }
   ```

8. `formatMcpError(e, platform = 'cloud-sync')`:
   - ECONNREFUSED / AbortError → `{ code: 'SERVICE_DOWN', message: ':3200 not running — start with: PORT=3200 npx tsx packages/cloud-sync/src/api/server.ts' }`
   - Default → `{ code: 'API_ERROR', message: truncated, platform }`

9. After creating: run `npx tsc --noEmit` in `packages/cloud-sync` — fix any TypeScript errors
10. Run `npm run build` in `packages/cloud-sync` — confirm passes
11. Git commit: `feat(cloud-sync): add MCP server (15 tools, port 3200)`

## Tool descriptions (important for Claude usability)
- `cloud_sync_get_dms` — "Get unreplied DMs across all platforms synced by the background engine. Use this to see what messages need a response. Filter by platform."
- `cloud_sync_queue_action` — "Queue a cloud action for the local Safari worker to execute. action_type can be: comment, send_dm, like, follow, research. priority: 1=highest, 10=lowest (default 5)."
- `cloud_sync_analytics_brief` — "Get AI-generated content brief based on recent post performance. Use this before creating new content to understand what hooks and formats are working."
- `cloud_sync_get_top_posts` — "Get top performing posts ranked by engagement. Use this to identify winning content patterns."

## Do NOT
- Modify `packages/cloud-sync/src/api/server.ts`
- Modify `packages/cloud-sync/src/sync-engine.ts` or any other source file
- Add new npm dependencies

## Verification
```
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test"}}}' | npx tsx packages/cloud-sync/src/api/mcp-server.ts
```
Expected serverInfo: `{ name: 'cloud-sync-safari-automation', version: '1.0.0' }`

```
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | npx tsx packages/cloud-sync/src/api/mcp-server.ts
```
Expected: 15 tools listed with `cloud_sync_` prefix.
