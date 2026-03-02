#!/bin/bash
# Launch PRD-051 — ClawBot MCP Agent Mesh
# Runs on actp-worker repo at highest priority

WORKER="/Users/isaiahdupree/Documents/Software/actp-worker"
H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
ROOT="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"

OPUS="claude-opus-4-5"
SONNET="claude-sonnet-4-5-20250929"
HAIKU="claude-haiku-4-5-20251001"

mkdir -p "$H/logs"
LOG="$H/logs/prd051-clawbot-mcp-mesh.log"

echo "=== PRD-051 ClawBot MCP Agent Mesh ===" | tee -a "$LOG"
echo "Target: $WORKER" | tee -a "$LOG"
echo "Features: $H/features/prd051-clawbot-mcp-mesh.json" | tee -a "$LOG"
echo "Prompt:   $H/prompts/prd051-clawbot-mcp-mesh.md" | tee -a "$LOG"
echo "Started:  $(date)" | tee -a "$LOG"
echo "" | tee -a "$LOG"

# Validate all paths before launch
if [ ! -d "$WORKER" ]; then
  echo "ERROR: actp-worker not found at $WORKER" | tee -a "$LOG"
  exit 1
fi
if [ ! -f "$H/features/prd051-clawbot-mcp-mesh.json" ]; then
  echo "ERROR: feature list not found" | tee -a "$LOG"
  exit 1
fi
if [ ! -f "$H/prompts/prd051-clawbot-mcp-mesh.md" ]; then
  echo "ERROR: prompt not found" | tee -a "$LOG"
  exit 1
fi

echo "✓ All paths validated" | tee -a "$LOG"
echo "Launching harness..." | tee -a "$LOG"

# Kill any existing prd051 harness processes
pkill -f "project=prd051" 2>/dev/null
sleep 1

node "$ROOT/harness/run-harness-v2.js" \
  --path="$WORKER" \
  --project="prd051-clawbot-mcp-mesh" \
  --model="$OPUS" \
  --fallback-model="$SONNET" \
  --max-retries=3 \
  --prompt="$H/prompts/prd051-clawbot-mcp-mesh.md" \
  --feature-list="$H/features/prd051-clawbot-mcp-mesh.json" \
  --adaptive-delay \
  --force-coding \
  --until-complete \
  >> "$LOG" 2>&1 &

PID=$!
echo "Launched PID=$PID" | tee -a "$LOG"
echo ""
echo "Monitor with:"
echo "  tail -f $LOG"
echo "  ps aux | grep prd051 | grep -v grep"
