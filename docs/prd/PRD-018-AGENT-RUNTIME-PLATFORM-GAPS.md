# PRD-018: Agent Runtime Platform — Architecture Audit & Gap Specs

**Status:** Draft  
**Priority:** P-0 (foundational)  
**Owner:** Isaiah Dupree  
**Created:** 2026-02-25  
**Source:** ChatGPT architecture sessions (Memory & Cognitive Architecture, Base AI Agent Design, Cognitive Architecture Recap)

---

## 1. Purpose

Audit the full Agent Runtime Platform architecture against existing PRDs. Map each component to an existing PRD or a new gap spec.

---

## 2. Architecture (from design sessions)

```
System: Agent Runtime Platform
├── Control Plane      — decides / configures
├── Data Plane         — executes
├── Memory Plane       — stores truth + projections
├── Telemetry Plane    — observability + watchdogs
├── Subsystem: Scheduling & Time
├── Subsystem: Reliability & Self-Healing
├── Subsystem: Researcher (ResearchWorker)
└── Subsystem: Executive Loop (agent cognition runtime)
```

---

## 3. Audit Matrix

### Control Plane

| Component | Coverage | PRD |
|-----------|----------|-----|
| Workflow definitions (DAGs, steps, triggers) | ✅ Full | PRD-001 |
| Local agent daemon / capability registration | ✅ Full | PRD-002 |
| Scheduling orchestration | ✅ Full | PRD-015 |
| Goal hierarchy + learning | ✅ Full | PRD-016 |
| Agent Registry + versioning | ❌ Gap | §4.1 |
| Policy Service (budgets, rate limits, safety) | ❌ Gap | §4.2 |
| Model routing configuration | ❌ Gap | §4.3 |
| Rollouts (canary, feature flags) | ❌ Gap | §4.4 |

### Data Plane

| Component | Coverage | PRD |
|-----------|----------|-----|
| Worker runtime + execution loop | ✅ Full | PRD-002 |
| Tool adapters (web, APIs, browser) | ✅ Full | PRD-002, PRD-003 |
| Action execution (posting, messaging) | ✅ Full | PRD-006 |
| Progress emission + partial artifacts | ✅ Full | PRD-COGNITIVE-ARCH §7 |
| Budget enforcement at runtime | ❌ Gap | §4.2 |
| Canonical event types | ❌ Gap | §4.5 |

### Memory Plane

| Component | Coverage | PRD |
|-----------|----------|-----|
| L1 Working/Session Memory (checkpoints) | ✅ Full | PRD-014, PRD-COGNITIVE-ARCH |
| L2 Episodic Memory (event log) | ✅ Full | PRD-COGNITIVE-ARCH §4.1.4 |
| L3 Semantic Memory (facts/knowledge) | ✅ Full | PRD-COGNITIVE-ARCH §4.1.3 |
| L4 Procedural Memory (SOPs, playbooks) | ✅ Full | PRD-COGNITIVE-ARCH §4.1.5 |
| L5 Archival/Cold Storage | ✅ Full | PRD-COGNITIVE-ARCH §4.2 |
| Conversation Memory Subsystem | ✅ Full | PRD-014 |
| L0 Registers/Scratchpad (per-step temp) | ❌ Gap | §4.6 |
| Retrieval Index Service (vector+keyword) | ❌ Gap | §4.7 |
| Memory Proposal Gate (formal gating service) | ⚠️ Partial — referenced in PRD-017 | §4.8 |

### Telemetry Plane

| Component | Coverage | PRD |
|-----------|----------|-----|
| Structured logs + heartbeats | ✅ Full | PRD-COGNITIVE-ARCH §6 |
| Stall detection | ✅ Full | PRD-COGNITIVE-ARCH §6 |
| Health Dashboard | ✅ Full | PRD-001 §11 |
| Watchdog / Supervisor | ✅ Full | PRD-COGNITIVE-ARCH §6 |
| SLA tracking (time-to-first-update, completion time) | ❌ Gap | §4.9 |
| Incident mode (throttle budgets, change retry) | ❌ Gap | §4.10 |
| DLQ + Human Review Queue | ⚠️ Partial — mentioned in PRD-015 | §4.11 |

### Reliability Subsystem

| Component | Coverage | PRD |
|-----------|----------|-----|
| Step-level retries/backoff/jitter | ✅ Full | PRD-001 §10 |
| Checkpoint resume + requeue | ✅ Full | PRD-015 |
| Tool-level circuit breakers | ❌ Gap | §4.12 |
| Poison job / DLQ after N failures | ⚠️ Partial | §4.11 |
| Worker recycling (stuck/leaked workers) | ❌ Gap | §4.13 |
| Replay / Forensics Tool | ❌ Gap | §4.14 |

### Researcher Subsystem

| Component | Coverage | PRD |
|-----------|----------|-----|
| ResearchRequest → EvidencePack → Synthesis | ✅ Full | PRD-017 |
| Staged pipeline + per-stage checkpoint | ✅ Full | PRD-017 |
| Source ranking + budget control | ✅ Full | PRD-017 |
| Evidence Store + Memory Proposal Gate | ⚠️ Partial | §4.8 |
| Domain allowlist + prompt injection firewall | ❌ Gap | §4.15 |

### Executive Loop Subsystem

| Component | Coverage | PRD |
|-----------|----------|-----|
| Intent Parser / Planner / Task Decomposer | ✅ Full | PRD-COGNITIVE-ARCH §3 |
| Two-phase responses (receipt → progress → final) | ✅ Full | PRD-009 |
| Reflector / AAR + learning | ✅ Full | PRD-016 §4 |
| Critic / Verifier as standalone service | ❌ Gap | §4.16 |
| Context Assembler (general, not just conversation) | ⚠️ Partial — PRD-014 covers conversation only | §4.17 |

---

## 4. Gap Specifications

### §4.1 Agent Registry Service

Catalog of all agent definitions — capabilities, tool permissions, memory namespaces, active version.

**Tables:**
```sql
actp_agent_definitions (
  id UUID PK, slug TEXT UNIQUE,
  version INT, description TEXT,
  capabilities JSONB,       -- tool names + permission tiers
  memory_read TEXT[],       -- namespaces agent reads
  memory_write TEXT[],      -- namespaces agent writes
  model_policy JSONB,       -- default model, fallback, max_cost
  enabled BOOL, created_at TIMESTAMPTZ
)
actp_agent_versions (
  id UUID PK, agent_id UUID FK,
  version INT, changelog TEXT,
  snapshot JSONB,           -- full definition at this version
  deployed_at TIMESTAMPTZ
)
```

**API:** `GET /api/agents`, `GET /api/agents/:slug`, `GET /api/agents/:slug/capabilities`  
**File:** `agent_registry.py`  
**Phase:** 2

---

### §4.2 Policy Service

Central runtime enforcement for budgets, rate limits, domain allowlists, and safety rules.

**Tables:**
```sql
actp_policies (
  id UUID PK,
  scope TEXT,       -- "global" | "agent:{slug}" | "tool:{name}"
  policy_type TEXT, -- "budget" | "rate_limit" | "allowlist" | "safety"
  config JSONB,
  enabled BOOL, created_at TIMESTAMPTZ
)
-- Budget config: { "daily_usd": 5.00, "per_run_usd": 0.50 }
-- Rate limit:    { "tool": "browser.fetch", "max_per_minute": 10 }
-- Allowlist:     { "allowed_domains": ["github.com", "docs.*"] }
-- Safety:        { "require_approval_for": ["network_write", "system_admin"] }

actp_budget_ledger (
  id UUID PK, agent_slug TEXT,
  tool_name TEXT, cost_usd FLOAT,
  run_id UUID, created_at TIMESTAMPTZ
)  -- append-only spend log
```

**Runtime contract:**  
Before each tool call: `policy_service.check(agent_slug, tool_name, action_type)`  
Returns: `{ allowed: true }` or `{ allowed: false, reason: "...", retry_after: N }`

**File:** `policy_service.py`  
**Phase:** 2

---

### §4.3 Model Routing Configuration

Data-driven table of rules for model selection per task type with fallback chains.

```sql
actp_model_routes (
  id UUID PK, task_type TEXT,
  provider TEXT, model TEXT,
  priority INT,             -- lower = preferred
  max_cost_usd FLOAT,
  conditions JSONB,         -- e.g. { "max_context_length": 4000 }
  enabled BOOL
)
```

**Current implicit routes to formalize:**

| task_type | model | rationale |
|-----------|-------|-----------|
| health_check | haiku | trivial, fast |
| greeting | haiku | conversational |
| content_generation | sonnet | quality needed |
| code_review | sonnet | quality needed |
| research_synthesis | sonnet | complex reasoning |
| strategy_planning | opus | high-stakes |

**File:** `model_router.py`  
**Phase:** 2

---

### §4.4 Rollout & Feature Flag System

```sql
actp_feature_flags (
  id UUID PK, flag_key TEXT UNIQUE,
  enabled BOOL DEFAULT false,
  rollout_pct INT DEFAULT 0,    -- 0-100
  target_ids TEXT[],            -- always-on for specific agents/users
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
```

**Usage:** `feature_flags.is_enabled("new_synthesis_v2", context={"agent": "researcher"})`  
**File:** `feature_flags.py`  
**Phase:** 3

---

### §4.5 Canonical Event Type Registry

Single source of truth for all structured events emitted across the system.

```
Job lifecycle:
  job.received          job.planning        job.dispatched
  job.progress          job.completed       job.failed
  job.cancelled         job.timed_out       job.retrying

Tool events:
  tool.call_started     tool.call_completed tool.call_failed
  tool.circuit_open     tool.circuit_closed

Research events:
  research.plan_created
  research.stage_completed  (stage: plan|search|fetch|rank|synthesize|propose)
  research.evidence_stored  research.proposal_created
  research.proposal_approved  research.proposal_rejected

Memory events:
  memory.write          memory.promote      memory.forget
  memory.checkpoint

Scheduler events:
  schedule.fired        schedule.missed     schedule.skipped
  schedule.coalesced    run.claimed         run.lease_renewed

Reliability events:
  circuit.open          circuit.half_open   circuit.closed
  dlq.enqueued          dlq.reviewed        job.replayed

Telemetry events:
  heartbeat.ok          heartbeat.stale     agent.stalled
  sla.breach            incident.declared   incident.resolved
```

**Implementation:** Enum in `event_types.py` + JSON schema per event type in `event_schemas/`  
**Phase:** 1 (retroactively formalize existing events)

---

### §4.6 L0 Registers / Scratchpad

Per-step temporary key-value store — lives only for the duration of a single job run.

**Contract:**
- Scoped to `(job_id, step_id)`
- Cleared automatically when job completes/fails
- Never persisted to Supabase (in-memory dict in worker)
- Exposed to tool calls via `ctx.scratch.get(key)` / `ctx.scratch.set(key, value)`

**Implementation:** `ScratchpadRegistry` class in `execution_context.py`  
**Phase:** 1

---

### §4.7 Retrieval Index Service

Vector + keyword indexes as **rebuildable projections** of canonical memory stores.

**Core rule:** The index is NOT the source of truth. Canonical stores (vault markdown + Supabase tables) are truth. The index can always be rebuilt from them.

**Design:**
```
Canonical stores (truth)          Index (projection)
─────────────────────────         ────────────────────
KNOWLEDGE-GRAPH.md          →     vector embeddings (pgvector)
actp_graph_entities         →     keyword + semantic index
DAILY-NOTES/*.md            →     episodic search
TACIT-KNOWLEDGE.md          →     procedural search
actp_cognitive_events       →     event search
```

**Tables:**
```sql
actp_retrieval_index (
  id UUID PK, source_table TEXT, source_id TEXT,
  content_hash TEXT,         -- detect staleness
  embedding vector(1536),    -- pgvector
  keywords TEXT[],           -- BM25 keywords
  indexed_at TIMESTAMPTZ
)
```

**Rebuild trigger:** `POST /api/memory/reindex` — rebuilds from canonical stores  
**Staleness check:** Compare `content_hash` against source on read  
**Phase:** 2

---

### §4.8 Memory Proposal Gate

Formal gating service between research/agent outputs and long-term memory writes. Prevents unreviewed claims from polluting semantic/procedural memory.

**Flow:**
```
Agent/ResearchWorker produces claim
  → MemoryProposal created (status: pending)
  → Critic/Verifier scores it (§4.16)
  → If score >= threshold AND source quality ok:
      → MemoryWrite executed + logged
  → Else:
      → Proposal rejected/deferred + reason logged
```

**Tables:**
```sql
actp_memory_proposals (
  id UUID PK,
  source_agent TEXT, source_run_id UUID,
  target_layer INT,        -- 1=semantic, 4=procedural
  target_key TEXT,
  proposed_value JSONB,
  evidence_refs TEXT[],    -- source IDs from EvidencePack
  score FLOAT,             -- critic score 0-10
  status TEXT,             -- pending | approved | rejected | deferred
  reviewer TEXT,           -- "auto" or user ID
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
```

**Auto-approve threshold:** score >= 7.0 + at least 1 source with authority >= 0.7  
**File:** `memory_proposal_gate.py`  
**Phase:** 2

---

### §4.9 SLA Tracking

Track time-to-first-update and end-to-end completion time per job/tool type.

**Tables:**
```sql
actp_sla_measurements (
  id UUID PK, job_id UUID,
  job_type TEXT,
  time_to_first_update_ms INT,   -- job.received → first job.progress
  time_to_completion_ms INT,     -- job.received → job.completed
  tool_rounds INT,
  sla_breached BOOL,             -- exceeded defined target
  created_at TIMESTAMPTZ
)
actp_sla_targets (
  job_type TEXT PK,
  time_to_first_update_ms INT,   -- e.g. 5000 (5s)
  time_to_completion_ms INT      -- e.g. 30000 (30s)
)
```

**Current SLA targets to formalize:**

| job_type | first_update | completion |
|----------|-------------|------------|
| health_check | 5s | 30s |
| revenue_overview | 5s | 60s |
| list_projects | 5s | 30s |
| research_synthesis | 5s | 120s |
| content_generation | 5s | 180s |

**Phase:** 2

---

### §4.10 Incident Mode

System-wide mode switch that throttles budgets and changes retry/execution strategy when the system is degraded.

**States:** `normal` → `degraded` → `incident` → `normal`

**Incident triggers (auto):**
- Error rate > 20% over 5 min window
- Budget spend > 2× rolling average in 1 hour
- Heartbeat failures on > 3 critical services

**Incident effects:**
- All `budget.daily_usd` limits halved
- `max_retries` reduced to 1 (fail fast)
- Non-critical crons suspended
- Alert sent via Telegram to admin

**Tables:**
```sql
actp_incident_log (
  id UUID PK, declared_at TIMESTAMPTZ,
  trigger_reason TEXT, trigger_data JSONB,
  resolved_at TIMESTAMPTZ, resolution_note TEXT
)
```

**File:** `incident_manager.py`  
**Phase:** 3

---

### §4.11 DLQ + Human Review Queue

Dead-letter queue for jobs that have exhausted retries, plus a human review interface.

**Tables:**
```sql
actp_dlq (
  id UUID PK, original_job_id UUID,
  job_type TEXT, input_data JSONB,
  failure_reason TEXT, retry_count INT,
  enqueued_at TIMESTAMPTZ,
  reviewed_by TEXT, reviewed_at TIMESTAMPTZ,
  resolution TEXT    -- "replayed" | "discarded" | "manual_fix"
)
```

**DLQ entry triggers:** job fails after `max_retries` exhausted  
**Review UI:** ACTPDash `/dlq` page — list pending, view inputs/errors, replay or discard  
**Telegram command:** `/dlq` — show pending items needing review  
**Phase:** 2

---

### §4.12 Tool-Level Circuit Breakers

Prevent cascading failures when a downstream tool/service degrades.

**States:** `closed` (normal) → `open` (failing, reject calls) → `half-open` (probe recovery)

**Config per tool:**
```python
CircuitBreakerConfig(
    tool_name="browser.fetch",
    failure_threshold=5,       # open after N failures in window
    window_seconds=60,
    recovery_probe_seconds=30, # try one call after open for this long
    fallback=None              # optional fallback tool name
)
```

**Implementation:** `CircuitBreakerManager` class in `circuit_breakers.py`  
**State stored in:** in-memory dict (reset on restart) + optionally `actp_circuit_states` table  
**Events emitted:** `tool.circuit_open`, `tool.circuit_half_open`, `tool.circuit_closed`  
**Phase:** 2

---

### §4.13 Worker Recycling

Detect and recover from stuck or memory-leaking workers.

**Detection:**
- Worker heartbeat stops → mark worker as `dead` in `actp_worker_registrations`
- Worker memory RSS > threshold → flag for restart
- Worker has held the same job claim for > `timeout_minutes` → release claim + requeue

**Recovery:**
- `WorkerSupervisor` checks worker health every 60s
- On dead/stuck: release all held claims → requeue → optionally restart process

**Implementation:** `worker_supervisor.py` (integrates with existing `heartbeat_agent.py`)  
**Phase:** 2

---

### §4.14 Replay / Forensics Tool

Re-run any past job from a checkpoint, inspect its full event timeline.

**Capabilities:**
- `replay_job(job_id, from_step=None)` — re-execute from beginning or a specific step
- `inspect_timeline(job_id)` — ordered list of all events for a job with timestamps
- `diff_runs(job_id_a, job_id_b)` — compare inputs, steps, outputs, timing

**Data sources:** `actp_agent_audit_log` + `actp_job_steps` + `actp_workflow_steps`  
**CLI command:** `python3 worker.py replay <job_id>`  
**Phase:** 3

---

### §4.15 Research Security (Domain Allowlist + Prompt Injection Firewall)

Prevent malicious content in fetched web pages from poisoning agent context.

**Domain allowlist:**
```python
RESEARCH_ALLOWED_DOMAINS = [
    "github.com", "docs.*", "arxiv.org", "wikipedia.org",
    "*.vercel.app",  # ACTP services
]
RESEARCH_BLOCKED_PATTERNS = [
    r"ignore previous instructions",
    r"you are now",
    r"<\|system\|>",
    r"TOOL_CALL:",          # prevent injected tool calls
]
```

**Sanitization pipeline (per fetched page):**
1. Strip HTML → plain text
2. Scan for injection patterns → redact + flag
3. Hash content for audit (`sha256:...`)
4. Store in `actp_research_evidence` with `sanitized=true`

**File:** `research_security.py`  
**Phase:** 1 (apply immediately to ResearchWorker)

---

### §4.16 Critic / Verifier Service

Standalone service that checks agent outputs for quality, contradictions, and missing evidence before they're used or stored.

**Inputs:**
- A claim or plan (text)
- Evidence refs (source IDs from EvidencePack or tool outputs)
- A rubric (configurable: accuracy, completeness, safety, confidence)

**Output:**
```json
{
  "score": 7.5,
  "verdict": "approve",   // approve | revise | reject
  "issues": [
    { "type": "missing_evidence", "claim": "X supports Y", "severity": "medium" }
  ],
  "confidence": 0.82
}
```

**Use cases:**
1. Gate memory writes (§4.8 Memory Proposal Gate)
2. Review research synthesis before returning to user
3. Check agent plans before execution (dry-run mode)
4. Post-run reflection (PRD-016 AAR)

**File:** `critic_verifier.py`  
**Phase:** 2

---

### §4.17 Context Assembler

Builds the right context packet for any agent/task from all memory layers — not just conversation history.

**PRD-014** covers conversation memory context. This covers the **general case**.

**Assembler logic:**
```
Given: task_type, agent_slug, user_id, job_id

1. Load conversation context (PRD-014 ConversationContextPacket)
2. Pull relevant semantic memory (graph entities, knowledge-graph)
3. Pull recent episodic memory (last N events matching task domain)
4. Pull applicable procedural memory (SOPs matching task_type)
5. Pull active goals (PRD-016 objectives matching agent)
6. Apply token budget: trim until fits in model context window
7. Return: AgentContextPacket
```

**AgentContextPacket schema:**
```json
{
  "conversation": { "turns": [...], "summary": "..." },
  "semantic":     { "entities": [...], "facts": [...] },
  "episodic":     { "recent_events": [...] },
  "procedural":   { "sops": [...], "lessons": [...] },
  "goals":        { "active_objectives": [...] },
  "token_budget": { "used": 2400, "limit": 4000 }
}
```

**File:** `context_assembler.py`  
**Phase:** 2

---

## 5. Build Phase Assignment

### Phase 1 — Immediate / Already Buildable
- §4.5 Canonical Event Types — `event_types.py` (formalize existing events)
- §4.6 L0 Scratchpad — `execution_context.py` (in-memory, trivial)
- §4.15 Research Security — `research_security.py` (apply to ResearchWorker)

### Phase 2 — Core Infrastructure
- §4.1 Agent Registry — `agent_registry.py` + 2 tables
- §4.2 Policy Service — `policy_service.py` + 2 tables
- §4.3 Model Routing — `model_router.py` + 1 table
- §4.7 Retrieval Index — `retrieval_index.py` + pgvector table
- §4.8 Memory Proposal Gate — `memory_proposal_gate.py` + 1 table
- §4.9 SLA Tracking — `sla_tracker.py` + 2 tables
- §4.11 DLQ — `dlq_manager.py` + 1 table
- §4.12 Circuit Breakers — `circuit_breakers.py`
- §4.13 Worker Recycling — `worker_supervisor.py`
- §4.16 Critic/Verifier — `critic_verifier.py`
- §4.17 Context Assembler — `context_assembler.py`

### Phase 3 — Advanced
- §4.4 Feature Flags — `feature_flags.py` + 1 table
- §4.10 Incident Mode — `incident_manager.py` + 1 table
- §4.14 Replay/Forensics — `worker.py replay` CLI command

---

## 6. New Tables Summary

| Table | Gap | Purpose |
|-------|-----|---------|
| `actp_agent_definitions` | §4.1 | Agent capability registry |
| `actp_agent_versions` | §4.1 | Agent version history |
| `actp_policies` | §4.2 | Budget/rate/safety policies |
| `actp_budget_ledger` | §4.2 | Append-only spend log |
| `actp_model_routes` | §4.3 | Model selection rules per task |
| `actp_feature_flags` | §4.4 | Canary/feature flag store |
| `actp_retrieval_index` | §4.7 | Vector+keyword index (projection) |
| `actp_memory_proposals` | §4.8 | Gated memory write proposals |
| `actp_sla_measurements` | §4.9 | Per-job SLA timing |
| `actp_sla_targets` | §4.9 | SLA targets per job type |
| `actp_incident_log` | §4.10 | Incident declarations + resolutions |
| `actp_dlq` | §4.11 | Dead-letter queue for exhausted jobs |

---

## 7. What Is Fully Covered (No Action Needed)

These architectural components have complete PRDs and do not need further spec work:

- **PRD-001**: Workflow Engine (DAG executor, step routing, retry, timeout)
- **PRD-002**: Local Agent Daemon v2 (capability registration, task poller, progress)
- **PRD-003**: Safari Research Pipeline
- **PRD-004**: Remotion Content Pipeline
- **PRD-005**: AI Content Review Gate
- **PRD-006**: Automated Publishing Pipeline
- **PRD-009**: OpenQualls Bot Reliability + tool calling
- **PRD-014**: Conversation Memory Subsystem
- **PRD-015**: Temporal Orchestration & Scheduler (all schedule types, missed-run, concurrency)
- **PRD-016**: Agent Goal + Learning System (OKR hierarchy, AAR, playbooks)
- **PRD-017**: ResearchWorker (staged pipeline, EvidencePack, synthesis)
- **PRD-COGNITIVE-ARCH**: Memory layers L1-L5, heartbeat/stall detection, job/step model, security posture

---

## 8. Recommended Next Build Order

```
1. event_types.py          (Phase 1) — unblock all telemetry consumers
2. execution_context.py    (Phase 1) — L0 scratchpad for tool calls
3. research_security.py    (Phase 1) — protect ResearchWorker immediately
4. policy_service.py       (Phase 2) — budget enforcement before scaling spend
5. circuit_breakers.py     (Phase 2) — protect against cascading tool failures
6. memory_proposal_gate.py (Phase 2) — gate before memory pollution accumulates
7. critic_verifier.py      (Phase 2) — enable quality checks on research + memory
8. context_assembler.py    (Phase 2) — multi-layer context for all agents
9. agent_registry.py       (Phase 2) — formalize what agents exist + can do
10. sla_tracker.py          (Phase 2) — measure against targets
```
