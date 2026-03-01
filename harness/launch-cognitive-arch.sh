#!/bin/bash
# Launch 5 Cognitive Architecture PRDs in parallel
# PRD-100: Cognitive Orchestrator Terminal
# PRD-101: Agent Spawner & Self-Healing System
# PRD-102: Content Generation Agent
# PRD-103: Autonomous Acquisition Agent
# PRD-104: Revenue & Analytics Agent

H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
ROOT="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"
ACTP="/Users/isaiahdupree/Documents/Software/actp-worker"
OPUS="claude-opus-4-6"
SONNET="claude-sonnet-4-5-20250929"
HAIKU="claude-haiku-4-5-20251001"

mkdir -p "$H/logs"

launch() {
  local id=$1 model=$2 path=$3 prompt=$4 features=$5
  local logfile="$H/logs/${id}.log"
  echo "🚀 Launching $id → $logfile"
  node "$ROOT/harness/run-harness-v2.js" \
    --path="$path" \
    --project="$id" \
    --model="$model" \
    --fallback-model="$HAIKU" \
    --max-retries=5 \
    --prompt="$prompt" \
    --feature-list="$features" \
    --adaptive-delay \
    --force-coding \
    --until-complete \
    >> "$logfile" 2>&1 &
  echo "  PID=$!"
}

# Kill any stale processes for these projects
pkill -f "project=prd-100" 2>/dev/null
pkill -f "project=prd-101" 2>/dev/null
pkill -f "project=prd-102" 2>/dev/null
pkill -f "project=prd-103" 2>/dev/null
pkill -f "project=prd-104" 2>/dev/null
sleep 1

# PRD-100: Cognitive Orchestrator Terminal (OPUS — most complex, system brain)
launch "prd-100-cognitive-orchestrator" \
  "$OPUS" \
  "$ACTP" \
  "$H/prompts/prd-100-cognitive-orchestrator.md" \
  "$ACTP/prd-100-features.json"

# PRD-101: Agent Spawner & Self-Healing (OPUS — critical reliability system)
launch "prd-101-agent-spawner" \
  "$OPUS" \
  "$ACTP" \
  "$H/prompts/prd-101-agent-spawner.md" \
  "$ACTP/prd-101-features.json"

# PRD-102: Content Generation Agent (SONNET — drives 1M followers / 100K views)
launch "prd-102-content-generation-agent" \
  "$SONNET" \
  "$ACTP" \
  "$H/prompts/prd-102-content-generation-agent.md" \
  "$ACTP/prd-102-features.json"

# PRD-103: Autonomous Acquisition Agent (SONNET — drives $5K+/month revenue)
launch "prd-103-acquisition-agent" \
  "$SONNET" \
  "$ACTP" \
  "$H/prompts/prd-103-acquisition-agent.md" \
  "$ACTP/prd-103-features.json"

# PRD-104: Revenue & Analytics Agent (SONNET — tracks all goals, fires alerts)
launch "prd-104-revenue-analytics-agent" \
  "$SONNET" \
  "$ACTP" \
  "$H/prompts/prd-104-revenue-analytics-agent.md" \
  "$ACTP/prd-104-features.json"

echo ""
echo "✅ 5 Cognitive Architecture agents launched in parallel"
echo ""
echo "📋 PRDs:"
echo "   PRD-100: Cognitive Orchestrator Terminal    → 40 features"
echo "   PRD-101: Agent Spawner & Self-Healing       → 50 features"
echo "   PRD-102: Content Generation Agent           → 50 features"
echo "   PRD-103: Autonomous Acquisition Agent       → 50 features"
echo "   PRD-104: Revenue & Analytics Agent          → 60 features"
echo ""
echo "📊 Monitor:"
echo "   tail -f $H/logs/prd-100-cognitive-orchestrator.log"
echo "   tail -f $H/logs/prd-101-agent-spawner.log"
echo "   tail -f $H/logs/prd-102-content-generation-agent.log"
echo "   tail -f $H/logs/prd-103-acquisition-agent.log"
echo "   tail -f $H/logs/prd-104-revenue-analytics-agent.log"
echo ""
echo "🔍 Check completion:"
echo "   python3 /tmp/check_pending2.py 2>/dev/null | grep prd-10"
