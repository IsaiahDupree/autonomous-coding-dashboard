---
domain: [acquisition]
agent_roles: [acquisition]
priority: high
---

# CRMLite MCP Server

## Project
/Users/isaiahdupree/Documents/Software/crmlite-mcp

## Context
CRMLite is a Next.js CRM at https://crmlite-isaiahduprees-projects.vercel.app with REST endpoints at /api/contacts, /api/conversations, /api/campaigns, /api/stats. This batch creates a standalone Node.js MCP server that wraps those endpoints so any Claude Code agent can search contacts, add entries, log interactions, and dedup handles before DMing — without needing to know CRMLite's REST schema. Auth header is x-api-key with value from CRMLITE_API_KEY env var. CRMLITE_URL env var holds the base URL.

## Instructions
- Implement each feature exactly as specified
- After EACH feature: run node --check server.js to confirm valid syntax
- After FEAT-007: run npm test to confirm all tests pass
- At the end: create a git commit with message "feat: crmlite mcp server"
- Update harness/crmlite-mcp-features.json after each: set passes=true, status=completed

---

## FEAT-001: Project scaffold

**Problem**: No crmlite-mcp directory or server exists.

**Fix**:
1. Create /Users/isaiahdupree/Documents/Software/crmlite-mcp/package.json with name "crmlite-mcp", version "1.0.0", main "server.js", scripts: { "test": "node --test tests/server.test.js" }, dependencies: {} (no external deps — use built-in https, readline, crypto)
2. Create /Users/isaiahdupree/Documents/Software/crmlite-mcp/server.js with top-level const readline = require('readline'); const https = require('https'); const http = require('http'); const { createHash } = require('crypto');
3. Add config block: const CRMLITE_URL = process.env.CRMLITE_URL || 'https://crmlite-isaiahduprees-projects.vercel.app'; const CRMLITE_KEY = process.env.CRMLITE_API_KEY; if (!CRMLITE_KEY) throw new Error('CRMLITE_API_KEY env var required');
4. Add crmFetch(path, method='GET', body=null) async function that calls CRMLITE_URL + path with header 'x-api-key': CRMLITE_KEY and Content-Type application/json. Returns { status, ok, data }.
5. Create /Users/isaiahdupree/Documents/Software/crmlite-mcp/tests/server.test.js as an empty Node test file (node:test) with a placeholder test: assert.ok(true)
6. Create /Users/isaiahdupree/Documents/Software/crmlite-mcp/.gitignore containing: node_modules/

**Acceptance**: node --check /Users/isaiahdupree/Documents/Software/crmlite-mcp/server.js exits 0.

---

## FEAT-002: crm_search tool

**Problem**: Agents cannot find contacts by name, handle, or platform.

**Fix**:
1. In server.js, implement async function crm_search({ query, platform, stage, limit = 20 }). Build URLSearchParams from non-null args: search=query, platform, stage, limit. Call crmFetch('/api/contacts?' + params). Return { contacts: data.contacts, total: data.total }.
2. Add to TOOLS array: { name: 'crm_search', description: 'Search CRMLite contacts by name, handle, email, notes. Filter by platform (instagram/tiktok/twitter/linkedin/threads) or pipeline stage.', inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Name, handle, email, or keyword' }, platform: { type: 'string' }, stage: { type: 'string', enum: ['prospect','contacted','replied','qualified','converted','lost'] }, limit: { type: 'number' } } } }
3. Register in TOOL_HANDLERS: { crm_search }

**Acceptance**: Tool appears in tools/list response.

---

## FEAT-003: crm_get_contact tool

**Problem**: Agents cannot pull a full contact card by ID or handle.

**Fix**:
1. In server.js, implement async function crm_get_contact({ id, handle, platform }). If id provided: call crmFetch('/api/contacts/' + id). Else: call crm_search({ query: handle, platform, limit: 1 }) and return contacts[0] or { error: 'not found' }. Return the full contact object including crm_platform_accounts array.
2. Add to TOOLS array: { name: 'crm_get_contact', description: 'Get a full CRM contact card by contact ID or by handle + platform. Returns contact with all platform accounts.', inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'Contact UUID' }, handle: { type: 'string', description: 'Social handle without @' }, platform: { type: 'string' } } } }
3. Register in TOOL_HANDLERS: { crm_get_contact }

**Acceptance**: Tool appears in tools/list; calling with a non-existent handle returns { error: 'not found' }.

---

## FEAT-004: crm_add_contact tool

**Problem**: Agents cannot create new contacts during outreach discovery.

**Fix**:
1. In server.js, implement async function crm_add_contact({ display_name, platform, handle, stage = 'prospect', notes, tags = [] }). Build body: { display_name, pipeline_stage: stage, notes, tags, platform_accounts: [{ platform, username: handle, is_primary: true }] }. Call crmFetch('/api/contacts', 'POST', body). Return { id: data.id, display_name, stage, platform, handle }.
2. Add to TOOLS array: { name: 'crm_add_contact', description: 'Add a new contact to CRMLite. Automatically creates the platform account link.', inputSchema: { type: 'object', required: ['display_name', 'platform', 'handle'], properties: { display_name: { type: 'string' }, platform: { type: 'string', enum: ['instagram','tiktok','twitter','linkedin','threads','youtube'] }, handle: { type: 'string', description: 'Handle without @' }, stage: { type: 'string', enum: ['prospect','contacted','replied','qualified','converted','lost'] }, notes: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } } } }
3. Register in TOOL_HANDLERS: { crm_add_contact }

**Acceptance**: Tool appears in tools/list.

---

## FEAT-005: crm_dedup_check tool

**Problem**: Agents DM the same person twice because there is no quick handle lookup before outreach.

**Fix**:
1. In server.js, implement async function crm_dedup_check({ handle, platform }). Call crmFetch('/api/contacts?search=' + encodeURIComponent(handle) + '&platform=' + platform + '&limit=5'). Check if any returned contact has a crm_platform_accounts entry with username === handle (case-insensitive). Return { exists: boolean, contact_id: string|null, stage: string|null, last_contacted: string|null }.
2. Add to TOOLS array: { name: 'crm_dedup_check', description: 'Check if a social handle already exists in CRMLite before sending a DM. Returns exists + current pipeline stage.', inputSchema: { type: 'object', required: ['handle', 'platform'], properties: { handle: { type: 'string', description: 'Handle without @' }, platform: { type: 'string', enum: ['instagram','tiktok','twitter','linkedin','threads'] } } } }
3. Register in TOOL_HANDLERS: { crm_dedup_check }

**Acceptance**: Tool appears in tools/list. Calling with a handle that does not exist returns { exists: false, contact_id: null }.

---

## FEAT-006: crm_log_interaction and crm_pipeline tools

**Problem**: Agents cannot record DMs sent or view the full pipeline funnel.

**Fix**:
1. In server.js, implement async function crm_log_interaction({ contact_id, action, notes, platform }). Build body: { contact_id, event_type: action, notes, platform, occurred_at: new Date().toISOString() }. Call crmFetch('/api/conversations', 'POST', body). Return { ok: true, event_id: data.id }.
2. Add crm_log_interaction to TOOLS array: { name: 'crm_log_interaction', description: 'Log an interaction with a contact: dm_sent, replied, call_scheduled, deal_closed, etc.', inputSchema: { type: 'object', required: ['contact_id', 'action'], properties: { contact_id: { type: 'string' }, action: { type: 'string', description: 'dm_sent | replied | call_scheduled | deal_closed | unfollowed' }, notes: { type: 'string' }, platform: { type: 'string' } } } }
3. Implement async function crm_pipeline({ stage }). Call crmFetch('/api/contacts?stage=' + stage + '&limit=50'). Return { stage, count: data.total, contacts: data.contacts.map(c => ({ id: c.id, display_name: c.display_name, platform: c.crm_platform_accounts?.[0]?.platform, handle: c.crm_platform_accounts?.[0]?.username })) }.
4. Add crm_pipeline to TOOLS array: { name: 'crm_pipeline', description: 'Get all contacts at a given pipeline stage.', inputSchema: { type: 'object', required: ['stage'], properties: { stage: { type: 'string', enum: ['prospect','contacted','replied','qualified','converted','lost'] } } } }
5. Register both in TOOL_HANDLERS.

**Acceptance**: Both tools appear in tools/list.

---

## FEAT-007: MCP stdio transport

**Problem**: The server has tools but no MCP protocol handler — Claude Code cannot connect.

**Fix**:
1. In server.js, implement the full MCP stdio transport at the bottom of the file. Use readline to read lines from process.stdin. Parse each line as JSON-RPC. Handle: initialize → respond with protocolVersion '2024-11-05', capabilities { tools: {} }, serverInfo { name: 'crmlite', version: '1.0.0' }. Handle tools/list → return { tools: TOOLS }. Handle tools/call → look up handler in TOOL_HANDLERS, call it with msg.params.arguments, wrap result in { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }. On error, return isError: true with error message. Handle notifications/initialized as no-op. Unknown methods with id → return -32601 error. Write all responses with process.stdout.write(JSON.stringify(response) + '\n').
2. TOOLS must be defined as const TOOLS = [] BEFORE the readline setup.
3. TOOL_HANDLERS must be defined as const TOOL_HANDLERS = { crm_search, crm_get_contact, crm_add_contact, crm_dedup_check, crm_log_interaction, crm_pipeline }.

**Acceptance**: echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}' | CRMLITE_API_KEY=test node server.js returns a JSON line containing protocolVersion.

---

## FEAT-008: Unit and integration tests

**Problem**: No tests exist — regressions are undetectable.

**Fix**:
1. In /Users/isaiahdupree/Documents/Software/crmlite-mcp/tests/server.test.js, use node:test and node:assert. Import { createHash } from 'crypto'.
2. Write test group 'crmFetch helper': mock the https module is not needed — instead test that crmFetch throws when CRMLITE_API_KEY is not set by spawning a child process with no env and confirming exit code 1.
3. Write test group 'tool schemas': load TOOLS by requiring a separate tools-export.js (create it: module.exports = { TOOLS, TOOL_HANDLERS }) and assert each tool has name (string), description (string), inputSchema.type === 'object'.
4. Write test group 'crm_dedup_check logic': mock crmFetch by monkey-patching the module. Create a fake response { contacts: [{ id: 'abc', crm_platform_accounts: [{ platform: 'instagram', username: 'testhandle' }] }] }. Assert crm_dedup_check({ handle: 'testhandle', platform: 'instagram' }) returns { exists: true, contact_id: 'abc' }.
5. Refactor server.js to require('./tools-export') if run via test (check if process.env.NODE_TEST), or self-initialize if run directly. Alternative: export the handler functions from a lib.js and test lib.js; server.js just wires them to MCP.
6. Run npm test — all tests must pass.

**Acceptance**: npm test exits 0 with at least 5 passing assertions.
