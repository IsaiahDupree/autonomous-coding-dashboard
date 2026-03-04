#!/bin/bash
H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
ROOT="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"
TARGET="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"
mkdir -p "$H/logs"

echo "Launching acd-dispatch..."
node "$ROOT/harness/run-harness-v2.js" --path="$TARGET" --project=acd-dispatch --model=claude-sonnet-4-5-20250929 --fallback-model=claude-haiku-4-5-20251001 --max-retries=3 --prompt="$H/prompts/acd-dispatch.md" --feature-list="$H/acd-dispatch-features.json" --adaptive-delay --force-coding --until-complete >> "$H/logs/acd-dispatch.log" 2>&1 &
echo "  PID=$!"
echo "ACD Dispatch agent launched."
