# PRD: Self-Healing System — Claude Code SDK + Docker Skill
## Autonomous Code Repair for Long-Horizon Tasks

**Status:** Draft  
**Date:** 2026-03-05  
**Source:** Founder voice memo — autonomous system vision  
**Scope:** When any agent/service/workflow fails, Claude Code SDK + Docker auto-diagnoses and fixes it

---

## 1. Problem Statement

As the autonomous system scales, code will fail. Browser agents break when platforms update their DOM. Services crash on dependency changes. Workers encounter edge cases not handled. We need a system that:

- Detects failures automatically (crash logs, health check failures, exit codes)
- Uses Claude Code SDK to diagnose the root cause
- Writes a fix using the GitHub repo as scaffolding for long-horizon coding tasks
- Tests the fix inside a Docker sandbox before deploying
- Self-deploys if tests pass; escalates to Telegram if not
- Never requires manual intervention for known failure categories

This is the "immune system" of the autonomous stack.

---

## 2. Existing Infrastructure to Build On

| Component | Location | Status |
|-----------|----------|--------|
| claude_launcher.py | actp-worker/ | ✅ Spawns Claude CLI sessions |
| SelfHealingLoop (L1-L4) | agent_swarm.py | ✅ 4-tier watchdog |
| agent_swarm coding role | actp-worker/ | ✅ Sonnet/Claude Code engine |
| Telegram escalation | telegram_bot.py | ✅ Working |
| Docker | /usr/local/bin/docker | ✅ Available |
| GitHub scaffolding | Multiple repos | ✅ Push/PR pattern exists |
| HEARTBEAT.md | ~/.openclaw/agents/ | ✅ Per-agent health files |

---

## 3. Features

### SHD-001 — Failure Detection Bus

Centralized failure event stream. Any component can emit a failure event:

```python
await emit_failure({
    "component": "safari_instagram",
    "error_type": "dom_selector_failed",
    "error_message": "Cannot find element: [data-testid='follow-button']",
    "traceback": "...",
    "context": { "action": "extract_followers", "url": "..." },
    "severity": "high"  # low | medium | high | critical
})
```

- Stored in Supabase `actp_failure_events` table
- Also written to local `~/.openclaw/failures/` directory
- Deduplicated: same component+error_type within 1h = single event with count++

### SHD-002 — Failure Classifier

Claude Haiku classifies each new failure event:

**Categories:**
- `dom_change` — platform changed UI (fix: update selectors)
- `rate_limit` — platform throttling (fix: add delay/backoff, no code change)
- `import_error` — missing Python/Node dependency (fix: pip/npm install)
- `api_breaking_change` — external API changed signature (fix: update client)
- `logic_bug` — edge case in our code (fix: Claude Code repair)
- `infra_failure` — port unavailable, DB down, disk full (fix: restart/provision)
- `config_missing` — env var not set (fix: document + Telegram alert)

Classification stored in failure event. Only `dom_change`, `import_error`, `api_breaking_change`, `logic_bug` proceed to auto-repair.

### SHD-003 — Claude Code Repair Agent

For auto-repairable failures:

1. **Gather context:**
   - Read failing file from GitHub (fresh copy)
   - Read error traceback
   - Read last 50 lines of service log
   - Read any related test files

2. **Spawn repair session** (claude_launcher.py, role=coding):
   ```
   Goal: Fix the following error in {file_path}:
   
   Error: {error_message}
   Traceback: {traceback}
   Context: {context}
   
   Rules:
   - Fix the minimal code needed
   - Do not change function signatures or APIs
   - Add a comment explaining the fix
   - If fix requires a new selector, add 3 fallback selectors
   - Run existing tests after fix
   ```

3. Agent writes fix to local file
4. Agent runs test suite (if exists): `npm test` or `pytest`
5. Returns: `{ fixed: bool, files_changed: [], test_result: pass|fail, explanation: str }`

### SHD-004 — Docker Sandbox Testing

Before deploying any fix:

1. Build Docker container from `Dockerfile.node` or `Dockerfile.python` in actp-worker
2. Copy fixed files into container
3. Run tests inside container: `docker run --rm actp-test pytest tests/` or `npm test`
4. Container is throwaway — no side effects
5. Only if `exit_code == 0` → proceed to deploy

Docker images pre-built daily so sandbox spins up in <30s.

### SHD-005 — Auto-Deploy Fixed Code

On successful sandbox test:

1. **For Node.js services (Safari Automation packages):**
   ```bash
   cd {service_dir}
   # Apply fix (already written by SHD-003)
   npm install  # in case new deps
   pm2 restart {service_name}  # or kill + restart
   ```

2. **For Python services (actp-worker):**
   ```bash
   cd /actp-worker
   # Apply fix
   .venv/bin/pip install -r requirements.txt  # in case new deps
   # Worker auto-reloads via watchdog, or restart via launchd
   ```

3. **Verify:** Health check endpoint returns 200 within 60s post-deploy
4. **Commit fix to GitHub:**
   ```bash
   git add {changed_files}
   git commit -m "self-heal: fix {error_type} in {component} [auto]"
   git push origin main
   ```

### SHD-006 — Escalation Protocol

When auto-repair fails or severity=critical:

**Tier 1 (retry):** Wait 60s, retry same action  
**Tier 2 (soft restart):** Restart the failing service process  
**Tier 3 (repair attempt):** SHD-003 + SHD-004  
**Tier 4 (human escalation):**  

Telegram message:
```
🚨 Self-Heal Failed — Human Needed

Component: {component}
Error: {error_message}
Repair attempts: {count}

Claude Code tried {N} fixes — all failed sandbox tests.

Last fix attempt:
{explanation}

GitHub PR: {pr_url}

[✅ Apply Anyway] [🔍 Review PR] [⏸ Pause Component]
```

### SHD-007 — Long-Horizon Coding via GitHub Scaffolding

For complex fixes requiring multi-file changes or new feature work:

1. Create GitHub branch: `self-heal/{timestamp}-{component}`
2. Claude Code agent works in that branch with full context:
   - All repo files available
   - Can read/write multiple files
   - Runs iterative build+test cycle
   - Max 20 turns before escalation
3. When done: open GitHub PR (auto-generated description from Claude)
4. Telegram: "PR ready for review: {pr_url}"
5. Human approves PR → GitHub Actions runs CI → auto-merge

### SHD-008 — Skill Library (Reusable Fix Patterns)

After each successful auto-fix, store the pattern:

```json
{
  "error_pattern": "Cannot find element matching selector",
  "component_type": "safari_browser_agent",
  "fix_strategy": "Add 3 fallback selectors using data-testid, aria-label, and text content",
  "example_fix": "...",
  "success_rate": 0.87
}
```

Stored in `actp_heal_patterns`. Future repair agents load relevant patterns as few-shot examples.

### SHD-009 — Self-Healing Dashboard

Add to autonomous.html:
- Live failure event feed (SSE from port 3201)
- Per-component health status grid
- Auto-repair success rate (last 7 days)
- Open incidents + escalations pending

---

## 4. Implementation Order

1. SHD-001: Failure Detection Bus + Supabase table
2. SHD-002: Failure Classifier (Haiku)
3. SHD-003: Claude Code Repair Agent
4. SHD-004: Docker Sandbox Testing
5. SHD-005: Auto-Deploy
6. SHD-006: Escalation Protocol (extend existing Telegram bot)
7. SHD-007: GitHub branch workflow for complex fixes
8. SHD-008: Skill library
9. SHD-009: Dashboard additions

---

## 5. Key Files to Create/Modify

```
actp-worker/
  self_healer.py             # NEW — orchestrates SHD-001 through SHD-006
  failure_classifier.py      # NEW — Haiku-based failure classification
  repair_agent.py            # NEW — wraps claude_launcher for code repair
  docker_sandbox.py          # NEW — Docker test runner
  heal_patterns.py           # NEW — skill library R/W

Dockerfile.test              # NEW — lightweight test image (node + python)
docker-compose.test.yml      # NEW — test sandbox compose

supabase/migrations/
  YYYYMMDD_failures.sql      # NEW — actp_failure_events, actp_heal_patterns
```

---

## 6. Acceptance Criteria

- [ ] Any service that crashes emits a failure event to `actp_failure_events` within 30s
- [ ] `dom_change` failures on Safari agents are auto-repaired within 10 min (95% of cases)
- [ ] `import_error` failures are auto-repaired (pip/npm install + restart) within 2 min
- [ ] Docker sandbox rejects broken fixes (bad test suite → no deploy)
- [ ] All auto-fixes commit to GitHub with `self-heal:` prefix in commit message
- [ ] Critical failures send Telegram alert within 60s
- [ ] Repair success rate ≥ 80% for dom_change + import_error categories
