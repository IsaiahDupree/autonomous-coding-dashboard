#!/bin/bash

# Start DemandRadar Autonomous Coding Harness
# ============================================

echo "🚀 Starting DemandRadar Autonomous Coding Session"
echo "=================================================="
echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEMANDRADAR_PATH="/Users/isaiahdupree/Documents/Software/WhatsCurrentlyInTheMarket/gap-radar"
PROMPT_FILE="$PROJECT_ROOT/harness/prompts/demandradar.md"

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Claude API key
if [ -z "$CLAUDE_CODE_OAUTH_TOKEN" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  No API key found. Attempting to source from Claude Code..."
    if [ -f "$PROJECT_ROOT/scripts/get-claude-key.sh" ]; then
        export CLAUDE_CODE_OAUTH_TOKEN=$("$PROJECT_ROOT/scripts/get-claude-key.sh")
    fi
fi

if [ -z "$CLAUDE_CODE_OAUTH_TOKEN" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "❌ Error: No Claude API key found"
    echo "   Set CLAUDE_CODE_OAUTH_TOKEN or ANTHROPIC_API_KEY"
    exit 1
fi
echo "✅ Claude API key found"

# Check DemandRadar project exists
if [ ! -d "$DEMANDRADAR_PATH" ]; then
    echo "❌ Error: DemandRadar project not found at $DEMANDRADAR_PATH"
    exit 1
fi
echo "✅ DemandRadar project found"

# Check prompt file exists
if [ ! -f "$PROMPT_FILE" ]; then
    echo "❌ Error: Prompt file not found at $PROMPT_FILE"
    exit 1
fi
echo "✅ Prompt file found"

echo ""
echo "📊 Project: DemandRadar"
echo "📁 Path: $DEMANDRADAR_PATH"
echo "📝 Tasks: 45 remaining (see AGENT_TASKS.md)"
echo "🎯 Focus: Report Generation (Sprint 1)"
echo ""

# Parse arguments
MAX_SESSIONS=${1:-100}
echo "⏱️  Max sessions: $MAX_SESSIONS"
echo ""

# Update harness status
cat > "$PROJECT_ROOT/harness-status.json" << EOF
{
  "project": "demandradar",
  "status": "running",
  "startTime": "$(date -Iseconds)",
  "maxSessions": $MAX_SESSIONS,
  "currentTask": "TASK-001: Report Detail Page Structure"
}
EOF

echo "🏃 Starting harness..."
echo "   Logs: $PROJECT_ROOT/harness-output.log"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start the harness with DemandRadar prompt
cd "$PROJECT_ROOT"
node harness/run-harness-v2.js \
    --project demandradar \
    --path "$DEMANDRADAR_PATH" \
    --prompt "$PROMPT_FILE" \
    --max-sessions "$MAX_SESSIONS" \
    2>&1 | tee -a harness-output.log
