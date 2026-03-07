#!/bin/bash
# dispatch-data-agents.sh
# Dispatches G-02, G-01, G-03 data collection agents to actp-worker via ACD harness
# Build order: InboxReplyHarvester → ContactPostEnricher → CompanyIntelligenceAgent
#
# Usage: bash harness/scripts/dispatch-data-agents.sh [--dry-run] [--agent G-01|G-02|G-03]
#
# WhatsCurrentlyInTheMarket integration note:
#   G-01 ContactPostEnricher uses RapidAPI (tiktok-scraper7, instagram-looter2)
#   from /Users/isaiahdupree/Documents/Software/WhatsCurrentlyInTheMarket
#   RAPIDAPI_KEY must be set in actp-worker/.env

ACD_ROOT="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"
TARGET_PATH="/Users/isaiahdupree/Documents/Software/actp-worker"
MODEL="claude-sonnet-4-6"
DRY_RUN=false

for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
  esac
done

mkdir -p "$ACD_ROOT/harness/logs" "$ACD_ROOT/harness/pids"

launch() {
  local slug="$1"
  local label="$2"
  local prompt_path="$ACD_ROOT/harness/prompts/${slug}.md"
  local feature_path="$ACD_ROOT/harness/features/${slug}.json"
  local log_file="$ACD_ROOT/harness/logs/${slug}.log"
  local pid_file="$ACD_ROOT/harness/pids/${slug}.pid"

  if [[ ! -f "$prompt_path" ]]; then echo "❌ Missing prompt: $prompt_path"; return 1; fi
  if [[ ! -f "$feature_path" ]]; then echo "❌ Missing features: $feature_path"; return 1; fi

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "🔍 [DRY RUN] $label → $slug (target: $TARGET_PATH)"
    return 0
  fi

  node "$ACD_ROOT/harness/run-harness-v2.js" \
    "--path=$TARGET_PATH" \
    "--project=$slug" \
    "--prompt=$prompt_path" \
    "--feature-list=$feature_path" \
    "--model=$MODEL" \
    "--fallback-model=claude-haiku-4-5-20251001" \
    "--max-retries=3" \
    "--adaptive-delay" \
    "--force-coding" \
    "--until-complete" \
    >> "$log_file" 2>&1 &

  local pid=$!
  echo "$pid" > "$pid_file"
  echo "  ✅ $label  PID=$pid  log=harness/logs/${slug}.log"
}

echo "======================================================"
echo " ACD Parallel Dispatch — Data Collection Agents"
echo " Target: $TARGET_PATH"
echo " Mode: ALL 3 launching simultaneously"
echo "======================================================"

# Launch all 3 in parallel — no waiting between them
launch "inbox-reply-harvester"     "G-02 InboxReplyHarvester"
launch "contact-post-enricher"     "G-01 ContactPostEnricher (RapidAPI)"
launch "company-intelligence-agent" "G-03 CompanyIntelligenceAgent"

echo ""
echo " Monitor:"
echo "  tail -f harness/logs/inbox-reply-harvester.log"
echo "  tail -f harness/logs/contact-post-enricher.log"
echo "  tail -f harness/logs/company-intelligence-agent.log"
echo "======================================================" 
