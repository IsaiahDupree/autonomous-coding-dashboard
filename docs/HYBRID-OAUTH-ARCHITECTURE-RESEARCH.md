# Hybrid OAuth Outer + API Key Inner — Community Research
*Scanned: Feb 26, 2026*

## Policy Reality Check

Anthropic's position is **unambiguous** as of mid-Feb 2026:
- OAuth/subscription tokens from Pro/Max are **only** for official Claude Code, Desktop, and claude.ai
- Third-party harnesses, Agent SDK wrappers, and custom orchestrators are **prohibited**
- Legal page updated mid-Feb 2026; takedown-style requests sent (e.g. to OpenCode)
- Account bans and sudden lockouts are **confirmed real** for heavy users

---

## What People Are Actually Shipping (Feb 26 2026)

### Pattern
```
Outer layer  → OAuth/subscription token  (lightweight: routing, persistence, memory, 24/7 loop)
Inner layer  → pure Anthropic API key    (heavy: native tool_use, 200k context, prompt caching)
```

---

### 1. Formic — Most Popular "Safe" Outer Wrapper
- **GitHub**: rickywo/Formic
- **Core idea**: Spawns and wraps the **official `claude` CLI binary** (the one that uses `claude auth login` OAuth token). You talk to Formic via Telegram/LINE/Discord/web; it pipes prompts to a real `claude` process.
- **v0.6** (~Feb 20): added native messaging bridges, "text your codebase" features
- **Hybrid extension pattern**: Formic as outer → when real tool calling needed, forwards full prompt + custom tool schema to a small inner FastAPI/Python service running the official Anthropic SDK with a real `sk-ant-` key
- **Ban risk**: **Lowest so far** — community says "Anthropic can't detect this easily" since you're running their own binary
- **Architecture fit**: Maps directly to our `_agent2_claude_oauth_hybrid` Phase 1 (outer) design

---

### 2. claude-code-by-agents (baryhuang) — Desktop Multi-Agent Orchestrator
- **GitHub**: baryhuang/claude-code-by-agents (~774 stars, forked from older web UI, now Electron + Deno backend)
- **Auth**: `claude auth login` → OAuth only, no API key needed
- **Orchestration**: "leader" agent acts as router; @mention specialized agents (local or remote). File-based coordination, task decomposition, dependency tracking. Beautiful live web UI.
- **Hybrid in the wild**: Desktop orchestrator on OAuth → certain "tool-heavy" agents proxy their reasoning turns to a separate container running API-key mode + full native tool_use (prompt caching, 1M context)
- **Ban risk**: Medium — desktop wrapping is harder to detect than direct SDK injection

---

### 3. Companion / claude-code-controller (Stan Girard, The-Vibe-Company)
- **GitHub**: The-Vibe-Company/claude-code-controller + companion
- Stan reverse-engineered Claude Code's internal filesystem/protocol (same one used for Agent Teams/swarms)
- Clean TypeScript REST API to spawn, monitor, and orchestrate Claude Code agents programmatically — all on subscription OAuth
- **Why built**: Burning $200/day on pure API; wanted to keep using Max "for free"
- **Hybrid pattern**: This as outer → delegate specific tool-calling loops to parallel inner service on API keys
- **Ban risk**: High — reverse-engineered protocol, could get DMCA'd like earlier projects

---

### 4. Other Active Hybrids
| Project | Key Feature | Risk |
|---|---|---|
| `mohsen1/claude-code-orchestrator` | `authMode: "oauth"` with fallback to API keys if rate-limited; long-horizon multi-instance | Medium |
| `weidwonder/claude_agent_sdk_oauth_demo` | Injects OAuth token into official Agent SDK; works for light personal use | High |
| n8n + Claude Desktop/Commander | n8n = secure outer orchestrator with guardrails; Claude Desktop = "brain" on OAuth; heavy tool calls → API-key MCP | Low-Medium |

---

## Recommended Full Stack (Community Consensus)

```
Telegram / WhatsApp / Cron
         ↓
Outer Orchestrator
(Formic / claude-code-by-agents / Companion / n8n)
         ↓  only when real tools or deep reasoning needed
Redis / local socket / HTTP queue
         ↓
Inner Tool Core
(tiny FastAPI/Python: Anthropic SDK + real sk-ant- API key)
→ full native tool_use + tool_result + 200k/1M context + prompt caching
         ↓
Docker sandbox / MCP / skills execution
         ↑  loop results back to outer
```

Outer stays cheap/chatty on subscription quota.
Inner only burns API dollars on expensive native tool-calling turns.

---

## Risk Matrix

| Approach | Detection Risk | Account Risk | Notes |
|---|---|---|---|
| CLI-wrapper (Formic, tmux + claude binary) | Low | Low | Running their own binary; most "safe" |
| Direct OAuth injection into SDK | High | High | Accounts confirmed banned |
| Reverse-engineered protocol (Companion) | Medium | Medium | Works great; DMCA risk |
| Heavy 24/7 usage (any method) | High | Medium-High | Still triggers rate-limits/flags |

---

## What Most People Landed On

People who tried pure hybrid in January 2026 mostly simplified to either:
- **Full API-key** OpenClaw + Lobster (clean, compliant, predictable cost)
- **n8n + official Claude Desktop** (safest "unlimited" feel, no code needed)

---

## Our Implementation

See `actp-worker/hybrid_tool_core.py` — inner tool core microservice (port 9191).  
See `actp-worker/dual_agent.py` → `_agent2_claude_oauth_hybrid` engine.  
Enable with: `AGENT2_ENGINE=claude_oauth_hybrid`

Outer (OpenClaw/OAuth) → routing decision → Inner (API key, port 9191) → native tool_use loop.
