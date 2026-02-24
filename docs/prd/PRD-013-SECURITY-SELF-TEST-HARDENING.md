# PRD-013: Security & Self-Test Hardening

## Priority: P1 (HIGH — prevents regressions, ensures safe automation)
## Target: actp-worker
## Status: PLANNED

---

## Problem Statement

The ACTP ecosystem runs 20+ services with 121 topics, 33 crons, and handles API keys for Meta, Stripe, RevenueCat, YouTube, Twitter, Instagram, and TikTok. The deep research report (deep-research-report-2.md) identified that **local agent platforms have a high-privilege attack surface** combining localhost endpoints, filesystem access, tool execution, and long-lived API tokens.

Additionally, the self-test agent exists but has **unreliable test mocking** (subprocess.Popen vs .run mismatch fixed in this session) and the self-heal pipeline doesn't yet effectively delegate code fixes to ACD.

### Key Findings from Deep Research Report
- CVE-2026-25253: authentication token exfiltration via crafted gatewayUrl
- Supply-chain pressure: typosquat domains, unauthorized npm publishes
- Most MCP repos have **no SECURITY.md and no published advisories**
- Agents are "local mini control planes" — if compromised, full local access

## Requirements

### R1: Self-Test Pipeline Reliability (MUST HAVE)
- All 22 self_test_agent tests passing (DONE — fixed this session)
- Self-test runs automatically on worker startup
- Self-test runs nightly at 2AM via cron
- Results stored in `actp_agent_health_snapshots`
- Telegram alert if any service down or tests failing

### R2: Self-Heal → ACD Delegation (MUST HAVE)
- When tests fail, self_test_agent builds a fix prompt
- Delegates to ACD via `POST /api/harness/start`
- ACD coding agent attempts to fix the failing tests
- Re-runs tests after ACD fix
- Reports success/failure via Telegram

### R3: API Key Security Audit (MUST HAVE)
- All API keys stored ONLY in .env (never in code)
- .env in .gitignore (verified)
- Rotate keys on any suspected compromise
- WORKER_SECRET required on all POST endpoints
- Rate limiting on all public endpoints (max 60 req/min)

### R4: Approval Gates for Risky Actions (MUST HAVE)
- Paid ad deployment → requires human approval via Telegram
- Bulk DM sending (>10 messages) → requires approval
- Code deployment to production → requires approval
- Large Stripe charges (>$100) → requires approval
- Approval queue in `actp_approval_queue` table
- Auto-reject if no approval within 4 hours (fail-closed)

### R5: Supply Chain Protection (SHOULD HAVE)
- Dependabot enabled on all GitHub repos
- CodeQL scanning on actp-worker and ACD repos
- npm audit on all Node.js services
- pip audit on Python services
- Weekly dependency review cron

### R6: Localhost Security (SHOULD HAVE)
- All local services bind to 127.0.0.1 only (not 0.0.0.0)
- Health server: verify WORKER_SECRET on sensitive endpoints
- Safari Automation: verify auth on all command endpoints
- No secrets in CLI arguments (use env vars or stdin)

### R7: Audit Logging (MUST HAVE)
- All tool executions logged in `actp_agent_audit_log`
- All webhook events logged
- All approval decisions logged with actor + timestamp
- 90-day retention policy
- Weekly audit summary via Telegram

## Implementation Plan

### Phase 1: Self-Test Hardening (Week 1)
1. Add nightly self-test cron at 2AM
2. Store results in Supabase snapshots
3. Telegram alert on failures
4. Verify all 22 tests pass consistently

### Phase 2: ACD Self-Heal Integration (Week 1)
1. Test `self_heal()` → `_delegate_to_acd()` flow
2. Verify ACD receives fix prompt and starts coding session
3. Verify re-test after ACD fix
4. Add timeout: 30min max for ACD fix attempt

### Phase 3: Approval Gates (Week 2)
1. Create `actp_approval_queue` Supabase table
2. Implement `system.approval_gate` topic
3. Telegram inline keyboard for approve/reject
4. Auto-reject after 4 hours
5. Wire into: ad deployment, bulk DMs, code deployment

### Phase 4: Security Audit (Week 2)
1. Scan all repos for hardcoded secrets
2. Verify .gitignore coverage
3. Enable Dependabot + CodeQL on remaining repos
4. Document all API keys and their scopes
5. Bind all local services to 127.0.0.1

## Success Criteria

| Metric | Target |
|--------|--------|
| Self-test pass rate | 100% (22/22 tests) |
| Nightly self-test running | ✅ |
| ACD self-heal delegation works | ✅ |
| All API keys in .env only | ✅ |
| Approval gates active | ≥3 risky actions gated |
| Audit logging coverage | 100% of tool executions |
| Dependabot enabled | All repos |

## Files to Modify

- `actp-worker/self_test_agent.py` — hardened mocking, ACD delegation
- `actp-worker/cron_definitions.py` — nightly self-test cron
- `actp-worker/health_server.py` — rate limiting, localhost binding
- `actp-worker/service_registry.py` — system.approval_gate topic
- `actp-worker/telegram_bot.py` — approval inline keyboards
- `.github/workflows/` — CodeQL, dependency review
