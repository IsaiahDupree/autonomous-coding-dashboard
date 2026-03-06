# Agent Prompt: Engineering Agent Module (PRD-071)

## Your mission
Add the `engineering_agent.py` module to the `company-orchestrator` repo. This module accepts natural language engineering tasks, resolves the target repo, dispatches to ACD `task-agent.js`, runs code review, triggers deploys, and reports results.

## Target repo
`/Users/isaiahdupree/Documents/Software/company-orchestrator`

Add files to the existing project scaffold. Do NOT recreate files already created by PRD-070.

## Files to create/modify
```
agents/engineering_agent.py   ← main module (NEW)
modules/repo_resolver.py      ← fuzzy repo lookup from repo-queue.json (NEW)
modules/code_reviewer.py      ← Claude-based diff quality gate (NEW)
modules/deploy_trigger.py     ← Vercel webhook + GitHub push (NEW)
tests/test_engineering_agent.py ← pytest tests (NEW)
```

## Key logic
```python
async def run_engineering_task(task: str) -> dict:
    plan = await decompose_task(task)           # Claude → {repoId, featureDesc, testStrategy}
    repo = resolve_repo(plan["repoId"])         # fuzzy match repo-queue.json
    result = dispatch_task_agent(repo, plan)    # subprocess: node task-agent.js
    review = await code_review_gate(repo)       # Claude reviews git diff; score < 6 → reject
    if result["testsPass"] and review["score"] >= 6:
        push_to_github(repo["path"])
        deploy_url = trigger_vercel_deploy(repo)
    return build_result(result, review, deploy_url)
```

## ACD task-agent.js path
`/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/task-agent.js`

Invoke via: `node <path> --repo <repoId> --task "<desc>" --no-commit` (orchestrator handles commit)

## repo-queue.json path
`/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/repo-queue.json`

## PRD
See: `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/prd/PRD-071-ENGINEERING-AGENT.md`

## Tests
`tests/test_engineering_agent.py`: test repo resolver (known + unknown repos), task decomposition shape, result schema, code review scoring (mock Claude). Run: `python -m pytest tests/test_engineering_agent.py -x -q`.
