#!/bin/bash
H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
ROOT="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"
TARGET="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"
mkdir -p "$H/logs"

echo "Launching acd-memory..."
node "$ROOT/harness/run-harness-v2.js" --path="$TARGET" --project=acd-memory --model=claude-sonnet-4-5-20250929 --fallback-model=claude-haiku-4-5-20251001 --max-retries=3 --prompt="$H/prompts/acd-memory.md" --feature-list="$H/acd-memory-features.json" --adaptive-delay --force-coding --until-complete >> "$H/logs/acd-memory.log" 2>&1 &
echo "  PID=$!"
echo "ACD Memory agent launched."
