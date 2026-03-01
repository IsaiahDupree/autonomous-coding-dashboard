#!/bin/bash
# Launch top-10 priority repos in parallel (10 agents)
# Targets: PRD-009 through PRD-017 + mediaposter

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
    --max-retries=3 \
    --prompt="$H/$prompt" \
    --feature-list="$features" \
    --adaptive-delay \
    --force-coding \
    --until-complete \
    >> "$logfile" 2>&1 &
  echo "  PID=$!"
}

# Kill any stale harness processes for these projects
pkill -f "project=prd-00[0-9]" 2>/dev/null
pkill -f "project=prd-01[0-9]" 2>/dev/null
pkill -f "project=prd-020" 2>/dev/null
pkill -f "project=mediaposter" 2>/dev/null
sleep 1

# --- Batch A: Highest priority (run immediately) ---
launch "prd-009-openqualls-bot" \
  "$OPUS" "$ACTP" \
  "prompts/prd-009-openqualls-bot.md" \
  "$ACTP/prd-009-features.json"

launch "prd-011-research-to-publish" \
  "$SONNET" "$ACTP" \
  "prompts/prd-011-research-to-publish.md" \
  "$ACTP/prd-011-features.json"

launch "prd-010-actp-pipeline" \
  "$SONNET" "/Users/isaiahdupree/Documents/Software/contentlite" \
  "prompts/prd-010-actp-pipeline.md" \
  "/Users/isaiahdupree/Documents/Software/contentlite/feature_list.json"

launch "prd-012-revenue-engine" \
  "$SONNET" "$ACTP" \
  "prompts/prd-012-revenue-engine.md" \
  "$ACTP/prd-012-features.json"

launch "prd-013-security-self-test" \
  "$SONNET" "$ACTP" \
  "prompts/prd-013-security-self-test.md" \
  "$ACTP/prd-013-features.json"

# --- Batch B: Next tier ---
launch "prd-020-chat-gateway" \
  "$SONNET" "$ACTP" \
  "prompts/prd-020-chat-gateway.md" \
  "$ACTP/prd-020-features.json"

launch "prd-014-conversation-memory" \
  "$SONNET" "$ACTP" \
  "prompts/prd-014-conversation-memory.md" \
  "$ACTP/prd-014-features.json"

launch "prd-015-temporal-scheduler" \
  "$SONNET" "$ACTP" \
  "prompts/prd-015-temporal-scheduler.md" \
  "$ACTP/prd-015-features.json"

launch "prd-017-research-worker" \
  "$SONNET" "$ACTP" \
  "prompts/prd-017-research-worker.md" \
  "$ACTP/prd-017-features.json"

launch "mediaposter-lite" \
  "$SONNET" "/Users/isaiahdupree/Documents/Software/mediaposter-lite" \
  "prompts/mplite.md" \
  "/Users/isaiahdupree/Documents/Software/mediaposter-lite/feature_list.json"

echo ""
echo "✅ 10 agents launched. Monitor with:"
echo "   tail -f $H/logs/prd-009-openqualls-bot.log"
echo "   ls -la $H/logs/"
echo ""
echo "⏰ Target: 11 AM — $(date -v+9H '+%I:%M %p %Z')"
