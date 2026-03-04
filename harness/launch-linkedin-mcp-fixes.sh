#!/bin/bash
# Launch ACD agent to implement LinkedIn MCP server fixes

H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
ROOT="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"
TARGET="/Users/isaiahdupree/Documents/Software/Safari Automation/packages/linkedin-automation"
SONNET="claude-sonnet-4-5-20250929"
HAIKU="claude-haiku-4-5-20251001"

mkdir -p "$H/logs"
LOG="$H/logs/linkedin-mcp-fixes.log"

echo "Launching LinkedIn MCP fixes agent..."
echo "Target: $TARGET"
echo "Prompt: $H/prompts/linkedin-mcp-server-fixes.md"
echo "Log:    $LOG"
echo ""

node "$ROOT/harness/run-harness-v2.js" \
  --path="$TARGET" \
  --project="linkedin-mcp-fixes" \
  --model="$SONNET" \
  --fallback-model="$HAIKU" \
  --max-retries=3 \
  --prompt="$H/prompts/linkedin-mcp-server-fixes.md" \
  --feature-list="$H/linkedin-mcp-fixes-features.json" \
  --adaptive-delay \
  --force-coding \
  --until-complete \
  2>&1 | tee "$LOG"
