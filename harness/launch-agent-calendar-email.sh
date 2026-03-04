#!/bin/bash
H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
ROOT="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"
TARGET="/Users/isaiahdupree/Documents/Software/agent-comms"
mkdir -p "$H/logs"
mkdir -p "$TARGET"

echo "Launching agent-calendar-email..."
node "$ROOT/harness/run-harness-v2.js" --path="$TARGET" --project=agent-calendar-email --model=claude-sonnet-4-5-20250929 --fallback-model=claude-haiku-4-5-20251001 --max-retries=3 --prompt="$H/prompts/agent-calendar-email.md" --feature-list="$H/agent-calendar-email-features.json" --adaptive-delay --force-coding --until-complete >> "$H/logs/agent-calendar-email.log" 2>&1 &
echo "  PID=$!"
echo ""
echo "Agent Calendar + Email system agent launched."
