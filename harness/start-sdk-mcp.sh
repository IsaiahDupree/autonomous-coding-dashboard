#!/bin/bash
#
# SDK MCP Server Startup Script
#
# PRD-122: Claude Agent SDK — actp-worker Integration
#
# Starts the SDK MCP server on stdio transport for Claude Desktop integration.
#
# Usage:
#   ./harness/start-sdk-mcp.sh
#   ./harness/start-sdk-mcp.sh --foreground
#

set -e

# Configuration
ACTP_WORKER_DIR="/Users/isaiahdupree/Documents/Software/actp-worker"
LOG_DIR="$(dirname "$0")/logs"
LOG_FILE="$LOG_DIR/sdk-mcp.log"
PID_FILE="$LOG_DIR/sdk-mcp.pid"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Load environment variables
if [ -f "$ACTP_WORKER_DIR/.env" ]; then
    source "$ACTP_WORKER_DIR/.env"
fi

# Ensure required environment variables are set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "ERROR: ANTHROPIC_API_KEY not set in environment or .env file"
    exit 1
fi

# Check if already running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo "SDK MCP Server is already running (PID: $OLD_PID)"
        echo "To stop it: kill $OLD_PID"
        exit 0
    else
        echo "Removing stale PID file"
        rm "$PID_FILE"
    fi
fi

# Change to actp-worker directory
cd "$ACTP_WORKER_DIR"

# Start server
echo "Starting SDK MCP Server..."
echo "Log file: $LOG_FILE"

if [ "$1" = "--foreground" ]; then
    # Run in foreground (for debugging)
    python3 sdk_mcp_server.py
else
    # Run in background
    nohup python3 sdk_mcp_server.py >> "$LOG_FILE" 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID > "$PID_FILE"

    # Wait a moment and check if it started successfully
    sleep 2
    if ps -p $SERVER_PID > /dev/null 2>&1; then
        echo "✓ SDK MCP Server started successfully (PID: $SERVER_PID)"
        echo "  Log: tail -f $LOG_FILE"
        echo "  Stop: kill $SERVER_PID"
    else
        echo "✗ SDK MCP Server failed to start"
        echo "  Check log: tail $LOG_FILE"
        rm "$PID_FILE"
        exit 1
    fi
fi
