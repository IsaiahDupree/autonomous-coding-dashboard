# MCP Server Upgrades -- Safety, Reliability, DX

## Project
/Users/isaiahdupree/Documents/Software/Safari Automation

## Context
The four MCP servers (instagram-dm, twitter-dm, tiktok-dm, linkedin-automation) are functional but lack safety
guards, health checks, structured errors, output schemas, pagination, and CRMLite context.
This batch adds 10 upgrades across all four servers in priority order.

## Instructions
- Implement each feature exactly as specified
- After EACH feature: run npx tsc --noEmit from the relevant package root
- At the end: run npm run build in each modified package and create a git commit
- Update /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/mcp-server-upgrades-features.json after completing each feature
- MCP server files are at packages/{platform}-dm/src/api/mcp-server.ts and packages/linkedin-automation/src/api/mcp-server.ts
- CRMLite base URL: https://crmlite-h3k1s46jj-isaiahduprees-projects.vercel.app

---

## MQS-001: dryRun on Instagram MCP write tools

**Problem**: instagram_send_dm, instagram_post_comment, instagram_accept_message_request fire immediately. Claude cannot confirm before acting.

**Fix**:
1. In packages/instagram-dm/src/api/mcp-server.ts, add dryRun?: boolean to inputSchema of instagram_send_dm, instagram_post_comment, and instagram_accept_message_request.
2. In executeTool handler for each, check if args.dryRun === true. If so, return immediately with { dryRun: true, wouldSend: { platform: 'instagram', tool: toolName, args } } without calling the REST service.

---

## MQS-002: dryRun on Twitter MCP write tools

**Problem**: twitter_send_dm, twitter_post_reply, twitter_post_tweet fire immediately.

**Fix**:
1. In packages/twitter-dm/src/api/mcp-server.ts, add dryRun?: boolean to twitter_send_dm, twitter_post_reply, twitter_post_tweet.
2. Same handler: return { dryRun: true, wouldSend: { platform: 'twitter', tool, args } } without calling REST.

---

## MQS-003: dryRun on TikTok MCP write tools

**Problem**: tiktok_send_dm, tiktok_post_comment fire immediately.

**Fix**:
1. In packages/tiktok-dm/src/api/mcp-server.ts, add dryRun?: boolean to tiktok_send_dm and tiktok_post_comment.
2. Return { dryRun: true, wouldSend: { platform: 'tiktok', tool, args } } without calling REST.

---

## MQS-004: is_ready tools on all 4 MCP servers

**Problem**: When REST services are down, tool calls hang for 30s with cryptic HTTP errors.

**Fix**:
1. In packages/instagram-dm/src/api/mcp-server.ts, add tool instagram_is_ready with no required inputs.
   Handler: use Promise.allSettled to fetch http://localhost:3100/health and http://localhost:3005/health with 3s timeout via AbortController.
   Return { ready: boolean, services: { dm: { up: boolean, url: string, latencyMs?: number }, comments: { up: boolean, url: string } } }
2. Same for twitter-dm: twitter_is_ready checking :3003 and :3007.
3. Same for tiktok-dm: tiktok_is_ready checking :3102 and :3006.
4. For linkedin-automation: linkedin_is_ready -- since LinkedIn calls functions directly, attempt a lightweight osascript 'tell app System Events to return name' and return { ready: boolean, method: 'direct' }.
5. All four must respond within 5 seconds (3s timeout per fetch, total 5s max).

---

## MQS-005: Structured error objects on Instagram MCP

**Problem**: Errors are plain strings. Claude cannot adapt its behavior based on error type.

**Fix**:
1. In packages/instagram-dm/src/api/mcp-server.ts, add helper formatMcpError(e: unknown, platform = 'instagram'): string.
2. Error shapes by detection:
   - 429 or 'rate limit' in message: JSON.stringify({ code: 'RATE_LIMITED', retryAfter: 60, platform, action: 'wait retryAfter seconds then retry' })
   - 401 or 'session' or 'login' in message: JSON.stringify({ code: 'SESSION_EXPIRED', platform, action: 'call instagram_session_ensure then retry' })
   - 404 or 'not found': JSON.stringify({ code: 'NOT_FOUND', platform })
   - Default: JSON.stringify({ code: 'ERROR', message: e instanceof Error ? e.message : String(e), platform })
3. Replace all catch blocks in executeTool: return { content: [{ type: 'text', text: formatMcpError(e) }], isError: true }

---

## MQS-006: Structured error objects on Twitter, TikTok, LinkedIn MCPs

**Problem**: Same plain string errors on the other three servers.

**Fix**:
1. Apply the same formatMcpError pattern from MQS-005 to:
   - packages/twitter-dm/src/api/mcp-server.ts (platform: 'twitter', SESSION_EXPIRED action: 'call twitter_session_ensure then retry')
   - packages/tiktok-dm/src/api/mcp-server.ts (platform: 'tiktok')
   - packages/linkedin-automation/src/api/mcp-server.ts (platform: 'linkedin', SESSION_EXPIRED action: 'call linkedin_navigate_to then retry')

---

## MQS-007: outputSchema on Instagram get_conversations and get_messages

**Problem**: Claude cannot know response shape without a round-trip exploration.

**Fix**:
1. In packages/instagram-dm/src/api/mcp-server.ts, add outputSchema to instagram_get_conversations:
   { type: 'object', properties: { conversations: { type: 'array', items: { type: 'object', properties: { username: {type:'string'}, lastMessage: {type:'string'}, unread: {type:'boolean'}, timestamp: {type:'string'} }, required: ['username'] } }, count: {type:'number'}, nextCursor: {type:'string'} }, required: ['conversations','count'] }
2. Add outputSchema to instagram_get_messages:
   { type: 'object', properties: { messages: { type: 'array', items: { type: 'object', properties: { id:{type:'string'}, sender:{type:'string'}, text:{type:'string'}, timestamp:{type:'string'}, isRead:{type:'boolean'} }, required: ['sender','text'] } }, count: {type:'number'} }, required: ['messages','count'] }

---

## MQS-008: outputSchema on Twitter, TikTok, LinkedIn get tools

**Problem**: Same missing outputSchema on the other three servers.

**Fix**:
1. Apply the same outputSchema pattern from MQS-007 to:
   - twitter_get_conversations and twitter_get_messages in packages/twitter-dm
   - tiktok_get_conversations and tiktok_get_messages in packages/tiktok-dm
   - linkedin_list_conversations and linkedin_get_messages in packages/linkedin-automation
2. Use identical schema shapes so Claude sees a consistent interface across all platforms.

---

## MQS-009: Pagination cursors on all get_conversations tools

**Problem**: get_conversations returns a flat array with no way to fetch page 2+.

**Fix**:
1. In all four mcp-server.ts files, add cursor?: string to inputSchema of get_conversations.
2. Pass cursor to the downstream REST call (?cursor={cursor} query param) or direct call.
3. Normalize response to { items: Conversation[], nextCursor?: string, total?: number } in all four.
4. If REST service does not support cursors yet, return nextCursor: undefined -- do not block on REST changes.

---

## MQS-010: crm_get_contact tool on all 4 MCP servers

**Problem**: Claude has no cross-platform contact history. Cannot prevent duplicate outreach.

**Fix**:
1. In packages/instagram-dm/src/api/mcp-server.ts, add tool instagram_crm_get_contact:
   inputSchema: { type: 'object', properties: { username: {type:'string'} }, required: ['username'] }
   Handler: fetch https://crmlite-h3k1s46jj-isaiahduprees-projects.vercel.app/api/contacts/by-username/instagram/{username} with 5s timeout.
   Return contact object if found (includes interactions, tags, pipeline stage), or { found: false, username } on 404.
2. Add twitter_crm_get_contact (platform: twitter), tiktok_crm_get_contact (platform: tiktok), linkedin_crm_get_contact (platform: linkedin) with same pattern.
3. All four return the same CRMLite contact shape.
