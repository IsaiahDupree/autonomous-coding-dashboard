#!/bin/bash
# Launch the autonomous prospect swarm agents
# Agents: ig-e2e-integration, tiktok-browser-agent, upwork-autonomous-builder

H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
ROOT="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"
SAFARI="/Users/isaiahdupree/Documents/Software/Safari Automation"
SONNET="claude-sonnet-4-6"
HAIKU="claude-haiku-4-5-20251001"

mkdir -p "$H/logs" "$H/pids"

launch() {
  local id=$1 model=$2 target=$3 prompt=$4 features=$5
  local logfile="$H/logs/${id}.log"
  echo "[$(date -u +%FT%TZ)] Launching $id → $logfile" | tee -a "$logfile"
  # Unset CLAUDECODE so nested Claude Code sessions are allowed
  env -u CLAUDECODE node "$ROOT/harness/run-harness-v2.js" \
    --path="$target" \
    --project="$id" \
    --model="$model" \
    --fallback-model="$HAIKU" \
    --max-retries=3 \
    --prompt="$prompt" \
    --feature-list="$features" \
    --adaptive-delay \
    --force-coding \
    --until-complete \
    >> "$logfile" 2>&1 &
  local pid=$!
  echo "$pid" > "$H/pids/${id}.pid"
  echo "Launched $id (PID=$pid) → $logfile"
}

# Kill any existing prospect swarm processes
pkill -f "project=ig-e2e-integration\|project=tiktok-browser-agent\|project=upwork-autonomous-builder" 2>/dev/null
sleep 1

# Agent 1: Instagram E2E integration + new endpoints
launch "ig-e2e-integration" "$SONNET" \
  "$SAFARI/packages/instagram-dm" \
  "$H/prompts/ig-e2e-integration.md" \
  "$H/ig-e2e-integration-features.json"

# Agent 2: TikTok browser agent (new package from scratch)
launch "tiktok-browser-agent" "$SONNET" \
  "$SAFARI" \
  "$H/prompts/tiktok-browser-agent.md" \
  "$H/tiktok-browser-agent-features.json"

# Agent 3: Upwork autonomous builder (new package)
launch "upwork-autonomous-builder" "$SONNET" \
  "$SAFARI" \
  "$H/prompts/upwork-autonomous-builder.md" \
  "$H/upwork-autonomous-builder-features.json"

echo ""
echo "=== Prospect Swarm Launched ==="
echo "Monitor:"
echo "  tail -f $H/logs/ig-e2e-integration.log"
echo "  tail -f $H/logs/tiktok-browser-agent.log"
echo "  tail -f $H/logs/upwork-autonomous-builder.log"
echo "  ps aux | grep run-harness | grep -v grep"
