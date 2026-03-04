# MPLite MCP Server

## Project
/Users/isaiahdupree/Documents/Software/mplite-mcp

## Context
MPLite is the ACTP publish queue at https://mediaposter-lite-isaiahduprees-projects.vercel.app. It manages a social media publish queue with Thompson Sampling optimal timing, platform rate limits, and direct Blotato publishing via Vercel cron. The mediaposter MCP already exposes upload+publish tools. This dedicated MPLite MCP adds queue management tools — add items to queue, check queue status, claim/complete/fail items, view platform limits, get schedule windows, and see per-platform daily stats. MPLITE_URL and MPLITE_KEY env vars required. Auth header: x-api-key.

## Instructions
- Implement each feature exactly as specified
- After EACH feature: run node --check server.js to confirm valid syntax
- After FEAT-007: run npm test to confirm all tests pass
- At the end: create a git commit with message "feat: mplite queue mcp server"
- Update harness/mplite-mcp-features.json after each: set passes=true, status=completed

---

## FEAT-001: Project scaffold

**Problem**: No mplite-mcp directory or server exists.

**Fix**:
1. Create /Users/isaiahdupree/Documents/Software/mplite-mcp/package.json: name "mplite-mcp", version "1.0.0", main "server.js", scripts: { "test": "node --test tests/server.test.js" }, dependencies: {}
2. Create /Users/isaiahdupree/Documents/Software/mplite-mcp/server.js with: const readline = require('readline'); const https = require('https');
3. Add config: const MPLITE_URL = process.env.MPLITE_URL || 'https://mediaposter-lite-isaiahduprees-projects.vercel.app'; const MPLITE_KEY = process.env.MPLITE_KEY; if (!MPLITE_KEY) throw new Error('MPLITE_KEY env var required');
4. Add mpliteFetch(path, method='GET', body=null) async function using https module. URL: MPLITE_URL + path. Headers: 'x-api-key': MPLITE_KEY, 'Content-Type': 'application/json'. Returns { status, ok, data }.
5. Create /Users/isaiahdupree/Documents/Software/mplite-mcp/tests/server.test.js with placeholder test.
6. Create .gitignore: node_modules/

**Acceptance**: node --check /Users/isaiahdupree/Documents/Software/mplite-mcp/server.js exits 0.

---

## FEAT-002: queue_add tool

**Problem**: Agents must know MPLite's POST /api/queue schema to enqueue content for publishing.

**Fix**:
1. Implement async function queue_add({ platform, account_id, video_url, caption, hashtags = [], title, scheduled_for, priority = 5, metadata = {} }). Build body: { platform, account_id, video_url, caption, hashtags, title, scheduled_for, priority, metadata, source: 'mcp' }. Remove undefined fields. Call mpliteFetch('/api/queue', 'POST', body). Return { ok: data.success, id: data.data?.id, platform, status: data.data?.status, scheduled_for }.
2. Add to TOOLS: { name: 'queue_add', description: 'Add a post to the MPLite publish queue. Supports instagram, tiktok, youtube, twitter, threads. video_url must be a public URL. Use scheduled_for (ISO 8601) for a specific time or omit for next available slot.', inputSchema: { type: 'object', required: ['platform', 'account_id', 'video_url', 'caption'], properties: { platform: { type: 'string', enum: ['instagram','tiktok','youtube','twitter','threads'] }, account_id: { type: 'string', description: 'Blotato account ID as string' }, video_url: { type: 'string', description: 'Public URL to the media file' }, caption: { type: 'string' }, hashtags: { type: 'array', items: { type: 'string' }, description: 'Without # prefix' }, title: { type: 'string', description: 'YouTube only' }, scheduled_for: { type: 'string', description: 'ISO 8601 datetime. Omit for next available slot.' }, priority: { type: 'number', description: '1=highest, 10=lowest, default 5' }, metadata: { type: 'object' } } } }
3. Register in TOOL_HANDLERS.

**Acceptance**: Tool appears in tools/list.

---

## FEAT-003: queue_list and queue_status tools

**Problem**: Agents cannot see what is in the queue or check the status of a specific item.

**Fix**:
1. Implement async function queue_list({ platform, status, limit = 20 }). Build query params: limit=limit, plus platform=platform and status=status if provided. Call mpliteFetch('/api/queue?' + params). Return { items: data.data, total: data.data?.length, filters: { platform, status } }.
2. Add queue_list to TOOLS: { name: 'queue_list', description: 'List items in the MPLite publish queue. Filter by platform and/or status (queued, scheduled, publishing, published, failed).', inputSchema: { type: 'object', properties: { platform: { type: 'string' }, status: { type: 'string', enum: ['queued','scheduled','publishing','published','failed'] }, limit: { type: 'number' } } } }
3. Implement async function queue_status({ id }). Call mpliteFetch('/api/queue/' + id). Return { id, platform: data.data?.platform, status: data.data?.status, scheduled_for: data.data?.scheduled_for, published_at: data.data?.published_at, platform_post_id: data.data?.platform_post_id, error_message: data.data?.error_message, retry_count: data.data?.retry_count }.
4. Add queue_status to TOOLS: { name: 'queue_status', description: 'Get the current status of a specific queue item by ID.', inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string', description: 'Queue item UUID' } } } }
5. Register both in TOOL_HANDLERS.

**Acceptance**: Both tools appear in tools/list.

---

## FEAT-004: queue_trigger and queue_daily_stats tools

**Problem**: Agents cannot trigger immediate publishing or see today's publish counts per platform.

**Fix**:
1. Implement async function queue_trigger(). Call mpliteFetch('/api/process-queue', 'POST', {}). Return { ok: data.success, processed: data.data?.processed, errors: data.data?.errors, message: data.data?.message }.
2. Add queue_trigger to TOOLS: { name: 'queue_trigger', description: 'Manually trigger the MPLite publish queue processor to immediately attempt the next item. Normally runs every 15 min via Vercel cron.', inputSchema: { type: 'object', properties: {} } }
3. Implement async function queue_daily_stats(). Call mpliteFetch('/api/queue?status=published&limit=200'). Group returned items by platform. Also call mpliteFetch('/api/queue?status=queued&limit=200') for pending counts. Build: { date: today, by_platform: { instagram: { published: N, queued: N }, tiktok: {...}, ... }, total_published_today: N, total_queued: N }.
4. Add queue_daily_stats to TOOLS: { name: 'queue_daily_stats', description: "Get today's publish counts and queue depth by platform.", inputSchema: { type: 'object', properties: {} } }
5. Register both in TOOL_HANDLERS.

**Acceptance**: Both tools appear in tools/list.

---

## FEAT-005: queue_update and queue_cancel tools

**Problem**: Agents cannot reschedule or cancel queued items.

**Fix**:
1. Implement async function queue_update({ id, scheduled_for, caption, priority, metadata }). Build body from non-undefined fields. Call mpliteFetch('/api/queue/' + id, 'PATCH', body). Return { ok: data.success, id, updated_fields: Object.keys(body) }.
2. Add queue_update to TOOLS: { name: 'queue_update', description: 'Update a queued item — reschedule, edit caption, or change priority. Only works on items with status queued or scheduled.', inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' }, scheduled_for: { type: 'string', description: 'New ISO 8601 datetime' }, caption: { type: 'string' }, priority: { type: 'number' }, metadata: { type: 'object' } } } }
3. Implement async function queue_cancel({ id, reason }). Call mpliteFetch('/api/queue/' + id, 'PATCH', { status: 'cancelled', metadata: { cancel_reason: reason, cancelled_at: new Date().toISOString() } }). Return { ok: data.success, id, reason }.
4. Add queue_cancel to TOOLS: { name: 'queue_cancel', description: 'Cancel a queued or scheduled item. Records the cancellation reason.', inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' }, reason: { type: 'string' } } } }
5. Register both in TOOL_HANDLERS.

**Acceptance**: Both tools appear in tools/list.

---

## FEAT-006: queue_health tool

**Problem**: Agents cannot verify MPLite is reachable before queuing items.

**Fix**:
1. Implement async function queue_health(). Call mpliteFetch('/api/health'). If ok: return { ok: true, url: MPLITE_URL, version: data.data?.version, queue_size: data.data?.queue_size, global_enabled: data.data?.global_enabled, cron: 'every 15 min via Vercel' }. If error: return { ok: false, url: MPLITE_URL, error: 'MPLite unreachable — check deployment at ' + MPLITE_URL }.
2. Add to TOOLS: { name: 'queue_health', description: 'Check MPLite is reachable and get current queue size and global publish status.', inputSchema: { type: 'object', properties: {} } }
3. Register in TOOL_HANDLERS.

**Acceptance**: Tool appears in tools/list. When called without network, returns { ok: false }.

---

## FEAT-007: MCP stdio transport

**Problem**: Tools exist but no MCP protocol — Claude Code cannot connect.

**Fix**:
1. In server.js define const TOOLS = [] and const TOOL_HANDLERS = { queue_add, queue_list, queue_status, queue_trigger, queue_daily_stats, queue_update, queue_cancel, queue_health } BEFORE readline setup.
2. Implement full MCP stdio transport: readline on stdin, parse JSON-RPC. Handle initialize → { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'mplite', version: '1.0.0' } }. Handle tools/list → { tools: TOOLS }. Handle tools/call → invoke handler, return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }, isError: true on throw. Handle notifications/initialized as no-op. Write responses as JSON lines to stdout.

**Acceptance**: echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}' | MPLITE_KEY=test node server.js returns a line containing protocolVersion.

---

## FEAT-008: Tests

**Problem**: No tests — broken queue operations publish to wrong accounts.

**Fix**:
1. In /Users/isaiahdupree/Documents/Software/mplite-mcp/tests/server.test.js use node:test and node:assert.
2. Extract TOOLS, TOOL_HANDLERS, and buildQueueBody(args) into lib.js. server.js requires('./lib').
3. Test 'buildQueueBody strips undefined': call buildQueueBody({ platform: 'instagram', account_id: '807', video_url: 'https://x.com/v.mp4', caption: 'test', title: undefined }). Assert result does not have 'title' key.
4. Test 'tool schema completeness': load TOOLS from lib.js, assert 8 tools, each with name and inputSchema.
5. Test 'queue_cancel body': call buildCancelBody('abc', 'test reason'), assert { status: 'cancelled', metadata: { cancel_reason: 'test reason' } }.
6. Test 'MPLITE_KEY guard': spawn child process without MPLITE_KEY, assert exit code 1.
7. Run npm test — all pass.

**Acceptance**: npm test exits 0 with at least 5 passing assertions.
