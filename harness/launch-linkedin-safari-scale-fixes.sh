#!/bin/bash
H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
ROOT="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"
SA="/Users/isaiahdupree/Documents/Software/Safari Automation"
mkdir -p "$H/logs"

echo "Launching linkedin-safari-scale-fixes..."
node "$ROOT/harness/run-harness-v2.js" --path="$SA/packages/linkedin-automation" --project=linkedin-safari-scale-fixes --model=claude-sonnet-4-5-20250929 --fallback-model=claude-haiku-4-5-20251001 --max-retries=3 --prompt="$H/prompts/linkedin-safari-scale-fixes.md" --feature-list="$H/linkedin-safari-scale-features.json" --adaptive-delay --force-coding --until-complete >> "$H/logs/linkedin-safari-scale-fixes.log" 2>&1 &
echo "  PID=$!"
echo ""
echo "LinkedIn Safari scale fixes agent launched."
