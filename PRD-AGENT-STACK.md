# PRD-008: Interoperable Local-First Agent Stack

## Product Requirements Document

**Author:** Isaiah Dupree (with Cascade AI)
**Status:** In Progress
**Date:** February 23, 2026

---

# Interoperable Local‑First Agent Stack Research on GitHub for ClaudeBot, OpenClaude, MothBot, MoltBot, and OpenClaw

## Executive summary

Across the requested name/variant set, there are three very different "families" of projects on GitHub.

First, the **ClaudeBot** name mostly maps to a classic "chat bot era" Hubot ecosystem (IRC + Hubot scripts/adapters). These repositories can run locally, but they are not interoperable agent platforms for modern market-research/e-commerce workflows; they are primarily messaging adapters and search scripts, last active around 2015–2016.

Second, several **OpenClaude**-labeled repositories are modern local desktop clients or "Cowork-style" desktop assistants. The strongest "enterprise-style integrations" story in this group is **open-claude-cowork**, which explicitly positions itself as a desktop chat app powered by Claude Agent SDK + a tool router with "500+ app integrations" (via Composio).

Third, **MoltBot/OpenClaw** maps to a large "agent platform with hands" ecosystem (gateway UI, plugins/skills, automation). Its maintainers publish unusually detailed security guidance (loopback binding, security audit tooling, file-system hardening flags, Docker hardening, and explicit warnings not to expose the control UI publicly). However, in early 2026, multiple independent security writeups and incident reports highlight **supply-chain/impersonation** campaigns and **malicious installation vectors** (e.g., compromised packages that install OpenClaw). This makes a "best security posture" requirement hard to satisfy unless deployments are tightly sandboxed and treated like privileged infrastructure.

For a composable, local-first, credit-efficient stack oriented to **market research + Shopify + Meta Ads + Obsidian-memory**, the most interoperable approach is to assemble a **tool-bus** around MCP and keep high-risk automation surfaces loopback-only:

- **Primary orchestration UI**: OpenWork (local-first; host mode binds to `127.0.0.1` by default; permissions surfaced).
- **Research engine**: Open Deep Research (local LangGraph server; supports multiple model providers, search tools, and MCP servers; can route some steps to local models via Ollama).
- **Tool aggregation/middleware**: MetaMCP (Docker Compose; aggregates MCP servers; supports env-var based secret handling; tool filtering middleware; can expose remote endpoints with auth).
- **Obsidian vault memory**: one of the Obsidian MCP bridges (notably `obsidian-mcp-plugin` (active) or `obsidian-mcp-server` (explicitly bridges to an Obsidian Local REST API plugin)).
- **Shopify e-commerce**: Shopify's official Storefront MCP endpoint (no auth; per-store endpoint), plus a separate Admin-capable MCP server where needed for back-office actions.
- **Meta Ads**: a dedicated MCP server for the Ads API (token/permissioned).
- **Credit-efficiency routing**: Claude Code Router (routes requests to cheaper/local providers such as Ollama; supports API-key auth and forces `127.0.0.1` binding when API key is not set).

## Landscape and evaluation criteria

Projects were scored qualitatively along the following criteria:

- **Interoperability**: Does it speak MCP or explicitly integrate with MCP servers/tool routers?
- **Local-first execution**: Can it run fully on localhost (even if it calls cloud models/APIs), and does it default-bind to loopback?
- **Obsidian memory compatibility**: Does it directly read/write an Obsidian vault or speak to an Obsidian bridge that manipulates Markdown/frontmatter?
- **E-commerce + Ads**: Shopify storefront/admin actions; Meta Ads insights/actions.
- **Security posture**: Presence of a security policy; explicit hardening guidance; known ecosystem-level risks (typosquatting, compromised dependencies).
- **Credit efficiency**: Support for routing to cheaper models, local models, separation of "summary vs research" models, tool filtering, and minimizing unnecessary tool context.

## GitHub repo inventory and comparison

| Repo | Primary function | Local-run | Obsidian | E-commerce/Ads | Security | License | Last commit | Maturity |
|---|---|---|---|---|---|---|---|---|
| **openwork** (different-ai) | Agent client/orchestrator UI | Yes (loopback default) | Partial (MCP) | Extensible | Explicit loopback | MIT | Feb 6, 2026 | Beta |
| **open_deep_research** (langchain-ai) | Deep research agent (LangGraph) | Yes | Yes via MCP | Via search | Standard OSS | MIT | Feb 8, 2026 | Beta |
| **open-claude-cowork** (ComposioHQ) | Desktop chat + tool router | Yes (Electron) | Not built-in | 500+ integrations | Requires API keys | MIT | Jan 29, 2026 | Beta |
| **open-claude** (tkattkat) | Native macOS Claude client | Yes | No | No | Web login | MIT | Dec 18, 2025 | Beta |
| **claude-code-router** (musistudio) | Model router/proxy | Yes | No | No | API key + loopback | MIT | Unspecified | Beta |
| **OpenClaw core** (openclaw) | Agent platform (gateway, skills) | Yes (loopback) | Partial (Markdown) | Via plugins | Extensive policy + hardening | MIT | Feb 22, 2026 | Prod (high risk) |
| **moltworker** (Cloudflare) | OpenClaw in CF Workers | No (cloud) | No | No | Experimental | Unspecified | Feb 16, 2026 | Experimental |
| **openclaw-studio** (grp06) | Web dashboard for OpenClaw | Partial | No | No | Tailnet recommended | MIT | Feb 21, 2026 | Beta |
| **metamcp** (metatool-ai) | MCP aggregator/gateway | Yes (Docker) | Yes via bridges | Yes via MCP | Env-var secrets | MIT | Feb 8, 2026 | Beta |
| **meta-ads-mcp** (pipeboard-co) | MCP server for Meta Ads | Yes | No | Meta Ads API | Token-based | Unspecified | Feb 22, 2026 | Beta |
| **shopify-mcp** (GeLi2001) | MCP server for Shopify Admin | Yes | No | Shopify Admin | Access token | Unspecified | Aug 22, 2025 | Beta |
| **obsidian-mcp-plugin** (aaronsb) | Obsidian MCP plugin | Yes | Yes | No | Unspecified | Unspecified | Feb 17, 2026 | Beta |
| **obsidian-mcp-server** (cyanheads) | Obsidian MCP bridge | Yes | Yes | No | REST API auth | Apache-2.0 | Jun 21, 2025 | Stable |

## Ranked recommendations

| Rank | Stack | Components | Why |
|---|---|---|---|
| **Top** | Best overall interoperable, local-first | OpenWork + Open Deep Research + MetaMCP + Obsidian MCP + Shopify MCP + Meta Ads MCP + Claude Code Router | Local-first, MCP aggregation, vault memory, multi-provider routing |
| **High** | Fastest SaaS automation | open-claude-cowork + MetaMCP + Obsidian MCP + Shopify/Meta MCP | 500+ integrations via Composio; add MCP for vault + e-commerce |
| **High** | Research-first, minimal UI | Open Deep Research + MetaMCP + Obsidian MCP + Shopify/Meta MCP | Strong for market research; easy to sandbox |
| **Medium** | OpenClaw-based (highest power, highest risk) | OpenClaw + Studio + vault-as-workspace + strict hardening + MetaMCP | Powerful but documented supply-chain risks |

## Architecture for the recommended stack

```
┌──────────────────────────────────────────────────────────────┐
│                    Local Workstation                           │
│                                                               │
│  ┌─────────────┐  ┌──────────────────┐  ┌──────────────┐   │
│  │  OpenWork    │  │ Open Deep        │  │ Claude Code  │   │
│  │  (UI)        │──│ Research         │──│ Router       │   │
│  │  127.0.0.1   │  │ (LangGraph)      │  │ (proxy)      │   │
│  └──────┬───────┘  └────────┬─────────┘  └──────┬───────┘   │
│         │                   │                    │            │
│         ▼                   ▼                    ▼            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              MetaMCP (Docker Compose)                    │  │
│  │         MCP Aggregator + Tool Middleware                 │  │
│  │  ${ENV_VAR} secrets │ tool filtering │ auth             │  │
│  └──┬──────────┬──────────┬──────────┬──────────┬────────┘  │
│     │          │          │          │          │            │
│     ▼          ▼          ▼          ▼          ▼            │
│  ┌──────┐ ┌───────┐ ┌─────────┐ ┌───────┐ ┌──────────┐    │
│  │Obsid.│ │Meta   │ │Shopify  │ │Shopify│ │ACTP      │    │
│  │MCP   │ │Ads MCP│ │Storefront│ │Admin  │ │Service   │    │
│  │Bridge│ │Server │ │MCP      │ │MCP    │ │Registry  │    │
│  └──────┘ └───────┘ └─────────┘ └───────┘ └──────────┘    │
│     │                                          │            │
│     ▼                                          ▼            │
│  ┌──────────┐                    ┌──────────────────────┐   │
│  │ Obsidian │                    │ actp-worker           │   │
│  │ Vault    │                    │ 20 services/121 topics│   │
│  └──────────┘                    └──────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## Security hardening checklist

- [ ] All agent UIs bound to `127.0.0.1` only
- [ ] All secrets in environment variables (never in config files)
- [ ] MetaMCP uses `${ENV_VAR}` references for all tokens
- [ ] Workspace-only file operations enabled where supported
- [ ] No MCP endpoints exposed to public internet
- [ ] Firewall / tailnet if remote access needed
- [ ] Supply-chain: install only from official GitHub repos, verify checksums
- [ ] Treat every SaaS API key as privileged credential
- [ ] Regular dependency audits (`npm audit`, `pip audit`)

## Credit-efficiency checklist

- [ ] Multi-model pipelines: expensive models for final output, cheap/local for intermediate
- [ ] Claude Code Router for dynamic model switching
- [ ] MetaMCP tool filtering to reduce token overhead
- [ ] Local Obsidian vault for memory (no re-summarization)
- [ ] Open Deep Research: separate summarize/research/compress/final models
- [ ] Ollama for low-stakes local model inference
- [ ] Sleep-when-idle for any hosted components

## Integration with ACTP ecosystem

The ACTP Worker's Unified Service Registry (PRD-007) provides **121 cloud-callable topics** across 20 services. These become available to the agent stack via:

1. **HTTP**: `POST /api/services/{service}/{topic}` on the worker's health server
2. **MCP**: A custom ACTP MCP server that wraps the service registry dispatch
3. **Direct**: Python import of `service_registry.dispatch()`

This means the agent stack can call any ACTP capability:
```
Agent → MetaMCP → ACTP MCP Server → service_registry.dispatch("twitter.strategy", {...})
```

## Appendix: Supply-chain risk warnings

- Malwarebytes: post-rename impersonation campaign with typosquat domains
- CSO: compromised npm package silently installs OpenClaw
- Endor Labs / The Hacker News: compromised release with postinstall OpenClaw install
- Official OpenClaw: publishes security advisories (positive transparency, but indicates rapid vulnerability/patch cadence)

**Recommendation**: If using OpenClaw, treat it like privileged infrastructure. Sandbox strictly. Monitor advisories. Prefer the Top-ranked stack (OpenWork + MetaMCP) for lower operational risk.
