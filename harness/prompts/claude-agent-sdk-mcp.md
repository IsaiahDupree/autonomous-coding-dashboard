# Claude Agent SDK — MCP Server (sdk_mcp_server.py)

## Mission
Build a FastMCP server in `actp-worker` that exposes all Claude Agent SDK pipeline tools
as MCP tools, allowing Claude agents (and this IDE) to launch SDK agents, run pipelines,
inspect checkpoints, manage task queues, and trigger self-healing — all via MCP protocol.

Target repo: `/Users/isaiahdupree/Documents/Software/actp-worker`

## Context
- FastMCP: `pip install mcp` or `pip install fastmcp` — use the `mcp` package
- Existing pattern: `harness/acd-mcp-server.js` (Node.js MCP server for ACD tools)
- This is a Python MCP server that wraps actp-worker internal modules
- Port: 3210 (HTTP transport) OR stdio transport (preferred for Claude IDE integration)
- The `claude_launcher.py`, `sdk_pipeline.py`, `workflow_executors.py`, `agent_swarm.py` must already exist

## MCP Server Implementation

### sdk_mcp_server.py structure
```python
#!/usr/bin/env python3
"""
SDK Agent MCP Server — exposes Claude Agent SDK tools via MCP protocol.
Wraps claude_launcher, sdk_pipeline, workflow_executors, agent_swarm.

Usage:
  python3 sdk_mcp_server.py          # stdio (for Claude IDE integration)
  python3 sdk_mcp_server.py --http   # HTTP on port 3210

Configure in ~/.claude.json:
  "sdk-agent": {
    "type": "stdio",
    "command": "python3",
    "args": ["/Users/isaiahdupree/Documents/Software/actp-worker/sdk_mcp_server.py"]
  }
"""
import sys, os, json, asyncio, logging
sys.path.insert(0, os.path.dirname(__file__))  # ensure actp-worker imports work

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
```

### 12 Tools to implement

```
sdk_launch_agent       — launch a single domain agent session
sdk_run_pipeline       — run full 5-stage client pipeline
sdk_resume_pipeline    — resume from last checkpoint
sdk_pipeline_status    — inspect checkpoint state for a project
sdk_list_agents        — list all 9 DOMAIN_AGENTS with descriptions
sdk_queue_task         — insert task into actp_agent_tasks
sdk_get_tasks          — query actp_agent_tasks by status
sdk_swarm_status       — get agent swarm health and last errors
sdk_executor_health    — check SdkAgentExecutor availability
sdk_self_heal          — trigger SelfHealingLoop for a role
sdk_read_checkpoint    — read specific checkpoint files
sdk_system_status      — combined health: executor + swarm + pending tasks count
```

### Tool input schemas (use these exactly)

```python
TOOLS = [
  Tool(name="sdk_launch_agent", description="Launch a Claude Agent SDK session for a domain agent",
       inputSchema={"type":"object","required":["agent_type","goal"],
         "properties":{
           "agent_type":{"type":"string","enum":["social-media-agent","acquisition-agent","revenue-agent","content-agent","product-agent","intake-agent","research-agent","planning-agent","builder-agent"]},
           "goal":{"type":"string"},"context":{"type":"object"},"task_id":{"type":"string"},
           "project_dir":{"type":"string"}
         }}),
  Tool(name="sdk_run_pipeline", description="Run full client proposal pipeline (intake→research→plan→build)",
       inputSchema={"type":"object","required":["proposal_text"],
         "properties":{"proposal_text":{"type":"string"},"project_dir":{"type":"string"}}}),
  Tool(name="sdk_resume_pipeline", description="Resume pipeline from last checkpoint",
       inputSchema={"type":"object","required":["project_dir"],
         "properties":{"project_dir":{"type":"string"}}}),
  Tool(name="sdk_pipeline_status", description="Get checkpoint status for a pipeline run",
       inputSchema={"type":"object","required":["project_dir"],
         "properties":{"project_dir":{"type":"string"}}}),
  Tool(name="sdk_list_agents", description="List all available domain agents",
       inputSchema={"type":"object","properties":{}}),
  Tool(name="sdk_queue_task", description="Queue a task for SDK agent execution via actp_agent_tasks",
       inputSchema={"type":"object","required":["agent_type","goal"],
         "properties":{"agent_type":{"type":"string"},"goal":{"type":"string"},
           "context":{"type":"object"},"priority":{"type":"integer","default":0}}}),
  Tool(name="sdk_get_tasks", description="List actp_agent_tasks from Supabase",
       inputSchema={"type":"object","properties":{"status":{"type":"string","enum":["pending","running","completed","failed"]},"limit":{"type":"integer","default":20}}}),
  Tool(name="sdk_swarm_status", description="Get agent swarm status and health",
       inputSchema={"type":"object","properties":{}}),
  Tool(name="sdk_executor_health", description="Check SdkAgentExecutor availability",
       inputSchema={"type":"object","properties":{}}),
  Tool(name="sdk_self_heal", description="Trigger SelfHealingLoop for an agent role",
       inputSchema={"type":"object","properties":{"role":{"type":"string","enum":["coding","researcher","content","acquisition","main"]}}}),
  Tool(name="sdk_read_checkpoint", description="Read checkpoint data from a pipeline project dir",
       inputSchema={"type":"object","required":["project_dir"],
         "properties":{"project_dir":{"type":"string"},"stage":{"type":"string"}}}),
  Tool(name="sdk_system_status", description="Combined system health check",
       inputSchema={"type":"object","properties":{}}),
]
```

### Handler pattern
```python
async def handle_call_tool(name: str, arguments: dict):
    if name == "sdk_list_agents":
        from claude_launcher import DOMAIN_AGENTS
        result = {k: {"description": v.description, "tools": v.tools, "model": v.model}
                  for k, v in DOMAIN_AGENTS.items()}
        return [TextContent(type="text", text=json.dumps(result, indent=2))]

    elif name == "sdk_launch_agent":
        from claude_launcher import launch_sdk_session
        from pathlib import Path
        result = await launch_sdk_session(
            agent_type=arguments["agent_type"],
            goal=arguments["goal"],
            context=arguments.get("context", {}),
            task_id=arguments.get("task_id", "mcp-call"),
            project_dir=Path(arguments["project_dir"]) if arguments.get("project_dir") else None,
        )
        return [TextContent(type="text", text=json.dumps(result, indent=2))]
    # ... etc for all tools
```

## ~/.claude.json config to add
```json
{
  "mcpServers": {
    "sdk-agent": {
      "type": "stdio",
      "command": "python3",
      "args": ["/Users/isaiahdupree/Documents/Software/actp-worker/sdk_mcp_server.py"]
    }
  }
}
```

## Start script: harness/start-sdk-mcp.sh
```bash
#!/bin/bash
cd /Users/isaiahdupree/Documents/Software/actp-worker
source .env 2>/dev/null || true
python3 sdk_mcp_server.py >> /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/logs/sdk-mcp.log 2>&1
```

## Tests
```bash
cd /Users/isaiahdupree/Documents/Software/actp-worker
pytest tests/test_sdk_mcp_server.py -v
```

All 4 tests must pass.
