# PRD-059: TikTok Comments MCP Server

## Status: Draft
## Author: Isaiah Dupree
## Created: 2026-02-22
## Priority: P1 — Enables direct Claude tool-calling for TikTok content operations

---

## 1. Problem Statement

The TikTok Comments service (port 3006) exposes a REST API for TikTok engagement: posting comments, searching videos, browsing trending content, navigating to posts, and reading driver status/rate limits. Today this service has **no MCP server** — neither standalone nor as part of another package. Claude and other agents can only reach it via:

1. HTTP calls from Python (ACTP worker `safari_comments_client.py`)
2. The `safari-mcp` umbrella wrapper (indirect, limited)
3. The `tiktok-dm` MCP server on port 3102, which does NOT cover the comments/research 3006 API

**The gap**: TikTok content discovery and engagement workflows require an agent to manually orchestrate REST calls rather than invoking MCP tools directly. This blocks autonomous content research and engagement loops.

---

## 2. Solution Overview

Create `packages/tiktok-comments/src/api/mcp-server.ts` — a standalone JSON-RPC 2.0 MCP server over stdio that exposes TikTok engagement and research operations via the TikTok Comments REST API (`:3006`).

Follows the same pattern as `twitter-dm/src/api/mcp-server.ts` (HTTP-delegation style):
- `readline` stdio transport
- `api()` helper with 30s timeout + structured error handling
- Structured `TOOLS` array with `inputSchema` per tool
- `executeTool()` switch, `handleRequest()` dispatcher
- `startMCPServer()` export + auto-start guard

---

## 3. Tools (9 total)

| Tool | Method | Endpoint | Required Args |
|---|---|---|---|
| `tiktok_comments_is_ready` | GET | `:3006/health` | — |
| `tiktok_comments_get_status` | GET | `/api/tiktok/status` | — |
| `tiktok_comments_navigate` | POST | `/api/tiktok/navigate` | `url` |
| `tiktok_comments_post` | POST | `/api/tiktok/comment` | `videoUrl`, `text`, `useAI?`, `dryRun?` |
| `tiktok_comments_get` | GET | `/api/tiktok/comments` | `videoUrl?`, `limit?` |
| `tiktok_comments_search` | POST | `/api/tiktok/search-cards` | `query`, `maxCards?` |
| `tiktok_comments_trending` | GET | `/api/tiktok/trending` | `limit?` |
| `tiktok_comments_like` | POST | `/api/tiktok/like` | `videoUrl`, `dryRun?` |
| `tiktok_comments_get_metrics` | GET | `/api/tiktok/metrics` | `videoUrl` |

### Tool Details

#### `tiktok_comments_is_ready`
- Description: Check if TikTok Comments service (:3006) is reachable. Call at the start of each session.
- Returns: `{ ready: boolean, url: string, latencyMs: number }`

#### `tiktok_comments_get_status`
- Description: Get TikTok driver status, current URL, and active rate limit state.
- Returns driver status + rate limits object.

#### `tiktok_comments_navigate`
- Description: Navigate Safari to a TikTok URL (video, profile, or search).
- Required: `url` — full TikTok URL.

#### `tiktok_comments_post`
- Description: Post a comment on a TikTok video. Requires a direct video URL (https://www.tiktok.com/@username/video/ID). Set useAI=true to generate comment with GPT-4o. Set dryRun=true to preview without posting.
- Required: `videoUrl`, `text` (omit if useAI=true)
- Structured errors: RATE_LIMITED, SESSION_EXPIRED, SERVICE_DOWN

#### `tiktok_comments_get`
- Description: Get comments from a TikTok video. Optionally navigate to videoUrl first.
- `limit` default: 20

#### `tiktok_comments_search`
- Description: Search TikTok for videos by keyword. Returns video cards with URL, author, description, views, likes.
- `maxCards` default: 20
- Returns: `{ videos: Array<{ id, url, author, description, viewsRaw, likesRaw }>, count }`

#### `tiktok_comments_trending`
- Description: Get trending videos from the TikTok For You page.
- `limit` default: 20
- Returns: `{ videos: Array<{ id, url, author, description, likes, comments, shares }>, count }`

#### `tiktok_comments_like`
- Description: Like a TikTok video. dryRun=true previews without acting.
- Required: `videoUrl`

#### `tiktok_comments_get_metrics`
- Description: Get engagement metrics for a TikTok video (views, likes, comments, shares, saves).
- outputSchema: `{ views: string, likes: string, comments: string, shares: string, saves: string, videoUrl: string }`

---

## 4. Architecture

```
Claude (MCP client)
       │ JSON-RPC 2.0 over stdio
       ▼
packages/tiktok-comments/src/api/mcp-server.ts
  - SERVER_NAME: 'tiktok-comments-safari-automation'
  - SERVER_VERSION: '1.0.0'
  - COMMENTS_BASE: 'http://localhost:3006'
  - TIMEOUT_MS: 30_000
       │ HTTP fetch
       ▼
packages/tiktok-comments/src/api/server.ts (port 3006)
       │
       ▼
packages/tiktok-comments/src/automation/tiktok-driver.ts
       │
       ▼
Safari browser (tiktok.com)
```

---

## 5. Implementation Details

### File structure
```
packages/tiktok-comments/
  src/
    api/
      server.ts          ← existing REST API (port 3006)
      mcp-server.ts      ← NEW: MCP stdio server
```

### Error handling
Apply the `formatMcpError()` pattern:
- `429` / `rate limit` → `{ code: 'RATE_LIMITED', retryAfter: 60, platform: 'tiktok', action: 'wait retryAfter seconds then retry' }`
- `401` / `session` / `login` → `{ code: 'SESSION_EXPIRED', platform: 'tiktok', action: 'navigate Safari to tiktok.com and log in, then retry' }`
- `ECONNREFUSED` / `AbortError` → `{ code: 'SERVICE_DOWN', message: 'PORT=3006 service is not running', base: 'http://localhost:3006' }`

### `dryRun` pattern
`tiktok_comments_post` and `tiktok_comments_like` accept `dryRun?: boolean`.
Return `{ dryRun: true, wouldPost: { tool, videoUrl, text } }` without calling the service.

### `api()` helper
Implement identical to twitter-dm MCP: fetch with AbortController timeout, parse JSON, surface structured errors on non-2xx.

### Start command
```
npx tsx packages/tiktok-comments/src/api/mcp-server.ts
```

### MCP config entry (to be added after implementation)
```json
{
  "tiktok-comments": {
    "command": "npx",
    "args": ["tsx", "packages/tiktok-comments/src/api/mcp-server.ts"],
    "cwd": "/Users/isaiahdupree/Documents/Software/Safari Automation"
  }
}
```

---

## 6. Acceptance Criteria

- [ ] `mcp-server.ts` compiles cleanly (`npx tsc --noEmit` passes in `packages/tiktok-comments`)
- [ ] `initialize` handshake returns `serverInfo: { name: 'tiktok-comments-safari-automation', version: '1.0.0' }`
- [ ] `tools/list` returns all 9 tools with correct inputSchema
- [ ] `tiktok_comments_is_ready` returns `{ ready: true }` when :3006 is up
- [ ] `tiktok_comments_search` with `query: "ai automation"` returns a videos array
- [ ] `tiktok_comments_post` with `dryRun: true` returns preview without calling service
- [ ] All write tools return structured RATE_LIMITED / SESSION_EXPIRED error objects
- [ ] `npm run build` in `packages/tiktok-comments` succeeds

---

## 7. Dependencies

- Service running: `PORT=3006 npx tsx packages/tiktok-comments/src/api/server.ts`
- Safari open and logged into tiktok.com
- No new npm packages required
