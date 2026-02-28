---
title: Benchmark — Vanilla OpenClaw vs ACTP+ACD
generated: 2026-02-26 21:20 UTC
use_cases: 46
actp_topics: 106
live_routing: no
---

# Vanilla OpenClaw vs ACTP + ACD — Capability Benchmark

> Generated: 2026-02-26 21:20 UTC  
> Scope: 46 use-cases × 8 categories  
> ACTP Registry: 19 services · 106 topics · 14 tools

## Executive Summary

| System | Native | Partial | None | Score |
|--------|--------|---------|------|-------|
| **Vanilla OpenClaw** | 0 | 15 | 31 | 15/92 (16%) |
| **ACTP (full stack)** | 46 | 0 | 0 | 92/92 (100%) |
| **ACD (coding only)** | 8 | 3 | 35 | 16/92 |

**Vanilla gap**: 95/106 topics (89%) have **no vanilla equivalent**.  
ACTP provides **46x more native capabilities** than vanilla OpenClaw.

---

## Capability Matrix

### System Health

| Use-Case | Vanilla OpenClaw | ACTP Route | ACD |
|----------|-----------------|------------|-----|
| **Full health check** | ⚠️ Partial<br>*Conceptual text only; cannot ping endpoints* | ✅ Native<br>`tool:run_health_check` | ❌ None |
| **Heartbeat status** | ⚠️ Partial<br>*Text summary; no real endpoint polling* | ✅ Native<br>`topic:system.heartbeat` | ❌ None |
| **Self-heal service** | ❌ None<br>*Cannot launch processes or manage tmux* | ✅ Native<br>`topic:system.self_heal` | ❌ None |
| **Run test suite** | ⚠️ Partial<br>*Can write shell commands; cannot execute* | ✅ Native<br>`tool:run_tests` | ⚠️ Partial<br>*ACD tracks pass/fail per feature* |
| **Cron schedule** | ❌ None<br>*No cron registry access* | ✅ Native<br>`topic:system.crons` | ❌ None |
| **Pending approvals** | ❌ None<br>*No approval gate concept* | ✅ Native<br>`topic:system.pending_approvals` | ❌ None |
| **Full system status** | ⚠️ Partial<br>*Describes conceptually; no real data* | ✅ Native<br>`topic:system.full_status` | ⚠️ Partial<br>*ACD provides coding pipeline status only* |
| **Restart worker** | ❌ None<br>*Cannot manage processes* | ✅ Native<br>`topic:system.restart_worker` | ❌ None |

### Revenue & Metrics

| Use-Case | Vanilla OpenClaw | ACTP Route | ACD |
|----------|-----------------|------------|-----|
| **Daily revenue** | ❌ None<br>*No RevenueCat/Stripe/Meta Ads API access* | ✅ Native<br>`topic:system.daily_revenue` | ❌ None |
| **RevenueCat overview** | ❌ None<br>*No RevenueCat API* | ✅ Native<br>`topic:dispatch → revcat.overview` | ❌ None |
| **Social metrics** | ❌ None<br>*No platform API access* | ✅ Native<br>`topic:dispatch → social.summary` | ❌ None |

### Content & Publishing

| Use-Case | Vanilla OpenClaw | ACTP Route | ACD |
|----------|-----------------|------------|-----|
| **Generate + queue tweet** | ⚠️ Partial<br>*Can generate text; cannot queue to publisher* | ✅ Native<br>`topic:twitter.generate + publish.content` | ❌ None |
| **Multi-platform publish** | ❌ None<br>*No platform API access* | ✅ Native<br>`topic:publish.multi` | ❌ None |
| **Auto-publish** | ❌ None<br>*No scheduling or platform capability* | ✅ Native<br>`topic:publish.auto` | ❌ None |
| **Blotato queue** | ❌ None<br>*No Blotato API* | ✅ Native<br>`topic:blotato.queue_summary` | ❌ None |
| **Analyze video hook** | ⚠️ Partial<br>*Can analyze text transcript; no video metadata* | ✅ Native<br>`topic:content.analyze_video` | ❌ None |
| **Smart schedule** | ❌ None<br>*No scheduling system* | ✅ Native<br>`topic:mediaposter.smart_schedule` | ❌ None |
| **Twitter metrics + playbook** | ⚠️ Partial<br>*Suggests from training; no live metrics* | ✅ Native<br>`topic:twitter.metrics + twitter.playbook` | ❌ None |

### Research

| Use-Case | Vanilla OpenClaw | ACTP Route | ACD |
|----------|-----------------|------------|-----|
| **Twitter market research** | ⚠️ Partial<br>*Web search fallback; no Safari automation* | ✅ Native<br>`topic:research.twitter` | ❌ None |
| **Keyword research** | ⚠️ Partial<br>*Training-data suggestions; no live volume data* | ✅ Native<br>`topic:research.keyword` | ❌ None |
| **Platform content research** | ❌ None<br>*No platform scraping* | ✅ Native<br>`topic:research.platform` | ❌ None |
| **Web search** | ⚠️ Partial<br>*Has web_search in ACTP tools; not vanilla native* | ✅ Native<br>`tool:web_search` | ❌ None |

### Coding Automation

| Use-Case | Vanilla OpenClaw | ACTP Route | ACD |
|----------|-----------------|------------|-----|
| **Delegate coding task** | ⚠️ Partial<br>*Can write code in context; no persistent harness* | ✅ Native<br>`tool:delegate_coding_task` | ✅ Native<br>*Core ACD: harness + feature tracking + sessions* |
| **Start ACD harness** | ❌ None<br>*Cannot launch ACD harness* | ✅ Native<br>`topic:acd.start_harness` | ✅ Native<br>*POST /api/projects/:id/harness/start* |
| **ACD project status** | ❌ None<br>*No ACD API access* | ✅ Native<br>`tool:acd_project_action` | ✅ Native<br>*GET /api/projects/:id/harness/status* |
| **List all ACD targets** | ❌ None<br>*No ACD database access* | ✅ Native<br>`tool:list_all_acd_targets` | ✅ Native<br>*GET /api/managed-projects* |
| **ACD harness logs** | ❌ None<br>*No log file access* | ✅ Native<br>`topic:acd.harness_logs` | ✅ Native<br>*GET /api/projects/:id/harness/logs* |
| **ACD dashboard stats** | ❌ None<br>*No cost tracking or session audit* | ✅ Native<br>`topic:acd.dashboard_stats` | ✅ Native<br>*GET /api/dashboard/stats* |
| **Ralph loop coding session** | ❌ None<br>*No tmux session management or retry loop* | ✅ Native<br>`tool:coding_session` | ✅ Native<br>*Handled by harness retry logic* |
| **Model switch** | ❌ None<br>*Cannot change own model mid-session* | ✅ Native<br>`tool:self_upgrade` | ❌ None |

### CRM & Outreach

| Use-Case | Vanilla OpenClaw | ACTP Route | ACD |
|----------|-----------------|------------|-----|
| **Send Twitter DM** | ❌ None<br>*No Twitter API or browser automation* | ✅ Native<br>`topic:dm.send` | ❌ None |
| **LinkedIn prospect search** | ❌ None<br>*No LinkedIn API* | ✅ Native<br>`topic:linkedin.prospect` | ❌ None |
| **LinkedIn AI message** | ⚠️ Partial<br>*Can draft message; cannot send it* | ✅ Native<br>`topic:linkedin.ai_message` | ❌ None |
| **Upwork job scan** | ❌ None<br>*No Upwork API* | ✅ Native<br>`topic:upwork.scan` | ❌ None |
| **Upwork proposal** | ⚠️ Partial<br>*Can write proposal; cannot submit* | ✅ Native<br>`topic:upwork.propose` | ❌ None |
| **CRM stats** | ❌ None<br>*No CRM database access* | ✅ Native<br>`topic:crm.stats` | ❌ None |

### Memory & Knowledge

| Use-Case | Vanilla OpenClaw | ACTP Route | ACD |
|----------|-----------------|------------|-----|
| **Write daily note** | ⚠️ Partial<br>*Outputs markdown; no vault schema write* | ✅ Native<br>`topic:memory.write_daily` | ❌ None |
| **Write knowledge graph** | ❌ None<br>*No structured graph schema or Supabase write* | ✅ Native<br>`topic:memory.write_knowledge` | ❌ None |
| **Write lesson learned** | ⚠️ Partial<br>*Outputs text; no persistent storage* | ✅ Native<br>`topic:memory.write_lesson` | ❌ None |
| **Entity graph search** | ❌ None<br>*No entity graph or Supabase access* | ✅ Native<br>`topic:graph.search` | ❌ None |
| **Memory promotion** | ❌ None<br>*No memory tier concept* | ✅ Native<br>`topic:graph.promote` | ❌ None |
| **Read document** | ❌ None<br>*No file system read access* | ✅ Native<br>`tool:read_document` | ❌ None |

### Workflow Automation

| Use-Case | Vanilla OpenClaw | ACTP Route | ACD |
|----------|-----------------|------------|-----|
| **Start workflow** | ❌ None<br>*No workflow DAG engine* | ✅ Native<br>`topic:workflow.start` | ❌ None |
| **Workflow status** | ❌ None<br>*No workflow tracking* | ✅ Native<br>`topic:workflow.status` | ⚠️ Partial<br>*ACD tracks coding tasks only* |
| **Approval gate** | ❌ None<br>*No approval gating* | ✅ Native<br>`topic:system.approval_gate` | ❌ None |
| **Delegate to ACD with approval** | ❌ None<br>*No approval-gated delegation* | ✅ Native<br>`topic:system.delegate_to_acd` | ✅ Native<br>*ACD handles execution after approval* |

---

## ACTP Service × Topic Census

**19 services · 106 topics**

| Service | Topics | Vanilla? |
|---------|--------|----------|
| `blotato` | 5 topics | ❌ None |
| `content` | 2 topics | ⚠️ 1/2 partial |
| `research` | 5 topics | ⚠️ 2/5 partial |
| `feedback` | 4 topics | ❌ None |
| `linkedin` | 8 topics | ⚠️ 1/8 partial |
| `upwork` | 6 topics | ⚠️ 1/6 partial |
| `dm` | 6 topics | ⚠️ 1/6 partial |
| `publish` | 4 topics | ❌ None |
| `comments` | 3 topics | ❌ None |
| `twitter` | 3 topics | ⚠️ 1/3 partial |
| `system` | 17 topics | ⚠️ 2/17 partial |
| `sora` | 2 topics | ❌ None |
| `crm` | 2 topics | ❌ None |
| `mediaposter` | 9 topics | ❌ None |
| `mplite` | 4 topics | ❌ None |
| `workflow` | 3 topics | ❌ None |
| `memory` | 4 topics | ⚠️ 2/4 partial |
| `graph` | 10 topics | ❌ None |
| `acd` | 9 topics | ❌ None |

**95/106 topics (89%) have no vanilla equivalent.**

---

## ACTP Structured Tool Definitions

Vanilla OpenClaw receives **none** of these — must answer from text only.

- `dispatch_actp_topic`
- `delegate_coding_task`
- `acd_project_action`
- `list_all_acd_targets`
- `list_available_topics`
- `platform_action`
- `coding_session`
- `run_health_check`
- `run_tests`
- `self_upgrade`
- `read_document`
- `web_search`
- `fetch_url`
- `list_documents`

---

## Tool Routing Accuracy

*Run with `--live` flag to test actual tool routing accuracy.*

| Prompt | Expected Tool |
|--------|--------------|
| `run a health check` | `run_health_check` |
| `show revenue overview` | `dispatch_actp_topic` |
| `list my ACD coding projects` | `acd_project_action` |
| `check blogcanvas project status` | `acd_project_action` |
| `list all available ACTP service topics` | `list_available_topics` |
| `delegate coding task: add dark mode` | `delegate_coding_task` |
| `start a coding session for refactoring` | `coding_session` |
| `run the test suite` | `run_tests` |
| `switch to opus model` | `self_upgrade` |
| `search the web for Claude pricing` | `web_search` |
| `read the SOUL.md document` | `read_document` |
| `list all ACD build targets` | `list_all_acd_targets` |
| `post to Twitter and Threads today` | `dispatch_actp_topic` |
| `research top AI posts on Twitter` | `dispatch_actp_topic` |
| `show pending approvals` | `dispatch_actp_topic` |
| `hello, good morning` | `(none)` |
| `hi there` | `(none)` |

---

## Conclusions

### Vanilla OpenClaw: What it CAN do
- General Q&A and reasoning from training data
- Draft tweets, emails, proposals as text
- Write code in-context (no persistent harness)
- Basic web search (if explicitly given a browser tool)

### Vanilla OpenClaw: What it CANNOT do
- Call real platform APIs (Twitter, LinkedIn, Upwork, TikTok, Instagram)
- Publish or schedule content autonomously
- Start/stop/monitor ACD coding harnesses
- Read from or write to Supabase schemas
- Manage approval gates or cron schedules
- Check real service health endpoints
- Access memory vault with tier decay schema
- Switch its own model or restart crashed services
- Run workflow DAGs or multi-step automations

### ACTP+ACD Advantages
- **46/46 use-cases natively** (vs 0 vanilla)
- **106 registered service topics** across 19 services
- **14 structured tool definitions** → deterministic routing
- Full Supabase audit trail on every tool call
- Approval gating for destructive/expensive actions
- ACD: session tracking, retry loops, feature pass-rates
- Memory vault: hot/warm/cold tier decay + entity graph
- Self-healing: heartbeat + auto-restart via tmux

### When to Use Vanilla OpenClaw
For ad-hoc Q&A, document drafting, in-context code review where no
external system access is needed.

### When to Use ACTP+ACD
For any autonomous action touching external systems, platforms, databases,
or requiring persistent state / approval tracking.

---
*Generated by `tests/benchmark_openclaw_vs_actp.py` — 2026-02-26 21:20 UTC*