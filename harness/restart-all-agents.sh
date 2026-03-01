#!/bin/bash
# restart-all-agents.sh
# Restarts all ACD harness agents in new process sessions (immune to terminal closure).
# Usage: bash harness/restart-all-agents.sh

set -e

HARNESS="$HOME/Documents/Software/autonomous-coding-dashboard/harness/run-harness-v2.js"
PARALLEL="$HOME/Documents/Software/autonomous-coding-dashboard/harness/run-parallel.js"
PROMPTS="$HOME/Documents/Software/autonomous-coding-dashboard/harness/prompts"
LOGS="$HOME/Documents/Software/autonomous-coding-dashboard/harness/logs/agent-prds"
ACTP="$HOME/Documents/Software/actp-worker"
SW="$HOME/Documents/Software"

mkdir -p "$LOGS"

launch() {
  local label="$1"; shift
  # nohup ignores SIGHUP; < /dev/null detaches stdin; disown removes from job table
  nohup node "$@" < /dev/null >> "$LOGS/${label}.log" 2>&1 &
  disown $!
  echo "  ✓ $label  (PID $!)"
}

echo "=== ACD Harness Restart $(date -u '+%Y-%m-%dT%H:%M:%SZ') ==="

echo ""
echo "→ Parallel controller (10 workers)..."
nohup node "$PARALLEL" --workers=10 \
  < /dev/null >> "$HOME/Documents/Software/autonomous-coding-dashboard/harness/logs/parallel-controller.log" 2>&1 &
disown $!
echo "  ✓ run-parallel --workers=10  (PID $!)"

sleep 2   # let parallel controller spin up before standalone agents compete for rate limits

echo ""
echo "→ Standalone agents..."

launch "prd-119-product-launch-agent" "$HARNESS" \
  --path="$ACTP" \
  --project=prd-119-product-launch-agent \
  --model=claude-opus-4-6 \
  --fallback-model=claude-sonnet-4-5-20250929 \
  --max-retries=3 \
  --prompt="$PROMPTS/prd-119-product-launch-agent.md" \
  --feature-list="$ACTP/prd-119-features.json" \
  --adaptive-delay --force-coding --until-complete

launch "prd-120-cross-agent-goal-optimizer" "$HARNESS" \
  --path="$ACTP" \
  --project=prd-120-cross-agent-goal-optimizer \
  --model=claude-opus-4-6 \
  --fallback-model=claude-sonnet-4-5-20250929 \
  --max-retries=3 \
  --prompt="$PROMPTS/prd-120-cross-agent-goal-optimizer.md" \
  --feature-list="$ACTP/prd-120-features.json" \
  --adaptive-delay --force-coding --until-complete

launch "softwarehub-products" "$HARNESS" \
  --path="$SW/SoftwareHub" \
  --project=softwarehub-products \
  --model=claude-sonnet-4-5-20250929 \
  --fallback-model=claude-haiku-4-5-20251001 \
  --max-retries=3 \
  --prompt="$PROMPTS/softwarehub-products.md" \
  --feature-list="$HOME/Documents/Software/autonomous-coding-dashboard/docs/feature_list_softwarehub_products.json" \
  --adaptive-delay --force-coding --until-complete

launch "prd-104-revenue-analytics-agent" "$HARNESS" \
  --path="$ACTP" \
  --project=prd-104-revenue-analytics-agent \
  --model=claude-sonnet-4-5-20250929 \
  --fallback-model=claude-haiku-4-5-20251001 \
  --max-retries=3 \
  --prompt="$PROMPTS/prd-104-revenue-analytics-agent.md" \
  --feature-list="$ACTP/prd-104-features.json" \
  --adaptive-delay --force-coding --until-complete

launch "prd-112-social-media-domain-agent" "$HARNESS" \
  --path="$ACTP" \
  --project=prd-112-social-media-domain-agent \
  --model=claude-sonnet-4-5-20250929 \
  --fallback-model=claude-sonnet-4-5-20250929 \
  --max-retries=3 \
  --prompt="$PROMPTS/prd-112-social-media-domain-agent.md" \
  --feature-list="$ACTP/prd-112-features.json" \
  --adaptive-delay --force-coding --until-complete

launch "prd-113-content-creation-domain-agent" "$HARNESS" \
  --path="$ACTP" \
  --project=prd-113-content-creation-domain-agent \
  --model=claude-sonnet-4-5-20250929 \
  --fallback-model=claude-sonnet-4-5-20250929 \
  --max-retries=3 \
  --prompt="$PROMPTS/prd-113-content-creation-domain-agent.md" \
  --feature-list="$ACTP/prd-113-features.json" \
  --adaptive-delay --force-coding --until-complete

launch "prd-114-acquisition-domain-agent" "$HARNESS" \
  --path="$ACTP" \
  --project=prd-114-acquisition-domain-agent \
  --model=claude-sonnet-4-5-20250929 \
  --fallback-model=claude-sonnet-4-5-20250929 \
  --max-retries=3 \
  --prompt="$PROMPTS/prd-114-acquisition-domain-agent.md" \
  --feature-list="$ACTP/prd-114-features.json" \
  --adaptive-delay --force-coding --until-complete

launch "prd-115-revenue-analytics-domain-agent" "$HARNESS" \
  --path="$ACTP" \
  --project=prd-115-revenue-analytics-domain-agent \
  --model=claude-sonnet-4-5-20250929 \
  --fallback-model=claude-sonnet-4-5-20250929 \
  --max-retries=3 \
  --prompt="$PROMPTS/prd-115-revenue-analytics-domain-agent.md" \
  --feature-list="$ACTP/prd-115-features.json" \
  --adaptive-delay --force-coding --until-complete

# prd-121 first (serialized), watch script auto-launches prd-122 when done
launch "prd-121-mcp-registry-discovery" "$HARNESS" \
  --path="$ACTP" \
  --project=prd-121-mcp-registry-discovery \
  --model=claude-sonnet-4-5-20250929 \
  --fallback-model=claude-haiku-4-5-20251001 \
  --max-retries=3 \
  --prompt="$PROMPTS/prd-121-mcp-registry-discovery.md" \
  --feature-list="$ACTP/prd-121-features.json" \
  --adaptive-delay --force-coding --until-complete

echo ""
echo "→ Starting prd-121→122 watch (auto-launches prd-122 when prd-121 hits 100%)..."
nohup bash "$HOME/Documents/Software/autonomous-coding-dashboard/harness/watch-prd-121-then-launch-122.sh" \
  < /dev/null >> "$HOME/Documents/Software/autonomous-coding-dashboard/harness/logs/watch-121-122.log" 2>&1 &
disown $!
echo "  ✓ watch-prd-121-then-launch-122  (PID $!)"

echo ""
echo "=== All agents launched. Verify with:"
echo "    ps aux | grep run-harness | grep -v grep | wc -l"
echo "    curl -s http://localhost:3535/api/agent-status | python3 -m json.tool | grep 'suspended\|slug'"
