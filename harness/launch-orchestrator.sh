#!/bin/zsh
# Launch Polsia Orchestrator as background daemon
# Usage: bash harness/launch-orchestrator.sh

H="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$H/logs"

# Kill any existing orchestrator
existing=$(pgrep -f "polsia-orchestrator.js" | head -1)
if [[ -n "$existing" ]]; then
  echo "Stopping existing orchestrator (PID $existing)"
  kill "$existing" 2>/dev/null
  sleep 1
fi

nohup node "$H/polsia-orchestrator.js" >> "$H/logs/orchestrator.log" 2>&1 &
PID=$!
echo "$PID" > "$H/orchestrator.pid"
echo "Orchestrator started — PID: $PID"
echo "Logs: $H/logs/orchestrator.log"
