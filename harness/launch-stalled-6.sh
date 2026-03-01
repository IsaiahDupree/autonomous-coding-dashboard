#!/bin/bash
# Restart 6 stalled repos + mediaposter (4 left)
# All have partial progress — harness will skip completed features

H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
ROOT="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"
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

# Kill stale processes
pkill -f "project=mediaposter$" 2>/dev/null
pkill -f "project=programmatic-ads" 2>/dev/null
pkill -f "project=content-factory" 2>/dev/null
pkill -f "project=lead-form-management" 2>/dev/null
pkill -f "project=cross-system-integration" 2>/dev/null
pkill -f "project=softwarehub-products" 2>/dev/null
sleep 1

# mediaposter — 4 features left (fastest)
launch "mediaposter" \
  "$SONNET" \
  "/Users/isaiahdupree/Documents/Software/MediaPoster" \
  "prompts/mediaposter.md" \
  "/Users/isaiahdupree/Documents/Software/MediaPoster/feature_list.json"

# cross-system-integration — 65 features left
launch "cross-system-integration" \
  "$SONNET" \
  "$ROOT" \
  "prompts/cross-system-integration.md" \
  "$ROOT/docs/feature_list_cross_system_integration.json"

# softwarehub-products — 155 features left
launch "softwarehub-products" \
  "$SONNET" \
  "/Users/isaiahdupree/Documents/Software/SoftwareHub" \
  "prompts/softwarehub-products.md" \
  "$ROOT/docs/feature_list_softwarehub_products.json"

# lead-form-management — 175 features left
launch "lead-form-management" \
  "$SONNET" \
  "/Users/isaiahdupree/Documents/Software/WaitlistLabapp" \
  "prompts/lead-form-management.md" \
  "/Users/isaiahdupree/Documents/Software/WaitlistLabapp/feature_list_lead_forms.json"

# content-factory — 180 features left
launch "content-factory" \
  "$SONNET" \
  "$ROOT" \
  "prompts/content-factory.md" \
  "$ROOT/docs/feature_list_content_factory.json"

# programmatic-ads — 180 features left
launch "programmatic-ads" \
  "$SONNET" \
  "$ROOT" \
  "prompts/programmatic-ads.md" \
  "$ROOT/docs/feature_list_programmatic_ads.json"

echo ""
echo "✅ 6 agents launched. prd-010 already running separately."
echo ""
echo "📊 Remaining work:"
echo "   mediaposter:             4 features  (~5 min)"
echo "   cross-system-integration: 65 features (~45 min)"
echo "   softwarehub-products:   155 features (~1.75h)"
echo "   lead-form-management:   175 features (~2h)"
echo "   content-factory:        180 features (~2h)"
echo "   programmatic-ads:       180 features (~2h)"
echo ""
echo "⏰ Slowest repo done by: ~$(date -v+2H30M '+%I:%M %p %Z') — well before 11 AM"
echo ""
echo "Monitor: tail -f $H/logs/cross-system-integration.log"
