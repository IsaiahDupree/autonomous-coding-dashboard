# Market Research MCP Server (Standardize + Expand)

## Project
/Users/isaiahdupree/Documents/Software/Safari Automation

## PRD
/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/prd/PRD-060-MARKET-RESEARCH-MCP-SERVER.md

## Context
The Market Research service (port 3106) already has a partial MCP server at `packages/market-research/src/mcp/server.ts` with 6 tools. That file has problems: wrong path (not `src/api/mcp-server.ts`), generic tool names without `market_research_` prefix, no health check, no niche/full/all-platforms tools, and no proper auto-start guard. Your job is to create a canonical `src/api/mcp-server.ts` with the standard pattern, prefixed names, and 6 new tools while leaving the existing `src/mcp/server.ts` untouched.

Reference files:
- Pattern: `packages/twitter-dm/src/api/mcp-server.ts` (HTTP-delegation style)
- Existing partial MCP: `packages/market-research/src/mcp/server.ts` (read this — use the tool handler logic, DO NOT modify it)
- Target REST API: `packages/market-research/src/api/server.ts` (port 3106)

## Instructions
1. Read `packages/market-research/src/mcp/server.ts` fully — reuse the `handleToolCall` logic as a starting point
2. Read `packages/market-research/src/api/server.ts` fully — identify all available endpoints
3. Create `packages/market-research/src/api/mcp-server.ts`
4. SERVER_NAME: `'market-research-safari-automation'`, SERVER_VERSION: `'1.5.0'`
5. BASE_URL: `process.env.MARKET_RESEARCH_URL || 'http://localhost:3106'`
6. TIMEOUT_MS: `60_000` (research calls can take 30–120s — use 60s, not 30s)
7. Implement all 12 tools:

**From existing 6 (rename with prefix):**
- `market_research_search` — POST /api/research/:platform/search `{ platform, query, maxResults? }`
- `market_research_get_trends` — GET /api/research/trends
- `market_research_top_creators` — POST /api/research/top-creators `{ niche, platform?, limit? }`
- `market_research_get_hashtags` — GET /api/research/hashtags/:platform
- `market_research_score_content` — POST /api/ai/score `{ content, niche?, platform? }`
- `market_research_creator_stats` — GET /api/research/creator/:handle

**New 6 tools:**
- `market_research_is_ready` — GET /health, returns `{ ready: boolean, url: string, latencyMs: number }`
- `market_research_niche` — POST /api/research/:platform/niche `{ platform, niche, postsPerNiche?, creatorsPerNiche? }`
  Description: "Run full niche research pipeline for a single platform and niche. Slow operation (30–120s). Call market_research_is_ready first."
- `market_research_full` — POST /api/research/:platform/full `{ platform, niches: string[], postsPerNiche? }`
  Description: "Run multi-niche full research for one platform. niches is an array."
- `market_research_all_platforms` — POST /api/research/all/full `{ niches: string[], platforms?: string[] }`
  Description: "Run cross-platform research. Very long-running (up to 300s). platforms defaults to all."
- `market_research_ingest` — POST /api/research/ingest `{ platform, items: object[] }`
  Description: "Ingest structured research results into Supabase (actp_platform_research)."
- `market_research_get_stored` — GET /api/research/stored `{ platform?, niche?, limit? }`
  Description: "Query previously stored research data from Supabase."

**Note on new endpoints**: `/api/research/:platform/niche`, `/api/research/:platform/full`, `/api/research/all/full`, `/api/research/ingest`, `/api/research/stored` may or may not exist in the current REST server. If they do not exist yet, implement the MCP tool stubs that call these paths — the REST server will be extended separately. The tool should return the raw response or `{ error: 'endpoint not yet implemented' }` gracefully.

8. `api()` helper: use `fetch` with AbortController, timeout TIMEOUT_MS, parse JSON, throw structured error on non-2xx
9. `formatMcpError(e, platform = 'market-research')` structured errors:
   - ECONNREFUSED / AbortError → `{ code: 'SERVICE_DOWN', message: ':3106 is not running — start with: SAFARI_RESEARCH_ENABLED=true PORT=3106 npx tsx packages/market-research/src/api/server.ts' }`
   - Default → `{ code: 'API_ERROR', message: truncated, platform }`
10. Auto-start guard: `if (process.argv[1]?.includes('mcp-server')) startMCPServer()`
11. After creating: run `npx tsc --noEmit` in `packages/market-research` — fix any TypeScript errors
12. Run `npm run build` in `packages/market-research` — confirm passes
13. Git commit: `feat(market-research): add canonical MCP server at src/api/mcp-server.ts (12 tools)`

## Do NOT
- Modify or delete `packages/market-research/src/mcp/server.ts`
- Modify the existing REST server `packages/market-research/src/api/server.ts`
- Add new npm dependencies
- Auto-start on import (only start via the guard)

## Verification
```
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test"}}}' | npx tsx packages/market-research/src/api/mcp-server.ts
```
Expected serverInfo: `{ name: 'market-research-safari-automation', version: '1.5.0' }`

```
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | npx tsx packages/market-research/src/api/mcp-server.ts
```
Expected: 12 tools all prefixed `market_research_`
