# PRD-009: Robust OpenClaw Safari Browser + DM Automation

**Status:** In Implementation  
**Author:** Isaiah Dupree  
**Date:** 2026-02-26  
**Priority:** P0 — Core bot reliability

---

## 1. Problem Statement

The OpenClaw bot (ACTP Worker's Telegram AI engine) needs to consistently and robustly perform two classes of operation:

1. **Safari browser control** — navigating, executing JS, taking screenshots, reading page state
2. **DM automation** — sending DMs on Instagram, Twitter, TikTok via Safari automation services

### Current Failure Modes (pre-PRD)

| Failure | Root Cause | Impact |
|---------|-----------|--------|
| DM sends fail with "session not active" | No pre-flight session guarantee before dispatch | 100% DM failure when tab drifted |
| Wrong platform/username extracted | Claude omits params from tool call | DM sent to wrong person or not at all |
| Double DM send | Tool loop continues after success | User gets spammed |
| Session drifts silently | Safari tab navigated away between operations | Next op lands in wrong context |
| Only Instagram DM works | Twitter/TikTok services not running | 66% of platforms unavailable |
| No visibility into failures | No telemetry or structured error logging | Debugging blind |
| Single point of failure | HTTP service down → entire automation dead | Zero resilience |

---

## 2. Benchmark Findings

**5 systems tested, 7 actions × 3 runs each (105 test cases):**

| Rank | System | Success | Avg Latency | Best For |
|------|--------|---------|-------------|----------|
| 🥇 | steipete/macos-automator-mcp | 100% | 264ms | navigate, session_recovery |
| 🥈 | lxman/safari-mcp-server | 100% | 574ms | console logs, network, screenshots |
| 🥉 | ACTP/instagram-dm | 100% | 951ms | execute_js (130ms), get_tabs (1ms) |
| 4 | peakmojo/applescript-mcp | 71% | 247ms | raw error messages |
| 5 | joshrutkowski/applescript-mcp | 14% | 129ms | fast, but no Safari tools |

### Key Architectural Insight

No single system wins everything. The optimal approach is **layered**:
- **steipete** for navigation and session recovery (best AppleScript knowledge base)
- **lxman** for Safari inspection (network logs, console, JS execution with WebDriver)
- **ACTP** for cached-state operations (get_tabs 1ms, execute_js 130ms when session is warm)
- **peakmojo** as an escape hatch for raw AppleScript when all else fails

---

## 3. Architecture

### 3.1 Session Guarantee Layer (3-Tier Self-Healing)

```
Every Safari operation →
  Tier 1: HTTP POST /api/session/ensure (fast, ~1.4s)
    → verifies URL match, activates tracked tab
  Tier 2: MCP steipete AppleScript (if HTTP fails)
    → activates Safari, finds instagram.com tab, navigates if missing
  Tier 3: direct osascript subprocess (nuclear last resort)
    → always available, pure macOS
```

**Implemented in:** `actp-worker/safari_session_manager.py`

### 3.2 DM Send Fallback Chain (3-Strategy)

```
dm.send(platform, username, text) →
  Strategy 1: sendDMFromProfile (navigate to profile → click Message btn)  [most reliable]
  Strategy 2: openConversation (search inbox for existing thread)
  Strategy 3: startNewConversation (compose dialog → search → chat)
```

**Implemented in:** `Safari Automation/packages/instagram-dm/src/api/server.ts`

### 3.3 Pre-Flight Session Guard (automatic, transparent)

```
_execute_tool("dispatch_actp_topic", {topic: "dm.send", ...})
  → Pass 1: merge top-level DM keys (if Claude puts them outside params{})
  → Pass 2: NL extraction fallback (if platform/username/text missing)
  → Pass 3: ensure_safari_session(platform)   ← NEW pre-flight
  → dispatch(topic, params)
```

**Implemented in:** `actp-worker/telegram_ai_engine.py::_execute_tool()`

### 3.4 Tool Loop Early Exit (prevents double-send)

```
_chat_inner_openai() tool loop:
  After each tool result:
    if "DM sent successfully" in result and ok=true:
      break loop immediately
      reply: "Done! I sent your message to X on Y."
```

### 3.5 Telemetry Layer (NEW — to be implemented)

```
Every session event → actp_safari_sessions table in Supabase:
  - session_id, platform, method_used, ok, latency_ms, url, error
  - daily aggregates: success_rate, avg_latency, failure_reasons

Every DM send → actp_dm_sends table:
  - dm_id, platform, username, strategy_used, ok, latency_ms, error
  - enables: daily stats, per-user rate limiting, duplicate detection
```

### 3.6 DM Queue + Rate Limit Guard (NEW — to be implemented)

```
Before dm.send:
  1. Check actp_dm_sends for duplicate (same username+platform in last 24h)
  2. Check platform rate limits (instagram: 50/day, twitter: 20/day, tiktok: 30/day)
  3. If within limits: send, log to actp_dm_sends
  4. If over limit: queue for next available slot, return "queued" status
```

### 3.7 platform_action Pre-Flight (NEW — to be implemented)

Currently only `dm.*` operations have session guarantee. Extend to:
- `platform_action.*` (research, posting, checkbacks)
- `safari.*` direct calls

---

## 4. Implementation Plan

### Phase 1 — Core Session Reliability ✅ DONE
- [x] `safari_session_manager.py` — 3-tier self-healing
- [x] `safari.*` topics in service_registry.py
- [x] Pre-flight guard in `_execute_tool` for `dm.*`
- [x] 3-strategy DM send in instagram-dm server.ts
- [x] Early exit in `_chat_inner_openai` on DM success
- [x] Enriched `dispatch_actp_topic` tool descriptions

### Phase 2 — Completeness (this PRD's implementation scope)
- [ ] DM queue + rate limit guard in `safari_session_manager.py`
- [ ] platform_action pre-flight (extend session guard beyond dm.*)
- [ ] Session + DM telemetry in Supabase (actp_safari_sessions, actp_dm_sends)
- [ ] Twitter DM service (port 3003) — same pattern as instagram-dm
- [ ] TikTok DM service (port 3002) — same pattern

### Phase 3 — Advanced Resilience (future)
- [ ] lxman integration for network log inspection on failures
- [ ] Automatic screenshot-on-failure stored to Supabase
- [ ] Cross-session tab health monitoring (background job)
- [ ] DM campaign scheduling (send X DMs per day automatically)

---

## 5. ACTP Service Topics (after Phase 2)

```
safari.*
  safari.ensure_session   params: {platform}
  safari.health           params: {platform: "all"|"instagram"|"twitter"|"tiktok"}
  safari.execute_js       params: {platform, script}
  safari.navigate         params: {platform, url}
  safari.inbox            params: {platform}

dm.*
  dm.send                 params: {platform, username, text}   ← auto-session + rate-limit
  dm.ai_generate          params: {platform, username, context}
  dm.health               params: {}
  dm.stats                params: {platform?, days?}           ← NEW
  dm.queue                params: {platform, username, text}   ← NEW (queues if rate-limited)
```

---

## 6. Success Metrics

| Metric | Baseline | Target |
|--------|---------|--------|
| DM send success rate | ~60% (session failures) | >95% |
| Double-send rate | ~100% (every run) | 0% |
| Session recovery time | N/A (would just fail) | <5s |
| Platform coverage | 1/3 (Instagram only) | 3/3 |
| Mean time to DM send | ~35s | <25s |
| Error visibility | 0% (no telemetry) | 100% (Supabase logs) |

---

## 7. Files Changed / Created

### New files
- `actp-worker/safari_session_manager.py` — unified session layer
- `supabase/migrations/YYYYMMDD_safari_dm_telemetry.sql` — new tables

### Modified files
- `actp-worker/service_registry.py` — safari.* topics added
- `actp-worker/telegram_ai_engine.py` — pre-flight guard, early exit, enriched tool desc
- `Safari Automation/packages/instagram-dm/src/api/server.ts` — 3-strategy send-to
- `Safari Automation/packages/instagram-dm/src/automation/safari-driver.ts` — self-healing session

### MCP servers installed
- `/Users/isaiahdupree/Documents/Software/mcp-servers/` (all 4 servers)
- Claude Desktop + Windsurf MCP configs updated
