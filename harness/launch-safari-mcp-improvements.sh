#!/bin/bash
H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
ROOT="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"
SA="/Users/isaiahdupree/Documents/Software/Safari Automation"
mkdir -p "$H/logs"

echo "Launching instagram-mcp-improvements..."
node "$ROOT/harness/run-harness-v2.js" --path="$SA/packages/instagram-dm" --project=instagram-mcp-improvements --model=claude-sonnet-4-5-20250929 --fallback-model=claude-haiku-4-5-20251001 --max-retries=3 --prompt="$H/prompts/instagram-mcp-improvements.md" --feature-list="$H/instagram-mcp-features.json" --adaptive-delay --force-coding --until-complete >> "$H/logs/instagram-mcp-improvements.log" 2>&1 &
echo "  PID=$!"

sleep 8

echo "Launching twitter-mcp-improvements..."
node "$ROOT/harness/run-harness-v2.js" --path="$SA/packages/twitter-dm" --project=twitter-mcp-improvements --model=claude-sonnet-4-5-20250929 --fallback-model=claude-haiku-4-5-20251001 --max-retries=3 --prompt="$H/prompts/twitter-mcp-improvements.md" --feature-list="$H/twitter-mcp-features.json" --adaptive-delay --force-coding --until-complete >> "$H/logs/twitter-mcp-improvements.log" 2>&1 &
echo "  PID=$!"

sleep 8

echo "Launching tiktok-mcp-improvements..."
node "$ROOT/harness/run-harness-v2.js" --path="$SA/packages/tiktok-dm" --project=tiktok-mcp-improvements --model=claude-sonnet-4-5-20250929 --fallback-model=claude-haiku-4-5-20251001 --max-retries=3 --prompt="$H/prompts/tiktok-mcp-improvements.md" --feature-list="$H/tiktok-mcp-features.json" --adaptive-delay --force-coding --until-complete >> "$H/logs/tiktok-mcp-improvements.log" 2>&1 &
echo "  PID=$!"

sleep 8

echo "Launching upwork-mcp-improvements..."
node "$ROOT/harness/run-harness-v2.js" --path="$SA/packages/upwork-automation" --project=upwork-mcp-improvements --model=claude-sonnet-4-5-20250929 --fallback-model=claude-haiku-4-5-20251001 --max-retries=3 --prompt="$H/prompts/upwork-mcp-improvements.md" --feature-list="$H/upwork-mcp-features.json" --adaptive-delay --force-coding --until-complete >> "$H/logs/upwork-mcp-improvements.log" 2>&1 &
echo "  PID=$!"

echo ""
echo "All 4 Safari MCP agents launched."
