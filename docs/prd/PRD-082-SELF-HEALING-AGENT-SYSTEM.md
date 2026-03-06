# PRD-082: Self-Healing Agent System (Overstory + Claude Code SDK)
**Priority:** P1 | **Owner:** ACD Agent | **Ref:** https://github.com/jayminwest/overstory

## Goal
The system fixes itself when code breaks, agents get stuck, or services go down — without human intervention. Uses Overstory's multi-agent git worktree orchestration + Claude Code SDK to perform long-horizon coding tasks 24/7.

## Overstory Integration
**Install:** `bun install -g @os-eco/overstory-cli`
**Init in ACD repo:** `cd autonomous-coding-dashboard && ov init && ov hooks install`

Overstory provides:
- `ov coordinator start` — starts the orchestrator agent that assigns tasks to workers
- Git worktrees — each agent gets isolated branch, no conflicts
- SQLite mail system — agents communicate without file collisions
- 4-tier merge queue — auto-merges completed work back to main
- Watchdog with AI triage — detects stuck/failing agents, reassigns work

## Healing Layers (already have layer 1–2, adding 3–4)

### Layer 1: Doctor Daemon (EXISTS — `harness/doctor-daemon.js`)
- Polls every 5min for stuck agents (no output >15min)
- Uses Claude tool-use loop to diagnose + suggest fix
- MAX_HEALS_PER_HOUR=3 circuit breaker

### Layer 2: Watchdog Queue (EXISTS — `harness/watchdog-queue.sh`)
- Restarts crashed daemons

### Layer 3: Code Fixer Agent (NEW)
- Triggered by doctor-daemon when diagnosis = "code_bug"
- Spawns Overstory worker agent in a git worktree
- Worker reads failing agent's logs, edits the code, runs tests, merges fix
- Claude Code SDK: uses `claude --sdk` to run code fix session

### Layer 4: Service Restarter (NEW)
- Monitors all ports (3100, 3003, 3102, 3105, 3005, 3006, 3007, 3004, 3106, 8090)
- If service down >2min: attempt restart via existing watchdog-safari.sh
- If restart fails 3x: trigger Layer 3 code fixer

## Files to Create
- `harness/overstory-bridge.js` — connects doctor-daemon decisions to Overstory worker spawning
- `harness/code-fixer-agent.js` — Claude Code SDK session that reads logs + fixes code
- `harness/service-monitor.js` — all-services health monitor + auto-restart
- `harness/launch-self-healing.sh` — starts all healing layers
- `harness/prompts/code-fixer.md` — Claude Code prompt for fixing broken agents

## Code Fixer Agent Prompt Template
```
You are a code fixing agent. A daemon has failed with this error:
{error_log}

The failing file is: {file_path}
Recent git log: {git_log}

Your job:
1. Read the failing file
2. Identify the root cause
3. Fix the code
4. Run: node --check {file_path}
5. Run the test file if one exists
6. Commit with message: "fix: auto-heal {daemon_name} — {one_line_description}"
7. Report: { fixed: true/false, changes: "description", confidence: 0-10 }
```

## Overstory Workflow
```
Doctor detects stuck agent
  → overstory-bridge.js: ov worker spawn --role builder --task "fix {file}"
  → Worker picks up task from SQLite mail
  → Worker: reads logs, edits file, runs tests
  → Worker: ov mail send orchestrator "done: {result}"
  → Orchestrator: ov merge queue add {worktree}
  → 4-tier merge: auto-merge to main
  → Doctor marks agent as healed
```

## Success Metrics
- Mean time to recovery <10min for code bugs
- Zero manual restarts needed for service crashes
- Doctor heal success rate >80%
- Overstory successfully merges fix PRs within 15min

## Dependencies
- bun (for Overstory)
- tmux (for Overstory worker sessions)
- ANTHROPIC_API_KEY (for Claude Code SDK + doctor)
- Git configured (for worktrees)
