# Twitter Comments MCP Server

## Project
/Users/isaiahdupree/Documents/Software/Safari Automation

## PRD
/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/prd/PRD-058-TWITTER-COMMENTS-MCP-SERVER.md

## Context
The Twitter Comments service (port 3007) has a full REST API for tweet engagement operations but no standalone MCP server. The `twitter-dm` MCP at `packages/twitter-dm/src/api/mcp-server.ts` already works as a reference pattern — it also calls :3007 internally for its comment tools. Your job is to create a new, standalone `mcp-server.ts` inside the `twitter-comments` package so it can be independently registered and used by Claude without pulling in the DM surface.

Reference files:
- Pattern: `packages/twitter-dm/src/api/mcp-server.ts` (HTTP-delegation style, copy the structure)
- Target REST API: `packages/twitter-comments/src/api/server.ts` (port 3007)
- Automation driver: `packages/twitter-comments/src/automation/twitter-driver.ts`

## Instructions
1. Create `packages/twitter-comments/src/api/mcp-server.ts`
2. Use the HTTP-delegation pattern from `twitter-dm/src/api/mcp-server.ts`:
   - `readline` stdio transport
   - `api()` helper with AbortController, 30s timeout, structured errors
   - `formatMcpError()` with `platform: 'twitter'`
   - `startMCPServer()` export + `if (process.argv[1]?.includes('mcp-server')) startMCPServer()` guard
3. Implement these 10 tools:
   - `twitter_comments_is_ready` — GET :3007/health, returns `{ ready, url, latencyMs }`
   - `twitter_comments_post_reply` — POST /api/twitter/tweet/reply `{ url, text, useAI }`, supports `dryRun`
   - `twitter_comments_search` — POST /api/twitter/search `{ query, tab, maxResults }`
   - `twitter_comments_timeline` — POST /api/twitter/timeline `{ handle, maxResults }`
   - `twitter_comments_compose` — POST /api/twitter/tweet `{ text, useAI, topic, replySettings }`, supports `dryRun`
   - `twitter_comments_like` — POST /api/twitter/tweet/like `{ tweetUrl }`, supports `dryRun`
   - `twitter_comments_retweet` — POST /api/twitter/tweet/retweet `{ tweetUrl }`, supports `dryRun`
   - `twitter_comments_bookmark` — POST /api/twitter/tweet/bookmark `{ tweetUrl }`
   - `twitter_comments_get_metrics` — GET /api/twitter/tweet/metrics?tweetUrl=...
   - `twitter_comments_get_profile` — not in 3007, skip or omit (3007 only, not 3003)
4. `dryRun` pattern on all write tools: return `{ dryRun: true, wouldPost: { tool, args } }` immediately without calling the service
5. SERVER_NAME: `'twitter-comments-safari-automation'`, SERVER_VERSION: `'1.0.0'`, COMMENTS_BASE: `'http://localhost:3007'`
6. After creating the file: run `npx tsc --noEmit` from `packages/twitter-comments` — fix any TypeScript errors
7. Run `npm run build` in `packages/twitter-comments` and confirm it passes
8. Create a git commit: `feat(twitter-comments): add standalone MCP server (port 3007)`

## Structured error shapes
- 429 or 'rate limit' in message → `{ code: 'RATE_LIMITED', retryAfter: 60, platform: 'twitter', action: 'wait retryAfter seconds then retry' }`
- 401 / 'session' / 'login' → `{ code: 'SESSION_EXPIRED', platform: 'twitter', action: 'call twitter_comments_is_ready and ensure Safari twitter.com session then retry' }`
- ECONNREFUSED / AbortError → `{ code: 'SERVICE_DOWN', message: 'http://localhost:3007 is not running — start with: PORT=3007 npx tsx packages/twitter-comments/src/api/server.ts' }`

## Do NOT
- Modify `packages/twitter-dm/src/api/mcp-server.ts`
- Modify the existing REST server `packages/twitter-comments/src/api/server.ts`
- Add new npm dependencies

## Verification
After building, test the initialize handshake:
```
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test"}}}' | npx tsx packages/twitter-comments/src/api/mcp-server.ts
```
Expected: `{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"twitter-comments-safari-automation","version":"1.0.0"}}}`
