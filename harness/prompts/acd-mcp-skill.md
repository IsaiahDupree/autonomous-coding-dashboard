# ACD — MCP Server + Claude Code Skill

## Project
/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard

## Context
The ACD (Autonomous Coding Dashboard) harness (`harness/run-harness-v2.js`) is currently CLI-only. This batch adds an MCP server (`harness/acd-mcp-server.js`) that exposes harness operations as callable MCP tools, plus a Claude Code skill file that makes the ACD workflow invocable via `/acd` in any Claude Code session.

## Instructions
- Implement each feature exactly as specified — exact file paths, function names, and route shapes
- After EACH feature: verify the file is valid JavaScript with `node --check <file>`
- At the end: run `node harness/acd-mcp-server.js --version` to confirm startup
- Update harness/acd-mcp-skill-features.json after each feature: set passes=true, status=completed
- The MCP server uses JSON-RPC 2.0 over stdio (readline on stdin, write to stdout)
- Use only Node.js built-ins (readline, fs, path, child_process, os) — no npm dependencies

---

## FEAT-001: Create acd-mcp-server.js with MCP handshake + acd_list_projects tool

**Problem**: No MCP server exists for ACD. Claude Code cannot call ACD harness operations as tools.

**Fix**:
1. File: `harness/acd-mcp-server.js` — create from scratch
2. JSON-RPC 2.0 stdio server — read from stdin line by line, write JSON responses to stdout
3. Handle `initialize` request: respond with `{ protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "acd-harness", version: "1.0.0" } }`
4. Handle `notifications/initialized` (no response needed)
5. Handle `tools/list` request: return array of all tool definitions (FEAT-001 through FEAT-005 tools)
6. Handle `tools/call` dispatch: route to individual tool handlers
7. Implement `acd_list_projects` tool:
   - inputSchema: `{ type: "object", properties: { includeCompleted: { type: "boolean" } }, required: [] }`
   - Logic: read all `harness/*-features.json` files (glob `harness/**/*features*.json`), parse each, return array of `{ project, description, total, passing, percentComplete, featureListPath }`
   - Also read `harness/parallel-status.json` if it exists and merge running pids
   - Return shape: `{ content: [{ type: "text", text: JSON.stringify(projects, null, 2) }] }`
8. Handle `--version` CLI flag: print `acd-mcp-server 1.0.0` and exit 0
9. All JSON-RPC errors use `{ code, message }` shape; send to stderr via `console.error`, never stdout

**Acceptance**: `node --check harness/acd-mcp-server.js` exits 0. `node harness/acd-mcp-server.js --version` prints version.

---

## FEAT-002: Add acd_start tool — spawn a harness run

**Problem**: Cannot start an ACD harness run from Claude Code without a shell.

**Fix**:
1. File: `harness/acd-mcp-server.js` — add tool definition + handler
2. Tool name: `acd_start`
3. inputSchema:
   ```json
   {
     "type": "object",
     "properties": {
       "slug": { "type": "string", "description": "Project slug used for log/status naming" },
       "promptPath": { "type": "string", "description": "Absolute path to .md PRD prompt file" },
       "featureListPath": { "type": "string", "description": "Absolute path to features JSON file" },
       "targetPath": { "type": "string", "description": "Absolute path to target repo (sets Claude cwd)" },
       "model": { "type": "string", "description": "Claude model ID (default: claude-sonnet-4-6)" },
       "fallbackModel": { "type": "string", "description": "Fallback model (default: claude-haiku-4-5-20251001)" },
       "maxRetries": { "type": "number", "description": "Max consecutive errors (default: 3)" }
     },
     "required": ["slug", "promptPath", "featureListPath", "targetPath"]
   }
   ```
4. Logic:
   - Validate all paths exist using `fs.existsSync` — return error if any missing
   - Build args array for `run-harness-v2.js`:
     `["harness/run-harness-v2.js", "--path=<targetPath>", "--project=<slug>", "--prompt=<promptPath>", "--feature-list=<featureListPath>", "--model=<model>", "--fallback-model=<fallbackModel>", "--max-retries=<maxRetries>", "--adaptive-delay", "--force-coding", "--until-complete"]`
   - Spawn with `child_process.spawn("node", args, { detached: true, stdio: ["ignore", logStream, logStream], cwd: "/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard" })`
   - Log file: `harness/logs/<slug>.log` (create with `fs.createWriteStream(..., { flags: "a" })`)
   - Call `child.unref()` so MCP server doesn't wait for harness to finish
   - Write pid to `harness/pids/<slug>.pid`
   - Return: `{ content: [{ type: "text", text: JSON.stringify({ started: true, pid: child.pid, slug, logFile: "harness/logs/<slug>.log" }) }] }`
5. Create `harness/logs/` and `harness/pids/` dirs with `fs.mkdirSync(..., { recursive: true })`

**Acceptance**: `node --check harness/acd-mcp-server.js` exits 0.

---

## FEAT-003: Add acd_status tool — read harness status + feature progress

**Problem**: No way to check harness run status from Claude Code.

**Fix**:
1. File: `harness/acd-mcp-server.js` — add tool definition + handler
2. Tool name: `acd_status`
3. inputSchema:
   ```json
   {
     "type": "object",
     "properties": {
       "slug": { "type": "string", "description": "Project slug to check" },
       "featureListPath": { "type": "string", "description": "Optional: absolute path to features JSON for detailed breakdown" }
     },
     "required": ["slug"]
   }
   ```
4. Logic:
   - Read `harness/harness-status-<slug>.json` if exists, else try `harness/harness-status.json`
   - Read `harness/pids/<slug>.pid` to get pid; check if process is alive with `process.kill(pid, 0)` (try/catch)
   - If `featureListPath` provided, read and parse it for feature breakdown
   - Read last 5 lines of `harness/logs/<slug>.log` if exists (read full file, split, tail)
   - Return: `{ content: [{ type: "text", text: JSON.stringify({ status, isRunning, pid, stats, recentLog, features: featuresBreakdown }) }] }`

**Acceptance**: `node --check harness/acd-mcp-server.js` exits 0.

---

## FEAT-004: Add acd_logs tool + acd_stop tool

**Problem**: Cannot read harness logs or stop a running harness from Claude Code.

**Fix**:
1. File: `harness/acd-mcp-server.js` — add two tool definitions + handlers

**acd_logs tool**:
- inputSchema: `{ "type": "object", "properties": { "slug": { "type": "string" }, "lines": { "type": "number", "description": "Number of lines to tail (default: 50)" } }, "required": ["slug"] }`
- Logic: read `harness/logs/<slug>.log`, split by newline, return last N lines
- Return: `{ content: [{ type: "text", text: logLines.join("\n") }] }`

**acd_stop tool**:
- inputSchema: `{ "type": "object", "properties": { "slug": { "type": "string" }, "force": { "type": "boolean", "description": "Use SIGKILL instead of SIGTERM (default: false)" } }, "required": ["slug"] }`
- Logic: read `harness/pids/<slug>.pid`, parse pid, send `process.kill(pid, force ? "SIGKILL" : "SIGTERM")`
- Handle ESRCH (process not found) gracefully
- Delete the .pid file after stopping
- Return: `{ content: [{ type: "text", text: JSON.stringify({ stopped: true, pid, signal }) }] }`

**Acceptance**: `node --check harness/acd-mcp-server.js` exits 0.

---

## FEAT-005: Create Claude Code skill file at ~/.claude/skills/acd.md

**Problem**: No `/acd` skill exists in Claude Code. Users cannot invoke the ACD workflow with a single slash command.

**Fix**:
1. File: `/Users/isaiahdupree/.claude/skills/acd.md` — create this file
2. The skill should contain a structured prompt that instructs Claude to:
   - When user says `/acd` or describes a coding task: ask for (1) target repo path, (2) what needs to be built/fixed
   - Follow the PRD-to-ACD workflow: research the target, identify gaps as discrete features, write a PRD prompt, create a features JSON, create a launch script, launch via `acd_start` MCP tool
   - Use `acd_status` to monitor progress and report back
   - Use `acd_logs` to show recent activity when asked
   - Format PRD features as FEAT-NNN with exact file paths and acceptance conditions
   - Keep batches to 6-10 features
   - Name features by category prefix (LI-, IG-, TW-, ACD-, etc.)
3. The file should be markdown, starting with `---\ndescription: ...\n---\n# ACD Workflow`
4. Must include the full step-by-step workflow (research → PRD → features JSON → launch script → launch → monitor)

**Acceptance**: File exists at `/Users/isaiahdupree/.claude/skills/acd.md` and is valid markdown.

---

## FEAT-006: Register acd-mcp-server in Claude Desktop config

**Problem**: The ACD MCP server exists but Claude Desktop doesn't know about it — MCP tools won't appear in Claude Code sessions.

**Fix**:
1. File: `/Users/isaiahdupree/Library/Application Support/Claude/claude_desktop_config.json`
2. Read the existing file
3. Add entry to `mcpServers` object:
   ```json
   "acd-harness": {
     "command": "node",
     "args": ["/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/acd-mcp-server.js"],
     "env": {}
   }
   ```
4. Write back the file with 2-space indentation (preserve all existing entries)
5. Also create `harness/logs/` and `harness/pids/` directories with `fs.mkdirSync` if they don't exist

**Acceptance**: File is valid JSON. The `acd-harness` key exists in `mcpServers`. All existing entries are preserved.
