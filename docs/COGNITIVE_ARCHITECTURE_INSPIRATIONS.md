# Cognitive Architecture Inspirations

> Reference systems that inspire the ACD autonomous agent architecture.
> Use these as design benchmarks when implementing PRD-100 through PRD-104.

---

## 1. ElizaOS / ai16z

- **Website**: https://elizaos.ai
- **GitHub**: https://github.com/elizaOS/eliza
- **What it is**: Open-source TypeScript framework for building persistent autonomous agents. Powers ai16z — a DAO that runs AI-managed investment agents.

### Key Patterns We Borrow
| Pattern | ElizaOS Implementation | Our Implementation |
|---|---|---|
| Agent Runtime | Central hub, coordinates memory + tools | `cognitive_orchestrator.py` (PRD-100) |
| Composable Swarms | Agents delegate to sub-agents, share context | `agent_spawner.py` (PRD-101) + capability routing |
| Character Cards | YAML/JSON agent personas with roles + tools | `actp_agent_registry` table (PRD-101) |
| Persistent Memory | PostgreSQL/PGlite vector store | Supabase `actp_*` tables |
| Plugins | npm packages extending agent actions | Executor adapters in `workflow_executors.py` |
| Plan-Act-Observe loop | Iterative goal pursuit with retries | `start_orchestrator_loop()` (PRD-100) |

### Relevant Links
- Architecture deep-dive: https://elizaos.ai/docs/architecture
- Swarms: https://elizaos.ai/docs/swarms
- Plugin system: https://elizaos.ai/docs/plugins

---

## 2. OpenClaw

- **Website**: https://openclaw.ai
- **What it is**: Self-hosted, always-on personal AI assistant with hub-and-spoke architecture. Central Gateway handles all inputs/outputs; Skills execute actions via APIs.

### Key Patterns We Borrow
| Pattern | OpenClaw Implementation | Our Implementation |
|---|---|---|
| Hub-and-Spoke | Gateway as single entry point | `health_server.py` REST API as unified gateway |
| Skills | TypeScript modules per capability | Executor classes (`workflow_executors.py`) |
| Always-on Daemon | Persistent process, 24/7 operation | `worker.py` daemon + `daily_routine.py` |
| Secure tunnels | Local-first, no cloud dependency | actp-worker local daemon + Supabase sync |
| Self-hosted | Runs on own hardware | Mac mini + Supabase (local compute, cloud DB) |
| Channel abstraction | WhatsApp, Slack, CLI as interchangeable inputs | Telegram bot + health_server + workflow engine |

### Key Difference from Us
OpenClaw is single-agent; we run multi-agent swarms. OpenClaw is personal assistant; we optimize for business revenue goals with feedback loops.

---

## 3. Polsia

- **Website**: https://polsia.com
- **What it is**: Autonomous AI that claims to run entire companies — 24/7 adaptive operation, project execution, marketing, and hiring without constant human input.

### Key Patterns We Borrow
| Pattern | Polsia Claim | Our Implementation |
|---|---|---|
| Autonomous company runner | All business functions run by AI | COT (PRD-100) orchestrates all 4 domain agents |
| 24/7 operation | No human required for daily ops | `daily_routine.py` 06:00 cron + all daemons |
| Adaptive thinking | Strategy adjusts to results | `OptimizationEngine.adjust_strategy()` (PRD-100) |
| Goal-oriented execution | Optimizes toward business metrics | `GoalProgressEngine` (PRD-104) closed loop |
| Marketing automation | Content + outreach handled by AI | PRD-102 (content) + PRD-103 (acquisition) |

### Key Difference from Us
Polsia is a black-box SaaS; we build and own the architecture. Our system is tuned specifically to our business goals ($5K+/month, 1M followers, 100K views/video).

---

## 4. ai16z / Eliza Framework

- **GitHub**: https://github.com/ai16z/eliza (now merged into elizaOS)
- **What it is**: Multi-agent framework used by ai16z DAO for autonomous investment management. Emphasizes encrypted agents, character-driven personalities, and Web3 integration.

### Key Patterns We Borrow
| Pattern | ai16z Implementation | Our Implementation |
|---|---|---|
| DAO-like feedback | Contributions + outcomes improve agent behavior | `ViralFeedbackLoop` + `OptimizationEngine` |
| Trajectory collection | Log all actions for RL-style improvement | `actp_orchestrator_log` + `actp_feedback_posts` |
| Character-driven agents | Each agent has defined role + system prompt | Each PRD-10X agent has a defined focus + capabilities |
| Autonomous investment | AI makes financial decisions | `ConversionTracker` + `StripeTracker` track ROI automatically |

---

## 5. LangGraph / CrewAI (Structural References)

- **LangGraph**: https://langchain-ai.github.io/langgraph — graph-based multi-agent workflows with state machines
- **CrewAI**: https://crewai.com — role-based multi-agent teams with task delegation

### What We Take From Each
- **LangGraph**: DAG-based workflow steps with conditional edges → our `actp_workflow_steps` (PRD-001) + `advanceExecution()` engine
- **CrewAI**: Agent roles with defined goals, memory, tools → our `actp_agent_registry` capability map + executor routing

---

## Architecture Comparison Matrix

| Feature | ElizaOS | OpenClaw | Polsia | ai16z | **Our System** |
|---|---|---|---|---|---|
| Multi-agent | ✅ Swarms | ❌ Single | Unknown | ✅ | ✅ 5 domain agents |
| Self-healing | Partial | ❌ | Unknown | Partial | ✅ PRD-101 full circuit breakers |
| Goal optimization | ✅ | ❌ | ✅ | ✅ | ✅ GoalProgressEngine closed loop |
| Revenue tracking | ❌ | ❌ | Unknown | ✅ | ✅ Stripe + Apple + Upwork |
| Audience growth | ❌ | ❌ | ✅ | Partial | ✅ 1M followers + 100K views target |
| Open source | ✅ | ✅ | ❌ | ✅ | ✅ Private GitHub |
| Local compute | Optional | ✅ | ❌ SaaS | Optional | ✅ Mac daemon + Vercel cloud |
| Web3 | ✅ | ❌ | ❌ | ✅ | ❌ (not needed) |
| Content machine | ❌ | ❌ | ✅ | ❌ | ✅ PRD-102 full pipeline |
| CRM + outreach | ❌ | ❌ | ✅ | ❌ | ✅ PRD-103 + Safari Automation |

---

## Design Principles Extracted

From studying all 5 systems, the following principles are baked into PRD-100 through PRD-104:

1. **Hub-and-spoke over peer-to-peer** (OpenClaw, ElizaOS) — single orchestrator delegates, never have agents call each other directly
2. **Persistent state over stateless calls** (ElizaOS, ai16z) — every action logged to Supabase, memory survives restarts
3. **Capability registry before routing** (CrewAI, ElizaOS) — orchestrator knows what each agent can do, routes by capability not by name
4. **Circuit breakers on all agent spawns** (our addition) — no system can infinite-loop on failures
5. **Closed feedback loop on every output** (ai16z, Polsia) — every post, outreach, and proposal fed back into strategy
6. **Batch everything for cost efficiency** (our constraint) — 10+ per Claude call, never 1 (unique to our $400/month AI ceiling)
7. **Goal-first planning** (Polsia, ai16z) — daily plan generated from goal gaps, not from task backlogs
