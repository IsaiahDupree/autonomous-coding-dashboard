# ACD Dispatch -- MCP Tools, Skill, and Dashboard

## Project
/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard

## Context
The ACD currently requires 5 manual steps to dispatch one job: hand-write PRD,
hand-write features.json, know absolute paths, call acd_start, poll for status.
The feature list authoring is the worst bottleneck -- each features.json requires
13+ carefully structured objects with id, name, description, category, priority, status, passes.

This batch adds 5 new MCP tools to harness/acd-mcp-server.js, a /dispatch skill,
a POST /api/dispatch backend route, a Launch Job drawer, and a PRD Library tab.

Existing tools in acd-mcp-server.js: acd_list_projects, acd_start, acd_status, acd_logs, acd_stop.
Backend: check backend/ for the Express app and existing API routes.
Update /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/acd-dispatch-features.json after each feature.

## Instructions
- Implement each feature in order
- After EACH feature: verify with node --check harness/acd-mcp-server.js (syntax check)
- Do not break existing tools: acd_list_projects, acd_start, acd_status, acd_logs, acd_stop
- Use the existing TOOLS array and executeTool switch pattern in acd-mcp-server.js

---

## ACD-DISP-001: acd_list_prds tool

**Problem**: acd_start requires absolute paths. No way to discover existing PRDs by name.

**Fix**:
1. Add to TOOLS array in harness/acd-mcp-server.js:
   name: 'acd_list_prds', description: 'List all PRD prompt files in harness/prompts/ with parsed frontmatter'
   inputSchema: { type: 'object', properties: { domain: { type: 'string', description: 'Optional filter by domain tag' } }, required: [] }

2. Add handler function acdListPrds(params):
   - Read all .md files from join(ACD_ROOT, 'harness', 'prompts')
   - For each file, read first 20 lines and parse YAML frontmatter (lines between --- markers)
   - Extract: domain, priority, description from frontmatter (if present)
   - Derive slug from filename (strip .md)
   - Return array: { slug, domain, priority, description, path, sizeBytes, modifiedAt }[]
   - Filter by params.domain if provided
   - Handle missing frontmatter gracefully

3. Add case 'acd_list_prds' to the executeTool switch statement.

---

## ACD-DISP-002: acd_write_prd tool

**Problem**: Writing a PRD to disk requires file system access outside the MCP server.

**Fix**:
1. Add to TOOLS array:
   name: 'acd_write_prd', description: 'Write a PRD markdown string to harness/prompts/{slug}.md'
   inputSchema: required: ['slug', 'content'], also: overwrite?: boolean

2. Add handler acdWritePrd(params):
   - Build path: join(ACD_ROOT, 'harness', 'prompts', params.slug + '.md')
   - If exists and !overwrite: return { error: 'FILE_EXISTS', path }
   - writeFileSync the content
   - Return { slug, path, bytesWritten: content.length, created: !existed }

3. Add case 'acd_write_prd' to executeTool switch.

---

## ACD-DISP-003: acd_generate_features tool

**Problem**: Writing features.json by hand for every PRD is the biggest bottleneck.

**Fix**:
1. Add to TOOLS array:
   name: 'acd_generate_features'
   description: 'Read a PRD and use Claude haiku to auto-extract structured features.json'
   inputSchema: required: ['slug'], optional: prdPath (override), outputPath (override)

2. Add handler acdGenerateFeatures(params):
   a. prdPath = params.prdPath || join(ACD_ROOT, 'harness', 'prompts', slug + '.md')
   b. outputPath = params.outputPath || join(ACD_ROOT, 'harness', slug + '-features.json')
   c. Read PRD content from prdPath
   d. Read ANTHROPIC_API_KEY from process.env (throw structured error if missing)
   e. Call Claude API via fetch to https://api.anthropic.com/v1/messages:
      - model: 'claude-haiku-4-5-20251001', max_tokens: 4096
      - system: 'You are a feature extraction expert. Extract discrete, independently testable features from PRDs. Return ONLY valid JSON.'
      - user: Build prompt string that instructs Claude to extract features with:
        * IDs format: SLUG-001, SLUG-002 (uppercase of params.slug)
        * category: api | database | ui | integration | testing | config | mcp | skill | backend
        * priority: 1 (blocking), 2 (core), 3 (enhancement)
        * name: what to build + acceptance criterion, under 120 chars
        * passes: false, status: 'pending' on all
        * Return shape: { project, version: '1.0.0', description, features: [{id,name,category,priority,passes,status}] }
        * Append the full PRD content at the end of the prompt
   f. Parse JSON from response.content[0].text
   g. writeFileSync to outputPath (mkdirSync if needed)
   h. Return { slug, count: features.length, path: outputPath, features }

3. Add case 'acd_generate_features' to executeTool switch.

---

## ACD-DISP-004: acd_dispatch tool

**Problem**: Even with individual tools, dispatch still requires 5 sequential calls.

**Fix**:
1. Add to TOOLS array:
   name: 'acd_dispatch'
   description: 'End-to-end: write PRD + generate features + start harness in one call'
   inputSchema: required: ['slug', 'targetPath'], optional: prdContent, model, overwritePrd

2. Add handler acdDispatch(params):
   a. If prdContent provided: call acdWritePrd({ slug, content: prdContent, overwrite: overwritePrd||false })
   b. prdPath = join(ACD_ROOT, 'harness', 'prompts', slug + '.md')
   c. If prdPath does not exist: return { error: 'PRD_NOT_FOUND', message: 'Provide prdContent or call acd_write_prd first' }
   d. Call acdGenerateFeatures({ slug }) -- get featureListPath and featuresGenerated count
   e. Call acdStart({ slug, promptPath: prdPath, featureListPath, targetPath, model: model||'claude-sonnet-4-5-20250929' })
   f. Return { slug, pid, logFile, featuresGenerated, prdPath, featureListPath, targetPath }

3. Add case 'acd_dispatch' to executeTool switch.

---

## ACD-DISP-005: acd_list_running tool

**Problem**: No tool to see all currently running ACD agents at a glance.

**Fix**:
1. Add to TOOLS array:
   name: 'acd_list_running'
   description: 'List all ACD agents with live process status and completion percentage'
   inputSchema: { type: 'object', properties: {}, required: [] }

2. Add handler acdListRunning():
   - Check harness/pids/ dir (create if missing) for .pid files
   - Also check parallel-status.json in harness/ for additional pid entries
   - For each pid found:
     a. Read pid number from file, derive slug from filename
     b. Check liveness: try { process.kill(pid, 0); isRunning=true } catch { isRunning=false }
     c. Find matching feature JSON (harness/{slug}-features.json or harness/features/{slug}.json)
     d. If found: count total and passed features, compute percentComplete
     e. Build entry: { slug, pid, isRunning, passed, total, percentComplete, logFile }
   - Return array sorted by percentComplete descending

3. Add case 'acd_list_running' to executeTool switch.

---

## ACD-DISP-006: /dispatch skill

**Problem**: No natural-language-to-running-agent workflow exists.

**Fix**:
1. Create /Users/isaiahdupree/Documents/Software/skills/dispatch/SKILL.md with:
   Title: ACD Dispatch -- Natural Language to Running Agent
   Usage: /dispatch [natural language description of what to build and where]
   Example: /dispatch build a TikTok comment reply feature that replies based on sentiment. Target: Safari Automation.

   6-step workflow:
   Step 1 - Inventory: call acd_list_prds. Check if relevant PRD already exists. If yes, ask: reuse / extend / new?
   Step 2 - PRD draft: write inline using standard format (YAML frontmatter: domain+priority, Mission, Working dir, Output files, Feature specs with acceptance criteria). 6-12 features.
   Step 3 - Feature extraction: call acd_generate_features. Show feature list. Ask: 'Proceed, edit (e#), or cancel?'
   Step 4 - Model selection:
     - haiku: config-only, simple scaffolding (< 5 features, no API integration)
     - sonnet: standard feature work (default)
     - opus: cross-cutting orchestrators, complex multi-file refactors
   Step 5 - Dispatch: call acd_dispatch. Show:
     [checkmark] Dispatched: {slug} (PID {pid})
     [checkmark] Features: {count} pending
     [checkmark] Log: harness/logs/{slug}.log
     Monitor: /acd-status {slug}
   Step 6 - Companion: /acd-status {slug} calls acd_status + acd_logs, formats progress report with passed/total bar.
   RULE: Always show features for approval before dispatching.

2. Create justfile with: dispatch (interactive), status (takes slug arg), running (shows acd_list_running table)

---

## ACD-DISP-007: POST /api/dispatch route in backend

**Problem**: The dashboard has no way to trigger a dispatch -- it is read-only.

**Fix**:
1. Find the Express app in backend/ (check app.js, index.ts, or dist/index.js for route structure).
2. Add POST /api/dispatch route:
   - Body: { slug, prdPath?, prdContent?, featureListPath?, targetPath, model? }
   - Required: slug, targetPath
   - If prdContent provided: write to harness/prompts/{slug}.md
   - If featureListPath not provided: run feature generation (same logic as acd_generate_features)
   - Spawn harness process (same spawn logic as acd_start in MCP server)
   - Write pid to harness/pids/{slug}.pid (mkdirSync if needed)
   - If SSE broadcast mechanism exists: broadcast { type: 'worker_started', slug, pid, featuresTotal }
   - Return 201: { slug, pid, logFile, featuresGenerated, prdPath, featureListPath }
3. Add GET /api/prds: returns same data as acd_list_prds (reads harness/prompts/).
4. Add GET /api/repos: reads harness/repos.json (create as [] if missing), returns known repo paths.

---

## ACD-DISP-008: Launch Job drawer in dashboard UI

**Problem**: Launching a new job requires CLI knowledge.

**Fix**:
1. Find the dashboard HTML (backend/ or root). Identify main layout file.
2. Add a 'Launch Job' button to the dashboard header/toolbar.
3. Build right-side drawer panel triggered by button click:
   - PRD Source: radio -- 'Select existing PRD' or 'Paste PRD content'
     - Select: dropdown populated from GET /api/prds (slug + domain labels)
     - Paste: textarea with PRD format template as placeholder
   - Target Repo: dropdown from GET /api/repos + manual text input fallback
   - Model: radio -- haiku / sonnet / opus (sonnet default)
   - 'Generate Features' button: POST /api/dispatch with { generateOnly: true }, show returned count
   - 'Launch' button (disabled until features generated): POST /api/dispatch, close drawer
     On success: new worker tile appears in grid via SSE; show toast 'Dispatched {slug} -- {count} features pending'
   - Close X button and Escape key support

---

## ACD-DISP-009: PRD Library tab in dashboard

**Problem**: No way to browse the 137+ existing PRD prompts or launch directly from them.

**Fix**:
1. Add 'PRD Library' tab to existing dashboard tab bar.
2. Tab content: searchable filterable table.
   Columns: Name (slug) | Domain | Features | Last Run | Pass Rate | Actions
   - Data from GET /api/prds
   - Last Run: check harness/logs/{slug}.log first timestamp
   - Pass Rate: check harness/{slug}-features.json, compute passed/total %
   - Actions: 'Launch' button opens Launch Job drawer pre-filled with this PRD
3. Domain filter dropdown: all | coding | acquisition | content | research | mcp | skill
4. Search input: real-time filter by slug name
5. Sort: Last Run date descending (never-run rows at bottom)
6. Click row name: open PRD preview modal showing markdown content rendered as HTML