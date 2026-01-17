#!/bin/bash
# Get Claude API key from Claude Code Desktop app or environment

# Check environment variables first (highest priority)
if [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
    echo "$CLAUDE_CODE_OAUTH_TOKEN"
    exit 0
fi

if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "$ANTHROPIC_API_KEY"
    exit 0
fi

# Try to read from Claude Desktop config
CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
if [ -d "$CLAUDE_CONFIG_DIR" ]; then
    # Look for config files
    if [ -f "$CLAUDE_CONFIG_DIR/config.json" ]; then
        KEY=$(grep -o '"api_key"[[:space:]]*:[[:space:]]*"[^"]*"' "$CLAUDE_CONFIG_DIR/config.json" 2>/dev/null | cut -d'"' -f4)
        if [ -n "$KEY" ]; then
            echo "$KEY"
            exit 0
        fi
    fi
    
    # Try preferences file
    if [ -f "$CLAUDE_CONFIG_DIR/preferences.json" ]; then
        KEY=$(grep -o '"apiKey"[[:space:]]*:[[:space:]]*"[^"]*"' "$CLAUDE_CONFIG_DIR/preferences.json" 2>/dev/null | cut -d'"' -f4)
        if [ -n "$KEY" ]; then
            echo "$KEY"
            exit 0
        fi
    fi
fi

# Fallback: try to get from claude CLI config
if command -v claude &> /dev/null; then
    KEY=$(claude config get api_key 2>/dev/null)
    if [ -n "$KEY" ] && [ "$KEY" != "null" ]; then
        echo "$KEY"
        exit 0
    fi
fi

# If nothing found, exit with error
echo "ERROR: Could not find Claude API key" >&2
echo "Please set CLAUDE_CODE_OAUTH_TOKEN or ANTHROPIC_API_KEY environment variable" >&2
exit 1

