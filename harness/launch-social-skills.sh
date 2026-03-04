#!/bin/bash
H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
ROOT="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"
TARGET="/Users/isaiahdupree/Documents/Software/skills"
mkdir -p "$H/logs"
mkdir -p "$TARGET"

echo "Launching social-skills..."
node "$ROOT/harness/run-harness-v2.js" --path="$TARGET" --project=social-skills --model=claude-sonnet-4-5-20250929 --fallback-model=claude-haiku-4-5-20251001 --max-retries=3 --prompt="$H/prompts/social-skills.md" --feature-list="$H/social-skills-features.json" --adaptive-delay --force-coding --until-complete >> "$H/logs/social-skills.log" 2>&1 &
echo "  PID=$!"
echo "Social Skills agent launched."
