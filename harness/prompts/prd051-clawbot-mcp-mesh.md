# PRD-051: ClawBot MCP Agent Mesh — ACD Build Prompt

## Mission
Build the complete ClawBot MCP Agent Mesh: a Telegram → Orchestrator Claude Code → Domain Specialist Claude Code instances + Persistent MCP Service Mesh architecture for the actp-worker. All new components must be feature-flagged so the current system stays live during migration.

## Working Directory
`/Users/isaiahdupree/Documents/Software/actp-worker/`

## PRD Reference
`/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/prd/PRD-051-CLAWBOT-MCP-AGENT-MESH.md`

## Feature Groups to Build (in order)

### Group 1: Foundation + Bot Fix (CMM-001 to CMM-019)
Build first — everything else depends on these.
- CMM-001, CMM-002: config.py + requirements.txt additions
- CMM-003 to CMM-007: File skeletons (orchestrator, agent_pool, mcp_service_mesh, actp_mcp_server, specialist_tools/)
- CMM-008, CMM-009: specialist_souls/ + mcp_servers.json
- CMM-016: **CRITICAL** — fix double-processing bug in telegram_command_bot.py
- CMM-017, CMM-018: wire orchestrator path (feature-flagged) + fix on_progress duplication

### Group 2: MCP Service Mesh (CMM-021 to CMM-031)
- CMM-021 to CMM-028: MCPServiceMesh class — dataclasses, start_all(), get(), health_check(), restart(), background loop, circuit breaker, HTTP fallback
- CMM-029, CMM-030, CMM-031: Register all services in mcp_servers.json

### Group 3: ACTP MCP Server (CMM-041 to CMM-050)
- CMM-041 to CMM-049: Full actp_mcp_server.py FastAPI app — all tools implemented
- CMM-050: Unit tests

### Group 4: Skill Domain Filtering (CMM-061 to CMM-071)
- CMM-061, CMM-062: SkillDomain enum + frontmatter parser in skill_loader.py
- CMM-063 to CMM-068: Tag all PRDs with domain frontmatter
- CMM-069, CMM-070: Domain audit + system prompt builder
- CMM-071: Unit tests

### Group 5: Agent Pool (CMM-076 to CMM-086)
- CMM-076, CMM-077, CMM-078: All dataclasses
- CMM-079 to CMM-085: Full AgentPool implementation
- CMM-086: Unit tests

### Group 6: Specialist Tools (CMM-101 to CMM-116)
- CMM-101: tool registry + base types
- CMM-102 to CMM-108: researcher_tools.py — all 7 tools
- CMM-109 to CMM-114: content_tools.py, acquisition_tools.py, publisher_tools.py, watchdog_tools.py — all tools
- CMM-115, CMM-116: MetricsLite endpoints (YouTube stats, platform summary)

### Group 7: Orchestrator (CMM-136 to CMM-150)
- CMM-136 to CMM-147: Full OrchestratorAgent implementation
- CMM-148 to CMM-150: Unit tests + E2E tests

### Group 8: Integration + Infra (CMM-161 to CMM-175)
- CMM-161, CMM-162: Telegram slash commands (/meshstatus, /specialize)
- CMM-163: Wire AgentPool into SwarmOrchestrator
- CMM-164, CMM-165: Soul files
- CMM-171 to CMM-175: E2E tests, start_all.sh, docs, CI, git push

---

## Critical Context

### Current State (what already works)
- `telegram_command_bot.py` → `telegram_ai_engine.chat()` → `agent_swarm.py` TaskRouter → SwarmAgent spawns claude CLI subprocess
- TaskRouter routes: hello→@main, "check youtube stats"→@researcher, "write code"→@coding, "health check"→@watchdog
- Bug: messages processed TWICE (on_progress callbacks + agent-core fallback path both trigger)
- Bug: all agents fall back to `dispatch_actp_topic` generic tool (partial_failure)
- `AGENT_MODE=swarm` in .env, `ORCHESTRATOR_ENABLED=false` (not yet implemented)

### Double-Processing Fix (CMM-016 — do this first)
In `telegram_command_bot.py` handle_admin_message(), for non-slash-command text:
```python
# CURRENT (broken):
try:
    ai_reply = await ai_chat(...)
    if ai_reply:          # if falsy → falls through to agent-core block!
        return ai_reply
except Exception:
    pass
# Falls through to agent-core two-layer block which ALSO calls ai_chat internally

# FIX:
try:
    ai_reply = await ai_chat(...)
    return ai_reply or "I'm working on it — try again in a moment."  # never falls through
except Exception as e:
    logger.warning(f"ai_chat error: {e}")
    return "Something went wrong. Try again or use /help."
# agent-core two-layer block becomes dead code for non-slash messages
```
Also add at top of update loop:
```python
_processed_update_ids: set[int] = set()
# In update loop:
if update["update_id"] in _processed_update_ids:
    continue
_processed_update_ids.add(update["update_id"])
# Keep set bounded: discard IDs older than last 1000
if len(_processed_update_ids) > 1000:
    _processed_update_ids = set(list(_processed_update_ids)[-500:])
```

### mcp_servers.json structure
```json
{
  "servers": [
    {
      "name": "market-research",
      "type": "local",
      "base_url": "http://localhost:3106",
      "health_endpoint": "/health",
      "restart_policy": "auto",
      "restart_cmd": ["npx", "tsx", "packages/market-research/src/api/server.ts"],
      "restart_cwd": "/Users/isaiahdupree/Documents/Software/Safari Automation",
      "roles": ["researcher"],
      "required_env_vars": []
    },
    {
      "name": "safari-twitter-dm",
      "type": "local",
      "base_url": "http://localhost:3003",
      "health_endpoint": "/health",
      "restart_policy": "auto",
      "restart_cmd": ["npx", "tsx", "packages/twitter-dm/src/api/server.ts"],
      "restart_cwd": "/Users/isaiahdupree/Documents/Software/Safari Automation",
      "roles": ["acquisition"],
      "required_env_vars": []
    }
  ]
}
```
(repeat pattern for all 18 servers from PRD-051 Section 3.4)

### AgentPool subprocess spawn pattern
Each specialist is spawned as:
```bash
claude --print --output-format json \
  --system-prompt /tmp/specialist_{role}_{uuid}.md \
  --mcp-config /tmp/mcp_config_{uuid}.json \
  -- "{intent}"
```
- System prompt = soul file content + domain-filtered PRD summaries
- MCP config = subset of mcp_servers.json filtered by role
- stdout: JSON lines — progress lines + final result line
- Final result line format: `{"success": true, "output": "...", "data": {...}, "tools_used": [...]}`

### Supabase project
- Project ID: `ivhfuhxorppptyuofbgq`
- Use existing SUPABASE_URL + SUPABASE_KEY from config.py
- Run migrations via Supabase MCP or direct SQL

### Key file locations
- actp-worker repo: `/Users/isaiahdupree/Documents/Software/actp-worker/`
- Existing skill loader: `actp-worker/skill_loader.py`
- Existing swarm: `actp-worker/agent_swarm.py`
- Existing bot: `actp-worker/telegram_command_bot.py`
- MetricsLite: `/Users/isaiahdupree/Documents/Software/metricslite/`
- Safari Automation: `/Users/isaiahdupree/Documents/Software/Safari Automation/`
- Feature list: `autonomous-coding-dashboard/harness/features/prd051-clawbot-mcp-mesh.json`

### Feature flag env var defaults (add to config.py + .env.example)
```bash
ORCHESTRATOR_ENABLED=false       # Phase 3 gate
AGENT_POOL_ENABLED=false         # Phase 2 gate  
MCP_MESH_ENABLED=false           # Phase 1 gate
SPECIALIST_TOOLS_ENABLED=false   # Phase 2 gate
ACTP_MCP_PORT=8766
ACTP_MCP_AUTH_KEY=               # empty = localhost trust
AGENT_POOL_MAX_CONCURRENCY=8
AGENT_POOL_ROLE_MAX=2
AGENT_POOL_WARM_TIMEOUT=60
ORCHESTRATOR_RESTART_DELAY=3
MCP_HEALTH_CHECK_INTERVAL=60
MCP_RESTART_MAX_ATTEMPTS=3
```

### Tests must pass
```bash
cd /Users/isaiahdupree/Documents/Software/actp-worker
python -m pytest tests/test_clawbot_mcp_mesh.py -v -m "not e2e and not slow"
python -m pytest tests/test_agent_pool.py -v
python -m pytest tests/test_actp_mcp_server.py -v
python -m pytest tests/test_skill_loader_domains.py -v
python -m pytest tests/test_orchestrator_agent.py -v
```

### Commit message on completion
```
feat: PRD-051 ClawBot MCP Agent Mesh — Phase 1+2+3

- Fix double-processing bug in telegram_command_bot.py
- Add mcp_service_mesh.py with 18 server registry + circuit breaker
- Add actp_mcp_server.py (port 8766) with 12 structured MCP tools
- Add agent_pool.py with ephemeral specialist lifecycle management
- Add specialist_tools/ with 30+ domain tools (researcher, content, acquisition, publisher, watchdog)
- Add orchestrator_agent.py with intent classification + multi-step decomposition
- Extend skill_loader.py with domain filtering (< 30 PRDs per specialist)
- Add specialist_souls/ with 6 role soul files
- Add /meshstatus + /specialize Telegram commands
- All changes feature-flagged — current system unchanged when flags off
- 80+ new tests covering all components
```
