# PRD-074: Self-Improving Agent Loop

## Status: Ready
## Author: Isaiah Dupree
## Created: 2026-03-04
## Priority: P1 — System that gets better over time without human input

---

## 1. Problem Statement

Every agent in the system currently operates with **fixed prompts and static knowledge**. When a marketing campaign underperforms or a code task fails, nothing is learned — the same mistakes repeat. Polsia's most powerful capability is the self-improving loop: after every task, the system reflects, extracts lessons, and evolves its own prompts and knowledge base.

Without a self-improving loop, the autonomous system plateaus. With it, the system compounds: each task makes the next one better.

---

## 2. Solution Overview

A **Self-Improving Loop** module (part of `company-orchestrator`) that runs after every completed task:
1. **Reflect**: Claude evaluates what happened — what worked, what didn't, why
2. **Extract**: Distill 1-3 concrete, reusable lessons (facts, patterns, rules)
3. **Store**: Write lessons to the 3-layer knowledge base (daily note + knowledge graph + tacit knowledge)
4. **Evolve**: If a lesson contradicts or improves an existing agent prompt, update the prompt file
5. **Promote**: Weekly, promote frequently-referenced lessons into permanent agent context

This is the "Self-Improving Expert Commands" + "Knowledge Evolution" patterns from the Agentic Engineering book.

---

## 3. Architecture

```
Task completes (any agent)
         │
         ▼
┌─────────────────────────────────┐
│         REFLECTOR               │
│                                 │
│  Input:                         │
│  - task definition              │
│  - agent result (success/fail)  │
│  - execution log excerpt        │
│                                 │
│  Output:                        │
│  - lesson_record (JSON)         │
│  - prompt_diff (optional)       │
│  - follow_up_tasks[] (1-3)      │
└────────────┬────────────────────┘
             │
    ┌────────┴──────────┐
    ▼                   ▼
Knowledge Base      Prompt Store
(3-layer memory)   (prompts/*.md)
```

---

## 4. Feature List

### Reflection Engine
- `SELF-001` Reflector: after each task, Claude evaluates result quality and extracts structured lesson `{ insight, category, confidence, affects_agent }`
- `SELF-002` Failure analyzer: on task failure, deep-dive root cause analysis — was it prompt, context, tool, or environment?
- `SELF-003` Success pattern extractor: on task success, identify what specifically worked (hook, structure, tool sequence)
- `SELF-004` Confidence scorer: rate lesson confidence 1-5; only apply to prompts if confidence >= 4

### Knowledge Base Integration
- `SELF-005` Daily note writer: append today's lessons to `~/.memory/vault/DAILY-NOTES/YYYY-MM-DD.md` (Layer 2)
- `SELF-006` Knowledge graph writer: write reusable facts to `~/.memory/vault/KNOWLEDGE-GRAPH.md` under correct PARA section (Layer 1)
- `SELF-007` Tacit knowledge writer: write learned rules/patterns to `~/.memory/vault/TACIT-KNOWLEDGE.md` (Layer 3)
- `SELF-008` Lesson deduplication: before writing, check if similar lesson exists; update existing rather than duplicate

### Prompt Evolution
- `SELF-009` Prompt differ: given new lesson, Claude proposes minimal diff to relevant agent prompt file
- `SELF-010` Prompt updater: apply approved diffs to `harness/prompts/*.md` files (only if confidence >= 4)
- `SELF-011` Prompt version control: git commit each prompt change with message `refine(prompt): <lesson summary>`
- `SELF-012` Rollback guard: if prompt change causes task failure rate to increase, revert to previous version

### Follow-up Task Generation
- `SELF-013` Next-task proposer: reflector generates 1-3 follow-up tasks for the orchestrator queue based on results
- `SELF-014` Task priority scorer: assign priority (P0/P1/P2) to proposed tasks based on impact estimate
- `SELF-015` Dedup check: before enqueuing, verify task isn't already in queue or recently completed

### Meta-Learning
- `SELF-016` Weekly digest: every Sunday, Claude synthesizes the week's lessons into a strategy update for each agent
- `SELF-017` Performance trend tracker: track per-agent success rate over time; flag if declining
- `SELF-018` Knowledge promotion: `memory_promote_candidates()` — promote high-frequency lessons into permanent agent context (threshold: referenced 3+ times)

### Ops
- `SELF-019` Reflection log: append each reflection to `logs/self-improve.jsonl` with full input/output
- `SELF-020` Reflection CLI: `python self_improve.py --reflect --task-id <id>` for manual replay

---

## 5. Success Criteria

- Every completed task produces at least 1 structured lesson written to knowledge base
- At least 1 prompt is updated within the first 10 task completions based on a high-confidence lesson
- Weekly digest runs automatically on Sunday and produces coherent strategy update
- System success rate measurably improves after 50 tasks compared to first 50

---

## 6. Dependencies

- 3-Layer Memory system: `~/.memory/vault/` (existing — EchoVault MCP)
- `harness/prompts/*.md` agent prompt files (existing)
- `memory_promote_candidates()` in `data_plane.py` (existing)
- Supabase `company_tasks` table (from PRD-070)
