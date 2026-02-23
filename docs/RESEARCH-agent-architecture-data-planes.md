# Research: AI Agent Architecture, Data Planes & Obsidian Memory

> Generated: 2026-02-22 | Source: YouTube nSBKCZQkmYw (Nat Eliason / Peter Yang), GitHub research, OpenClaw docs

---

## 1. Video Summary: "How to Build an OpenClaw Business That Makes $4,000/Week"

**Source**: https://www.youtube.com/watch?v=nSBKCZQkmYw (Nat Eliason + Peter Yang, 35 min)

Nat Eliason gave his OpenClaw bot "Felix" $1,000 and it earned $14,718 in 3 weeks by autonomously launching a website, info product, and X/Twitter account.

### Key Timestamps & Topics

| Time | Topic |
|------|-------|
| 00:00 | Meet Felix: The OpenClaw bot building its own business |
| 03:49 | "I'm going to sleep. Build a product that makes money." |
| 08:03 | Multiple OpenClaw chats to build 5 projects at once |
| 11:06 | How Felix ignores prompt injections on X/Twitter |
| 14:42 | Felix ended up with $100K+ in crypto |
| **17:24** | **The 3-layer memory system that makes it all work** |
| **22:14** | **Heartbeat, cron jobs, and delegating to Codex** |
| 26:41 | Ask this question to make your bot more capable |
| 32:14 | Recap: how to set up your own bot |

### The 3-Layer Memory System (Core Architecture)

This is the **single biggest unlock** according to Nat: "Get the memory structure in first because then your conversations from day one will be useful."

**Layer 1: Knowledge Graph** (`~/life/` folder, PARA system)
- Projects, Areas, Resources, Archives
- Stores durable facts about people and projects
- Summary files for quick lookups
- Persistent, rarely changes

**Layer 2: Daily Notes** (dated markdown files)
- One file per day logging what happened
- Bot writes during conversations
- Nightly consolidation extracts important facts → Layer 1
- Rolling window, older notes archived

**Layer 3: Tacit Knowledge** (about the owner)
- Communication preferences
- Workflow habits
- Hard rules ("never do X")
- Lessons learned from past mistakes
- What makes the bot feel like it "knows you"

### Heartbeat vs Cron Jobs

**Heartbeat** (periodic awareness):
- Single heartbeat batches multiple checks (inbox, calendar, notifications, project status)
- Runs in main session with full context
- Smart suppression: returns `HEARTBEAT_OK` if nothing needs attention
- Config: `every: "30m"`, `activeHours: { start: "08:00", end: "22:00" }`
- **HEARTBEAT.md checklist**: Check email, review calendar, summarize background tasks, send check-in if idle 8+ hours

**Cron Jobs** (precise scheduling):
- Exact timing: "Send at 9:00 AM every Monday"
- Standalone tasks, session isolation
- Model overrides per job (cheaper model for routine, opus for analysis)
- One-shot reminders with `--at`
- Example: `openclaw cron add --name "Morning briefing" --cron "0 7 * * *" --tz "America/New_York"`

**When to use which:**
- Heartbeat → multiple periodic checks, context-aware decisions, conversational continuity
- Cron → exact timing, standalone tasks, noisy/frequent, external triggers

---

## 2. GitHub Research: Best-Fit Open-Source Stack

### A. EchoVault (mraza007/echovault) — LOCAL-FIRST MEMORY ⭐ RECOMMENDED

**What**: Local-first memory for coding agents. Markdown + SQLite FTS5 + optional semantic search.

**Key Features:**
- MCP native: `memory_save`, `memory_search`, `memory_context` tools
- Local-first: Everything at `~/.memory/vault/`, Obsidian-compatible
- Zero idle cost: No background daemon
- Hybrid search: FTS5 keyword + Ollama/OpenAI/OpenRouter for semantic
- 3-layer secret redaction: API keys, passwords stripped before disk
- Cross-agent: Claude Code, Cursor, Codex, OpenCode share one vault
- YAML frontmatter on all session files

**File Structure:**
```
~/.memory/
├── vault/           # Obsidian-compatible Markdown
│   └── my-project/
│       └── 2026-02-01-session.md
├── index.db         # SQLite: FTS5 + sqlite-vec
└── config.yaml      # Embedding provider config
```

**Install:** `pip install git+https://github.com/mraza007/echovault.git && memory init && memory setup claude-code`

**Relevance to ACD**: Direct fit. Can be the Obsidian memory layer for ACD's Claude Code agent. All agent sessions get persisted as searchable markdown. No cloud dependency.

### B. TurboVault (Epistates/turbovault) — OBSIDIAN VAULT AS TOOL API

**What**: Rust MCP server, 44 specialized tools for Obsidian vault operations.

**Key Features:**
- Sub-100ms performance for most operations
- Full-text search, link graph analysis
- Atomic batch operations for research workflows
- Read, write, search, analyze, manage notes
- Direct connection for Claude and other AI agents

**Relevance to ACD**: If we want the agent to actively manage an Obsidian vault (create notes, build knowledge graphs, search across vault). Heavier than EchoVault but more powerful.

### C. OpenWork (different-ai/openwork) — AGENT WORKBENCH

**What**: Open-source alternative to Claude Cowork. Local-first desktop app for running agents, skills, and MCP servers.

**Key Features:**
- Local-first, cloud-ready
- Runs host stack locally with project folder
- Skill/plugin system
- Connectors (Slack, WhatsApp, Telegram)
- Every agent action logged
- Clear agent boundaries (permissions)

**Relevance to ACD**: Could serve as a UI layer, but we already have ACTPDash. More relevant as reference architecture for agent orchestration.

### D. Open Deep Research (langchain-ai/open_deep_research) — RESEARCH AGENT

**What**: Open-source deep research agent, works across model providers + search tools + MCP servers.

**Relevance to ACD**: Could power ResearchLite's automated competitor/market research. Integrates with MCP tool ecosystem.

### E. Shopify MCP (GeLi2001/shopify-mcp) — E-COMMERCE

**What**: MCP server for Shopify API. Usable from Claude, Cursor, etc.

**Relevance to ACD**: If any ACTP products involve Shopify stores, this MCP server gives the agent direct read/write access to products, orders, customers.

### F. Meta Ads MCP (pipeboard-co/meta-ads-mcp) — AD MANAGEMENT

**What**: MCP server for Facebook/Instagram Ads (Meta Ads API).

**Relevance to ACD**: Direct fit for ACTP's ad deployment pipeline. Agent could manage Meta campaigns, creatives, and insights directly via MCP.

### G. Composio (ComposioHQ/composio) — 1000+ INTEGRATIONS

**What**: Tool router with 1000+ SaaS integrations, OAuth management, sandboxed execution.

**Relevance to ACD**: Could be the "integration backbone" if we need to connect to many services beyond what we've built custom.

---

## 3. Data Plane Architecture: Read/Write Across All ACTP Systems

### Current System Map

| System | Type | Data Store | Current Access |
|--------|------|-----------|---------------|
| **actp-worker** | Python daemon | Supabase (shared) | Direct DB |
| **CRMLite** | Next.js API | Supabase crm_* tables | REST API |
| **MPLite** | Next.js API | Supabase publish_* | REST API |
| **GenLite** | Next.js API | Supabase actp_gen_* | REST API |
| **AdLite** | Next.js API | Supabase actp_ad_* | REST API |
| **MetricsLite** | Next.js API | Supabase actp_metric_* | REST API |
| **HookLite** | Next.js API | Supabase webhooks | REST API |
| **ResearchLite** | Next.js API | Supabase market_items | REST API |
| **ContentLite** | Next.js API | Supabase reviews | REST API |
| **PublishLite** | Next.js API | Supabase publish_sched | REST API |
| **WorkflowEngine** | Next.js API | Supabase workflow_* | REST API |
| **ACTPDash** | Next.js UI | All of above | REST APIs |
| **Safari Automation** | Node.js mono | Local + APIs | HTTP + WS |
| **Remotion Microservice** | Node.js | Local renders | REST API |

### Unified Data Plane Design

```
┌─────────────────────────────────────────────────────────┐
│                    AI AGENT (Claude Code / ACD)          │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ EchoVault│  │ TurboVault│  │ MCP Tools│              │
│  │ (Memory) │  │ (Obsidian)│  │(Shopify, │              │
│  │          │  │           │  │ Meta Ads)│              │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘              │
│       │               │              │                    │
│  ┌────▼───────────────▼──────────────▼────┐              │
│  │         Supabase MCP Server            │              │
│  │    (already connected in Windsurf)     │              │
│  └────────────────┬───────────────────────┘              │
│                   │                                       │
└───────────────────┼───────────────────────────────────────┘
                    │
    ┌───────────────▼────────────────────────┐
    │          SUPABASE (shared DB)           │
    │                                         │
    │  actp_*  crm_*  publish_*  workflow_*  │
    │  All tables readable/writable           │
    └───────────────┬────────────────────────┘
                    │
    ┌───────────────▼────────────────────────┐
    │        ACTP Lite Services (REST)        │
    │                                         │
    │  CRMLite  MPLite  GenLite  AdLite      │
    │  MetricsLite  HookLite  ResearchLite   │
    │  ContentLite  PublishLite  WorkflowEng │
    └───────────────┬────────────────────────┘
                    │
    ┌───────────────▼────────────────────────┐
    │        LOCAL SERVICES                   │
    │                                         │
    │  actp-worker (Python)                  │
    │  Safari Automation (Node.js)           │
    │  Remotion Microservice (Node.js)       │
    │  CRM DM Sync Bridge                   │
    └────────────────────────────────────────┘
```

### Data Plane Access Matrix

| Agent Action | Read From | Write To | Method |
|-------------|-----------|----------|--------|
| Research competitors | Safari DM APIs, ResearchLite | Supabase market_items | REST + DB |
| Generate content | ContentLite, GenLite | Supabase gen_jobs | REST |
| Render video | Remotion service | Supabase renders | REST |
| Publish content | MPLite, PublishLite, Blotato | Supabase publish_* | REST |
| Manage ads | AdLite, Meta Ads MCP | Supabase ad_* | REST + MCP |
| Track metrics | MetricsLite | Supabase metrics | REST |
| CRM operations | CRMLite | Supabase crm_* | REST |
| RevCat subscriber | CRMLite /api/revcat | Supabase crm_revcat_* | REST + Webhook |
| DM conversations | Safari unified-dm | CRMLite via sync | REST |
| Agent memory | EchoVault | ~/.memory/vault/ | MCP |
| Knowledge base | TurboVault/Obsidian | Obsidian vault | MCP |
| E-commerce | Shopify MCP | Shopify API | MCP |
| Workflow orchestration | WorkflowEngine | Supabase workflow_* | REST |

---

## 4. Implementation Plan: Agent-Accessible Architecture

### Phase 1: Obsidian Memory (EchoVault) — IMMEDIATE
1. Install EchoVault on local machine
2. Configure for Claude Code (`memory setup claude-code`)
3. Set `~/.memory/vault/` as Obsidian vault
4. ACD harness saves session context after each run
5. Agent can search prior decisions/bugs/learnings

### Phase 2: 3-Layer Memory (Nat Eliason model) — WEEK 1
1. Create `~/life/` PARA structure (Projects, Areas, Resources, Archives)
2. Set up daily notes automation (dated markdown)
3. Nightly consolidation cron: extract key facts → Knowledge Graph
4. Tacit knowledge file: ACD preferences, rules, patterns

### Phase 3: Heartbeat + Cron System — WEEK 1
1. Create HEARTBEAT.md checklist for ACD agent
2. Implement heartbeat loop in actp-worker (already exists, extend)
3. Add cron job definitions for:
   - Morning briefing (daily status of all services)
   - DM sync (every 30min, already implemented)
   - Metrics refresh (every 5min)
   - Content pipeline trigger (every 4h)
   - Research sweep (daily)
4. Agent receives heartbeat results, decides what needs attention

### Phase 4: MCP Integration — WEEK 2
1. Add EchoVault MCP to Claude Code config
2. Add TurboVault MCP for Obsidian vault management
3. Evaluate Shopify MCP if e-commerce needed
4. Evaluate Meta Ads MCP for ACTP ad pipeline
5. All accessible from ACD harness via Claude Code key

### Phase 5: Data Plane Verification — WEEK 2
1. Verify read/write from agent to all Supabase tables
2. Verify REST API access to all Lite services
3. Verify Safari DM sync → CRM flow
4. Verify RevCat webhook → CRM contact update
5. End-to-end test: agent researches → generates → publishes → tracks

---

## 5. Security Guidance

### Hard Rules (from research)
- **Container/VM isolation**: Run agent workloads in containers, not main laptop
- **Never expose control plane** to public internet
- **Least-privilege OAuth scopes**: Separate accounts where possible
- **Pin dependencies**: No "vibe-installing" forks during hype cycles
- **Secret rotation**: Keep secrets out of dotfiles, rotate keys often
- **EchoVault redaction**: 3-layer secret stripping before disk write

### ACD-Specific Security
- All Supabase access via service role key (server-side only)
- All Lite services use API key auth (x-api-key header)
- RevCat webhook uses shared secret
- Safari DM APIs are local-only (localhost ports)
- Obsidian vault is local-only (no cloud sync of agent memory)
- Claude Code key scoped to ACD harness only

---

## 6. Credit Efficiency (Minimal Compute)

| Task | Where | Cost |
|------|-------|------|
| Indexing, vault search, dedupe | Local (EchoVault FTS5) | Free |
| Pattern matching, scoring | Local (Python/Node) | Free |
| Extraction, lightweight analysis | Haiku 4.5 | $0.001/call |
| Synthesis, strategy, creative | Sonnet 4.5 / Opus | $0.01-0.10/call |
| Full research sweep | Open Deep Research | Varies |

**Caching strategy**: Don't re-pull Meta insights for same date range. Cache Supabase queries. Batch heartbeat checks into single agent turn.

---

## 7. Recommended Stack for ACD

| Layer | Tool | Status |
|-------|------|--------|
| **Agent Memory** | EchoVault (MCP) | TO INSTALL |
| **Knowledge Base** | Obsidian vault via TurboVault MCP | TO INSTALL |
| **CRM** | CRMLite (15 endpoints) | ✅ DEPLOYED |
| **DM Sync** | crm_dm_sync.py in actp-worker | ✅ BUILT |
| **RevCat** | CRMLite /api/revcat/webhook | ✅ BUILT |
| **Publishing** | MPLite + PublishLite | ✅ DEPLOYED |
| **Content Gen** | ContentLite + GenLite | ✅ DEPLOYED |
| **Ad Management** | AdLite + Meta Ads MCP | DEPLOYED + TO ADD |
| **Research** | ResearchLite + Open Deep Research | DEPLOYED + TO ADD |
| **Metrics** | MetricsLite | ✅ DEPLOYED |
| **Workflow** | WorkflowEngine | ✅ DEPLOYED |
| **Heartbeat** | actp-worker heartbeat loop | ✅ EXISTS |
| **Cron** | actp-worker poller loops | ✅ EXISTS |
| **Data Plane** | Supabase (shared) + REST APIs | ✅ EXISTS |

---

## References

- YouTube: https://www.youtube.com/watch?v=nSBKCZQkmYw
- EchoVault: https://github.com/mraza007/echovault
- TurboVault: https://github.com/epistates/turbovault
- OpenWork: https://github.com/different-ai/openwork
- Open Deep Research: https://github.com/langchain-ai/open_deep_research
- Shopify MCP: https://github.com/GeLi2001/shopify-mcp
- Meta Ads MCP: https://github.com/pipeboard-co/meta-ads-mcp
- Composio: https://github.com/ComposioHQ/composio
- OpenClaw Cron Docs: https://docs.openclaw.ai/automation/cron-jobs
- OpenClaw Heartbeat Docs: https://docs.openclaw.ai/automation/cron-vs-heartbeat
