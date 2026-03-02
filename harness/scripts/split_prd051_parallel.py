"""
Split prd051-clawbot-mcp-mesh.json into 8 parallel agent sub-lists.
Writes harness/features/prd051-0{1..8}-*.json and launch script.
"""
import json, os, sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(BASE, "features", "prd051-clawbot-mcp-mesh.json")
FEAT_DIR = os.path.join(BASE, "features")
LOG_DIR  = os.path.join(BASE, "logs")
os.makedirs(LOG_DIR, exist_ok=True)

with open(SRC) as f:
    all_features = json.load(f)["features"]

# ── split rules ──────────────────────────────────────────────────────────────
AGENTS = [
    {
        "id":    "p051-01-foundation",
        "name":  "PRD-051 Agent 01 — Foundation + Bot Fixes",
        "categories": {"setup", "database", "bot"},
        "model": "claude-opus-4-5",
        "focus": "Config additions, file skeletons (orchestrator, agent_pool, mcp_service_mesh, actp_mcp_server, specialist_tools/), Supabase migrations, fix double-processing bug in telegram_command_bot.py, wire orchestrator feature-flag path, /meshstatus command stub",
    },
    {
        "id":    "p051-02-mcp-mesh",
        "name":  "PRD-051 Agent 02 — MCP Service Mesh",
        "id_prefixes": ["CMM-02", "CMM-03"],
        "model": "claude-sonnet-4-5-20250929",
        "focus": "mcp_service_mesh.py: MCPServerConfig, MCPServerHandle, MCPServiceMesh class — start_all(), get(), health_check(), restart(), background health loop, circuit breaker, HTTP fallback, register all 18 services in mcp_servers.json",
    },
    {
        "id":    "p051-03-mcp-server",
        "name":  "PRD-051 Agent 03 — ACTP MCP Server (port 8766)",
        "id_prefix": "CMM-04",
        "model": "claude-sonnet-4-5-20250929",
        "focus": "actp_mcp_server.py: FastAPI app on port 8766, Bearer auth, all 12 MCP tools (create_job, get_job, list_jobs, wait_for_job, dispatch_topic, list_topics, get_topic_schema, analytics tools, workflow tools, swarm status), unit tests",
    },
    {
        "id":    "p051-04-skills",
        "name":  "PRD-051 Agent 04 — Skill Domain Filtering",
        "categories": {"skills"},
        "model": "claude-sonnet-4-5-20250929",
        "focus": "skill_loader.py: SkillDomain enum, PRD frontmatter parser, get_registry(domain) filtering, domain audit, build_system_prompt(role, soul, domain). Tag all 86 PRDs with domain frontmatter. Unit tests for domain filtering.",
    },
    {
        "id":    "p051-05-agent-pool",
        "name":  "PRD-051 Agent 05 — Agent Pool Lifecycle",
        "categories": {"agent_pool"},
        "model": "claude-sonnet-4-5-20250929",
        "focus": "agent_pool.py: SpecialistHandoff, SpecialistResult, AgentHandle, AgentPoolStatus dataclasses. AgentPool class with asyncio semaphores, run_task() full lifecycle (spawn Claude Code subprocess with --system-prompt + --mcp-config, stream stdout, parse JSON result, kill on timeout), warm reuse, metrics, feature-flag fallback to SwarmAgent. Unit tests.",
    },
    {
        "id":    "p051-06-tools",
        "name":  "PRD-051 Agent 06 — Specialist Tools (30+ tools)",
        "categories": {"tools"},
        "model": "claude-sonnet-4-5-20250929",
        "focus": "specialist_tools/: ToolResult base type, tool registry. researcher_tools.py: get_youtube_stats (MetricsLite), get_platform_metrics, safari_research (3106), get_top_creators. content_tools.py: generate_content_from_blueprint (ContentLite), render_video, workflow tools. acquisition_tools.py: send_dm (safari DM services), CRM tools. publisher_tools.py: enqueue_post (MPLite), timing, performance. watchdog_tools.py: check_all_services, restart_service, error logs. MetricsLite /api/youtube/stats endpoint.",
    },
    {
        "id":    "p051-07-orchestrator",
        "name":  "PRD-051 Agent 07 — Orchestrator Agent",
        "categories": {"orchestrator"},
        "model": "claude-opus-4-5",
        "focus": "orchestrator_agent.py: OrchestratorAgent class, intent classification (5 types), single-specialist dispatch, multi-step task decomposition (sequential + parallel with asyncio.gather), result synthesis via Claude API, conversation context per user_id persisted to Supabase, ACTP state enrichment from MCP, CONVERSATION fast path, self-healing PID file, feature-flag fallback, latency tracking. Unit tests + E2E tests.",
    },
    {
        "id":    "p051-08-infra",
        "name":  "PRD-051 Agent 08 — Testing, Infra, CI",
        "categories": {"testing", "infra"},
        "model": "claude-sonnet-4-5-20250929",
        "focus": "Comprehensive E2E test suite test_clawbot_mcp_mesh.py. start_all.sh: add actp_mcp_server + orchestrator startup sections. GitHub Actions CI for non-e2e tests. Wire AgentPool into SwarmOrchestrator (CMM-163). Specialist soul files. /meshstatus + /specialize Telegram commands. docs/CLAWBOT_MESH_GUIDE.md. git commit + push all new files.",
    },
]

# Assign features to agents
def assign(features, agents):
    assigned = {a["id"]: [] for a in agents}
    unassigned = []
    for feat in features:
        cat  = feat.get("category","")
        fid  = feat.get("id","")
        matched = False
        for a in agents:
            # Match by categories set
            if "categories" in a and cat in a["categories"]:
                assigned[a["id"]].append(feat)
                matched = True
                break
            # Match by ID prefix (covers mcp splits) — supports single or list
            prefixes = a.get("id_prefixes") or ([a["id_prefix"]] if "id_prefix" in a else [])
            if prefixes and any(fid.startswith(p) for p in prefixes):
                assigned[a["id"]].append(feat)
                matched = True
                break
        if not matched:
            unassigned.append(feat)
    return assigned, unassigned

assigned, unassigned = assign(all_features, AGENTS)

# Leftovers → agent 01 foundation
if unassigned:
    print(f"WARNING: {len(unassigned)} unassigned features → adding to p051-01-foundation")
    for f in unassigned: print(f"  {f['id']} ({f['category']})")
    assigned["p051-01-foundation"].extend(unassigned)

# Write sub-feature-lists
for agent in AGENTS:
    aid = agent["id"]
    feats = assigned[aid]
    out_path = os.path.join(FEAT_DIR, f"{aid}.json")
    with open(out_path, "w") as f:
        json.dump({"features": feats}, f, indent=2)
    print(f"Wrote {aid}.json: {len(feats)} features")

# Write parallel launch script
HAIKU  = "claude-haiku-4-5-20251001"
ROOT   = BASE.replace("/harness","")
WORKER = "/Users/isaiahdupree/Documents/Software/actp-worker"
HARNESS_JS = os.path.join(ROOT, "harness", "run-harness-v2.js")
PROMPTS_DIR = os.path.join(ROOT, "harness", "prompts")
MAIN_PROMPT = os.path.join(PROMPTS_DIR, "prd051-clawbot-mcp-mesh.md")

lines = [
    "#!/bin/bash",
    "# PRD-051 ClawBot MCP Agent Mesh — 8 Parallel Agents",
    f'H="{BASE}"',
    f'ROOT="{ROOT}"',
    f'WORKER="{WORKER}"',
    f'PROMPT="{MAIN_PROMPT}"',
    'mkdir -p "$H/logs"',
    "",
    "echo '=== PRD-051 Parallel Launch (8 agents) ==='",
    "",
    "# Kill any existing prd051 processes",
    "pkill -f 'project=p051-' 2>/dev/null",
    "pkill -f 'project=prd051' 2>/dev/null",
    "sleep 1",
    "",
    "launch() {",
    "  local id=$1 model=$2",
    "  local features=\"$H/features/${id}.json\"",
    "  local log=\"$H/logs/${id}.log\"",
    f'  node "{HARNESS_JS}" \\',
    '    --path="$WORKER" \\',
    '    --project="$id" \\',
    '    --model="$model" \\',
    f'    --fallback-model="{HAIKU}" \\',
    '    --max-retries=3 \\',
    '    --prompt="$PROMPT" \\',
    '    --feature-list="$features" \\',
    '    --adaptive-delay \\',
    '    --force-coding \\',
    '    --until-complete \\',
    '    >> "$log" 2>&1 &',
    '  echo "Launched $id model=$model PID=$!"',
    "}",
    "",
]

for agent in AGENTS:
    lines.append(f'launch "{agent["id"]}" "{agent["model"]}"')

lines += [
    "",
    "echo ''",
    "echo '8 agents running. Monitor:'",
    "echo \"  ps aux | grep p051 | grep -v grep | wc -l\"",
    "for id in " + " ".join(a["id"] for a in AGENTS) + "; do",
    "  echo \"  tail -f $H/logs/${id}.log\"",
    "done",
]

launch_path = os.path.join(BASE, "launch-prd051-parallel.sh")
with open(launch_path, "w") as f:
    f.write("\n".join(lines) + "\n")
os.chmod(launch_path, 0o755)
print(f"\nWrote launch script: {launch_path}")
print(f"Total features across all agents: {sum(len(assigned[a['id']]) for a in AGENTS)}")
