#!/bin/bash
H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
ROOT="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"
TARGET="/Users/isaiahdupree/Documents/Software/gtm-engineering-agents"
mkdir -p "$H/logs"
mkdir -p "$TARGET"

echo "Launching gtm-engineering-agents..."
node "$ROOT/harness/run-harness-v2.js" --path="$TARGET" --project=gtm-engineering-agents --model=claude-sonnet-4-5-20250929 --fallback-model=claude-haiku-4-5-20251001 --max-retries=3 --prompt="$H/prompts/gtm-engineering-agents.md" --feature-list="$H/gtm-engineering-features.json" --adaptive-delay --force-coding --until-complete >> "$H/logs/gtm-engineering-agents.log" 2>&1 &
echo "  PID=$!"
echo ""
echo "GTM Engineering agent launched."
