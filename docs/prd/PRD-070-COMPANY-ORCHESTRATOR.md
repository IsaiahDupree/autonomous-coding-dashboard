# PRD-070: Autonomous Company Orchestrator

## Status: Ready
## Author: Isaiah Dupree
## Created: 2026-03-04
## Priority: P0 — Foundation for autonomous company running

---

## 1. Problem Statement

The ACTP system has Safari automation, publishing, market research, and an engineering ACD — but **no central orchestrator** that ties them into a 24/7 autonomous company-running loop. Each subsystem operates in isolation. There is nothing that:

- Maintains a company task queue ("grow Twitter → research → post → track → improve")
- Delegates tasks to the right agent (engineering, marketing, ops)
- Reflects after each task and decides what to do next
- Reports what it's doing in real time (like Polsia's live log at https://polsia.com/live)

We need an **Autonomous Company Orchestrator** — the brain that turns our existing tools into a continuously operating business.

---

## 2. Solution Overview

A **Python orchestrator service** (`company-orchestrator`) that:
- Polls a Supabase task queue every 60s
- Routes tasks to the correct agent module (engineering, marketing, ops)
- Executes tasks using existing ACTP/Safari tools as sub-agents
- Reflects on results and auto-generates next tasks
- Streams a live activity log to a dashboard endpoint
- Runs as a persistent process (systemd / Docker / nohup)

Architecture directly mirrors the Agentic Engineering book's Orchestrator + Research-Plan-Build-Review pattern.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────┐
│               COMPANY ORCHESTRATOR (Python)              │
│                                                          │
│  ┌──────────────┐   ┌──────────────┐  ┌──────────────┐  │
│  │  Task Queue  │   │   Planner    │  │  Reflector   │  │
│  │  (Supabase)  │──▶│  (Claude AI) │  │ (self-improve│  │
│  └──────────────┘   └──────┬───────┘  └──────────────┘  │
│                            │                             │
│              ┌─────────────┼──────────────┐              │
│              ▼             ▼              ▼              │
│       Engineering     Marketing         Ops              │
│         Agent          Agent           Agent             │
│       (ACD/Claude)  (Safari+ACTP)  (Research+Inbox)      │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Feature List

### Core Loop
- `ORCH-001` Task queue schema in Supabase (`company_tasks` table: id, type, status, priority, payload, result, created_at, completed_at)
- `ORCH-002` Main orchestrator loop: poll → plan → delegate → reflect → enqueue next (60s interval)
- `ORCH-003` Planner agent: given task, use Claude to produce structured execution plan with agent type + tool calls
- `ORCH-004` Task router: dispatch plan to engineering_agent / marketing_agent / ops_agent modules
- `ORCH-005` Result handler: capture agent output, write to Supabase, update task status

### Engineering Agent Module
- `ORCH-006` Engineering agent: accepts coding task → dispatches to ACD `task-agent.js` via subprocess → returns result
- `ORCH-007` GitHub integration: after successful task, trigger git push + optional Vercel deploy webhook

### Marketing Agent Module
- `ORCH-008` Marketing agent: accepts campaign task → calls existing ACTP Safari automation services
- `ORCH-009` Twitter/X posting via Safari automation (port 3007) with AI-generated content
- `ORCH-010` Email outreach via SMTP integration with AI-drafted messages

### Ops/Support Agent Module
- `ORCH-011` Ops agent: web research via ACTP market research API (port 3106)
- `ORCH-012` Inbox monitor: summarize new emails/DMs via Safari automation, surface action items

### Self-Improving Loop
- `ORCH-013` Reflector: after each task, Claude evaluates result quality and appends lesson to knowledge base
- `ORCH-014` Task generator: reflector auto-proposes 1-3 follow-up tasks based on results
- `ORCH-015` Prompt evolution: reflector updates agent system prompts in `prompts/` dir when patterns improve

### Observability
- `ORCH-016` Activity log: append every action to `logs/orchestrator-activity.jsonl` with ts, task, agent, result
- `ORCH-017` Live status endpoint: `GET /status` returns current task, queue depth, last 20 activity lines
- `ORCH-018` Metrics tracker: daily summary (tasks completed, agents used, success rate, estimated ARR impact)

### Ops
- `ORCH-019` CLI: `python orchestrator.py --run` (daemon), `--once` (single tick), `--status`, `--enqueue "task"`
- `ORCH-020` Config: `.env` driven (ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_KEY, enabled agent flags)

---

## 5. Success Criteria

- Orchestrator runs for 24h without manual intervention
- Successfully delegates at least one task per agent type (engineering, marketing, ops)
- Activity log captures every action with structured JSON
- Reflector generates at least 1 follow-up task after task completion
- `/status` endpoint responds in < 200ms

---

## 6. Dependencies

- Existing ACTP Safari automation services (ports 3003, 3005, 3007, 3106)
- ACD `task-agent.js` for engineering tasks
- Supabase (project: ivhfuhxorppptyuofbgq)
- Claude API (OAuth)
