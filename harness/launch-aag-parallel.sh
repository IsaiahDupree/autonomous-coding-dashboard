#!/bin/bash
# Launch all AAG agents in parallel

SAFARI="/Users/isaiahdupree/Documents/Software/Safari Automation"
H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
OPUS="claude-opus-4-6"
SONNET="claude-sonnet-4-5-20250929"
HAIKU="claude-haiku-4-5-20251001"
ROOT="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"

mkdir -p "$H/logs"

launch() {
  local id=$1 model=$2 prompt=$3 features=$4
  local logfile="$H/logs/${id}.log"
  node "$ROOT/harness/run-harness-v2.js" \
    --path="$SAFARI" \
    --project="$id" \
    --model="$model" \
    --fallback-model="$HAIKU" \
    --max-retries=3 \
    --prompt="$H/prompts/$prompt" \
    --feature-list="$H/features/$features" \
    --adaptive-delay \
    --force-coding \
    --until-complete \
    >> "$logfile" 2>&1 &
  echo "Launched $id (PID=$!)"
}

# Kill any existing AAG harness processes first
pkill -f "project=aag-" 2>/dev/null
sleep 1

# Launch all 10 in parallel
launch "aag-01-foundation"   "$OPUS"   "aag-agent-01-foundation.md"        "aag-01-foundation.json"
launch "aag-02-discovery"    "$SONNET" "aag-agent-02-discovery.md"         "aag-02-discovery.json"
launch "aag-03-scoring"      "$SONNET" "aag-agent-03-scoring.md"           "aag-03-scoring.json"
launch "aag-04-warmup"       "$SONNET" "aag-agent-04-warmup.md"            "aag-04-warmup.json"
launch "aag-05-outreach"     "$SONNET" "aag-agent-05-outreach.md"          "aag-05-outreach.json"
launch "aag-06-followup"     "$SONNET" "aag-agent-06-followup.md"          "aag-06-followup.json"
launch "aag-07-orchestrator" "$OPUS"   "aag-agent-07-orchestrator.md"      "aag-07-orchestrator.json"
launch "aag-08-email"        "$SONNET" "aag-agent-08-email.md"             "aag-08-email.json"
launch "aag-09-entity"       "$SONNET" "aag-agent-09-entity-resolution.md" "aag-09-entity.json"
launch "aag-10-reporting"    "$SONNET" "aag-agent-10-reporting.md"         "aag-10-reporting.json"

echo ""
echo "All 10 agents launched. Monitor with:"
echo "  watch -n5 'ps aux | grep run-harness | grep aag | grep -v grep | wc -l'"
echo "  tail -f harness/logs/aag-01-foundation.log"
