#!/bin/bash
H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
ROOT="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"
TARGET="/Users/isaiahdupree/Documents/Software/Safari Automation"
mkdir -p "$H/logs"

echo "Launching mcp-server-upgrades..."
node "$ROOT/harness/run-harness-v2.js" --path="$TARGET" --project=mcp-server-upgrades --model=claude-sonnet-4-5-20250929 --fallback-model=claude-haiku-4-5-20251001 --max-retries=3 --prompt="$H/prompts/mcp-server-upgrades.md" --feature-list="$H/mcp-server-upgrades-features.json" --adaptive-delay --force-coding --until-complete >> "$H/logs/mcp-server-upgrades.log" 2>&1 &
echo "  PID=$!"
echo "MCP Server Upgrades agent launched."
