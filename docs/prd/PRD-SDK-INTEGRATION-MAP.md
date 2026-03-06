# Claude Agent SDK — Full Integration Map
## Where It Plugs Into the Existing ACTP + ACD System

**Status:** Ready to implement  
**Upstream:** PRD-CLAUDE-AGENT-SDK-CLIENT-WORK-SYSTEM.md  
**Related:** PRD-122 (Claude Code Agent Launcher), PRD-002 (Local Agent Daemon)

---

## The Core Finding

`worker.py` line 465 **already calls `claude_code_launcher_loop()`** when `CLAUDE_CODE_AVAILABLE=true`:

```python
# actp-worker/worker.py:465
if CLAUDE_CODE_AVAILABLE:
    loops.append(claude_code_launcher_loop())
```

This means PRD-122 (`ClaudeCodeAgentLauncher`) is **already wired** into the worker event loop — it just needs `claude_launcher.py` to implement `claude_code_launcher_loop()`. The `claude-agent-sdk` is the Python library that makes this clean instead of raw subprocess calls.

**The SDK slots into 6 exact places. Nothing needs to be rearchitected — only extended.**

---

## Integration Point 1 — `worker.py`: `claude_code_launcher_loop()`

**File:** `actp-worker/worker.py`  
**Line:** 465 — already expects this function  
**Status:** Wired but `claude_launcher.py` doesn't exist yet

### What to build

Create `actp-worker/claude_launcher.py` — the implementation of PRD-122 using the SDK:

```python
"""
PRD-122: ClaudeCodeAgentLauncher — SDK implementation.
Replaces manual asyncio.create_subprocess_exec with claude-agent-sdk query().
"""
import asyncio
import json
import logging
import os
from pathlib import Path
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition

from config import (
    CLAUDE_CODE_MODEL, CLAUDE_CODE_MAX_CONCURRENT,
    CLAUDE_CODE_SESSION_TIMEOUT, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
)

logger = logging.getLogger("actp.launcher")

# ── Agent Definitions (PRD-122: MCPConfigBuilder + SystemPromptBuilder) ────────

DOMAIN_AGENTS: dict[str, AgentDefinition] = {
    "social-media-agent": AgentDefinition(
        description="Social media content creation and posting",
        prompt="You create high-engagement social content and post to platforms via MCP tools.",
        tools=["Read", "Write", "WebSearch", "WebFetch"],
        model="sonnet",
    ),
    "acquisition-agent": AgentDefinition(
        description="Lead acquisition and outreach",
        prompt="You find, qualify, and outreach to prospects via LinkedIn, GitHub, and Slack MCP tools.",
        tools=["Read", "Write", "WebSearch"],
        model="sonnet",
    ),
    "revenue-agent": AgentDefinition(
        description="Revenue tracking and optimization",
        prompt="You analyze Stripe data, identify churn risk, and suggest upsell opportunities.",
        tools=["Read", "Write"],
        model="haiku",
    ),
    "content-agent": AgentDefinition(
        description="Long-form content generation from research blueprints",
        prompt="You write blog posts, emails, and video scripts from structured briefs.",
        tools=["Read", "Write", "WebSearch", "WebFetch"],
        model="sonnet",
    ),
    "product-agent": AgentDefinition(
        description="Product feature development and GitHub issue management",
        prompt="You implement features, write tests, open PRs, and manage GitHub issues.",
        tools=["Read", "Write", "Edit", "Bash", "WebFetch"],
        model="sonnet",
    ),
    # Client pipeline agents (PRD-SDK-CLIENT-WORK-SYSTEM)
    "intake-agent": AgentDefinition(
        description="Client proposal intake — parse and classify work requests",
        prompt="Parse client proposals into structured ClientBrief JSON. Classify project type. Flag gaps.",
        tools=["Read", "Write", "WebSearch"],
        model="haiku",
    ),
    "research-agent": AgentDefinition(
        description="Deep research agent for client work scoping",
        prompt="Research project requirements: competitors, tech stack, complexity. Write research_report.md.",
        tools=["WebSearch", "WebFetch", "Read", "Write"],
        model="opus",
    ),
    "planning-agent": AgentDefinition(
        description="Project planning and architecture decisions",
        prompt="Produce project_plan.json with phases, features, acceptance criteria, and architecture.",
        tools=["Read", "Write"],
        model="sonnet",
    ),
    "builder-agent": AgentDefinition(
        description="Feature implementation and code generation",
        prompt="Implement features from project_plan.json. Write tests. Commit. Mark complete.",
        tools=["Read", "Write", "Edit", "Bash", "WebFetch"],
        model="sonnet",
    ),
}

# ── Session Pool ───────────────────────────────────────────────────────────────

_semaphores: dict[str, asyncio.Semaphore] = {}
MAX_CONCURRENT = int(os.getenv("CLAUDE_CODE_MAX_CONCURRENT", "2"))
COST_LIMIT_DOMAINS = {"content-agent": 1}  # stricter limit for expensive agents


def _get_semaphore(agent_type: str) -> asyncio.Semaphore:
    limit = COST_LIMIT_DOMAINS.get(agent_type, MAX_CONCURRENT)
    if agent_type not in _semaphores:
        _semaphores[agent_type] = asyncio.Semaphore(limit)
    return _semaphores[agent_type]


# ── Core launch function ───────────────────────────────────────────────────────

async def launch_sdk_session(
    agent_type: str,
    goal: str,
    context: dict,
    task_id: str,
    project_dir: Path | None = None,
) -> dict:
    """
    Launch a claude-agent-sdk session for a given agent domain + goal.
    Returns: {"ok": bool, "result": str, "tool_use_count": int, "cost_usd": float}
    """
    agent_def = DOMAIN_AGENTS.get(agent_type)
    if not agent_def:
        return {"ok": False, "error": f"Unknown agent_type: {agent_type}"}

    cwd = project_dir or Path(os.getenv("CLIENT_PROJECTS_DIR", "/tmp/actp-sessions")) / task_id
    cwd.mkdir(parents=True, exist_ok=True)

    prompt = goal
    if context:
        prompt = f"{goal}\n\nContext:\n{json.dumps(context, indent=2)}"

    opts = ClaudeAgentOptions(
        model=os.getenv("CLAUDE_CODE_MODEL", "claude-sonnet-4-5"),
        fallback_model="claude-opus-4-5",
        max_turns=50,
        max_budget_usd=float(os.getenv("CLAUDE_CODE_MAX_BUDGET_USD", "2.0")),
        permission_mode="acceptEdits",
        cwd=cwd,
        agents={agent_type: agent_def},
    )

    messages = []
    tool_uses = 0
    final_result = ""

    async with _get_semaphore(agent_type):
        try:
            async for msg in query(prompt=prompt, options=opts):
                messages.append(msg)
                msg_type = type(msg).__name__
                if msg_type == "AssistantMessage":
                    for block in getattr(msg, "content", []):
                        if getattr(block, "type", "") == "tool_use":
                            tool_uses += 1
                elif msg_type == "ResultMessage":
                    final_result = getattr(msg, "result", "")

            logger.info(f"[launcher] ✅ {agent_type} task={task_id} tools={tool_uses}")
            return {"ok": True, "result": final_result, "tool_use_count": tool_uses, "cost_usd": 0.0}

        except Exception as exc:
            logger.error(f"[launcher] ✗ {agent_type} task={task_id}: {exc}")
            return {"ok": False, "error": str(exc)[:300], "tool_use_count": tool_uses}


# ── Worker loop (called by worker.py when CLAUDE_CODE_AVAILABLE=true) ──────────

async def claude_code_launcher_loop() -> None:
    """
    Polls actp_agent_tasks for tasks with use_claude_code=true, dispatches to SDK.
    Registered in worker.py main loop automatically via CLAUDE_CODE_AVAILABLE flag.
    """
    from supabase import create_client
    import config

    db = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY)
    poll_interval = int(os.getenv("CLAUDE_CODE_POLL_INTERVAL", "15"))

    logger.info(f"[launcher] Claude Code launcher loop started (poll every {poll_interval}s)")

    while True:
        try:
            result = (
                db.table("actp_agent_tasks")
                .select("*")
                .eq("status", "pending")
                .eq("use_claude_code", True)
                .order("priority", desc=True)
                .limit(5)
                .execute()
            )
            tasks = result.data or []

            for task in tasks:
                # Mark claimed
                db.table("actp_agent_tasks").update({"status": "running"}).eq("id", task["id"]).execute()

                asyncio.create_task(
                    _handle_task(db, task),
                    name=f"sdk-{task['id'][:8]}"
                )

        except Exception as exc:
            logger.error(f"[launcher] Poll error: {exc}")

        await asyncio.sleep(poll_interval)


async def _handle_task(db, task: dict) -> None:
    task_id = task["id"]
    agent_type = task.get("agent_type", "content-agent")
    goal = task.get("goal", "")
    context = task.get("context", {}) or {}

    result = await launch_sdk_session(agent_type, goal, context, task_id)

    status = "completed" if result.get("ok") else "failed"
    db.table("actp_agent_tasks").update({
        "status": status,
        "result": json.dumps(result),
        "completed_at": "now()",
    }).eq("id", task_id).execute()
```

**Config additions needed** (`actp-worker/config.py`):
```python
CLAUDE_CODE_MODEL        = os.getenv("CLAUDE_CODE_MODEL", "claude-sonnet-4-5")
CLAUDE_CODE_MAX_CONCURRENT = int(os.getenv("CLAUDE_CODE_MAX_CONCURRENT", "2"))
CLAUDE_CODE_SESSION_TIMEOUT = int(os.getenv("CLAUDE_CODE_SESSION_TIMEOUT", "300"))
CLAUDE_CODE_MAX_BUDGET_USD  = float(os.getenv("CLAUDE_CODE_MAX_BUDGET_USD", "2.0"))
CLAUDE_CODE_AVAILABLE    = (
    os.getenv("ENABLE_CLAUDE_CODE_LAUNCHER", "false").lower() == "true"
    and shutil.which("claude") is not None
)
CLIENT_PROJECTS_DIR      = os.getenv("CLIENT_PROJECTS_DIR", "/tmp/actp-sessions")
```

---

## Integration Point 2 — `workflow_executors.py`: 18th Executor

**File:** `actp-worker/workflow_executors.py`  
**Status:** 17 executors registered; add `SdkAgentExecutor` as #18  
**Pattern:** Drop-in — follows `BaseExecutor` exactly

```python
# Add at bottom of workflow_executors.py (before register_all())

class SdkAgentExecutor(BaseExecutor):
    """
    Executes sdk_agent tasks via claude-agent-sdk query().
    PRD-122 integration: routes use_claude_code tasks to the SDK launcher.
    Supports all DOMAIN_AGENTS: social-media, acquisition, revenue, content,
    product, intake, research, planning, builder.
    """
    task_type = "sdk_agent"
    persona = (
        "Claude Code autonomous agent: accepts any domain goal and executes it "
        "with full tool access (Read/Write/Edit/Bash/WebSearch/WebFetch). "
        "Self-validates output. Writes checkpoints for recovery."
    )

    async def check_available(self) -> bool:
        import shutil, os
        return (
            shutil.which("claude") is not None
            and bool(os.getenv("ANTHROPIC_API_KEY"))
        )

    async def execute(self, input_data: dict, heartbeat_fn=None) -> dict:
        from claude_launcher import launch_sdk_session
        from pathlib import Path

        agent_type  = input_data.get("agent_type", "content-agent")
        goal        = input_data.get("goal", "")
        context     = input_data.get("context", {})
        task_id     = input_data.get("task_id", "workflow")
        project_dir = input_data.get("project_dir")

        if heartbeat_fn:
            await heartbeat_fn(f"SDK agent [{agent_type}] starting")

        result = await launch_sdk_session(
            agent_type=agent_type,
            goal=goal,
            context=context,
            task_id=task_id,
            project_dir=Path(project_dir) if project_dir else None,
        )

        if heartbeat_fn:
            tools = result.get("tool_use_count", 0)
            await heartbeat_fn(f"SDK agent done — {tools} tool calls")

        return result

    def validate_output(self, output: dict) -> list[str]:
        issues = super().validate_output(output)
        if not output.get("ok"):
            issues.append(f"sdk_agent reported failure: {output.get('error', 'unknown')}")
        return issues
```

**Registration** (add to `register_all()` at bottom of file):
```python
register_executor(SdkAgentExecutor())
```

**Workflow task to trigger it** (via Supabase `actp_workflow_tasks`):
```json
{
  "task_type": "sdk_agent",
  "input_data": {
    "agent_type": "intake-agent",
    "goal": "Parse client proposal and write client_brief.json",
    "context": { "proposal_text": "..." },
    "task_id": "intake-001"
  }
}
```

---

## Integration Point 3 — `agent_swarm.py`: SDK Replaces `claude_code_unstructured`

**File:** `actp-worker/agent_swarm.py`  
**Lines:** `SwarmAgent.engine` field + `AGENT2_ENGINES` dict  
**Status:** `claude_code_unstructured` engine exists but uses raw subprocess; SDK upgrades it

### 3a. New engine in `AGENT2_ENGINES`

```python
# In agent_swarm.py — add alongside existing engines in AGENT2_ENGINES dict

async def _sdk_engine(packet: "TaskPacket", on_heartbeat) -> "ExecutionResult":
    """
    SDK-powered engine for coding agent (replaces claude_code_unstructured).
    Uses claude-agent-sdk query() instead of raw subprocess.
    """
    from claude_launcher import launch_sdk_session, DOMAIN_AGENTS
    from dual_agent import ExecutionResult

    # Map swarm role to agent domain
    role_map = {
        "coding":      "builder-agent",
        "researcher":  "research-agent",
        "content":     "content-agent",
        "acquisition": "acquisition-agent",
        "main":        "content-agent",
    }
    agent_type = role_map.get(packet.tool_name, "content-agent")

    result = await launch_sdk_session(
        agent_type=agent_type,
        goal=packet.task,
        context=packet.context or {},
        task_id=packet.task_id,
    )

    return ExecutionResult(
        task_id=packet.task_id,
        status="completed" if result.get("ok") else "failed",
        summary=result.get("result", result.get("error", "")),
        human_summary=result.get("result", "")[:300],
        warnings=[result["error"]] if not result.get("ok") else [],
    )

# Register alongside existing engines:
AGENT2_ENGINES["claude_sdk"] = _sdk_engine
```

### 3b. Update `coding` agent profile to use SDK engine

```python
# In AGENT_PROFILES dict — coding agent
AgentProfile(
    role="coding",
    name="Coding Agent",
    engine="claude_sdk",          # was: "claude_code_unstructured"
    model_tier="sonnet",
    ...
)
```

### 3c. Wire `SelfHealingLoop` to SDK `AgentHealthMonitor`

The existing `SelfHealingLoop.heal_agent()` uses HEARTBEAT.md staleness + `agent.state.last_error`. Wire the SDK `AgentHealthMonitor` to feed failures directly:

```python
# In claude_launcher.py — add to launch_sdk_session()

from agent_swarm import get_swarm

async def _sdk_failure_hook(agent_type: str, error: str, task_id: str) -> None:
    """Bridge SDK failures → SelfHealingLoop."""
    try:
        swarm = get_swarm()
        role_map = {
            "builder-agent": "coding",
            "research-agent": "researcher",
            "content-agent": "content",
        }
        role = role_map.get(agent_type, "coding")
        if role in swarm._agents:
            swarm._agents[role].state.last_error = f"SDK task {task_id}: {error}"
            swarm._agents[role].state.status = "error"
            # Healing loop will detect on next cycle
    except Exception:
        pass
```

### 3d. `SharedContext` — SDK checkpoints into `~/openclaw-shared/`

```python
# In claude_launcher.py — write pipeline state to SharedContext

from pathlib import Path
import json, time

SHARED_DIR = Path.home() / "openclaw-shared"

def write_sdk_checkpoint(task_id: str, stage: str, data: dict) -> None:
    """Write SDK stage completion to shared context (readable by all swarm agents)."""
    SHARED_DIR.mkdir(exist_ok=True)
    checkpoint = {
        "task_id": task_id,
        "stage": stage,
        "timestamp": time.time(),
        **data,
    }
    # Append to handoffs log (mirrors SharedContext.log_handoff)
    with open(SHARED_DIR / "handoffs.jsonl", "a") as f:
        f.write(json.dumps(checkpoint) + "\n")
    # Update context store for fast lookup
    ctx_file = SHARED_DIR / "context.json"
    ctx = json.loads(ctx_file.read_text()) if ctx_file.exists() else {}
    ctx[f"sdk_pipeline_{task_id}"] = checkpoint
    ctx_file.write_text(json.dumps(ctx, indent=2))
```

---

## Integration Point 4 — `harness/acd-mcp-server.js`: New MCP Tool

**File:** `autonomous-coding-dashboard/harness/acd-mcp-server.js`  
**Status:** Already has `acd_run_cycle` + `acd_parallel_plan`; add `acd_launch_sdk_pipeline`  
**Pattern:** POST to Workflow Engine API → triggers `client-proposal-to-delivery` workflow

```javascript
// Add to acd-mcp-server.js alongside existing MCP tools

server.tool(
  "acd_launch_sdk_pipeline",
  {
    action: z.enum([
      "intake",       // parse proposal → client_brief.json
      "research",     // research brief → research_report.md
      "plan",         // generate project_plan.json
      "build",        // implement phase from plan
      "full_pipeline" // run all stages end-to-end
    ]),
    proposal: z.string().optional().describe("Client proposal text (required for intake/full_pipeline)"),
    project_dir: z.string().optional().describe("Workspace directory for this client project"),
    agent_type: z.string().optional().describe("Override agent: intake-agent | research-agent | planning-agent | builder-agent"),
    dry_run: z.boolean().optional().default(false),
  },
  async ({ action, proposal, project_dir, agent_type, dry_run }) => {
    // Option A: direct SDK task via actp-worker health API
    const workerUrl = process.env.ACTP_WORKER_URL || "http://localhost:8080";

    if (dry_run) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            action, proposal: proposal?.slice(0, 100), project_dir,
            agent_type, note: "DRY RUN — no task submitted"
          }, null, 2)
        }]
      };
    }

    const taskPayload = {
      agent_type: agent_type || _actionToAgent(action),
      goal: _buildGoal(action, proposal),
      context: { proposal, project_dir, action },
      use_claude_code: true,
      priority: action === "full_pipeline" ? 10 : 5,
    };

    const resp = await fetch(`${workerUrl}/api/tasks/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskPayload),
    });
    const result = await resp.json();

    appendActivityLog({ type: "sdk_pipeline", action, task_id: result.task_id });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

function _actionToAgent(action) {
  return {
    intake: "intake-agent",
    research: "research-agent",
    plan: "planning-agent",
    build: "builder-agent",
    full_pipeline: "intake-agent",
  }[action] || "content-agent";
}

function _buildGoal(action, proposal) {
  if (action === "intake")        return `Parse this client proposal and write client_brief.json:\n\n${proposal}`;
  if (action === "research")      return "Research the client brief and write research_report.md";
  if (action === "plan")          return "Create project_plan.json from research_report.md";
  if (action === "build")         return "Implement phase 1 from project_plan.json";
  if (action === "full_pipeline") return `Run full client pipeline for: ${proposal?.slice(0, 200)}`;
  return proposal || "";
}
```

---

## Integration Point 5 — NanoBot: `SpawnTool` → SDK Handoff

**File:** `/Users/isaiahdupree/Documents/Software/NanoBot/nanobot/agent/subagent.py`  
**Existing:** `SubagentManager.spawn()` creates asyncio background tasks  
**Enhancement:** NanoBot receives client proposals → spawns SDK pipeline via `actp-worker` HTTP

The NanoBot's existing `SpawnTool` already supports delegating to background tasks. Wire it to call the actp-worker when the task contains code/build intent:

**NanoBot `~/.nanobot/config.json` addition:**
```json
{
  "tools": {
    "mcpServers": {
      "actp-worker": {
        "url": "http://localhost:8080/mcp",
        "headers": { "Authorization": "Bearer YOUR_WORKER_KEY" }
      }
    }
  },
  "skills": [
    {
      "name": "client_intake",
      "trigger": ["proposal", "client wants", "build me", "can you build"],
      "action": "Use the actp-worker MCP server to launch an sdk_agent intake task with the proposal text. Report the task_id back to the client."
    }
  ]
}
```

This means: client sends a Telegram message with a proposal → NanoBot detects "build" intent → calls `acd_launch_sdk_pipeline(action="intake", proposal=...)` via MCP → returns task ID to client.

---

## Integration Point 6 — Supabase: 2 New Migrations

**Project:** `ivhfuhxorppptyuofbgq`  
**Purpose:** Support `use_claude_code` flag + session logging (PRD-122 spec, items 41-43)

```sql
-- Migration 1: Add SDK fields to actp_agent_tasks
ALTER TABLE actp_agent_tasks
  ADD COLUMN IF NOT EXISTS use_claude_code bool DEFAULT false,
  ADD COLUMN IF NOT EXISTS claude_session_id uuid,
  ADD COLUMN IF NOT EXISTS agent_type text;

-- Migration 2: Session tracking table (PRD-122 item 41)
CREATE TABLE IF NOT EXISTS actp_claude_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type    text NOT NULL,
  goal          text,
  task_id       uuid REFERENCES actp_agent_tasks(id) ON DELETE SET NULL,
  status        text DEFAULT 'running',      -- running | completed | failed
  result        text,
  tool_use_count int DEFAULT 0,
  tokens_in     int DEFAULT 0,
  tokens_out    int DEFAULT 0,
  cost_usd      numeric(8,4) DEFAULT 0,
  error_message text,
  started_at    timestamptz DEFAULT now(),
  completed_at  timestamptz
);

CREATE INDEX ON actp_claude_sessions(status, started_at DESC);
CREATE INDEX ON actp_claude_sessions(agent_type, started_at DESC);
```

---

## Integration Point 7 — Self-Healing: SDK Hooks → `SelfHealingLoop`

**The bridge between SDK lifecycle and the existing 4-tier watchdog:**

```
SDK Hook                         →  SelfHealingLoop Tier
─────────────────────────────────────────────────────────
PreToolUseHookInput (block cmd)  →  Damage control (existing approval_gate)
PostToolUseFailure (tool error)  →  L1: soft retry — log + wait
SubagentStop (error stop_reason) →  L2: respawn — re-instantiate SwarmAgent
3× SubagentStop errors           →  L3: multi-failure escalate (Telegram)
5+ tool failures same session    →  L4: circuit breaker — halt + preserve
```

In practice, add to `claude_launcher.py`:

```python
_session_failures: dict[str, int] = {}

async def _monitored_query(prompt, opts, agent_type, task_id):
    """Wraps query() with failure tracking → SelfHealingLoop integration."""
    session_key = f"{agent_type}:{task_id}"
    _session_failures.setdefault(session_key, 0)

    try:
        async for msg in query(prompt=prompt, options=opts):
            yield msg

        # Clean slate on success
        _session_failures.pop(session_key, None)

    except Exception as exc:
        _session_failures[session_key] = _session_failures.get(session_key, 0) + 1
        failures = _session_failures[session_key]

        await _sdk_failure_hook(agent_type, str(exc), task_id)

        if failures >= 3:
            # L4: circuit breaker
            write_sdk_checkpoint(task_id, "circuit_broken", {
                "error": str(exc), "failures": failures
            })
            raise  # Don't retry — SelfHealingLoop handles escalation

        raise  # Let caller retry (L1/L2)
```

---

## Consolidated Implementation Order

| Step | File | Action | Effort |
|------|------|--------|--------|
| **1** | `actp-worker/claude_launcher.py` | Create — `claude_code_launcher_loop()` + SDK sessions | 2-3h |
| **2** | `actp-worker/config.py` | Add `CLAUDE_CODE_*` env vars + `CLAUDE_CODE_AVAILABLE` check | 15 min |
| **3** | `actp-worker/workflow_executors.py` | Add `SdkAgentExecutor` class + register it | 30 min |
| **4** | Supabase | Run 2 migrations (actp_agent_tasks columns + actp_claude_sessions) | 10 min |
| **5** | `harness/acd-mcp-server.js` | Add `acd_launch_sdk_pipeline` MCP tool | 45 min |
| **6** | `actp-worker/agent_swarm.py` | Add `claude_sdk` engine + wire `SharedContext` checkpoints | 1h |
| **7** | `~/.nanobot/config.json` | Add `actp-worker` MCP server + client_intake skill | 15 min |
| **8** | `.env` in actp-worker | Add `ENABLE_CLAUDE_CODE_LAUNCHER=true` + `CLIENT_PROJECTS_DIR` | 5 min |

**Total estimated effort: ~5-6 hours for full integration.**

Steps 1-4 unlock the client pipeline immediately. Steps 5-8 add the NanoBot channel + full swarm integration.

---

## Environment Variables Checklist

```bash
# actp-worker/.env additions
ENABLE_CLAUDE_CODE_LAUNCHER=true
CLAUDE_CODE_MODEL=claude-sonnet-4-5
CLAUDE_CODE_MAX_CONCURRENT=2
CLAUDE_CODE_SESSION_TIMEOUT=300
CLAUDE_CODE_MAX_BUDGET_USD=2.0
CLAUDE_CODE_POLL_INTERVAL=15
CLIENT_PROJECTS_DIR=/Users/isaiahdupree/Documents/Software/client-projects

# Already present (no change needed)
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://ivhfuhxorppptyuofbgq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

---

## What This Unlocks

Once Steps 1-4 are complete:

1. **Any agent task** in `actp_agent_tasks` with `use_claude_code=true` automatically gets picked up by `claude_code_launcher_loop()` and executed by the SDK
2. **Any workflow step** with `task_type: "sdk_agent"` routes through `SdkAgentExecutor` via the Workflow Engine  
3. **The `coding` SwarmAgent** in `agent_swarm.py` uses SDK `query()` instead of manual subprocess — cleaner, hookable, type-safe
4. **Self-healing failures** from SDK sessions propagate to `SelfHealingLoop` automatically via `_sdk_failure_hook()`
5. **Client proposals** received in NanoBot Telegram/Slack trigger the full 5-stage pipeline (intake → research → plan → build → deliver) without human intervention
