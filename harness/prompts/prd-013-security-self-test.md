# PRD-013: Security & Self-Test Hardening

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **PRD**: /docs/prd/PRD-013-SECURITY-SELF-TEST-HARDENING.md
- **Priority**: P1 (HIGH)

## Context

The self-test agent exists with 22 passing tests. Deep research report identified local agent platforms as high-privilege attack surfaces. The self-heal → ACD delegation pipeline needs to work so the system can fix its own bugs.

### What Exists
- `self_test_agent.py` — spin_up, health_checks, run_tests, self_heal, verify_fixes, report
- 22 tests passing in `tests/test_self_test_agent.py`
- `actp_agent_audit_log` table for audit trail
- `actp_agent_health_snapshots` for health data
- WORKER_SECRET auth on POST endpoints
- .env in .gitignore, Dependabot enabled

### What's Missing
- Nightly automated self-test cron
- Self-heal → ACD delegation (exists but untested)
- Approval gates for risky actions (ads, bulk DMs, deploys)
- Rate limiting on public endpoints
- Supply chain scanning (npm audit, pip audit)

## Task

### 1. Nightly Self-Test Cron
Add to `cron_definitions.py`:
```python
{"name": "nightly_self_test", "fn": "trigger_nightly_self_test", "schedule": "0 2 * * *", "enabled": True}
```

Create `trigger_nightly_self_test()` in `workflow_task_poller.py`:
- Run `self_test_agent.run_self_test()`
- Store results in `actp_agent_health_snapshots`
- Send Telegram alert if any failures
- If tests fail, attempt self-heal via ACD

### 2. Self-Heal → ACD Integration
In `self_test_agent.py`, verify `_delegate_to_acd()`:
- Build fix prompt from failing test output
- POST to ACD `/api/harness/start` with fix prompt
- Wait up to 30 minutes for ACD fix
- Re-run failing tests after fix
- Report success/failure via Telegram

### 3. Approval Gates
Create `approval_gate.py`:
```python
async def request_approval(action: str, details: dict, chat_id: int) -> str:
    """Request human approval via Telegram inline keyboard."""
    # Insert into actp_approval_queue
    # Send Telegram message with Approve/Reject buttons
    # Return approval_id

async def check_approval(approval_id: str) -> str:
    """Check approval status: pending, approved, rejected, expired."""
    # Auto-reject after 4 hours (fail-closed)
```

Gate these actions:
- `ads.deploy` — paid ad creation
- `dm.bulk_send` — sending >10 DMs
- `system.deploy_code` — production deployments

### 4. Rate Limiting
Add to `health_server.py`:
- Track request counts per IP per minute
- Return 429 if >60 requests/minute from same IP
- Exempt localhost (127.0.0.1)

### 5. Audit Logging Enhancement
- Verify all tool executions log to `actp_agent_audit_log`
- Add weekly audit summary cron (Sundays 8PM)
- Telegram report: top 10 actions, error count, unique actors

## Supabase Tables

```sql
CREATE TABLE IF NOT EXISTS actp_approval_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  requested_by text NOT NULL,
  status text DEFAULT 'pending',  -- pending, approved, rejected, expired
  decided_by text,
  decided_at timestamptz,
  expires_at timestamptz DEFAULT now() + interval '4 hours',
  created_at timestamptz DEFAULT now()
);
```

## Testing
```bash
python3 -m pytest tests/test_self_test_agent.py -v
python3 -m pytest tests/ -v  # Full suite, verify no regressions
```

## CRITICAL: Feature Tracking

After completing each task, update `prd-013-features.json` in the project root.
Set `"passes": true` for each completed feature:

```bash
python3 -c "
import json
with open('prd-013-features.json') as f: data = json.load(f)
for feat in data['features']:
    if feat['id'] == 'SEC-001': feat['passes'] = True
with open('prd-013-features.json', 'w') as f: json.dump(data, f, indent=2)
"
```

Do this for EVERY feature you complete. The harness tracks progress via this file.

## Git Workflow

After each meaningful change, commit:
```bash
git add -A && git commit -m "feat(prd-013): <description>"
```

## Constraints
- Fail-closed on approvals: no response = reject
- Never auto-approve risky actions
- All local services MUST bind to 127.0.0.1
- Do NOT break existing 308+ tests
