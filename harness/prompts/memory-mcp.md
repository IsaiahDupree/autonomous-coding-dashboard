# Memory MCP Server

## Project
/Users/isaiahdupree/Documents/Software/memory-mcp

## Context
The ACTP system has a 3-layer memory system: tacit knowledge events in Supabase table actp_memory_events, daily notes (markdown files at /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/memory/daily/YYYY-MM-DD.md), and a knowledge graph. Currently no agent can read or write memory without writing raw Supabase queries. This batch creates a Node.js MCP server that makes all three layers agent-callable — record events, semantic search, read/write daily notes, and dump recent context. Supabase project: ivhfuhxorppptyuofbgq. SUPABASE_URL and SUPABASE_KEY env vars required.

## Instructions
- Implement each feature exactly as specified
- After EACH feature: run node --check server.js to confirm valid syntax
- After FEAT-007: run npm test to confirm all tests pass
- At the end: create a git commit with message "feat: memory mcp server"
- Update harness/memory-mcp-features.json after each: set passes=true, status=completed

---

## FEAT-001: Project scaffold

**Problem**: No memory-mcp directory or server exists.

**Fix**:
1. Create /Users/isaiahdupree/Documents/Software/memory-mcp/package.json: name "memory-mcp", version "1.0.0", main "server.js", scripts: { "test": "node --test tests/server.test.js" }, dependencies: {}
2. Create /Users/isaiahdupree/Documents/Software/memory-mcp/server.js with: const readline = require('readline'); const https = require('https'); const fs = require('fs'); const path = require('path');
3. Add config: const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ivhfuhxorppptyuofbgq.supabase.co'; const SUPABASE_KEY = process.env.SUPABASE_KEY; const DAILY_NOTES_DIR = process.env.DAILY_NOTES_DIR || '/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/memory/daily'; if (!SUPABASE_KEY) throw new Error('SUPABASE_KEY env var required');
4. Add supabaseFetch(table, params='', method='GET', body=null) async function using https module. GET: SUPABASE_URL + '/rest/v1/' + table + '?' + params with headers apikey, Authorization Bearer, Accept application/json. POST: same with Content-Type application/json and body. Returns parsed JSON.
5. Create /Users/isaiahdupree/Documents/Software/memory-mcp/tests/server.test.js with placeholder test.
6. Create .gitignore: node_modules/

**Acceptance**: node --check /Users/isaiahdupree/Documents/Software/memory-mcp/server.js exits 0.

---

## FEAT-002: memory_record tool

**Problem**: Agents cannot persist observations, decisions, or context without raw Supabase access.

**Fix**:
1. Implement async function memory_record({ category, content, tags = [], metadata = {}, source = 'agent' }). Valid categories: observation, decision, context, skill, error, milestone, plan. Build body: { category, content, tags, metadata: { ...metadata, source }, created_at: new Date().toISOString() }. Call supabaseFetch('actp_memory_events', '', 'POST', body). Return { ok: true, id: data.id, category, content_preview: content.slice(0, 80) }.
2. Add to TOOLS: { name: 'memory_record', description: 'Record a memory event to the ACTP 3-layer memory system. Use for observations, decisions, context discoveries, errors, milestones.', inputSchema: { type: 'object', required: ['category', 'content'], properties: { category: { type: 'string', enum: ['observation','decision','context','skill','error','milestone','plan'] }, content: { type: 'string', description: 'The memory content to record' }, tags: { type: 'array', items: { type: 'string' } }, metadata: { type: 'object', description: 'Extra structured data' }, source: { type: 'string', description: 'Which agent or system recorded this' } } } }
3. Register in TOOL_HANDLERS.

**Acceptance**: Tool appears in tools/list.

---

## FEAT-003: memory_search tool

**Problem**: Agents cannot retrieve relevant past context without writing SQL.

**Fix**:
1. Implement async function memory_search({ query, category, tags, limit = 20, days = 30 }). Build Supabase query params: select=id,category,content,tags,metadata,created_at, order=created_at.desc, limit=limit. If category: append &category=eq.{category}. If days: append &created_at=gte.{isoDateDaysAgo(days)}. Fetch all matching rows. Client-side: filter rows where content.toLowerCase().includes(query.toLowerCase()) OR tags array contains any query word (split by space). If tags param provided: filter rows where tags array overlaps provided tags array. Return { results: filtered.slice(0, limit), total: filtered.length, query, category, days }.
2. Add isoDateDaysAgo(days) helper: returns new Date(Date.now() - days*86400000).toISOString().
3. Add to TOOLS: { name: 'memory_search', description: 'Search the ACTP memory system for past context, decisions, and observations. Filters by category, tags, and recency.', inputSchema: { type: 'object', required: ['query'], properties: { query: { type: 'string' }, category: { type: 'string', enum: ['observation','decision','context','skill','error','milestone','plan'] }, tags: { type: 'array', items: { type: 'string' } }, limit: { type: 'number' }, days: { type: 'number', description: 'Lookback window in days, default 30' } } } }
4. Register in TOOL_HANDLERS.

**Acceptance**: Tool appears in tools/list.

---

## FEAT-004: memory_daily_note tool

**Problem**: Agents cannot read or write daily notes for session context continuity.

**Fix**:
1. Implement async function memory_daily_note({ action, date, content, append = false }). date defaults to today: new Date().toISOString().split('T')[0]. notePath = path.join(DAILY_NOTES_DIR, date + '.md'). For action='read': fs.mkdirSync(DAILY_NOTES_DIR, { recursive: true }); if file exists return { date, content: fs.readFileSync(notePath, 'utf8'), exists: true }; else return { date, content: '', exists: false }. For action='write': fs.mkdirSync(DAILY_NOTES_DIR, { recursive: true }); if append and file exists: fs.appendFileSync(notePath, '\n\n' + content); else fs.writeFileSync(notePath, content); return { ok: true, date, action, path: notePath }. For action='list': read DAILY_NOTES_DIR, return array of { date, size } for all .md files sorted descending.
2. Add to TOOLS: { name: 'memory_daily_note', description: 'Read, write, or list daily notes. Daily notes provide session continuity across agent runs.', inputSchema: { type: 'object', required: ['action'], properties: { action: { type: 'string', enum: ['read','write','list'] }, date: { type: 'string', description: 'YYYY-MM-DD, defaults to today' }, content: { type: 'string', description: 'Note content (required for write)' }, append: { type: 'boolean', description: 'Append to existing note instead of overwriting' } } } }
3. Register in TOOL_HANDLERS.

**Acceptance**: Tool appears in tools/list. memory_daily_note({ action: 'read', date: '2099-01-01' }) returns { exists: false }.

---

## FEAT-005: memory_context_dump tool

**Problem**: Agents starting a new session have no way to quickly reconstruct recent context.

**Fix**:
1. Implement async function memory_context_dump({ days = 7, limit_per_category = 5 }). Fetch actp_memory_events from last N days ordered by created_at desc, limit 100. Group by category. For each category keep top limit_per_category items. Also call memory_daily_note({ action: 'list' }) and read the most recent 3 daily notes. Build output: { period: days + ' days', generated_at: new Date().toISOString(), recent_events_by_category: { observation: [...], decision: [...], milestone: [...] }, recent_daily_notes: [ { date, preview: content.slice(0, 200) }, ...], total_events: N }.
2. Add to TOOLS: { name: 'memory_context_dump', description: 'Dump recent memory context across all categories and daily notes. Call at session start to reconstruct working context.', inputSchema: { type: 'object', properties: { days: { type: 'number', description: 'Days to look back, default 7' }, limit_per_category: { type: 'number', description: 'Max events per category, default 5' } } } }
3. Register in TOOL_HANDLERS.

**Acceptance**: Tool appears in tools/list.

---

## FEAT-006: memory_list_recent and memory_delete tools

**Problem**: Agents cannot browse recent memories or clean up stale/incorrect entries.

**Fix**:
1. Implement async function memory_list_recent({ category, limit = 30, days = 14 }). Query actp_memory_events select=id,category,content,tags,created_at, order created_at desc, limit, filter by category if provided and created_at >= isoDateDaysAgo(days). Return { events: data, count: data.length }.
2. Add to TOOLS: { name: 'memory_list_recent', description: 'List recent memory events, optionally filtered by category.', inputSchema: { type: 'object', properties: { category: { type: 'string' }, limit: { type: 'number' }, days: { type: 'number' } } } }
3. Implement async function memory_delete({ id, reason }). Call supabaseFetch('actp_memory_events?id=eq.' + id, '', 'DELETE', null) with headers Prefer: return=minimal. Log deletion: call supabaseFetch('actp_memory_events', '', 'POST', { category: 'observation', content: 'Deleted memory event ' + id + ': ' + (reason || 'no reason given'), tags: ['deletion'], metadata: { deleted_id: id } }). Return { ok: true, deleted_id: id }.
4. Add to TOOLS: { name: 'memory_delete', description: 'Delete a specific memory event by ID. Records the deletion as a new observation.', inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string', description: 'UUID of the memory event to delete' }, reason: { type: 'string' } } } }
5. Register both in TOOL_HANDLERS.

**Acceptance**: Both tools appear in tools/list.

---

## FEAT-007: MCP stdio transport

**Problem**: Tools exist but no MCP protocol — Claude Code cannot connect.

**Fix**:
1. In server.js define const TOOLS = [] and const TOOL_HANDLERS = { memory_record, memory_search, memory_daily_note, memory_context_dump, memory_list_recent, memory_delete } BEFORE readline setup.
2. Implement full MCP stdio transport: readline on stdin, parse JSON-RPC. Handle initialize → { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'memory', version: '1.0.0' } }. Handle tools/list → { tools: TOOLS }. Handle tools/call → invoke handler, wrap in { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }, isError: true on throw. Handle notifications/initialized as no-op. Write JSON-RPC responses as single lines to stdout.

**Acceptance**: echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}' | SUPABASE_KEY=test node server.js returns a line containing protocolVersion.

---

## FEAT-008: Tests

**Problem**: No tests — broken memory operations corrupt agent context.

**Fix**:
1. In /Users/isaiahdupree/Documents/Software/memory-mcp/tests/server.test.js use node:test and node:assert.
2. Extract isoDateDaysAgo(days), groupByCategory(events), buildContextDump logic into lib.js. server.js requires('./lib').
3. Test 'isoDateDaysAgo': assert isoDateDaysAgo(0) date part equals today, isoDateDaysAgo(7) date part is 7 days ago.
4. Test 'groupByCategory': mock events array with 3 categories, assert keys match and counts are correct.
5. Test 'memory_daily_note read missing': call with a far-future date, assert { exists: false }.
6. Test 'memory_daily_note write+read roundtrip': write content to a temp date, read back, assert content matches, clean up file.
7. Test 'tool schema completeness': load TOOLS from lib.js, assert each has name, description, inputSchema.type === 'object'.
8. Run npm test — all pass.

**Acceptance**: npm test exits 0 with at least 6 passing assertions.
