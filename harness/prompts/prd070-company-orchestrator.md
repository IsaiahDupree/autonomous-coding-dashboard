# Agent Prompt: Company Orchestrator (PRD-070)

## Your mission
Build a Python `company-orchestrator` service — the central 24/7 autonomous company-running loop inspired by Polsia.com. This is the brain that connects engineering, marketing, and ops agents into one continuously operating system.

## Target repo
`/Users/isaiahdupree/Documents/Software/company-orchestrator`

Create this as a new Python project if it doesn't exist. Initialize with `pyproject.toml` or `requirements.txt`.

## Architecture
```
orchestrator.py          ← main entry point
agents/
  engineering_agent.py  ← dispatches to ACD task-agent.js
  marketing_agent.py    ← calls Safari automation ports
  ops_agent.py          ← research + inbox
modules/
  planner.py            ← Claude-powered task planner
  reflector.py          ← self-improvement loop
  router.py             ← dispatches tasks to agents
  metrics.py            ← daily summary tracking
logs/                   ← orchestrator-activity.jsonl
prompts/                ← agent system prompts (evolvable)
.env.example
README.md
```

## Key connections (all already exist)
- ACD task-agent: `node /path/to/harness/task-agent.js --repo X --task Y`
- Safari automation: HTTP to `http://localhost:3007` (Twitter), `3005` (IG), `3106` (market research)
- Supabase: project `ivhfuhxorppptyuofbgq` — use `SUPABASE_URL` + `SUPABASE_KEY` from env
- Claude: `anthropic` Python SDK with `ANTHROPIC_API_KEY` from env

## PRD
See: `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/prd/PRD-070-COMPANY-ORCHESTRATOR.md`

## Implementation order
1. Create project scaffold + requirements.txt
2. Supabase `company_tasks` table migration (use supabase-py)
3. Main orchestrator loop (poll → plan → delegate → reflect)
4. Task router (engineering / marketing / ops dispatch)
5. Engineering agent module (subprocess to task-agent.js)
6. Marketing agent module (HTTP to Safari ports)
7. Ops agent module (market research API)
8. Reflector + task generator
9. Activity log + /status endpoint (simple FastAPI)
10. CLI + .env.example + README

## Tests
Create `tests/test_orchestrator.py` with pytest. Test: planner output shape, router dispatch logic, rate limiter, CLI flags, result schema. Run with `python -m pytest tests/ -x -q`.
