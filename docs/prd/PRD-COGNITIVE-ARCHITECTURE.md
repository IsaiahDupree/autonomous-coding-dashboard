# PRD: Cognitive Architecture + Terminal Workflows + Layered Memory

**Status**: Active  
**Version**: 1.0  
**Created**: 2026-02-24  
**Owner**: Isaiah Dupree  
**Relates to**: actp-worker, OpenClaw, cognitive_engine.py, ACD

---

## 1. Core Design Goal

Build an agent that can:
- Understand a human request in natural language
- Plan a task
- Execute it through tools/terminal workflows
- Report progress while running
- Remember useful context over time
- Learn from outcomes (without drifting)
- Stay safe and debuggable

**Mental model: Planner + Worker + Memory + Observer + Terminal UX**

---

## 2. High-Level System Layers

### A. Interface Layer (Human ↔ Agent)

**Modes**
- Terminal CLI (primary)
- Chat UI (local web optional)
- API endpoint
- Telegram bot (active)

**Responsibilities**
- Accept natural language instructions
- Show status / heartbeats
- Stream logs/events
- Allow interruptions (`pause`, `stop`, `resume`)
- Ask clarifying questions only when needed
- Present results in human-readable format

---

### B. Cognitive Layer (Thinking + Decisioning)

**Core components**
- **Intent Parser** — determines what the user is asking
- **Task Decomposer** — breaks goal into substeps
- **Planner** — forms execution plan
- **Executor Controller** — dispatches tools/actions
- **Reflector / Evaluator** — checks results and quality
- **Policy Guardrails** — safety/rules/constraints
- **Context Assembler** — builds the right context from memory

**Implementation**: `cognitive_engine.py` + `openclaw_client.py`

---

### C. Tooling / Action Layer

The "hands" of the agent.

- Terminal command runner
- File system tools
- Git operations
- Web/browser automation (Safari Gateway)
- Search/scraping tools
- API connectors (32 ACTP services, 190+ topics)
- Code execution (ACD harness)
- Local app integrations (Obsidian vault, Supabase)

**Key principle**: Tools should be **small, explicit, and observable**.

**Implementation**: `service_registry.py` (32 services, 190+ topics), `data_plane.py` (140 methods)

---

### D. Memory Layer (Layered Memory System)

See Section 4 for full detail.

**Implementation**: `cognitive_engine.py`, `graph_memory.py`, `~/.memory/vault/`

---

### E. Runtime / Reliability Layer

- Job queue (actp_jobs table)
- Heartbeats (`heartbeat_agent.py` — every 30m)
- Status events (`actp_agent_audit_log`)
- Checkpointing (`actp_job_steps` table)
- Retry logic
- Timeouts
- Crash recovery
- Stall detection

---

## 3. Cognitive Architecture (Canonical Flow)

```
Step 1: Receive Goal
Step 2: Build Working Context (memory + constraints + tools)
Step 3: Plan (objective, substasks, dependencies, stop conditions)
Step 4: Execute (tools/terminal in controlled steps)
Step 5: Heartbeat + Status Reporting (every N seconds)
Step 6: Evaluate / Reflect (did output satisfy goal?)
Step 7: Commit Memory (lessons, outcomes, patterns)
```

**Heartbeat events while running:**
- current step
- last action
- next action
- time since last meaningful progress
- warnings/blockers

---

## 4. Layered Memory System

### 4.1 Memory Types (by function)

#### 1. Working Memory (Ephemeral)
- **Stores**: active goal, current step, open subtasks, temporary notes, recent tool outputs
- **Lifetime**: minutes to hours, cleared at end of task
- **Implementation**: in-session OpenClaw context, cleared on `/new`

#### 2. Session Memory (Recent Context)
- **Stores**: user intent summary, major decisions, artifacts produced, pending follow-ups
- **Lifetime**: session/day scale
- **Implementation**: OpenClaw continuity plugin, `DAILY-NOTES/YYYY-MM-DD.md`

#### 3. Long-Term Semantic Memory (Structured)
- **Stores**: user preferences, stable project architecture, constraints, recurring workflows
- **Format**: JSON + Markdown + Supabase
- **Implementation**: `KNOWLEDGE-GRAPH.md`, `ENTITY-GRAPH.md`, `actp_graph_entities`

#### 4. Episodic Memory (Experience Logs)
- **Stores**: tasks attempted, actions taken, success/failure, errors, recovery steps
- **Purpose**: learning and debugging ("last time this failed because...")
- **Implementation**: `DAILY-NOTES/`, `actp_memory_events`, `actp_agent_audit_log`

#### 5. Procedural Memory (How-To Patterns)
- **Stores**: standard operating procedures, terminal command sequences, deployment runbooks, troubleshooting flows
- **Implementation**: `TACIT-KNOWLEDGE.md`, skills/ directory, `AGENTS.md`

#### 6. Reflective Memory (Lessons / Heuristics)
- **Stores**: "what tends to work", "what to avoid", strategy heuristics, safety lessons
- **Purpose**: system gets smarter without becoming chaotic
- **Implementation**: `TACIT-KNOWLEDGE.md`, `TACIT-PREFERENCES.md`, `actp_graph_entities` (layer=3)

#### 7. Growth Memory (Revenue/Growth Signals — NEVER forgotten)
- **Stores**: MRR changes, subscriber events, viral content, ROAS changes, follower growth
- **Implementation**: `GROWTH-METRICS.md`, `actp_cognitive_events` (never_forget=True)

---

### 4.2 Memory Layers (by storage)

| Layer | Type | Storage | Examples |
|-------|------|---------|---------|
| Hot | Fast Cache | In-memory, session | Working memory, active context |
| Warm | Structured Store | Supabase, SQLite | actp_memory_events, actp_graph_entities, actp_jobs |
| Cold | Knowledge Notes | Obsidian/Markdown | KNOWLEDGE-GRAPH.md, DAILY-NOTES/, GROWTH-METRICS.md |

---

### 4.3 Memory Write Policy (Memory Gate)

**Do NOT save everything. Ask before writing to long-term:**

- Is it reusable?
- Is it stable?
- Will it matter later?
- Is it a user preference or system constraint?
- Is it a repeatable lesson?

**If yes** → save to long-term / procedural / reflective  
**If no** → keep in working/session memory only

**Implementation**: `cognitive_engine.score_event()` — events scoring < 5.0 never reach vault, < 7.0 don't promote to layer 1/3.

---

## 5. Terminal-Centric Workflow Architecture

### Terminal UX Features

#### A. Live Status Line
```
RUNNING | step 3/8 | tool:web_search | heartbeat: 12s ago | mode: safe
```

#### B. Event Stream
```
PLAN_CREATED, TOOL_START, TOOL_RESULT, HEARTBEAT, WARNING, BLOCKED, CHECKPOINT_SAVED, TASK_COMPLETE
```
**Implementation**: `actp_agent_audit_log` with structured action strings

#### C. Interrupt Controls
- `pause`, `resume`, `cancel`, `retry step`
- `show plan`, `show context`, `explain last action`

#### D. Modes
- **Dry Run** — plan only
- **Safe Execute** — read-only tools
- **Full Execute** — writes/network allowed
- **Debug Mode** — verbose logs
- **Batch Mode** — minimal output, machine-readable

---

## 6. Heartbeat + Stall Detection

### Status Taxonomy

```
idle → planning → running → waiting → retrying → blocked → stalled → completed → failed → cancelled
```

Fine-grain (optional):
```
running.cpu, running.io, waiting.user, waiting.network, waiting.rate_limit
```

### Liveness vs Progress (key distinction)

A process can be:
- **alive but not progressing** (stuck) — needs stall detection
- **progressing but slow** — acceptable
- **dead** — restart needed
- **waiting on external dependency** — acceptable with timeout

### Stall Detection Rules

Mark as `stalled` when:
- no heartbeat for X seconds **OR**
- heartbeats continue but no progress update for Y seconds/minutes

Then auto-trigger:
- warning in terminal
- diagnostic snapshot to `actp_agent_health_snapshots`
- OpenClaw notification via `notify_needs_attention()`
- retry or fallback action

**Implementation**: `heartbeat_agent.agent_heartbeat_loop()` — 30m interval, NEEDS_ATTENTION triggers OpenClaw wakeup

---

## 7. Job/Step Execution Model

Each user request becomes a **Job**:

```json
{
  "job_id": "uuid",
  "goal": "research and compare X",
  "plan": [...],
  "state": "running",
  "steps": [...],
  "events": [...],
  "artifacts": [...],
  "memory_refs": [...],
  "checkpoints": [...]
}
```

### Step Object

```json
{
  "step_id": "uuid",
  "job_id": "uuid",
  "description": "Fetch competitor data",
  "tool": "research.hashtags",
  "input": {...},
  "expected_output": "list of hashtags",
  "status": "completed",
  "retries": 0,
  "started_at": "...",
  "ended_at": "..."
}
```

**Implementation target**: `actp_jobs` + `actp_job_steps` Supabase tables (see Section 11)

---

## 8. Security + Local-First Posture

### Security Principles

- **Local-first by default** — no cloud calls unless explicitly needed
- **Least privilege tools** — each tool only gets what it needs
- **Explicit tool permissions** — defined in service registry tags
- **Sandbox command execution** — ACD harness wraps all Claude CLI calls
- **Secrets isolation** — env vars only, never in code or logs
- **Audit log of actions** — `actp_agent_audit_log` captures everything
- **Approval gates for destructive actions** — `actp_approval_queue`

### Permission Tiers

| Tier | Allowed |
|------|---------|
| `read_only` | Any read from any data plane |
| `local_write` | Vault writes, local file changes |
| `network_read` | External API reads (research, metrics) |
| `network_write` | Post content, send DMs, update CRM |
| `system_admin` | Config changes — requires manual approval |

---

## 9. Observability + Learning Loop

After each significant run, generate 3 outputs:

### A. Result Summary (for user)
- what was done
- artifacts produced
- confidence / uncertainty
- next steps

### B. Run Log (for debugging)
- tools used, timings, errors, retries, stall episodes
- stored in `actp_agent_audit_log` + `actp_openclaw_sessions`

### C. Reflection (for learning)
- what worked, what failed
- suggested improvement to workflow/prompt/tooling
- memory write decisions
- feeds → `TACIT-KNOWLEDGE.md` + `actp_cognitive_events` (signal_type=strategy_insight)

---

## 10. Failure Modes + Mitigations

| Failure Mode | Symptom | Mitigation |
|---|---|---|
| **Context Bloat** | Too much memory loaded → worse decisions | Memory gate in `score_event()` — only importance≥5 enters daily notes |
| **Silent Stalls** | Agent alive but no progress | Heartbeat + progress distinction + `NEEDS_ATTENTION` → OpenClaw wakeup |
| **Tool Chaos** | Too many tools, unclear routing | 32 services with explicit tags + `cognitive.data_plane_map` |
| **Memory Pollution** | Saving low-quality data as truth | Promotion threshold 7.0+ for layer 1, never_forget gated to 21 specific signal types |
| **Opaque Reasoning** | User doesn't know what agent is doing | `actp_agent_audit_log` + Telegram status commands + `cognitive.session_brief` |
| **Model Waste** | Using Opus for trivial tasks | Model routing in `config.py` — Haiku for health checks, Sonnet for content, Opus for strategy |

---

## 11. Implementation Roadmap

### Phase 1 — Reliable Base Agent ✅ DONE
- [x] CLI interface (OpenClaw)
- [x] Heartbeat + status events
- [x] Audit log (`actp_agent_audit_log`)
- [x] Cron system with `run_with_audit()`
- [x] Service registry (32 services, 190+ topics)

### Phase 2 — Memory Foundation ✅ DONE
- [x] 3-layer vault (KNOWLEDGE-GRAPH, DAILY-NOTES, TACIT-KNOWLEDGE)
- [x] Layer 4 growth memory (GROWTH-METRICS.md)
- [x] `graph_memory.py` + Supabase graph tables
- [x] `cognitive_engine.py` — scoring, forgetting, routing
- [x] `actp_cognitive_events` table with decay/never_forget

### Phase 3 — Job/Step Model ← NEXT
- [ ] `actp_jobs` table (job_id, goal, state, plan, artifacts)
- [ ] `actp_job_steps` table (step_id, job_id, tool, status, retries)
- [ ] Stall detection in heartbeat (progress vs liveness)
- [ ] Checkpoint saving on long tasks
- [ ] `cognitive.ingest` called at task start/complete

### Phase 4 — Smarter Cognition
- [ ] Reflector/evaluator after each cron run
- [ ] `run_with_audit` feeds outcome back to cognitive engine
- [ ] Retry/fallback policies in service dispatch
- [ ] Procedural memory reuse (search TACIT-KNOWLEDGE before acting)

### Phase 5 — Multi-Agent Workers
- [ ] researcher agent (research + feedback service)
- [ ] coder agent (ACD harness delegation)
- [ ] terminal ops agent (system + deploy topics)
- [ ] memory librarian agent (consolidation + promotion)
- [ ] QA/evaluator agent (content review + metrics)

---

## 12. Cognitive Architecture (Current State Summary)

```
ACTP Worker (localhost:9090)
├── service_registry.py     — 32 services, 190+ topics, all callable via HTTP/CLI/Python
├── data_plane.py           — 140 methods across 15 domains
├── cognitive_engine.py     — attention filter, growth scorer, memory router
│   ├── score_event()       — importance 0-10, growth_score 0-10
│   ├── ingest()            — routes to vault layer + Supabase
│   ├── run_forgetting_cycle() — prunes expired low-value events
│   ├── pull_growth_snapshot() — polls all data planes for growth metrics
│   └── summarize_for_session() — distilled brief for agent context
├── heartbeat_agent.py      — every 30m, wired to cognitive + OpenClaw
├── graph_memory.py         — entity/relation graph + promotion pipeline
├── openclaw_client.py      — model routing, wakeup, session audit
└── cron_definitions.py     — 29 crons, all wrapped in run_with_audit()

Memory Vault (~/.memory/vault/)
├── KNOWLEDGE-GRAPH.md      — Layer 1: semantic/durable facts
├── ENTITY-GRAPH.md         — Layer 1: entity relationships
├── DAILY-NOTES/            — Layer 2: episodic daily logs
├── TACIT-KNOWLEDGE.md      — Layer 3: procedural rules/lessons
├── TACIT-PREFERENCES.md    — Layer 3: owner preferences
├── GROWTH-METRICS.md       — Layer 4: never-forgotten growth signals
└── PROJECT-MEMORY/         — per-project memory files

Supabase (ivhfuhxorppptyuofbgq)
├── actp_cognitive_events   — scored signal stream, decay, never_forget
├── actp_memory_writes      — audit of every vault write
├── actp_memory_events      — raw episodic events for promotion
├── actp_graph_entities     — layer 1 knowledge graph
├── actp_graph_relations    — entity relationships
├── actp_openclaw_sessions  — every AI call with model + duration
├── actp_agent_audit_log    — every action, cron, command
└── actp_agent_health_snapshots — heartbeat snapshots
```

---

## 13. Core Philosophy

> **Build an agent that is not just "smart," but operationally trustworthy — observable, memory-grounded, terminal-capable, and able to work with humans in natural language over time.**

The system should be:
- **Observable** — every action logged, heartbeat visible, stalls detected
- **Memory-grounded** — 4 layers + growth signals, with a write gate to prevent bloat
- **Terminal-capable** — first-class CLI, service registry callable from anywhere
- **Revenue-aware** — growth signals never forgotten, cognitive engine amplifies revenue domain ×1.5
- **Non-inhibiting** — all wiring is non-fatal (try/except), never blocks core functionality
