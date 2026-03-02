#!/bin/bash
# PRD-051 ClawBot MCP Agent Mesh — 8 Parallel Agents
H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
ROOT="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"
WORKER="/Users/isaiahdupree/Documents/Software/actp-worker"
PROMPT="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/prompts/prd051-clawbot-mcp-mesh.md"
mkdir -p "$H/logs"

echo '=== PRD-051 Parallel Launch (8 agents) ==='

# Kill any existing prd051 processes
pkill -f 'project=p051-' 2>/dev/null
pkill -f 'project=prd051' 2>/dev/null
sleep 1

launch() {
  local id=$1 model=$2
  local features="$H/features/${id}.json"
  local log="$H/logs/${id}.log"
  node "/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/run-harness-v2.js" \
    --path="$WORKER" \
    --project="$id" \
    --model="$model" \
    --fallback-model="claude-haiku-4-5-20251001" \
    --max-retries=3 \
    --prompt="$PROMPT" \
    --feature-list="$features" \
    --adaptive-delay \
    --force-coding \
    --until-complete \
    >> "$log" 2>&1 &
  echo "Launched $id model=$model PID=$!"
}

launch "p051-01-foundation" "claude-opus-4-5"
launch "p051-02-mcp-mesh" "claude-sonnet-4-5-20250929"
launch "p051-03-mcp-server" "claude-sonnet-4-5-20250929"
launch "p051-04-skills" "claude-sonnet-4-5-20250929"
launch "p051-05-agent-pool" "claude-sonnet-4-5-20250929"
launch "p051-06-tools" "claude-sonnet-4-5-20250929"
launch "p051-07-orchestrator" "claude-opus-4-5"
launch "p051-08-infra" "claude-sonnet-4-5-20250929"

echo ''
echo '8 agents running. Monitor:'
echo "  ps aux | grep p051 | grep -v grep | wc -l"
for id in p051-01-foundation p051-02-mcp-mesh p051-03-mcp-server p051-04-skills p051-05-agent-pool p051-06-tools p051-07-orchestrator p051-08-infra; do
  echo "  tail -f $H/logs/${id}.log"
done
