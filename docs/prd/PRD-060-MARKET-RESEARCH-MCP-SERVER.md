# PRD-060: Market Research MCP Server (Standardize + Expand)

## Status: Draft
## Author: Isaiah Dupree
## Created: 2026-02-22
## Priority: P1 — Consolidates and expands the Market Research MCP surface

---

## 1. Problem Statement

The Market Research service (port 3106) already has a partial MCP server at `packages/market-research/src/mcp/server.ts` with 6 tools. However:

1. **Wrong path**: All other MCP servers live at `src/api/mcp-server.ts`. The research one is at `src/mcp/server.ts` — inconsistent, not in the standard location ACD looks for.
2. **Missing tools**: The existing 6 tools (search_posts, get_trends, get_top_creators, get_hashtags, score_content, get_creator_stats) do not cover the full niche pipeline (`/api/research/{platform}/niche`), multi-niche full run (`/api/research/{platform}/full`), cross-platform (`/api/research/all/full`), or data ingest.
3. **No health / is_ready check**: Agents have no fast way to verify the service is up before issuing long-running research calls.
4. **No auto-start guard**: The existing server auto-starts on import (no `if (process.argv[1]?.includes(...))` guard), which breaks when the file is imported as a module.
5. **Generic tool names**: Tools named `search_posts`, `get_trends` lack a platform prefix — they shadow similarly-named tools in other MCP servers if both are registered.

---

## 2. Solution Overview

Create `packages/market-research/src/api/mcp-server.ts` — the canonical, expanded MCP server for the Market Research API. The existing `src/mcp/server.ts` is kept as-is for backward compat but the **new file** becomes the registered entry point.

Follows the HTTP-delegation pattern from `twitter-dm/src/api/mcp-server.ts`:
- All tool names prefixed with `market_research_`
- `api()` helper with configurable base URL + 60s timeout (research calls are slow)
- Structured error handling (SERVICE_DOWN, RATE_LIMITED)
- `startMCPServer()` export + auto-start guard

---

## 3. Tools (12 total)

| Tool | Method | Endpoint | Required Args |
|---|---|---|---|
| `market_research_is_ready` | GET | `:3106/health` | — |
| `market_research_search` | POST | `/api/research/:platform/search` | `platform`, `query`, `maxResults?` |
| `market_research_get_trends` | GET | `/api/research/trends` | — |
| `market_research_top_creators` | POST | `/api/research/top-creators` | `niche`, `platform?`, `limit?` |
| `market_research_get_hashtags` | GET | `/api/research/hashtags/:platform` | `platform` |
| `market_research_score_content` | POST | `/api/ai/score` | `content`, `niche?`, `platform?` |
| `market_research_creator_stats` | GET | `/api/research/creator/:handle` | `handle` |
| `market_research_niche` | POST | `/api/research/:platform/niche` | `platform`, `niche`, `postsPerNiche?`, `creatorsPerNiche?` |
| `market_research_full` | POST | `/api/research/:platform/full` | `platform`, `niches[]`, `postsPerNiche?` |
| `market_research_all_platforms` | POST | `/api/research/all/full` | `niches[]`, `platforms[]?` |
| `market_research_ingest` | POST | `/api/research/ingest` | `platform`, `items[]` |
| `market_research_get_stored` | GET | `/api/research/stored` | `platform?`, `niche?`, `limit?` |

### Tool Details

#### `market_research_is_ready`
- Description: Check if the Market Research service (:3106) is reachable before issuing any research calls. Always call first — research jobs can take 60–300s.
- Returns: `{ ready: boolean, url: string, latencyMs: number }`

#### `market_research_search`
- Description: Search for posts on a social media platform by keyword. Fast single-pass extraction.
- `platform` enum: `twitter | threads | instagram | facebook | tiktok`
- Returns: `{ posts: Array<{ author, text, likes, views, comments, url }>, count }`

#### `market_research_get_trends`
- Description: Get cross-platform trending topics and niches.
- Returns: `{ trends: Array<{ topic, platforms, totalEngagement }> }`

#### `market_research_top_creators`
- Description: Get top creators for a specific niche, ranked by total engagement.
- `limit` default: 10

#### `market_research_get_hashtags`
- Description: Get trending hashtags for a specific platform.

#### `market_research_score_content`
- Description: Score content quality for a niche (0-100) using AI analysis.
- Returns: `{ score: number, feedback: string, suggestions: string[] }`

#### `market_research_creator_stats`
- Description: Get engagement statistics for a creator handle (followers, avg engagement, top content).

#### `market_research_niche` *(new)*
- Description: Run the full niche research pipeline for a platform — scroll + collect + deduplicate + rank posts and creators. This is a long-running operation (30–120s). Use market_research_is_ready first.
- `postsPerNiche` default: 100, `creatorsPerNiche` default: 20

#### `market_research_full` *(new)*
- Description: Run a multi-niche full research pipeline for one platform. Calls niche pipeline for each niche in the array.
- `niches`: array of niche strings, e.g. `["solopreneur", "ai_automation"]`

#### `market_research_all_platforms` *(new)*
- Description: Run cross-platform research for multiple niches. Very long-running (up to 300s). Returns top creators + posts ranked by engagement per niche per platform.
- `platforms` defaults to all: `["twitter", "threads", "instagram", "tiktok"]`

#### `market_research_ingest` *(new)*
- Description: Ingest structured research items into the ACTP Supabase data store (actp_platform_research).
- `items`: array of `{ platform, niche, post_url, author, text, likes, views, comments, shares }`

#### `market_research_get_stored` *(new)*
- Description: Query previously ingested research data from Supabase. Filter by platform and/or niche.
- `limit` default: 50

---

## 4. Architecture

```
Claude (MCP client)
       │ JSON-RPC 2.0 over stdio
       ▼
packages/market-research/src/api/mcp-server.ts   ← NEW (canonical)
  - SERVER_NAME: 'market-research-safari-automation'
  - SERVER_VERSION: '1.5.0'
  - BASE: 'http://localhost:3106' (override via MARKET_RESEARCH_URL)
  - TIMEOUT_MS: 60_000  (research calls are slow)
       │ HTTP fetch
       ▼
packages/market-research/src/api/server.ts (port 3106)
       │
       ▼
Platform-specific researchers (Twitter, Threads, IG, TikTok, Facebook)
       │
       ▼
Safari browser (per-platform)
```

### Kept for compat
`packages/market-research/src/mcp/server.ts` — existing file, left unchanged. Not registered.

---

## 5. Implementation Details

### Key differences from existing `src/mcp/server.ts`
1. File at `src/api/mcp-server.ts` (standard path)
2. All tool names prefixed `market_research_`
3. 6 new tools: `niche`, `full`, `all_platforms`, `ingest`, `get_stored`, `is_ready`
4. 60s timeout (vs 30s) — research calls are slow
5. `BASE_URL` reads `process.env.MARKET_RESEARCH_URL || 'http://localhost:3106'`
6. Proper auto-start guard: `if (process.argv[1]?.includes('mcp-server')) startMCPServer()`
7. `formatMcpError()` with `platform: 'market-research'`

### Start command
```
npx tsx packages/market-research/src/api/mcp-server.ts
```

### MCP config entry (to be added after implementation)
```json
{
  "market-research": {
    "command": "npx",
    "args": ["tsx", "packages/market-research/src/api/mcp-server.ts"],
    "cwd": "/Users/isaiahdupree/Documents/Software/Safari Automation",
    "env": {
      "MARKET_RESEARCH_URL": "http://localhost:3106"
    }
  }
}
```

---

## 6. Acceptance Criteria

- [ ] `mcp-server.ts` compiles cleanly (`npx tsc --noEmit` passes in `packages/market-research`)
- [ ] `initialize` returns `serverInfo: { name: 'market-research-safari-automation', version: '1.5.0' }`
- [ ] `tools/list` returns all 12 tools with correct schemas
- [ ] `market_research_is_ready` returns `{ ready: true }` when :3106 is up
- [ ] `market_research_search` with `{ platform: 'twitter', query: 'ai automation' }` returns posts
- [ ] `market_research_top_creators` with `{ niche: 'solopreneur' }` returns creators list
- [ ] `market_research_niche` with `{ platform: 'twitter', niche: 'solopreneur' }` triggers niche pipeline
- [ ] All tools return `SERVICE_DOWN` error when :3106 is not running
- [ ] `npm run build` in `packages/market-research` succeeds
- [ ] Existing `src/mcp/server.ts` is untouched

---

## 7. Dependencies

- Service running: `SAFARI_RESEARCH_ENABLED=true PORT=3106 npx tsx packages/market-research/src/api/server.ts`
- Safari open with relevant platform tabs
- No new npm packages required
