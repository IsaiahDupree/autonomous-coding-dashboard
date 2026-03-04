#!/bin/bash
H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
ROOT="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"
TARGET="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"
mkdir -p "$H/logs"

echo "Launching acd-orchestration..."
node "$ROOT/harness/run-harness-v2.js" --path="$TARGET" --project=acd-orchestration --model=claude-sonnet-4-5-20250929 --fallback-model=claude-haiku-4-5-20251001 --max-retries=3 --prompt="$H/prompts/acd-orchestration.md" --feature-list="$H/acd-orchestration-features.json" --adaptive-delay --force-coding --until-complete >> "$H/logs/acd-orchestration.log" 2>&1 &
echo "  PID=$!"
echo "ACD Orchestration agent launched."
