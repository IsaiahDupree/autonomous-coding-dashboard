# Implementation Enhancement: Claude Agent SDK — Autonomous Client-Work System
## With Self-Healing Agent Workflows

**Status:** Draft  
**Date:** 2026  
**Scope:** `claude-agent-sdk` v0.1.45 + NanoBot integration for full proposal-to-delivery pipelines

---

## 1. What Was Found

### 1.1 claude-agent-sdk v0.1.45
Installed at: `/Users/isaiahdupree/Documents/Software/NanoBot/.venv`  
Package: `pip install claude-agent-sdk`

Core primitives:
- **`query(prompt, options)`** — async iterator that runs Claude Code CLI programmatically, streaming `UserMessage`, `AssistantMessage`, `ResultMessage`, `SystemMessage`
- **`AgentDefinition`** — defines a specialized subagent: `description`, `prompt`, `tools[]`, `model` (`sonnet | opus | haiku | inherit`)
- **`ClaudeAgentOptions`** — full session config: `model`, `max_turns`, `permission_mode`, `mcp_servers`, `hooks`, `agents{}`, `sandbox`, `cwd`, `env`, `thinking`
- **`PermissionMode`** — `'default' | 'acceptEdits' | 'plan' | 'bypassPermissions'`
- **Hooks** — lifecycle intercept points: `PreToolUseHookInput`, `PostToolUseHookInput`, `SubagentStartHookInput`, `SubagentStopHookInput`, `StopHookInput`, `PermissionRequestHookInput`
- **`SandboxSettings`** — filesystem + network isolation for untrusted agent tasks
- **`McpServerConfig`** — stdio or HTTP MCP server attachment

### 1.2 NanoBot (nanobot-ai v0.1.4.post3)
Location: `/Users/isaiahdupree/Documents/Software/NanoBot/`  
Package: `nanobot-ai` — ultra-lightweight personal AI assistant (~4,000 lines)

Key internals:
- **`AgentLoop`** — receive → context → LLM (via LiteLLM) → tools → respond (max 40 iterations)
- **`SubagentManager`** — `spawn(task, label)` creates background asyncio tasks per request
- **`SpawnTool`** — in-conversation tool to delegate to a background subagent
- **`MemoryStore`** — file-based persistent memory across sessions
- **Built-in tools** — `WebSearch`, `WebFetch`, `ReadFile`, `WriteFile`, `EditFile`, `ListDir`, `Exec` (shell), `CronTool`, `MessageTool`
- **MCP support** — stdio + HTTP transport, tools auto-discovered on startup
- **Channels** — Telegram, Discord, WhatsApp, Slack, Email, Feishu, DingTalk, QQ, Matrix

---

## 2. Required Environment Variables

### NanoBot
```bash
# Core — required
ANTHROPIC_API_KEY=sk-ant-...          # Direct Claude API
# OR configure in ~/.nanobot/config.json:
# { "providers": { "anthropic": { "apiKey": "sk-ant-..." } } }

# Optional — web search
BRAVE_SEARCH_API_KEY=BSA...           # Brave Search for WebSearch tool

# Optional — voice (Telegram only)
GROQ_API_KEY=gsk_...                  # Whisper transcription for voice messages

# Channel tokens (add only what you use)
TELEGRAM_BOT_TOKEN=...
DISCORD_BOT_TOKEN=...
SLACK_BOT_TOKEN=...
```

NanoBot config file: `~/.nanobot/config.json`
```json
{
  "providers": {
    "anthropic": { "apiKey": "sk-ant-..." }
  },
  "agents": {
    "defaults": {
      "model": "claude-sonnet-4-5",
      "provider": "anthropic"
    }
  }
}
```

### claude-agent-sdk
```bash
# Required — the SDK wraps the `claude` CLI
ANTHROPIC_API_KEY=sk-ant-...

# claude CLI must be installed and in PATH
# npm install -g @anthropic-ai/claude-code
```

---

## 3. The System Vision: Proposal → Delivery Pipeline

The user's goal: *"a system through Claude Code that accepts a client's proposal and request for work, tailors an onboarding, thinks and researches the work, plans and decides what work to build, then actually builds it."*

### 3.1 Pipeline Stages

```
CLIENT PROPOSAL
      │
      ▼
┌─────────────────┐
│  INTAKE AGENT   │  — Parses proposal, classifies work type, extracts requirements
│  (NanoBot gate) │    Channels: Email, Telegram, Slack, or web form
└────────┬────────┘
         │ structured brief
         ▼
┌─────────────────┐
│ ONBOARDING AGENT│  — Tailors questions based on project type, fills gaps
│  (SDK AgentDef) │    Produces: ClientBrief{scope, budget, timeline, tech_stack}
└────────┬────────┘
         │ ClientBrief
         ▼
┌─────────────────┐
│ RESEARCH AGENT  │  — Web research, competitor analysis, tech stack research
│  (SDK opus)     │    Tools: WebSearch, WebFetch, filesystem writes
└────────┬────────┘
         │ ResearchReport
         ▼
┌─────────────────┐
│ PLANNING AGENT  │  — Produces ordered feature list + architecture decisions
│  (SDK sonnet)   │    Output: project_plan.json with phases + acceptance criteria
└────────┬────────┘
         │ project_plan.json
         ▼
┌─────────────────┐
│  BUILD AGENT    │  — Implements features, runs tests, commits code
│  (SDK + tools)  │    Tools: Read, Write, Edit, Bash, WebFetch
└────────┬────────┘
         │ deliverable
         ▼
┌─────────────────┐
│ REVIEW + DELIVER│  — Quality gate, generates delivery report, notifies client
│  (NanoBot chan) │
└─────────────────┘
```

---

## 4. Implementation: claude-agent-sdk Wiring

### 4.1 Agent Definitions

```python
from claude_agent_sdk import AgentDefinition, ClaudeAgentOptions, query

INTAKE_AGENT = AgentDefinition(
    description="Client proposal intake — parse and classify work requests",
    prompt="""You are a senior consultant intake agent. When given a client proposal:
1. Extract: project type, scope, budget range, timeline, key requirements
2. Classify: web_app | mobile_app | automation | data_pipeline | consulting | other
3. Flag ambiguities that require clarification
4. Output structured JSON: ClientBrief schema
Be concise. Ask minimal clarifying questions. Default to a reasonable scope if unclear.""",
    tools=["Read", "Write", "WebSearch"],
    model="haiku"   # Fast, cheap — intake is deterministic
)

ONBOARDING_AGENT = AgentDefinition(
    description="Client onboarding — tailored questionnaire based on project type",
    prompt="""You customize onboarding based on project type from ClientBrief.
For web_app: ask about target users, existing codebase, deploy target, auth needs.
For automation: ask about trigger events, data sources, error tolerance, schedule.
For mobile_app: ask about platform (iOS/Android/both), device capabilities, offline needs.
Produce OnboardingReport with filled gaps. Never ask more than 5 questions.""",
    tools=["Read", "Write"],
    model="sonnet"
)

RESEARCH_AGENT = AgentDefinition(
    description="Research agent — market, technical, and competitive research",
    prompt="""You research work requests deeply before planning begins.
Given a ClientBrief, produce a ResearchReport covering:
- Existing solutions / competitor analysis
- Recommended tech stack with rationale
- Key risks and mitigations
- Estimated complexity (S/M/L/XL)
- Reference implementations or libraries to leverage
Use WebSearch and WebFetch extensively. Write findings to research_report.md.""",
    tools=["WebSearch", "WebFetch", "Read", "Write"],
    model="opus"    # Research needs deep reasoning
)

PLANNING_AGENT = AgentDefinition(
    description="Planning agent — feature breakdown and project architecture",
    prompt="""Given ResearchReport + ClientBrief, produce a project_plan.json:
{
  "phases": [{ "name": str, "features": [{"id", "title", "acceptance_criteria", "complexity"}] }],
  "architecture": { "stack": [], "data_model": {}, "api_routes": [] },
  "milestones": [{ "date": str, "deliverable": str }],
  "risks": [{ "risk": str, "mitigation": str }]
}
Prioritize: MVP first. Group by dependency. Each feature must have clear acceptance criteria.""",
    tools=["Read", "Write"],
    model="sonnet"
)

BUILDER_AGENT = AgentDefinition(
    description="Implementation agent — builds features from approved plan",
    prompt="""You implement features from project_plan.json one phase at a time.
For each feature:
1. Read existing codebase context
2. Implement the feature following the project's patterns
3. Write/update tests
4. Verify acceptance criteria are met
5. Commit with descriptive message
Mark each feature complete in project_plan.json as you finish.
Stop and report if you hit a blocker that requires human input.""",
    tools=["Read", "Write", "Edit", "Bash", "WebFetch"],
    model="sonnet"
)
```

### 4.2 Pipeline Orchestrator

```python
import asyncio
import json
from pathlib import Path
from claude_agent_sdk import query, ClaudeAgentOptions

async def run_client_pipeline(proposal_text: str, project_dir: Path):
    """Full autonomous pipeline: proposal → delivery."""
    
    # Stage 1: Intake
    brief_path = project_dir / "client_brief.json"
    async for msg in query(
        prompt=f"Process this client proposal and write client_brief.json:\n\n{proposal_text}",
        options=ClaudeAgentOptions(
            agents={"intake": INTAKE_AGENT},
            cwd=project_dir,
            max_turns=10,
            permission_mode="acceptEdits",
        )
    ):
        if hasattr(msg, 'subtype') and msg.subtype == 'result':
            break

    # Stage 2: Research
    brief = json.loads(brief_path.read_text())
    async for msg in query(
        prompt=f"Research this project brief and write research_report.md:\n\n{json.dumps(brief, indent=2)}",
        options=ClaudeAgentOptions(
            agents={"researcher": RESEARCH_AGENT},
            cwd=project_dir,
            max_turns=30,
            permission_mode="acceptEdits",
        )
    ):
        pass

    # Stage 3: Plan
    research = (project_dir / "research_report.md").read_text()
    async for msg in query(
        prompt=f"Create project_plan.json from this research:\n\n{research}",
        options=ClaudeAgentOptions(
            agents={"planner": PLANNING_AGENT},
            cwd=project_dir,
            max_turns=20,
            permission_mode="acceptEdits",
        )
    ):
        pass

    # Stage 4: Build (phase by phase)
    plan = json.loads((project_dir / "project_plan.json").read_text())
    for phase in plan["phases"]:
        await build_phase(phase, project_dir)
```

---

## 5. Self-Healing Agent Workflows

The core requirement: agents must recover from failures without human intervention.

### 5.1 Four-Tier Self-Healing Architecture

This extends the existing `SelfHealingLoop` in `agent_swarm.py` with SDK-level hooks.

```
TIER 1 — Soft Retry (transient failures)
  Tool call fails → wait 30s → retry same step
  Trigger: tool error, network timeout, rate limit
  Max attempts: 3 per step

TIER 2 — Step Respawn (step-level failure)
  Step fails 3× → respawn with different strategy/model
  Strategy: switch model (haiku→sonnet→opus), change tool set
  Writes failure context to error_log.md for next attempt

TIER 3 — Phase Recovery (phase-level failure)
  Phase fails → research phase failure → replan skipping failed feature
  Updates project_plan.json with skip reason
  Notifies human via NanoBot channel (Telegram/Slack)

TIER 4 — Circuit Breaker (systemic failure)
  3+ consecutive phase failures → halt pipeline
  Escalate to human with full context dump
  Preserve all work done so far
```

### 5.2 SDK Hook Implementation

```python
from claude_agent_sdk import (
    ClaudeAgentOptions, HookEvent,
    PreToolUseHookInput, PostToolUseHookInput,
    SubagentStartHookInput, SubagentStopHookInput, StopHookInput,
    HookCallback
)
import time, json
from pathlib import Path
from dataclasses import dataclass, field


@dataclass
class AgentHealthMonitor:
    """Monitors agent health and triggers recovery."""
    project_dir: Path
    tool_failures: dict = field(default_factory=dict)
    step_failures: int = 0
    phase_failures: int = 0
    start_time: float = field(default_factory=time.time)
    
    def on_pre_tool_use(self, hook: PreToolUseHookInput) -> dict:
        """Gate tool calls — block dangerous tools in production."""
        dangerous = {"Bash": ["rm -rf", "DROP TABLE", "sudo rm"]}
        if hook.tool_name == "Bash" and hook.tool_input:
            cmd = hook.tool_input.get("command", "")
            for danger in dangerous.get("Bash", []):
                if danger in cmd:
                    return {"decision": "deny", "reason": f"Blocked dangerous command: {danger}"}
        return {"decision": "approve"}
    
    def on_post_tool_failure(self, hook: PostToolUseHookInput) -> None:
        """Track tool failures for recovery decisions."""
        tool = hook.tool_name
        self.tool_failures[tool] = self.tool_failures.get(tool, 0) + 1
        
        failure_log = self.project_dir / "error_log.md"
        with failure_log.open("a") as f:
            f.write(f"\n## Tool Failure: {tool} at {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Input: {hook.tool_input}\n")
            f.write(f"Error: {hook.tool_result}\n")
        
        # Tier 1: auto-retry logged implicitly by SDK retry logic
    
    def on_subagent_stop(self, hook: SubagentStopHookInput) -> None:
        """Detect subagent completion or failure."""
        if hook.stop_reason == "error":
            self.step_failures += 1
            self._handle_step_failure(hook)
    
    def _handle_step_failure(self, hook: SubagentStopHookInput) -> None:
        """Tier 2: respawn with adjusted strategy."""
        if self.step_failures >= 3:
            self.phase_failures += 1
            self._escalate_to_human(f"Phase failed after {self.step_failures} step failures")
    
    def _escalate_to_human(self, reason: str) -> None:
        """Write escalation to Supabase for NanoBot to pick up."""
        escalation = {
            "timestamp": time.time(),
            "reason": reason,
            "step_failures": self.step_failures,
            "phase_failures": self.phase_failures,
            "tool_failures": self.tool_failures,
            "runtime_seconds": time.time() - self.start_time,
        }
        (self.project_dir / "escalation.json").write_text(json.dumps(escalation, indent=2))


def build_self_healing_options(project_dir: Path, monitor: AgentHealthMonitor) -> ClaudeAgentOptions:
    """Build options with full self-healing hook configuration."""
    return ClaudeAgentOptions(
        model="claude-sonnet-4-5",
        fallback_model="claude-opus-4-5",  # Tier 2: escalate model on retry
        max_turns=50,
        permission_mode="acceptEdits",
        cwd=project_dir,
        hooks={
            HookEvent.PreToolUse: [
                {"matcher": "*", "callback": monitor.on_pre_tool_use}
            ],
            HookEvent.PostToolUseFailure: [
                {"matcher": "*", "callback": monitor.on_post_tool_failure}
            ],
            HookEvent.SubagentStop: [
                {"matcher": "*", "callback": monitor.on_subagent_stop}
            ],
        },
        agents={
            "intake": INTAKE_AGENT,
            "researcher": RESEARCH_AGENT,
            "planner": PLANNING_AGENT,
            "builder": BUILDER_AGENT,
        }
    )
```

### 5.3 Workflow State Machine

```
PIPELINE STATE TRANSITIONS:

idle ──► intake ──► onboarding ──► research ──► planning ──► building ──► review ──► done
         │               │              │             │            │           │
         ▼               ▼              ▼             ▼            ▼           ▼
       [FAIL]          [FAIL]         [FAIL]        [FAIL]       [FAIL]      [FAIL]
         │               │              │             │            │           │
         └───────────────┴──────────────┴─────────────┴────────────┴───────────┘
                                        ▼
                              self_heal_loop.assess()
                                  /         \
                            retry           escalate
                           (Tier 1-3)       (Tier 4)
                               │                 │
                          resume from        human review
                          last checkpoint    + resume
```

### 5.4 Checkpoint-Based Recovery

Every stage writes a checkpoint so the pipeline can resume after failure:

```python
CHECKPOINT_STAGES = [
    "intake",       # client_brief.json
    "onboarding",   # onboarding_report.json
    "research",     # research_report.md
    "planning",     # project_plan.json
    "build_phase_N" # phase_{n}_complete.json
]

async def resume_pipeline(project_dir: Path):
    """Resume from last successful checkpoint."""
    completed = []
    for stage in CHECKPOINT_STAGES:
        checkpoint_file = project_dir / f"{stage.replace('_N', '')}_complete.json"
        if checkpoint_file.exists():
            completed.append(stage)
    
    last_good = completed[-1] if completed else None
    next_stage = CHECKPOINT_STAGES[len(completed)]
    
    print(f"Resuming from: {last_good} → {next_stage}")
    # Continue pipeline from next_stage
```

---

## 6. NanoBot Integration Points

NanoBot acts as the **communication layer** — the client-facing and human-escalation channel — while the SDK handles the heavy agentic work.

### 6.1 NanoBot as Client Gateway

```
Client sends proposal via Telegram/Email/Slack
        │
        ▼
NanoBot receives → SpawnTool → SubagentManager.spawn()
        │           launches "intake" task
        ▼
Background asyncio task runs intake_agent.run(proposal)
        │
        ▼
NanoBot gateway delivers updates back to client channel
```

### 6.2 NanoBot Config for Client Pipeline

`~/.nanobot/config.json`:
```json
{
  "providers": {
    "anthropic": { "apiKey": "sk-ant-..." }
  },
  "agents": {
    "defaults": {
      "model": "claude-sonnet-4-5",
      "provider": "anthropic"
    }
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "YOUR_BOT_TOKEN",
      "allowFrom": ["YOUR_USER_ID", "CLIENT_USER_IDS..."]
    }
  },
  "tools": {
    "restrictToWorkspace": false,
    "mcpServers": {
      "filesystem": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/client-projects"]
      }
    }
  }
}
```

---

## 7. Integration with Existing ACTP System

The SDK enhances the existing `agent_swarm.py` + Workflow Engine rather than replacing it.

| Existing System | SDK Enhancement |
|-----------------|-----------------|
| `SelfHealingLoop` (4-tier watchdog) | SDK hooks add step-level pre/post intercept |
| `SwarmAgent.run_task()` | `AgentDefinition` replaces ad-hoc prompts |
| `workflow_executors.py` | New `SdkAgentExecutor` task type |
| `SubagentManager.spawn()` (NanoBot) | SDK `query()` handles code-gen tasks |
| `TaskRouter` (keyword routing) | SDK `agents{}` dict enables named routing |
| Supabase `actp_workflow_tasks` | Checkpoint files complement DB state |

### 7.1 New `SdkAgentExecutor`

Add to `workflow_executors.py`:

```python
class SdkAgentExecutor:
    """Executor that runs claude-agent-sdk for code-generating tasks."""
    task_type = "sdk_agent"
    
    async def execute(self, task: WorkflowTask) -> dict:
        action = task.payload.get("action")
        project_dir = Path(task.payload.get("project_dir", "/tmp/client-work"))
        
        if action == "intake":
            return await self._run_intake(task.payload["proposal"], project_dir)
        elif action == "research":
            return await self._run_research(task.payload["brief"], project_dir)
        elif action == "plan":
            return await self._run_planning(project_dir)
        elif action == "build":
            return await self._run_build(task.payload["phase"], project_dir)
    
    async def _run_intake(self, proposal: str, project_dir: Path) -> dict:
        monitor = AgentHealthMonitor(project_dir=project_dir)
        opts = build_self_healing_options(project_dir, monitor)
        opts.max_turns = 10
        
        messages = []
        async for msg in query(
            prompt=f"Process client proposal and write client_brief.json:\n\n{proposal}",
            options=opts
        ):
            messages.append(msg)
        
        brief_path = project_dir / "client_brief.json"
        if brief_path.exists():
            return {"success": True, "brief": json.loads(brief_path.read_text())}
        return {"success": False, "error": "intake failed to produce client_brief.json"}
```

---

## 8. Workflow Definition for Supabase

Seed this into `actp_workflow_definitions` to wire into the existing Workflow Engine:

```json
{
  "slug": "client-proposal-to-delivery",
  "name": "Client Proposal → Delivery",
  "description": "Full autonomous pipeline: intake → research → plan → build",
  "steps": [
    {
      "slug": "intake",
      "type": "local_task",
      "task_type": "sdk_agent",
      "payload": { "action": "intake" },
      "max_retries": 3,
      "timeout_seconds": 300
    },
    {
      "slug": "research",
      "type": "local_task",
      "task_type": "sdk_agent",
      "payload": { "action": "research" },
      "depends_on": ["intake"],
      "max_retries": 2,
      "timeout_seconds": 600
    },
    {
      "slug": "planning",
      "type": "local_task",
      "task_type": "sdk_agent",
      "payload": { "action": "plan" },
      "depends_on": ["research"],
      "max_retries": 2,
      "timeout_seconds": 300
    },
    {
      "slug": "review-plan",
      "type": "ai_review",
      "depends_on": ["planning"],
      "conditions": [{ "field": "plan_complexity", "op": "lte", "value": "XL" }]
    },
    {
      "slug": "build-phase-1",
      "type": "local_task",
      "task_type": "sdk_agent",
      "payload": { "action": "build", "phase": 0 },
      "depends_on": ["review-plan"],
      "max_retries": 3,
      "timeout_seconds": 3600
    },
    {
      "slug": "deliver",
      "type": "cloud_api",
      "service": "crmlite",
      "endpoint": "/api/agent/action",
      "payload": { "action": "crm.log_interaction", "type": "delivery" },
      "depends_on": ["build-phase-1"]
    }
  ]
}
```

---

## 9. Environment Variables Summary

```bash
# ── NanoBot ──────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...          # Required: Claude models
BRAVE_SEARCH_API_KEY=BSA...           # Optional: WebSearch tool
# Config: ~/.nanobot/config.json

# ── claude-agent-sdk ─────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...          # Same key, required
# claude CLI must be installed: npm install -g @anthropic-ai/claude-code

# ── Existing ACTP (no changes) ───────────────────────────────
SUPABASE_URL=https://ivhfuhxorppptyuofbgq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
WORKFLOW_ENGINE_MASTER_KEY=...
ANTHROPIC_API_KEY=sk-ant-...          # Already in actp-worker .env
```

---

## 10. Quick Start

```bash
# 1. Verify SDK is installed
/Users/isaiahdupree/Documents/Software/NanoBot/.venv/bin/python3 \
  -c "import claude_agent_sdk; print(f'SDK v{claude_agent_sdk.__version__} ready')"

# 2. Run NanoBot in CLI mode (confirm API key works)
cd /Users/isaiahdupree/Documents/Software/NanoBot
.venv/bin/nanobot agent -m "Summarize what an autonomous client-work pipeline needs"

# 3. Start NanoBot gateway for channel access
.venv/bin/nanobot gateway

# 4. Test the SDK query (requires claude CLI)
.venv/bin/python3 -c "
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions
async def test():
    async for msg in query(
        prompt='Say: SDK connected successfully',
        options=ClaudeAgentOptions(max_turns=1)
    ):
        print(msg)
asyncio.run(test())
"
```

---

## 11. Next Implementation Steps

| Priority | Task | File |
|----------|------|------|
| P1 | Add `SdkAgentExecutor` to workflow_executors.py | `actp-worker/workflow_executors.py` |
| P1 | Seed `client-proposal-to-delivery` workflow definition | Supabase |
| P2 | Wire NanoBot Telegram channel as client intake endpoint | `~/.nanobot/config.json` |
| P2 | Add `AgentHealthMonitor` hooks to all SDK queries | `actp-worker/sdk_pipeline.py` (new) |
| P3 | Add checkpoint resume logic to pipeline orchestrator | `actp-worker/sdk_pipeline.py` |
| P3 | Connect `escalation.json` → NanoBot → CRMLite notification | `actp-worker/sdk_pipeline.py` |
| P4 | Build client-facing portal to submit proposals | Vercel service (new) |
