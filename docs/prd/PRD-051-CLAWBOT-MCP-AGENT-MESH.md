# PRD-051: ClawBot MCP Agent Mesh
## Telegram → Orchestrator Claude Code → Domain Specialists + Persistent MCP Service Mesh

**Status:** Draft  
**Version:** 1.0  
**Date:** 2026-03-01  
**Owner:** ACTP Engineering  

---

## 1. Problem Statement

The current ClawBot architecture has the right routing structure (Telegram → swarm → domain agents) but falls short in three critical ways:

1. **Agents use generic tools** — All agents fall back to `dispatch_actp_topic`, a generic HTTP forwarder. There are no domain-specific tools wired per agent role. "Can we check YouTube stats?" routes to `@researcher` correctly but the researcher has no YouTube tool to call.

2. **Skills are undifferentiated** — All 86 skill PRDs are dumped into every agent's system prompt regardless of role. `@researcher` gets ACD harness docs it will never use. Context windows are wasted; agent focus is diluted.

3. **No persistent MCP service mesh** — Every Claude subprocess has to re-discover, re-initialize, and re-connect to services on every task. Services are called via raw HTTP rather than structured MCP tool calls, losing type safety, discoverability, and session reuse.

The result: agents are intelligent routers wrapping a single underpowered tool call, not specialized domain experts backed by live service connections.

---

## 2. Vision

```
Telegram User
     │
     ▼
┌─────────────────────────────────────┐
│  telegram_command_bot.py            │  ← unchanged entry point
│  (auth, rate limit, formatting)     │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Orchestrator Claude Code Instance  │  ← always warm, fast-start
│  • All 86 skill PRDs loaded         │  ← full strategic context
│  • Reads ACTP state via MCP         │  ← knows what's running
│  • Decomposes task → specialist(s)  │  ← routes with full context
│  • Synthesizes multi-agent results  │  ← coherent final reply
└──┬──────┬──────┬──────┬──────┬──────┘
   │      │      │      │      │
   ▼      ▼      ▼      ▼      ▼     (spawned on demand, killed when done)
┌──────┐┌──────┐┌──────┐┌──────┐┌──────────┐
│@res  ││@code ││@cont ││@acq  ││@watchdog │
│earcher│coding ││ent   ││uisit ││          │
│      ││      ││      ││ion   ││          │
│Skills││Skills││Skills││Skills││Skills    │
│(R)   ││(C)   ││(Co)  ││(A)   ││(W)       │
└──┬───┘└──┬───┘└──┬───┘└──┬───┘└────┬─────┘
   │       │       │       │          │
   ▼       ▼       ▼       ▼          ▼
┌──────────────────────────────────────────────────────────┐
│                  MCP Service Mesh (always running)        │
│                                                           │
│  supabase-mcp     safari-gateway   market-research(3106)  │
│  blotato-mcp      contentlite-mcp  publishlite-mcp        │
│  workflow-engine  remotion-mcp     actp-topics-mcp        │
│  safari-dm(3001-3003)  safari-comments(3004-3007)         │
└──────────────────────────────────────────────────────────┘
```

**Core principles:**
- **Services stay alive** — MCP servers are persistent processes, not re-spawned per request
- **Specialists are ephemeral** — Claude Code subprocesses spin up per task, die on completion
- **Skills are filtered** — each specialist receives only the PRDs relevant to its domain
- **Orchestrator has full context** — the main Claude Code instance sees everything, decides who to call
- **MCP over raw HTTP** — all service interactions use typed MCP tool calls, not ad-hoc `httpx`

---

## 3. Architecture Components

### 3.1 Orchestrator Agent (`orchestrator_agent.py`)

The orchestrator is a **long-lived Claude Code process** (or fast-restart via PID file) that:

- Maintains conversation history per Telegram user
- Has all 86 skill PRDs in its system prompt
- Connects to **all MCP servers** simultaneously (read-only for most)
- Decides whether a request needs zero, one, or multiple specialists
- Passes enriched `SpecialistHandoff` packets to the agent pool
- Collects results and synthesizes a coherent Telegram reply

**Orchestrator MCP connections (read):**
- `supabase-mcp` — read job state, analytics, content queue
- `actp-topics-mcp` — see what topics/workflows are active
- `workflow-engine` — read running executions

**Orchestrator does NOT execute domain tasks directly** — it delegates.

**Lifecycle:** Started by `start_all.sh`, kept alive by `SelfHealingLoop`. Restart latency target: < 3 seconds.

---

### 3.2 Agent Pool (`agent_pool.py`)

Manages the lifecycle of specialist Claude Code subprocesses:

```python
class AgentPool:
    async def acquire(role: str, handoff: SpecialistHandoff) -> AgentHandle
    async def release(handle: AgentHandle) -> None
    async def run_task(role: str, handoff: SpecialistHandoff) -> SpecialistResult
    def status() -> dict[str, AgentPoolStatus]
```

**Pool behavior:**
- **Cold start**: spawn new Claude Code process with role's system prompt + filtered skills + MCP config
- **Warm reuse** (optional, phase 2): keep specialist alive for 60s after task for follow-up queries
- **Max concurrency**: configurable per role (default: 2 per role, 8 total)
- **Timeout**: per-role timeout (researcher: 120s, coding: 300s, others: 90s)
- **Cleanup**: `finally` block ensures subprocess always killed regardless of outcome

**Handoff packet:**
```python
@dataclass
class SpecialistHandoff:
    role: str                        # target specialist
    intent: str                      # human intent string
    context: dict                    # orchestrator-enriched context
    mcp_servers: list[str]           # which MCP servers to connect
    skill_domains: list[str]         # which skill subsets to load
    tools_allowed: list[str]         # explicit tool allowlist
    priority: str                    # normal | high | urgent
    timeout_seconds: int
    on_progress: Callable | None     # callback for streaming to Telegram
```

---

### 3.3 Domain Specialists

Each specialist is a **Claude Code subprocess** configured at spawn time with:
1. A **soul file** (role identity, constraints, output format)
2. **Domain-filtered skills** (subset of the 86 PRDs relevant to the role)
3. **MCP server connections** (only the servers it needs)
4. **Explicit tool allowlist** (can't call tools outside its domain)

#### 3.3.1 @researcher — ResearchClaw

**Domain:** Market intelligence, analytics, competitive research, platform data

**Skills loaded:**
- `PRD-003-SAFARI-RESEARCH-PIPELINE.md`
- `PRD-008-AUTONOMOUS-TWITTER-RESEARCH-PIPELINE.md`
- `PRD-MARKET-RESEARCH.md`
- Analytics/metrics PRDs
- Platform-specific research PRDs

**MCP servers:**
- `safari-gateway` (7070) — browser automation
- `market-research` (3106) — unified platform research API
- `supabase-mcp` — read analytics tables (`actp_platform_research`, `actp_twitter_research`)
- `metricslite-mcp` — YouTube/social stats

**Tools:**
```
safari_twitter_research(keyword, count)
safari_tiktok_research(keyword, count)  
safari_instagram_research(keyword, count)
get_youtube_stats(channel_id_or_handle)
get_platform_metrics(platform, account)
get_top_creators(niche, platform)
query_research_db(sql)
```

**Output:** Structured `ResearchResult` with sources, data points, insights

---

#### 3.3.2 @coding — CodingClaw

**Domain:** ACD pipeline, feature implementation, code review, testing, deployment

**Skills loaded:**
- `AGENT_HARNESS_GUIDE.md`
- ACD-specific PRDs (ACD dispatch, harness, features)
- Testing PRDs
- `PRD-001-WORKFLOW-ENGINE.md`

**MCP servers:**
- `supabase-mcp` — read/write `actp_jobs`, `actp_features`, `actp_repos`
- `filesystem` (local) — read/write code files
- `github-mcp` (when available)

**Tools:**
```
read_file(path)
write_file(path, content)
run_bash(command)
git_status()
git_commit(message)
run_tests(path)
get_feature_list(project)
mark_feature_done(feature_id)
```

---

#### 3.3.3 @content — ContentClaw

**Domain:** Content generation, video production, publishing queue management

**Skills loaded:**
- `PRD-007-RESEARCH-TO-BLOTATO-PIPELINE.md`
- Content generation PRDs
- Publishing workflow PRDs
- Remotion/video PRDs

**MCP servers:**
- `contentlite-mcp` — generate content from blueprints
- `workflow-engine-mcp` — start/monitor content workflows
- `remotion-mcp` (3100) — render videos
- `supabase-mcp` — read blueprints, write content queue
- `blotato-mcp` (external) — schedule/publish

**Tools:**
```
generate_content_from_blueprint(blueprint_id, platform)
render_video(template, params)
schedule_post(platform, content, time)
get_content_queue(status)
get_blueprints(niche, limit)
start_workflow(slug, params)
```

---

#### 3.3.4 @acquisition — AcquisitionClaw

**Domain:** DM outreach, CRM, LinkedIn, Upwork, lead generation

**Skills loaded:**
- Acquisition/outreach PRDs
- CRM PRDs
- Platform DM PRDs

**MCP servers:**
- `safari-instagram-dm` (3100) — Instagram DMs
- `safari-twitter-dm` (3003) — Twitter DMs
- `safari-tiktok-dm` (3102) — TikTok DMs
- `safari-linkedin` (3105) — LinkedIn automation
- `supabase-mcp` — CRM tables

**Tools:**
```
send_dm(platform, username, message)
get_dm_conversations(platform)
search_prospects(niche, platform)
add_crm_contact(contact_data)
get_crm_pipeline()
post_upwork_proposal(job_id, proposal)
```

---

#### 3.3.5 @publisher — PublisherClaw (new role)

**Domain:** Scheduling, cross-platform publishing, timing optimization

**Skills loaded:**
- MPLite integration PRDs
- PublishLite timing PRDs
- Platform publishing PRDs

**MCP servers:**
- `publishlite-mcp` — Thompson Sampling timing
- `mplite-mcp` — publish queue management
- `blotato-mcp` — direct platform publishing
- `supabase-mcp` — published content tracking

**Tools:**
```
get_best_publish_time(platform)
enqueue_post(platform, content, media)
get_publish_queue(status)
publish_now(post_id)
get_post_performance(post_id)
```

---

#### 3.3.6 @watchdog — WatchdogClaw

**Domain:** Health monitoring, self-healing, infrastructure diagnostics

**Skills loaded:**
- Infrastructure PRDs
- Deployment/ops PRDs

**MCP servers:**
- `supabase-mcp` — job health tables
- All service health endpoints (read-only)

**Tools:**
```
check_service_health(service_name)
get_job_queue_stats()
restart_service(service_name)
get_error_logs(service, minutes)
check_all_services()
get_swarm_status()
```

---

### 3.4 MCP Service Mesh (`mcp_service_mesh.py`)

A persistent registry of MCP server connections that **stays running**. Specialists connect to pre-warmed servers rather than cold-starting new connections each time.

```python
class MCPServiceMesh:
    servers: dict[str, MCPServerHandle]   # name → running MCP process/connection
    
    async def start_all() -> None          # start all configured servers
    async def get(name: str) -> MCPHandle  # get handle to a running server  
    async def health_check() -> dict       # status of all servers
    async def restart(name: str) -> None   # restart a single server
```

**Registered servers:**

| Name | Type | Port/URL | Restart Policy |
|---|---|---|---|
| `supabase` | External HTTP | Supabase cloud | Never (external) |
| `safari-gateway` | Local process | 7070 | Auto-restart |
| `market-research` | Local process | 3106 | Auto-restart |
| `safari-instagram-dm` | Local process | 3100 | Auto-restart |
| `safari-twitter-dm` | Local process | 3003 | Auto-restart |
| `safari-tiktok-dm` | Local process | 3102 | Auto-restart |
| `safari-linkedin` | Local process | 3105 | Auto-restart |
| `safari-threads-comments` | Local process | 3004 | Auto-restart |
| `safari-instagram-comments` | Local process | 3005 | Auto-restart |
| `safari-tiktok-comments` | Local process | 3006 | Auto-restart |
| `safari-twitter-comments` | Local process | 3007 | Auto-restart |
| `remotion` | Local process | 3100 | Auto-restart |
| `workflow-engine` | External HTTP | Vercel | Never (external) |
| `contentlite` | External HTTP | Vercel | Never (external) |
| `researchlite` | External HTTP | Vercel | Never (external) |
| `publishlite` | External HTTP | Vercel | Never (external) |
| `blotato` | External HTTP | backend.blotato.com | Never (external) |
| `metricslite` | External HTTP | Vercel | Never (external) |
| `actp-topics` | Local process | 8765 (worker) | Auto-restart |

---

### 3.5 ACTP Topics MCP Server (`actp_mcp_server.py`)

A new **local MCP server** that exposes the ACTP worker's topics and job system as structured MCP tools. This replaces raw `dispatch_actp_topic` HTTP calls.

**Exposed tools:**
```
# Jobs
create_job(topic, params, priority) → job_id
get_job(job_id) → JobStatus
list_jobs(status, limit) → list[Job]
wait_for_job(job_id, timeout) → JobResult

# Topics  
list_topics() → list[TopicDefinition]
dispatch_topic(topic, params) → JobResult
get_topic_schema(topic) → JsonSchema

# Analytics
get_revenue_summary(days) → RevenueSummary
get_content_performance(platform, days) → PerformanceReport
get_workflow_status(slug) → WorkflowExecution

# System
get_system_health() → HealthReport
get_active_campaigns() → list[Campaign]
```

---

### 3.6 Skill Loader Domain Filtering (`skill_loader.py` extension)

Current: `get_registry()` returns all 86 PRDs regardless of who's asking.

New: `get_registry(domain=None)` filters to relevant PRD subset.

**Domain map:**

| Domain | PRD tags included |
|---|---|
| `research` | research, market, safari, twitter, analytics, competitive |
| `coding` | acd, harness, testing, deployment, workflow-engine, git |
| `content` | content, video, remotion, blotato, mplite, publishing |
| `acquisition` | dm, crm, linkedin, upwork, outreach, leads |
| `publishing` | publish, schedule, timing, platform, mplite |
| `watchdog` | health, monitoring, infrastructure, deployment |
| `orchestrator` | all (no filter) |

Each PRD gets tagged in its frontmatter:
```markdown
---
domain: [research, market]
agent_roles: [researcher]
priority: high
---
```

Skill loader reads these tags and filters accordingly. Untagged PRDs default to `orchestrator` only.

---

## 4. Data Flow: "Can we check YouTube stats?"

```
1. Telegram receives: "Can we check YouTube stats?"
   
2. telegram_command_bot.py
   → authenticate (admin)
   → call orchestrator_agent.process(user_id, text)

3. OrchestratorAgent
   → load conversation context for user_id
   → classify intent: analytics_query
   → enrich context: {platform: "youtube", query_type: "stats", account: "inferred from context"}
   → SpecialistHandoff(
       role="researcher",
       intent="Get YouTube channel stats for Isaiah Dupree",
       mcp_servers=["metricslite", "supabase"],
       skill_domains=["research", "analytics"],
       tools_allowed=["get_youtube_stats", "get_platform_metrics"]
     )

4. AgentPool.run_task("researcher", handoff)
   → spawn claude code subprocess
   → inject: researcher soul + research/analytics PRDs + MCP config
   → Claude Code calls: get_youtube_stats("IsaiahDupree")
   → MCP tool hits MetricsLite /api/youtube/stats
   → Returns: {subscribers: 12400, views_30d: 84200, top_video: {...}}
   → Claude Code formats: "Your YouTube channel has 12,400 subscribers..."
   → subprocess exits

5. OrchestratorAgent receives SpecialistResult
   → formats for Telegram (markdown, within 4096 chars)
   → returns to telegram_command_bot.py

6. telegram_command_bot.py sends reply to user
```

Total latency target: < 15 seconds for analytics queries.

---

## 5. Data Flow: Complex Multi-Agent Task

**Input:** "Research trending AI automation hooks, generate 3 TikTok scripts, schedule them for this week"

```
OrchestratorAgent decomposes into 3 sequential specialist calls:

Step 1 → @researcher
  intent: "Research trending AI automation hooks on TikTok and Twitter"
  tools: [safari_tiktok_research, safari_twitter_research, get_top_creators]
  output: ResearchResult{hooks: [...], top_formats: [...], best_times: [...]}

Step 2 → @content (receives Step 1 output as context)
  intent: "Generate 3 TikTok video scripts from these trending hooks"
  context: {research: <Step 1 result>}
  tools: [generate_content_from_blueprint, get_blueprints]
  output: ContentResult{scripts: [script1, script2, script3]}

Step 3 → @publisher (receives Steps 1+2 output as context)
  intent: "Schedule these 3 scripts for optimal times this week"
  context: {scripts: <Step 2 result>, timing_data: <Step 1 result best_times>}
  tools: [get_best_publish_time, enqueue_post]
  output: PublishResult{scheduled: [{post_id, time}, ...]}

OrchestratorAgent synthesizes:
  "Done! I researched trending hooks, generated 3 scripts, and scheduled them:
   - Script 1 (hook: 'Nobody talks about...') → Wednesday 7PM
   - Script 2 (hook: 'I tested...') → Thursday 4PM  
   - Script 3 (hook: 'The algorithm...') → Saturday 10AM"
```

---

## 6. Implementation Plan

### Phase 1: Foundation (Week 1)
- [ ] `actp_mcp_server.py` — expose ACTP topics as MCP tools (replaces `dispatch_actp_topic`)
- [ ] `mcp_service_mesh.py` — persistent server registry with health monitoring
- [ ] `skill_loader.py` extension — domain tag filtering
- [ ] Tag all 86 PRDs with domain frontmatter
- [ ] Fix double-processing bug in `telegram_command_bot.py`

### Phase 2: Specialist Tools (Week 2)
- [ ] `agent_pool.py` — lifecycle manager for specialist subprocesses
- [ ] `specialist_tools/researcher_tools.py` — YouTube stats, platform metrics, safari research
- [ ] `specialist_tools/content_tools.py` — content generation, video render, blueprint fetch
- [ ] `specialist_tools/acquisition_tools.py` — DM, CRM, prospect search
- [ ] `specialist_tools/publisher_tools.py` — schedule, queue, timing
- [ ] `specialist_tools/watchdog_tools.py` — health check, restart, logs
- [ ] Per-specialist soul files updated with tool documentation

### Phase 3: Orchestrator (Week 3)
- [ ] `orchestrator_agent.py` — always-warm Claude Code orchestrator
- [ ] Multi-step task decomposition logic
- [ ] Parallel specialist dispatch (when steps are independent)
- [ ] Result synthesis into coherent Telegram reply
- [ ] Wire `telegram_command_bot.py` → orchestrator (replace current ai_engine path)

### Phase 4: MetricsLite Integration (Week 3-4)
- [ ] Build `metricslite-mcp` adapter (wraps MetricsLite Vercel API as MCP)
- [ ] YouTube stats endpoint in MetricsLite
- [ ] Cross-platform analytics aggregation
- [ ] Wire to `@researcher`

### Phase 5: Hardening (Week 4)
- [ ] Full E2E tests per specialist
- [ ] Latency benchmarks per role
- [ ] Graceful degradation (no MCP → fallback to HTTP)
- [ ] Circuit breaker per MCP server
- [ ] Update `start_all.sh` to start MCP mesh

---

## 7. New File Structure

```
actp-worker/
├── orchestrator_agent.py          # NEW: always-warm orchestrator Claude Code
├── agent_pool.py                  # NEW: specialist lifecycle manager
├── mcp_service_mesh.py            # NEW: persistent MCP server registry
├── actp_mcp_server.py             # NEW: ACTP topics/jobs as MCP server
├── specialist_tools/
│   ├── __init__.py
│   ├── researcher_tools.py        # NEW: YouTube, Safari, analytics
│   ├── content_tools.py           # NEW: ContentLite, Remotion, blueprints
│   ├── acquisition_tools.py       # NEW: DM, CRM, Upwork
│   ├── publisher_tools.py         # NEW: MPLite, PublishLite, Blotato
│   └── watchdog_tools.py          # NEW: health, restart, logs
├── specialist_souls/
│   ├── researcher-soul.md         # updated with tool docs
│   ├── coding-soul.md
│   ├── content-soul.md
│   ├── acquisition-soul.md
│   ├── publisher-soul.md          # NEW role
│   └── watchdog-soul.md
├── agent_swarm.py                 # updated TaskRouter + AgentPool integration
├── skill_loader.py                # extended: domain filtering
├── agent_registry.py              # updated: route to orchestrator
├── telegram_command_bot.py        # updated: fix double-processing, wire orchestrator
└── start_all.sh                   # updated: start MCP mesh
```

---

## 8. Environment Variables

```bash
# Agent Pool
AGENT_POOL_MAX_CONCURRENCY=8          # total concurrent specialists
AGENT_POOL_ROLE_MAX=2                 # per-role max
AGENT_POOL_WARM_TIMEOUT=60            # seconds to keep warm after task
ORCHESTRATOR_RESTART_DELAY=3          # max orchestrator restart latency

# MCP Service Mesh
MCP_MESH_ENABLED=true
MCP_HEALTH_CHECK_INTERVAL=60          # seconds
MCP_RESTART_MAX_ATTEMPTS=3

# ACTP MCP Server
ACTP_MCP_PORT=8766                    # separate from worker on 8765
ACTP_MCP_AUTH_KEY=...

# Feature flags
ORCHESTRATOR_ENABLED=false            # Phase 3 gate
AGENT_POOL_ENABLED=false              # Phase 2 gate
MCP_MESH_ENABLED=false                # Phase 1 gate
SPECIALIST_TOOLS_ENABLED=false        # Phase 2 gate
```

---

## 9. Success Metrics

| Metric | Current | Target |
|---|---|---|
| "Check YouTube stats" → real data | ❌ partial_failure | ✅ < 15s |
| Multi-step task completion | ❌ not possible | ✅ < 60s |
| Agent routing accuracy | ~70% | > 95% |
| Skill context relevance | ~20% (86 PRDs dumped) | > 85% (filtered) |
| Double message processing | ❌ happening | ✅ zero |
| MCP server cold start per request | ~500ms overhead | ✅ 0ms (persistent) |
| Orchestrator restart time | N/A | < 3s |

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Orchestrator crashes lose context | PID file + auto-restart, context persisted to Supabase between turns |
| Specialist timeout cascades to user | Per-role timeouts, partial result synthesis, graceful "still working" updates |
| MCP server zombies accumulate | Mesh health checker cleans up stale connections every 60s |
| Claude Code subprocess leaks | `AgentPool` uses `asyncio.wait_for` + `finally` subprocess kill |
| Phase 3 orchestrator breaks existing flow | Feature flag `ORCHESTRATOR_ENABLED=false` keeps current flow live |
| PRD tagging incomplete | Untagged PRDs default to orchestrator-only; specialists degrade gracefully |

---

## 11. Backward Compatibility

All changes are **additive and flag-gated**:
- `ORCHESTRATOR_ENABLED=false` → uses current `telegram_ai_engine.chat()` path
- `AGENT_POOL_ENABLED=false` → uses current `SwarmAgent` direct spawn
- `MCP_MESH_ENABLED=false` → services called via raw HTTP as today
- `SPECIALIST_TOOLS_ENABLED=false` → falls back to `dispatch_actp_topic`

Phases can be rolled out independently. Current system remains fully operational during migration.

---

## 12. Definition of Done

- [ ] "Can we check YouTube stats?" returns real subscriber/view data in < 15s
- [ ] "Research trending hooks, write 3 scripts, schedule them" completes end-to-end
- [ ] All MCP servers show healthy in `/swarm status`
- [ ] Zero double-processing of Telegram messages
- [ ] Each specialist's skill context is < 30 PRDs (domain-filtered)
- [ ] Orchestrator survives restart in < 3s
- [ ] E2E test coverage for each specialist role
- [ ] `start_all.sh` starts full MCP mesh with health checks
