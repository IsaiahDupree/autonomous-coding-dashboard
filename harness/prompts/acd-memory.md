# ACD Memory -- 3-Layer Memory, Heartbeat, and Scheduling MCP Tools

## Project
/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard

## Context
The ACD MCP server (harness/acd-mcp-server.js) currently has no connection to the
3-layer memory system, heartbeat agent, or scheduling. This batch adds 6 features:
acd_read_memory, acd_write_memory, acd_heartbeat_status, acd_schedule,
acd_list_scheduled, and a harness auto-log hook.

The 3-layer memory system lives in actp-worker:
  Layer 1: Knowledge Graph -- ~/.memory/vault/KNOWLEDGE-GRAPH.md + actp_graph_entities (Supabase)
  Layer 2: Daily Notes -- ~/.memory/vault/DAILY-NOTES/YYYY-MM-DD.md + actp_memory_events (Supabase)
  Layer 3: Tacit Knowledge -- ~/.memory/vault/TACIT-KNOWLEDGE.md

Supabase project: ivhfuhxorppptyuofbgq
actp-worker path: /Users/isaiahdupree/Documents/Software/actp-worker
Memory vault: ~/.memory/vault (default from config.py MEMORY_VAULT_PATH)
ACTP MCP server port: 8766 (FastAPI, auth: Bearer ACTP_MCP_AUTH_KEY or empty=localhost trust)
CRMLite agent status URL: https://crmlite-h3k1s46jj-isaiahduprees-projects.vercel.app/api/agent/status

Existing tools in acd-mcp-server.js: acd_list_projects, acd_start, acd_status, acd_logs, acd_stop
Schedule file: harness/schedule.json
Update /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/acd-memory-features.json after each feature.

## Instructions
- Implement each feature in order
- After EACH feature: verify with node --check harness/acd-mcp-server.js
- Do not break existing tools
- Use existsSync/readFileSync/fetch already imported in acd-mcp-server.js
- For Supabase calls: use fetch() directly with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from process.env
- For Python graph_memory calls: spawn python3 with -c flag from the actp-worker directory

---

## ACD-MEM-001: acd_read_memory tool

**Problem**: Claude Code has no way to read previous session context from the 3-layer memory system.

**Fix**:
1. Add to TOOLS array in harness/acd-mcp-server.js:
   name: 'acd_read_memory'
   description: 'Read context from all 3 memory layers: tacit knowledge (L3), today daily note (L2), top knowledge graph entities (L1)'
   inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Optional topic to filter graph entities' }, layers: { type: 'array', items: { type: 'string' }, description: 'Which layers to read: [1,2,3] default all' } }, required: [] }

2. Add handler acdReadMemory(params):
   vaultPath = process.env.MEMORY_VAULT_PATH || path.join(os.homedir(), '.memory', 'vault')
   result = { layers: {} }

   Layer 3: read vaultPath/TACIT-KNOWLEDGE.md if exists, include first 2000 chars
   result.layers[3] = { content: tacitContent, source: tacitPath }

   Layer 2: today = new Date().toISOString().split('T')[0], read vaultPath/DAILY-NOTES/{today}.md
   also read yesterday's note (date -1 day)
   result.layers[2] = { today: todayContent, yesterday: yesterdayContent, date: today }

   Layer 1: query Supabase actp_graph_entities table:
   fetch SUPABASE_URL + '/rest/v1/actp_graph_entities?select=name,entity_type,properties,tags,confidence,layer&order=updated_at.desc&limit=15'
   headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY }
   if params.query: append &name=ilike.*{params.query}*
   result.layers[1] = { entities: data, count: data.length }

   Return result

3. Add case 'acd_read_memory' to executeTool switch.

---

## ACD-MEM-002: acd_write_memory tool

**Problem**: Claude Code agents cannot write events back to the memory system after completing work.

**Fix**:
1. Add to TOOLS array:
   name: 'acd_write_memory'
   description: 'Write a memory event to Layer 2 (actp_memory_events + daily note). Events with importance >= 7.0 promote to Layer 1 nightly.'
   inputSchema: { type: 'object', properties: {
     event_type: { type: 'string', description: 'decision | error | insight | observation | session_complete' },
     content: { type: 'string', description: 'What happened, what was built, what was decided' },
     importance_score: { type: 'number', description: '0-10. >= 7.0 promotes to Layer 1 nightly. 9-10=major decision, 7-8=significant feature, 5-6=normal work' },
     source: { type: 'string', description: 'Source agent identifier, e.g. acd-dispatch or claude_code' },
     metadata: { type: 'object', description: 'Optional: { slug, features_passed, features_total, files_changed }' }
   }, required: ['event_type', 'content'] }

2. Add handler acdWriteMemory(params):
   a. Write to Supabase actp_memory_events:
      POST SUPABASE_URL + '/rest/v1/actp_memory_events'
      body: { event_type: params.event_type, content: params.content, importance_score: params.importance_score || 5.0, source: params.source || 'acd', metadata: params.metadata || {}, created_at: new Date().toISOString() }
   b. Append to today's daily note:
      vaultPath/DAILY-NOTES/YYYY-MM-DD.md -- append markdown block:
      '\n## ACD Event: HH:MM\n**Type:** {event_type}\n**Score:** {importance_score}\n{content}\n'
      (mkdirSync the DAILY-NOTES dir if missing)
   c. Return { ok: true, eventType: params.event_type, importanceScore, promotesNightly: score >= 7.0, notePath }

3. Add case 'acd_write_memory' to executeTool switch.

---

## ACD-MEM-003: acd_heartbeat_status tool

**Problem**: No way to check heartbeat health without polling CRMLite manually.

**Fix**:
1. Add to TOOLS array:
   name: 'acd_heartbeat_status'
   description: 'Read latest heartbeat snapshots from Supabase and CRMLite agent/status endpoint'
   inputSchema: { type: 'object', properties: {}, required: [] }

2. Add handler acdHeartbeatStatus():
   a. Query Supabase actp_agent_health_snapshots: GET last 3 rows ordered by created_at desc
      endpoint: SUPABASE_URL + '/rest/v1/actp_agent_health_snapshots?select=*&order=created_at.desc&limit=3'
   b. Also fetch CRMLite agent/status (5s timeout, graceful fail):
      GET https://crmlite-h3k1s46jj-isaiahduprees-projects.vercel.app/api/agent/status
   c. Return { snapshots: last3, crmliteStatus: statusOrNull, lastHeartbeatAt: snapshots[0]?.created_at, servicesUp: snapshots[0]?.services_up, servicesTotal: snapshots[0]?.services_total }

3. Add case 'acd_heartbeat_status' to executeTool switch.

---

## ACD-MEM-004: acd_schedule tool

**Problem**: No way to schedule future ACD agent runs from within Claude Code.

**Fix**:
1. Add to TOOLS array:
   name: 'acd_schedule'
   description: 'Schedule a future ACD agent run. Writes to harness/schedule.json which heartbeat_agent checks.'
   inputSchema: { type: 'object', properties: {
     slug: { type: 'string' },
     targetPath: { type: 'string', description: 'Absolute path to target repo' },
     schedule: { type: 'string', description: 'once | daily | weekly | cron-string' },
     runAt: { type: 'string', description: 'ISO 8601 datetime for once jobs (e.g. 2026-03-04T09:00:00Z)' },
     model: { type: 'string', description: 'Default: claude-sonnet-4-5-20250929' },
     enabled: { type: 'boolean', description: 'Default: true' }
   }, required: ['slug', 'targetPath'] }

2. Add handler acdSchedule(params):
   schedulePath = join(ACD_ROOT, 'harness', 'schedule.json')
   schedule = existsSync(schedulePath) ? JSON.parse(readFileSync(schedulePath,'utf8')) : { jobs: [] }
   Ensure schedule.jobs is an array.
   Remove any existing job with same slug (replace).
   schedule.jobs.push({ slug, targetPath, schedule: params.schedule||'once', runAt: params.runAt, model: params.model||'claude-sonnet-4-5-20250929', enabled: params.enabled!==false, addedAt: new Date().toISOString(), promptPath: join(ACD_ROOT,'harness','prompts',slug+'.md'), featureListPath: join(ACD_ROOT,'harness',slug+'-features.json') })
   writeFileSync(schedulePath, JSON.stringify(schedule, null, 2))
   Return { ok: true, slug, schedule: params.schedule||'once', runAt: params.runAt, schedulePath, totalJobs: schedule.jobs.length }

3. Add case 'acd_schedule' to executeTool switch.

---

## ACD-MEM-005: acd_list_scheduled tool

**Problem**: No visibility into what's scheduled to run and when.

**Fix**:
1. Add to TOOLS array:
   name: 'acd_list_scheduled'
   description: 'List all scheduled ACD agent runs from harness/schedule.json with PID liveness check'
   inputSchema: { type: 'object', properties: {}, required: [] }

2. Add handler acdListScheduled():
   Read schedule.json (return empty if missing).
   For each job, check if a PID file exists in harness/pids/{slug}.pid and if process is alive.
   Determine status: 'running' (alive PID), 'pending' (enabled, future runAt), 'overdue' (enabled, past runAt), 'disabled' (enabled: false), 'no-prompt' (promptPath does not exist).
   Return { jobs: enrichedJobs[], pending: count, running: count, disabled: count }

3. Add case 'acd_list_scheduled' to executeTool switch.

---

## ACD-MEM-006: Harness auto-log hook in run-harness-v2.js

**Problem**: When an ACD session completes or fails, nothing is logged to the memory system.

**Fix**:
1. Find run-harness-v2.js in harness/. Locate where sessions end -- the 'session complete' or error handler after each Claude Code run.
2. After each session conclusion (success or failure), call the acdWriteMemory logic inline:
   - Read the feature list JSON to get current passed/total counts
   - importance_score = passed/total >= 0.8 ? 7.5 : passed/total >= 0.5 ? 5.5 : 4.0
   - event_type = 'session_complete'
   - content = 'ACD session {sessionNumber} for {slug}: {passed}/{total} features passing ({pct}%)'
   - source = 'acd-harness'
   - metadata = { slug, session_number: N, features_passed: passed, features_total: total }
3. Write this to Supabase actp_memory_events using the same fetch pattern as ACD-MEM-002.
4. If MEMORY_VAULT_PATH is set or ~/.memory/vault exists, also append to today's daily note.
5. Make the memory write non-blocking (do not await, do not throw -- wrap in try/catch with console.error on failure).
   The session must complete even if memory write fails.