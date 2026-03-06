# PRD-058: Twitter Comments MCP Server

## Status: Draft
## Author: Isaiah Dupree
## Created: 2026-02-22
## Priority: P1 — Enables direct Claude tool-calling for Twitter content operations

---

## 1. Problem Statement

The Twitter Comments service (port 3007) exposes a rich REST API for tweet engagement: posting replies, searching, reading timelines, composing tweets, liking, retweeting, and fetching metrics. Today this service is only reachable via:

1. HTTP calls from Python scripts (ACTP worker)
2. The `safari-mcp` umbrella wrapper (limited surface, not directly registered)
3. The `twitter-dm` MCP server, which co-mingles DM and comments tools into one 20+ tool surface

**There is no standalone MCP server** living inside `packages/twitter-comments/` that Claude can directly call for content/engagement-only workflows. This means:
- Agents running content operations must load the full DM server (includes irrelevant DM tools)
- The `twitter-comments` package has no self-contained runnable MCP entry point
- Registering just the engagement surface requires the whole DM service to be up

---

## 2. Solution Overview

Create `packages/twitter-comments/src/api/mcp-server.ts` — a **standalone JSON-RPC 2.0 MCP server** over stdio that exposes all content and engagement operations via the Twitter Comments REST API (`:3007`).

Follows the identical pattern as `twitter-dm/src/api/mcp-server.ts`:
- `readline` stdio transport
- `api()` helper with 30s timeout + structured error handling
- `TOOLS` array with `inputSchema` / `outputSchema` per tool
- `executeTool()` switch, `handleRequest()` method dispatcher
- `startMCPServer()` export + auto-start guard

---

## 3. Tools (10 total)

| Tool | Method | Endpoint | Required Args |
|---|---|---|---|
| `twitter_comments_is_ready` | — | GET :3007/health | — |
| `twitter_comments_post_reply` | POST | `/api/twitter/tweet/reply` | `postUrl`, `text?`, `useAI?`, `dryRun?` |
| `twitter_comments_search` | POST | `/api/twitter/search` | `query`, `tab?`, `maxResults?` |
| `twitter_comments_timeline` | POST | `/api/twitter/timeline` | `handle`, `maxResults?` |
| `twitter_comments_compose` | POST | `/api/twitter/tweet` | `text?`, `useAI?`, `topic?`, `replySettings?`, `dryRun?` |
| `twitter_comments_like` | POST | `/api/twitter/tweet/like` | `tweetUrl`, `dryRun?` |
| `twitter_comments_retweet` | POST | `/api/twitter/tweet/retweet` | `tweetUrl`, `dryRun?` |
| `twitter_comments_bookmark` | POST | `/api/twitter/tweet/bookmark` | `tweetUrl` |
| `twitter_comments_get_metrics` | GET | `/api/twitter/tweet/metrics` | `tweetUrl` |
| `twitter_comments_get_profile` | GET | `/api/twitter/profile/:handle` (via :3003) | `handle` |

### Tool Details

#### `twitter_comments_is_ready`
- Description: Check if the Twitter Comments service (:3007) is reachable. Call before any operation each session.
- Returns: `{ ready: boolean, url: string, latencyMs: number }`

#### `twitter_comments_post_reply`
- Description: Reply to a tweet by URL. Supports AI-generated replies (useAI=true). Set dryRun=true to preview without posting.
- Structured errors: RATE_LIMITED, SESSION_EXPIRED, SERVICE_DOWN

#### `twitter_comments_search`
- Description: Search tweets by keyword. Returns author, text, likes, retweets, views, URL.
- `tab` enum: `top | latest | people | media` (default: `top`)
- `maxResults` default: 20

#### `twitter_comments_timeline`
- Description: Get recent tweets from a user's profile timeline.
- `maxResults` default: 20

#### `twitter_comments_compose`
- Description: Compose and post a new tweet. Supports AI generation, reply settings. dryRun=true previews without posting.
- `replySettings` enum: `everyone | following | verified | mentioned`

#### `twitter_comments_like` / `twitter_comments_retweet` / `twitter_comments_bookmark`
- All write operations support `dryRun=true`

#### `twitter_comments_get_metrics`
- Description: Get engagement metrics for a tweet (likes, retweets, replies, views, bookmarks).
- outputSchema: `{ likes: number, retweets: number, replies: number, views: number, bookmarks: number, tweetUrl: string }`

---

## 4. Architecture

```
Claude (MCP client)
       │ JSON-RPC 2.0 over stdio
       ▼
packages/twitter-comments/src/api/mcp-server.ts
  - SERVER_NAME: 'twitter-comments-safari-automation'
  - SERVER_VERSION: '1.0.0'
  - COMMENTS_BASE: 'http://localhost:3007'
  - TIMEOUT_MS: 30_000
       │ HTTP fetch
       ▼
packages/twitter-comments/src/api/server.ts (port 3007)
       │
       ▼
packages/twitter-comments/src/automation/twitter-driver.ts
       │
       ▼
Safari browser (twitter.com)
```

---

## 5. Implementation Details

### File structure
```
packages/twitter-comments/
  src/
    api/
      server.ts          ← existing REST API (port 3007)
      mcp-server.ts      ← NEW: MCP stdio server
```

### Error handling
Reuse the `formatMcpError()` pattern from `twitter-dm/src/api/mcp-server.ts`:
- `429` / `rate limit` → `{ code: 'RATE_LIMITED', retryAfter: 60, platform: 'twitter' }`
- `401` / `session` / `login` → `{ code: 'SESSION_EXPIRED', action: 'call twitter_comments_is_ready then ensure Safari session' }`
- `ECONNREFUSED` / `AbortError` → `{ code: 'SERVICE_DOWN', message: ':3007 is not running' }`

### `dryRun` pattern
All write tools (`post_reply`, `compose`, `like`, `retweet`) accept `dryRun?: boolean`.
When `true`, return immediately with `{ dryRun: true, wouldPost: { tool, args } }` without calling the service.

### Start command
```
npx tsx packages/twitter-comments/src/api/mcp-server.ts
```

### MCP config entry (to be added after implementation)
```json
{
  "twitter-comments": {
    "command": "npx",
    "args": ["tsx", "packages/twitter-comments/src/api/mcp-server.ts"],
    "cwd": "/Users/isaiahdupree/Documents/Software/Safari Automation"
  }
}
```

---

## 6. Acceptance Criteria

- [ ] `mcp-server.ts` starts without TypeScript errors (`npx tsc --noEmit` passes)
- [ ] `initialize` handshake returns correct `serverInfo`
- [ ] `tools/list` returns all 10 tools with correct schemas
- [ ] `twitter_comments_is_ready` returns `{ ready: true }` when service is up, `SERVICE_DOWN` when not
- [ ] `twitter_comments_search` with `query: "ai automation"` returns posts array
- [ ] `twitter_comments_post_reply` with `dryRun: true` returns preview without calling service
- [ ] All write tools return structured errors on `RATE_LIMITED` / `SESSION_EXPIRED`
- [ ] `npm run build` in `packages/twitter-comments` succeeds

---

## 7. Dependencies

- Service running: `PORT=3007 npx tsx packages/twitter-comments/src/api/server.ts`
- Safari open and logged into twitter.com
- No new npm packages required (uses `fetch` + `readline` builtins)
