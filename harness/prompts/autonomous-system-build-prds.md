---
domain: coding
tags: [browser-agents, prospects, upwork, self-healing, cloud-bridge]
priority: high
---

# Autonomous System Builder — PRD Implementation Agent

## Your Mission

You are the autonomous coding agent responsible for implementing the 5-PRD autonomous business system. Read the master vision and implement features in priority order.

## Step 1 — Read These PRDs (in order)

1. `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/prd/PRD-AUTONOMOUS-SYSTEM-MASTER-VISION.md`
2. `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/prd/PRD-CLOUD-LOCAL-REQUEST-BRIDGE.md`
3. `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/prd/PRD-BROWSER-AGENT-UNIFIED-CONTROL.md`
4. `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/prd/PRD-PROSPECT-ACQUISITION-PIPELINE.md`
5. `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/prd/PRD-UPWORK-AUTONOMOUS-FULFILLMENT.md`
6. `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/prd/PRD-SELF-HEALING-CLAUDE-CODE-DOCKER.md`

## Step 2 — Assess Current State

For each PRD, grep the codebase to check what's already implemented:

```bash
# Check Cloud-Local Bridge
ls /Users/isaiahdupree/Documents/Software/actp-worker/cloud_task_poller.py 2>/dev/null
ls /Users/isaiahdupree/Documents/Software/actp-worker/data_bridge.py 2>/dev/null

# Check Browser Agent Control
ls "/Users/isaiahdupree/Documents/Software/Safari Automation/packages/linkedin-chrome/" 2>/dev/null
ls "/Users/isaiahdupree/Documents/Software/Safari Automation/packages/unified-control/" 2>/dev/null

# Check Prospect Pipeline
ls /Users/isaiahdupree/Documents/Software/actp-worker/prospect_pipeline.py 2>/dev/null

# Check Upwork Pipeline
ls /Users/isaiahdupree/Documents/Software/actp-worker/upwork_pipeline.py 2>/dev/null

# Check Self-Healer
ls /Users/isaiahdupree/Documents/Software/actp-worker/self_healer.py 2>/dev/null
```

## Step 3 — Pick Highest-Priority Unimplemented Feature and Implement It

Work on one feature at a time. For each feature:

1. Read the PRD section carefully
2. Read existing related code files for context
3. Write the implementation (minimal, clean, follows existing patterns)
4. Run any available tests
5. Commit to GitHub
6. Move to next feature

## Coding Conventions (from actp-worker codebase)

- Python async/await throughout
- All new files: typed with dataclasses or TypedDict
- Supabase calls via `self.supabase.table(...).select|insert|update|upsert`
- Config flags in `config.py` with `os.getenv("FLAG_NAME", "default")`
- Logging: `logger = logging.getLogger(__name__)`
- New executor type: inherit from `BaseExecutor` in `workflow_executors.py`
- All new features gated by `ENABLE_*` env flag

## Key Paths

```
actp-worker:      /Users/isaiahdupree/Documents/Software/actp-worker/
Safari Automation: /Users/isaiahdupree/Documents/Software/Safari Automation/
ACD repo:         /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/
Passport drive:   /Volumes/My Passport/
```

## Priority Order

1. **CLB-001 + CLB-008**: `actp_cloud_tasks` Supabase table + `claim_cloud_task` RPC
2. **CLB-002**: `cloud_task_poller.py` in actp-worker
3. **CLB-004**: extend `heartbeat_agent.py` with full service health report
4. **BAC-001**: `actp_browser_agents` registry table + registration
5. **BAC-003**: audit all Safari services — apply Instagram battle-tested patterns
6. **BAC-004**: `packages/linkedin-chrome/` with Playwright headful Chrome
7. **PAP-004**: `actp_prospects` Supabase table
8. **PAP-001**: keyword→creator pipeline via existing Market Research API (3106)
9. **UAF-001**: extend Upwork Safari service with job search action
10. **UAF-002**: job feasibility scorer (Claude Haiku)
11. **UAF-007**: Telegram approval gate with inline keyboard
12. **SHD-001**: `actp_failure_events` table + `emit_failure()` helper

## Do NOT

- Do not modify working services without a clear bug to fix
- Do not change existing API contracts (routes, function signatures)
- Do not remove or weaken existing tests
- Do not deploy to Vercel without testing locally first
- Do not send DMs or post content without Telegram human approval

## When Stuck

- Check `actp-worker/logs/worker.log` for runtime errors
- Read existing executor in `workflow_executors.py` as pattern reference
- Check Safari Automation README for service-specific setup
- Use `curl http://localhost:{port}/health` to verify service is running
