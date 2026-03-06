# PRD-071: Engineering Agent Service

## Status: Ready
## Author: Isaiah Dupree
## Created: 2026-03-04
## Priority: P0 — Self-directing code agent

---

## 1. Problem Statement

The ACD can execute features from a pre-built list, but there is **no agent that can accept an open-ended engineering task, plan the implementation, execute it autonomously, verify it, and deploy it** without a human writing the feature list first.

When the Company Orchestrator generates a task like "Add webhook support to cloud-sync-mcp" or "Fix the rate-limiting bug in the ACTP worker", there is no automated path from that text to working, deployed, tested code.

---

## 2. Solution Overview

An **Engineering Agent** module (added to `company-orchestrator`) that:
- Accepts a natural language engineering task + target repo
- Uses Claude to decompose the task into a concrete implementation plan
- Dispatches to ACD `task-agent.js` for code execution
- Monitors CI/tests and reports pass/fail
- Triggers deploy on success
- Reports back to the orchestrator with structured result

This IS the Polsia "Engineering Agent" — the one you see in their live log doing Git commits, server restarts, and deploys.

---

## 3. Architecture

```
Orchestrator task: "Add rate limiting to cloud-sync-mcp API"
         │
         ▼
┌─────────────────────────┐
│   Engineering Agent      │
│                          │
│  1. Decompose task       │◄── Claude (plan)
│  2. Find target repo     │◄── repo-queue.json lookup
│  3. dispatch task-agent  │──► harness/task-agent.js
│  4. Monitor test output  │
│  5. Trigger deploy       │──► Vercel/GitHub webhook
│  6. Return result        │──► Orchestrator
└─────────────────────────┘
```

---

## 4. Feature List

### Task Decomposition
- `ENG-001` Task analyzer: given natural language task, Claude produces `{ repoId, featureDescription, testStrategy, deployTarget }` JSON
- `ENG-002` Repo resolver: find best matching repo from repo-queue.json given task description (fuzzy match on tags/name/focus)
- `ENG-003` Subtask splitter: if task is complex, split into ordered subtasks and execute sequentially

### Code Execution
- `ENG-004` Task dispatch: call `task-agent.js` programmatically with resolved repo + feature description
- `ENG-005` Execution monitor: stream task-agent output to engineering agent log in real time
- `ENG-006` Retry logic: if task-agent fails tests, rephrase task and retry once with more context

### Verification
- `ENG-007` Test runner: after task-agent completes, independently run `npm test` / `pytest` and parse result
- `ENG-008` Code review gate: Claude reviews diff (git diff HEAD~1) and scores quality (1-10); reject if < 6
- `ENG-009` Regression check: ensure passing test count didn't decrease from pre-task baseline

### Deployment
- `ENG-010` Vercel deploy trigger: POST to Vercel deploy webhook after passing tests
- `ENG-011` GitHub push: `git push origin main` after successful tests + review gate
- `ENG-012` Deploy status poll: poll Vercel deployment API until status is `READY` or `ERROR`

### Reporting
- `ENG-013` Result schema: `{ success, repoId, task, filesChanged, testsPass, deployUrl, commitHash, duration, reviewScore }`
- `ENG-014` Engineering log: append each task result to `logs/engineering-agent.jsonl`
- `ENG-015` Failure report: on failure, write root cause + stack trace to result for orchestrator reflector

---

## 5. Success Criteria

- Given "Add a health check endpoint to cloud-sync-mcp", agent produces working code, passes tests, and pushes to GitHub without human intervention
- Code review gate catches at least 1 low-quality output in testing
- Deploy trigger fires within 60s of successful tests

---

## 6. Dependencies

- `harness/task-agent.js` (existing)
- `harness/repo-queue.json` (existing)
- Vercel API token (env: `VERCEL_TOKEN`)
- GitHub personal access token (env: `GITHUB_TOKEN`)
