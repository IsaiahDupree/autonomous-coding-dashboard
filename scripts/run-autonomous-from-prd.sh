#!/bin/bash
# Run autonomous coding harness on a project directory with PRD

set -e

PROJECT_DIR=${1:-""}
MAX_SESSIONS=${2:-10}

if [ -z "$PROJECT_DIR" ] || [ ! -d "$PROJECT_DIR" ]; then
    echo "Usage: $0 <project-directory> [max-sessions]"
    echo ""
    echo "Example:"
    echo "  $0 test-projects/my-app 5"
    echo ""
    echo "Available projects:"
    ls -d test-projects/*/ 2>/dev/null | sed 's|test-projects/||' | sed 's|/$||' | sed 's/^/  - /' || echo "  (none)"
    exit 1
fi

cd "$(dirname "$0")/.."

# Check if PRD exists
if [ ! -f "${PROJECT_DIR}/PRD.md" ]; then
    echo "⚠️  Warning: PRD.md not found in ${PROJECT_DIR}"
    echo "   The initializer will create features from the project structure"
fi

# Check for Claude CLI
if ! command -v claude &> /dev/null; then
    echo "❌ Claude CLI not found"
    echo "   Install with: npm install -g @anthropic-ai/claude-code"
    exit 1
fi

# Source API key
if [ -z "$CLAUDE_CODE_OAUTH_TOKEN" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
    KEY=$(bash scripts/get-claude-key.sh 2>/dev/null || echo "")
    if [ -n "$KEY" ] && [ "$KEY" != "ERROR"* ]; then
        export CLAUDE_CODE_OAUTH_TOKEN="$KEY"
        echo "✅ Sourced API key from Claude Code"
    else
        echo "❌ Could not find API key"
        exit 1
    fi
fi

echo "🚀 Starting Autonomous Coding Harness"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📁 Project: ${PROJECT_DIR}"
echo "📄 PRD: $(test -f "${PROJECT_DIR}/PRD.md" && echo 'PRD.md' || echo 'Will be created')"
echo "🔢 Max Sessions: ${MAX_SESSIONS}"
echo ""

# Copy harness files to project if needed
if [ ! -f "${PROJECT_DIR}/harness/run-harness-v2.js" ]; then
    echo "📦 Setting up harness in project..."
    mkdir -p "${PROJECT_DIR}/harness"
    cp -r harness/* "${PROJECT_DIR}/harness/" 2>/dev/null || {
        echo "⚠️  Could not copy harness files, using global harness"
    }
fi

# Run harness
cd "${PROJECT_DIR}"
if [ -f "harness/run-harness-v2.js" ]; then
    node harness/run-harness-v2.js --max-sessions "${MAX_SESSIONS}" --continuous
else
    # Use global harness
    cd "$(dirname "$0")/.."
    node harness/run-harness-v2.js --path "$(realpath ${PROJECT_DIR})" --max-sessions "${MAX_SESSIONS}" --continuous
fi

