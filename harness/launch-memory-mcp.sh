#!/bin/bash
H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
ROOT="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"
TARGET="/Users/isaiahdupree/Documents/Software/memory-mcp"
mkdir -p "$H/logs"

node "$ROOT/harness/run-harness-v2.js" --path="$TARGET" --project=memory-mcp --model=claude-sonnet-4-5-20250929 --fallback-model=claude-haiku-4-5-20251001 --max-retries=3 --prompt="$H/prompts/memory-mcp.md" --feature-list="$H/memory-mcp-features.json" --adaptive-delay --force-coding --until-complete >> "$H/logs/memory-mcp.log" 2>&1 &
echo "PID=$!"
