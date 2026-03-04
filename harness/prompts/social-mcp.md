# Social Automation MCP Server

## Project
/Users/isaiahdupree/Documents/Software/social-mcp

## Context
Nine Safari automation services run locally across ports 3100-3106 handling DMs, comments, and market research for Instagram, Twitter, TikTok, LinkedIn, and Threads. This batch creates a unified Node.js MCP server that wraps all nine services so any Claude Code agent can DM, comment, check inbox, and run research with a single tool call — without needing to know which port handles which platform. All services accept/return JSON via HTTP on localhost.

Port map:
- 3100: instagram-dm
- 3003: twitter-dm
- 3102: tiktok-dm
- 3105: linkedin-automation
- 3005: instagram-comments
- 3007: twitter-comments
- 3006: tiktok-comments
- 3004: threads-comments
- 3106: market-research (all platforms)

## Instructions
- Implement each feature exactly as specified
- After EACH feature: run node --check server.js to confirm valid syntax
- After FEAT-007: run npm test to confirm all tests pass
- At the end: create a git commit with message "feat: social automation mcp server"
- Update harness/social-mcp-features.json after each: set passes=true, status=completed

---

## FEAT-001: Project scaffold

**Problem**: No social-mcp directory or server exists.

**Fix**:
1. Create /Users/isaiahdupree/Documents/Software/social-mcp/package.json with name "social-mcp", version "1.0.0", main "server.js", scripts: { "test": "node --test tests/server.test.js" }, dependencies: {}
2. Create /Users/isaiahdupree/Documents/Software/social-mcp/server.js with: const readline = require('readline'); const http = require('http');
3. Add SERVICE_PORTS config object: const SERVICE_PORTS = { instagram_dm: 3100, twitter_dm: 3003, tiktok_dm: 3102, linkedin: 3105, instagram_comments: 3005, twitter_comments: 3007, tiktok_comments: 3006, threads_comments: 3004, market_research: 3106 };
4. Add DM_PORTS mapping: const DM_PORTS = { instagram: 3100, twitter: 3003, tiktok: 3102, linkedin: 3105 };
5. Add COMMENT_PORTS mapping: const COMMENT_PORTS = { instagram: 3005, twitter: 3007, tiktok: 3006, threads: 3004 };
6. Add localFetch(port, path, method='GET', body=null) async function using http.request to localhost:{port}{path} with Content-Type application/json. Returns { status, ok, data }.
7. Create /Users/isaiahdupree/Documents/Software/social-mcp/tests/server.test.js with placeholder: const { test } = require('node:test'); const assert = require('node:assert'); test('placeholder', () => assert.ok(true));
8. Create /Users/isaiahdupree/Documents/Software/social-mcp/.gitignore: node_modules/

**Acceptance**: node --check /Users/isaiahdupree/Documents/Software/social-mcp/server.js exits 0.

---

## FEAT-002: social_health tool

**Problem**: Agents have no way to check which Safari services are running before attempting automation.

**Fix**:
1. In server.js, implement async function social_health(). For each entry in SERVICE_PORTS, call localFetch(port, '/health') with a 3000ms timeout using AbortController (use http.request timeout option or Promise.race with setTimeout). Build result object: { [serviceName]: { up: boolean, port: number, latencyMs?: number } }. Catch connection errors as up: false.
2. Compute summary: { all_up: boolean, up_count: number, total: 9, services: {...}, start_cmd: 'See ~/.claude/CLAUDE.md Safari Services section to start missing services' }.
3. Add to TOOLS array: { name: 'social_health', description: 'Check which of the 9 Safari automation services are running. Returns per-service up/down + latency.', inputSchema: { type: 'object', properties: {} } }
4. Register in TOOL_HANDLERS.

**Acceptance**: Tool appears in tools/list. When no services are running, returns all_up: false with up_count: 0.

---

## FEAT-003: social_dm tool

**Problem**: Agents must know port numbers and REST schemas to send DMs — there is no unified interface.

**Fix**:
1. In server.js, implement async function social_dm({ platform, username, message }). Look up port from DM_PORTS[platform]. If no port found, return { error: 'Platform not supported for DM: ' + platform + '. Supported: instagram, twitter, tiktok, linkedin' }. Call localFetch(port, '/send-dm', 'POST', { username, message }). If service is down (ECONNREFUSED), return { error: 'Service down on port ' + port + '. Run social_health to diagnose.' }. Return { ok: true, platform, username, verified: data.verified, strategy: data.strategy } on success.
2. Add to TOOLS array: { name: 'social_dm', description: 'Send a direct message to a user on Instagram, Twitter/X, TikTok, or LinkedIn via Safari automation. Always run crm_dedup_check first.', inputSchema: { type: 'object', required: ['platform', 'username', 'message'], properties: { platform: { type: 'string', enum: ['instagram','twitter','tiktok','linkedin'] }, username: { type: 'string', description: 'Handle without @' }, message: { type: 'string', description: 'Message text to send' } } } }
3. Register in TOOL_HANDLERS.

**Acceptance**: Tool appears in tools/list. Calling with an unsupported platform returns error string immediately (no network call).

---

## FEAT-004: social_comment tool

**Problem**: Agents cannot post comments on feed posts without knowing the comment service port per platform.

**Fix**:
1. In server.js, implement async function social_comment({ platform, post_url, text }). Look up port from COMMENT_PORTS[platform]. If not found, return { error: 'Platform not supported for comments: ' + platform }. Call localFetch(port, '/post-comment', 'POST', { postUrl: post_url, text }). If ECONNREFUSED, return { error: 'Comment service down on port ' + port }. Return { ok: data.success, platform, post_url, comment_id: data.commentId }.
2. Add to TOOLS array: { name: 'social_comment', description: 'Post a comment on a social media post via Safari automation. Supports Instagram, Twitter, TikTok, Threads.', inputSchema: { type: 'object', required: ['platform', 'post_url', 'text'], properties: { platform: { type: 'string', enum: ['instagram','twitter','tiktok','threads'] }, post_url: { type: 'string', description: 'Full URL of the post to comment on' }, text: { type: 'string', description: 'Comment text' } } } }
3. Register in TOOL_HANDLERS.

**Acceptance**: Tool appears in tools/list.

---

## FEAT-005: social_inbox tool

**Problem**: Agents cannot retrieve unread DMs without knowing 4 different port/path combinations.

**Fix**:
1. In server.js, implement async function social_inbox({ platform }). If platform provided: only fetch that platform's conversations. Else: fetch all DM platforms in parallel using Promise.allSettled. For each platform in DM_PORTS, call localFetch(port, '/conversations'). Collect results into { [platform]: { conversations: [], error?: string } }. Return { platforms: result, total_conversations: sum of all conversation counts }.
2. Add to TOOLS array: { name: 'social_inbox', description: 'Get DM conversations from Instagram, Twitter, TikTok, and/or LinkedIn inboxes. Omit platform to fetch all at once.', inputSchema: { type: 'object', properties: { platform: { type: 'string', enum: ['instagram','twitter','tiktok','linkedin'], description: 'Specific platform to check. Omit for all.' } } } }
3. Register in TOOL_HANDLERS.

**Acceptance**: Tool appears in tools/list. Calling with a down service returns that platform with error: 'service down' and still returns other platforms.

---

## FEAT-006: social_research tool

**Problem**: Agents cannot run niche or competitor research without knowing the market-research service API at port 3106.

**Fix**:
1. In server.js, implement async function social_research({ platform, keyword, max_posts = 5 }). Call localFetch(3106, '/search', 'POST', { platform, keyword, maxPosts: max_posts }). If ECONNREFUSED, return { error: 'Market research service down on port 3106. Start with: PORT=3106 npx tsx packages/market-research/src/api/server.ts &' }. Return { posts: data.posts, count: data.count, platform, keyword }.
2. Implement async function social_competitor_research({ platform, niche, max_creators = 5 }). Call localFetch(3106, '/competitor-research', 'POST', { platform, niche, config: { creatorsPerNiche: max_creators, postsPerNiche: 50 } }). Return { niche, top_creators: data.topCreators }.
3. Add social_research to TOOLS: { name: 'social_research', description: 'Search for posts by keyword on Instagram, Twitter, TikTok, or Threads. Returns engagement stats.', inputSchema: { type: 'object', required: ['platform', 'keyword'], properties: { platform: { type: 'string', enum: ['instagram','twitter','tiktok','threads'] }, keyword: { type: 'string' }, max_posts: { type: 'number' } } } }
4. Add social_competitor_research to TOOLS: { name: 'social_competitor_research', description: 'Find top creators in a niche on a platform with engagement scores.', inputSchema: { type: 'object', required: ['platform', 'niche'], properties: { platform: { type: 'string', enum: ['instagram','twitter','tiktok','threads'] }, niche: { type: 'string', description: 'e.g. ai automation, solopreneur' }, max_creators: { type: 'number' } } } }
5. Register both in TOOL_HANDLERS.

**Acceptance**: Both tools appear in tools/list.

---

## FEAT-007: MCP stdio transport

**Problem**: Tools exist but no MCP protocol — Claude Code cannot connect.

**Fix**:
1. In server.js add TOOLS array (const TOOLS = []) and TOOL_HANDLERS (const TOOL_HANDLERS = { social_health, social_dm, social_comment, social_inbox, social_research, social_competitor_research }) BEFORE the readline setup.
2. Implement full MCP stdio transport: readline reads stdin line by line, parses JSON-RPC. Handle initialize → protocolVersion '2024-11-05', capabilities { tools: {} }, serverInfo { name: 'social', version: '1.0.0' }. Handle tools/list → { tools: TOOLS }. Handle tools/call → call handler, wrap in { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }. Handle notifications/initialized as no-op. Write all responses as JSON + newline to stdout.

**Acceptance**: echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}' | node server.js returns a line containing protocolVersion.

---

## FEAT-008: Tests

**Problem**: No tests — platform routing bugs are undetectable.

**Fix**:
1. In /Users/isaiahdupree/Documents/Software/social-mcp/tests/server.test.js use node:test and node:assert.
2. Refactor server.js: extract SERVICE_PORTS, DM_PORTS, COMMENT_PORTS, and the platform-routing logic (not the HTTP calls) into a lib.js file. server.js requires('./lib') and wires to MCP.
3. Test 'DM_PORTS coverage': assert DM_PORTS has keys instagram, twitter, tiktok, linkedin.
4. Test 'COMMENT_PORTS coverage': assert COMMENT_PORTS has keys instagram, twitter, tiktok, threads.
5. Test 'social_dm platform validation': call social_dm({ platform: 'youtube', username: 'x', message: 'y' }) from lib.js (stub localFetch) → assert result.error includes 'not supported'.
6. Test 'social_comment platform validation': call social_comment({ platform: 'linkedin', post_url: 'x', text: 'y' }) → assert result.error includes 'not supported'.
7. Test 'tool schema completeness': load TOOLS from lib.js, assert every tool has name, description, inputSchema.type === 'object'.
8. Run npm test — all pass.

**Acceptance**: npm test exits 0 with at least 6 passing assertions.
