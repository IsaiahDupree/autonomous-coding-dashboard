# Campaigns MCP Server

## Project
/Users/isaiahdupree/Documents/Software/campaigns-mcp

## Context
The ACTP system stores creative testing campaigns in Supabase (project ivhfuhxorppptyuofbgq) across four tables: actp_campaigns (A/B test campaigns), actp_rounds (test rounds within campaigns), actp_creatives (individual pieces of content), and actp_organic_posts (live published post records with engagement metrics). No agent can query or update this data without writing raw SQL. This batch creates a Node.js MCP server that exposes campaign management, creative lookup, winner selection, and organic post tracking as MCP tools. SUPABASE_URL and SUPABASE_KEY (service role) env vars required.

## Instructions
- Implement each feature exactly as specified
- After EACH feature: run node --check server.js to confirm valid syntax
- After FEAT-007: run npm test to confirm all tests pass
- At the end: create a git commit with message "feat: campaigns mcp server"
- Update harness/campaigns-mcp-features.json after each: set passes=true, status=completed

---

## FEAT-001: Project scaffold

**Problem**: No campaigns-mcp directory or server exists.

**Fix**:
1. Create /Users/isaiahdupree/Documents/Software/campaigns-mcp/package.json: name "campaigns-mcp", version "1.0.0", main "server.js", scripts: { "test": "node --test tests/server.test.js" }, dependencies: {}
2. Create /Users/isaiahdupree/Documents/Software/campaigns-mcp/server.js with: const readline = require('readline'); const https = require('https');
3. Add config: const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ivhfuhxorppptyuofbgq.supabase.co'; const SUPABASE_KEY = process.env.SUPABASE_KEY; if (!SUPABASE_KEY) throw new Error('SUPABASE_KEY env var required');
4. Add supabaseFetch(table, params='', method='GET', body=null) async function using https. Headers: apikey, Authorization Bearer SUPABASE_KEY, Accept application/json, Content-Type application/json. Returns parsed JSON.
5. Add supabaseRpc(fn, body) async function: POST to SUPABASE_URL + '/rest/v1/rpc/' + fn with same headers. Returns parsed JSON.
6. Create /Users/isaiahdupree/Documents/Software/campaigns-mcp/tests/server.test.js with placeholder test.
7. Create .gitignore: node_modules/

**Acceptance**: node --check /Users/isaiahdupree/Documents/Software/campaigns-mcp/server.js exits 0.

---

## FEAT-002: campaigns_list and campaigns_get tools

**Problem**: Agents cannot see active campaigns without raw SQL.

**Fix**:
1. Implement async function campaigns_list({ status, limit = 20 }). Query actp_campaigns: select=id,name,status,platform,objective,budget_usd,start_date,end_date,created_at, order=created_at.desc, limit. If status: append &status=eq.{status}. Return { campaigns: data, count: data.length }.
2. Add campaigns_list to TOOLS: { name: 'campaigns_list', description: 'List ACTP creative testing campaigns. Filter by status (draft, active, paused, completed, archived).', inputSchema: { type: 'object', properties: { status: { type: 'string', enum: ['draft','active','paused','completed','archived'] }, limit: { type: 'number' } } } }
3. Implement async function campaigns_get({ id }). Query actp_campaigns?id=eq.{id}&select=* (single). Also fetch rounds: actp_rounds?campaign_id=eq.{id}&select=id,round_number,status,winner_creative_id,started_at,ended_at&order=round_number.asc. Return { campaign: campaign[0], rounds, round_count: rounds.length }.
4. Add campaigns_get to TOOLS: { name: 'campaigns_get', description: 'Get full details of a campaign including its rounds.', inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } }
5. Register both in TOOL_HANDLERS.

**Acceptance**: Both tools appear in tools/list.

---

## FEAT-003: creatives_list and creatives_get tools

**Problem**: Agents cannot browse creatives or check which are pending approval.

**Fix**:
1. Implement async function creatives_list({ campaign_id, status, platform, limit = 20 }). Query actp_creatives: select=id,campaign_id,round_id,platform,status,content_type,caption,video_url,thumbnail_url,created_at, order=created_at.desc, limit. Apply eq filters for provided args. Return { creatives: data, count: data.length }.
2. Add creatives_list to TOOLS: { name: 'creatives_list', description: 'List creatives in the ACTP system. Filter by campaign, status (draft, approved, rejected, published, archived), or platform.', inputSchema: { type: 'object', properties: { campaign_id: { type: 'string' }, status: { type: 'string', enum: ['draft','approved','rejected','published','archived'] }, platform: { type: 'string' }, limit: { type: 'number' } } } }
3. Implement async function creatives_get({ id }). Query actp_creatives?id=eq.{id}&select=* single row. Also fetch linked organic posts: actp_organic_posts?creative_id=eq.{id}&select=id,platform,status,views,likes,comments,shares,published_at,post_url. Return { creative: data[0], organic_posts: posts, performance_summary: { total_views: sum, total_likes: sum, total_comments: sum, post_count: posts.length } }.
4. Add creatives_get to TOOLS: { name: 'creatives_get', description: 'Get a creative with its linked organic posts and aggregate performance metrics.', inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } }
5. Register both in TOOL_HANDLERS.

**Acceptance**: Both tools appear in tools/list.

---

## FEAT-004: creatives_approve and organic_posts_list tools

**Problem**: Agents cannot approve/reject creatives or see published post performance.

**Fix**:
1. Implement async function creatives_approve({ id, action, notes }). action must be 'approve' or 'reject'. new_status = action === 'approve' ? 'approved' : 'rejected'. Call supabaseFetch('actp_creatives?id=eq.' + id, '', 'PATCH', { status: new_status, review_notes: notes, reviewed_at: new Date().toISOString() }). Return { ok: true, id, new_status, notes }.
2. Add creatives_approve to TOOLS: { name: 'creatives_approve', description: 'Approve or reject a creative for publishing. Approved creatives can be queued via queue_add.', inputSchema: { type: 'object', required: ['id', 'action'], properties: { id: { type: 'string' }, action: { type: 'string', enum: ['approve','reject'] }, notes: { type: 'string', description: 'Review notes or rejection reason' } } } }
3. Implement async function organic_posts_list({ platform, status, campaign_id, days = 30, limit = 30 }). Query actp_organic_posts: select=id,campaign_id,creative_id,platform,status,views,likes,comments,shares,published_at,post_url. Apply filters. Append published_at=gte.{isoDateDaysAgo(days)} always. Add isoDateDaysAgo helper. Order published_at desc, limit. Return { posts: data, count: data.length, filters: { platform, status, days } }.
4. Add organic_posts_list to TOOLS: { name: 'organic_posts_list', description: 'List published organic posts with engagement metrics. Filter by platform, status, campaign.', inputSchema: { type: 'object', properties: { platform: { type: 'string' }, status: { type: 'string' }, campaign_id: { type: 'string' }, days: { type: 'number' }, limit: { type: 'number' } } } }
5. Register both in TOOL_HANDLERS.

**Acceptance**: Both tools appear in tools/list.

---

## FEAT-005: campaigns_summary tool

**Problem**: Agents have no single call to get the overall health of the ACTP creative testing system.

**Fix**:
1. Implement async function campaigns_summary(). Run in parallel with Promise.all: (a) supabaseFetch('actp_campaigns', 'select=status&order=created_at.desc&limit=200') — count by status. (b) supabaseFetch('actp_creatives', 'select=status&limit=500') — count by status. (c) supabaseFetch('actp_organic_posts', 'select=platform,views,likes&published_at=gte.' + isoDateDaysAgo(30) + '&limit=500') — sum views/likes by platform. Build output: { campaigns: { active: N, draft: N, completed: N, total: N }, creatives: { draft: N, approved: N, published: N, total: N }, organic_last_30d: { instagram: { posts: N, total_views: N, total_likes: N }, tiktok: {...}, youtube: {...}, twitter: {...} }, generated_at: now }.
2. Add to TOOLS: { name: 'campaigns_summary', description: 'Get a full health summary of the ACTP creative testing system: campaign counts, creative statuses, and organic post performance for the last 30 days.', inputSchema: { type: 'object', properties: {} } }
3. Register in TOOL_HANDLERS.

**Acceptance**: Tool appears in tools/list.

---

## FEAT-006: campaigns_create tool

**Problem**: Agents cannot programmatically spin up new A/B test campaigns.

**Fix**:
1. Implement async function campaigns_create({ name, platform, objective, budget_usd, start_date, end_date, metadata = {} }). Build body: { name, platform, objective, budget_usd, start_date, end_date, status: 'draft', metadata, created_at: new Date().toISOString() }. Call supabaseFetch('actp_campaigns', '', 'POST', body) with header Prefer: return=representation. Return { ok: true, id: data[0]?.id, name, platform, status: 'draft' }.
2. Add to TOOLS: { name: 'campaigns_create', description: 'Create a new ACTP creative testing campaign. Starts in draft status. Use campaigns_list to see existing before creating duplicates.', inputSchema: { type: 'object', required: ['name', 'platform', 'objective'], properties: { name: { type: 'string' }, platform: { type: 'string', enum: ['instagram','tiktok','youtube','twitter','threads'] }, objective: { type: 'string', description: 'e.g. brand_awareness, lead_gen, product_launch' }, budget_usd: { type: 'number' }, start_date: { type: 'string', description: 'YYYY-MM-DD' }, end_date: { type: 'string', description: 'YYYY-MM-DD' }, metadata: { type: 'object' } } } }
3. Register in TOOL_HANDLERS.

**Acceptance**: Tool appears in tools/list.

---

## FEAT-007: MCP stdio transport

**Problem**: Tools exist but no MCP protocol — Claude Code cannot connect.

**Fix**:
1. In server.js define const TOOLS = [] and const TOOL_HANDLERS = { campaigns_list, campaigns_get, creatives_list, creatives_get, creatives_approve, organic_posts_list, campaigns_summary, campaigns_create } BEFORE readline setup.
2. Implement full MCP stdio transport: readline on stdin, parse JSON-RPC. Handle initialize → { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'campaigns', version: '1.0.0' } }. Handle tools/list → { tools: TOOLS }. Handle tools/call → invoke handler, return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }, isError: true on throw. Handle notifications/initialized as no-op. Write responses as JSON lines to stdout.

**Acceptance**: echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}' | SUPABASE_KEY=test node server.js returns a line containing protocolVersion.

---

## FEAT-008: Tests

**Problem**: No tests — wrong status values can corrupt campaign data.

**Fix**:
1. In /Users/isaiahdupree/Documents/Software/campaigns-mcp/tests/server.test.js use node:test and node:assert.
2. Extract TOOLS, isoDateDaysAgo, groupByField(rows, field), aggregatePerformance(posts) into lib.js.
3. Test 'isoDateDaysAgo': assert returns ISO string, 30 days ago is before today.
4. Test 'groupByField': mock [{ status: 'active' }, { status: 'active' }, { status: 'draft' }], assert { active: 2, draft: 1 }.
5. Test 'aggregatePerformance': mock posts array, assert sum of views/likes correct.
6. Test 'creatives_approve validates action': call with action='delete', assert throws or returns error.
7. Test 'tool schema completeness': load TOOLS from lib.js, assert 8 tools with name + inputSchema.
8. Run npm test — all pass.

**Acceptance**: npm test exits 0 with at least 6 passing assertions.
