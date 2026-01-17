#!/bin/bash
# Start backend server with proper configuration

set -e

cd "$(dirname "$0")/../backend"

# Source API key from Claude Code if not set
if [ -z "$CLAUDE_CODE_OAUTH_TOKEN" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
    KEY=$(bash ../scripts/get-claude-key.sh 2>/dev/null || echo "")
    if [ -n "$KEY" ] && [ "$KEY" != "ERROR"* ]; then
        export CLAUDE_CODE_OAUTH_TOKEN="$KEY"
        echo "✅ Sourced API key from Claude Code"
    fi
fi

# Set port
export PORT=${BACKEND_PORT:-3434}
export BACKEND_PORT=${BACKEND_PORT:-3434}

echo "🚀 Starting backend server on port ${PORT}..."
echo "   API URL: http://localhost:${PORT}"

npm run dev

