# TikTok Comments MCP Server

## Project
/Users/isaiahdupree/Documents/Software/Safari Automation

## PRD
/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/prd/PRD-059-TIKTOK-COMMENTS-MCP-SERVER.md

## Context
The TikTok Comments service (port 3006) has a REST API for TikTok engagement (commenting, searching, trending, navigating, metrics) but zero MCP servers. The `tiktok-dm` MCP at `packages/tiktok-dm/src/api/mcp-server.ts` covers port 3102 (DMs) but does NOT call port 3006 at all. Your job is to create `packages/tiktok-comments/src/api/mcp-server.ts` — a standalone MCP server that delegates to :3006.

Reference files:
- Pattern: `packages/twitter-dm/src/api/mcp-server.ts` (HTTP-delegation style — copy the `api()`, `formatMcpError()`, `handleRequest()`, `startMCPServer()` structure)
- Target REST API: `packages/tiktok-comments/src/api/server.ts` (port 3006)
- Automation driver: `packages/tiktok-comments/src/automation/tiktok-driver.ts`

## Route map (from the REST server)
Study `packages/tiktok-comments/src/api/server.ts` to confirm the exact endpoint paths before implementing. Key routes:
- `GET /health` — service health
- `GET /api/tiktok/status` — driver status + rate limits
- `POST /api/tiktok/navigate` body: `{ url }`
- `POST /api/tiktok/comment` body: `{ videoUrl, text }` (check actual endpoint name in server.ts)
- `GET /api/tiktok/comments` query: `?videoUrl=&limit=`
- `POST /api/tiktok/search-cards` body: `{ query, maxCards }`
- `GET /api/tiktok/trending` query: `?limit=`
- `POST /api/tiktok/like` body: `{ videoUrl }` (check actual endpoint)
- `GET /api/tiktok/metrics` query: `?videoUrl=` (check actual endpoint)

## Instructions
1. Read `packages/tiktok-comments/src/api/server.ts` fully to map all routes before writing the MCP
2. Create `packages/tiktok-comments/src/api/mcp-server.ts`
3. SERVER_NAME: `'tiktok-comments-safari-automation'`, SERVER_VERSION: `'1.0.0'`, COMMENTS_BASE: `'http://localhost:3006'`, TIMEOUT_MS: `30_000`
4. Implement these 9 tools (adjusting endpoint paths to match what you find in server.ts):
   - `tiktok_comments_is_ready` — GET /health, returns `{ ready, url, latencyMs }`
   - `tiktok_comments_get_status` — GET /api/tiktok/status
   - `tiktok_comments_navigate` — POST /api/tiktok/navigate `{ url }`
   - `tiktok_comments_post` — POST to the comment endpoint `{ videoUrl, text, useAI? }`, supports `dryRun`
   - `tiktok_comments_get` — GET comments `{ videoUrl?, limit? }`
   - `tiktok_comments_search` — POST /api/tiktok/search-cards `{ query, maxCards? }`
   - `tiktok_comments_trending` — GET /api/tiktok/trending `{ limit? }`
   - `tiktok_comments_like` — POST to like endpoint `{ videoUrl }`, supports `dryRun`
   - `tiktok_comments_get_metrics` — GET metrics for a video URL
5. `dryRun` on write tools (`post`, `like`): return `{ dryRun: true, wouldPost: { tool, videoUrl, text } }` without calling service
6. `formatMcpError(e, platform = 'tiktok')` — structured error shapes:
   - 429 / 'rate limit' → `{ code: 'RATE_LIMITED', retryAfter: 60, platform: 'tiktok', action: 'wait retryAfter seconds then retry' }`
   - 401 / 'session' / 'login' → `{ code: 'SESSION_EXPIRED', platform: 'tiktok', action: 'navigate Safari to tiktok.com, log in, then retry' }`
   - ECONNREFUSED / AbortError → `{ code: 'SERVICE_DOWN', message: 'http://localhost:3006 is not running — start with: PORT=3006 npx tsx packages/tiktok-comments/src/api/server.ts' }`
7. After creating: run `npx tsc --noEmit` in `packages/tiktok-comments` — fix any TypeScript errors
8. Run `npm run build` in `packages/tiktok-comments` — confirm passes
9. Git commit: `feat(tiktok-comments): add standalone MCP server (port 3006)`

## Do NOT
- Modify `packages/tiktok-dm/src/api/mcp-server.ts`
- Modify the existing REST server `packages/tiktok-comments/src/api/server.ts`
- Add new npm dependencies

## Verification
```
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test"}}}' | npx tsx packages/tiktok-comments/src/api/mcp-server.ts
```
Expected serverInfo: `{ name: 'tiktok-comments-safari-automation', version: '1.0.0' }`

Then:
```
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | npx tsx packages/tiktok-comments/src/api/mcp-server.ts
```
Expected: 9 tools listed.
