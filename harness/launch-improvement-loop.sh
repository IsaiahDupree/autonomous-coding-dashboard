#!/usr/bin/env bash
#
# launch-improvement-loop.sh — start|stop|status
# Self-improving automation loop daemon (PRD-084 IL-009)
#

set -e

H="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$H/improvement-loop.pid"
LOG_FILE="$H/logs/improvement-loop.log"
SCRIPT="$H/improvement-loop.js"

mkdir -p "$H/logs"

case "${1:-}" in
  start)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      if kill -0 "$PID" 2>/dev/null; then
        echo "✗ improvement-loop already running (PID $PID)"
        exit 1
      else
        echo "⚠ Stale PID file found, removing..."
        rm -f "$PID_FILE"
      fi
    fi

    echo "▶ Starting improvement-loop daemon..."
    nohup node "$SCRIPT" daemon >> "$LOG_FILE" 2>&1 &
    PID=$!
    echo "$PID" > "$PID_FILE"
    echo "✓ Started (PID $PID) — logs: $LOG_FILE"
    ;;

  stop)
    if [ ! -f "$PID_FILE" ]; then
      echo "✗ improvement-loop not running (no PID file)"
      exit 1
    fi

    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
      echo "◼ Stopping improvement-loop (PID $PID)..."
      kill "$PID"
      rm -f "$PID_FILE"
      echo "✓ Stopped"
    else
      echo "✗ Process not found (PID $PID), removing stale PID file"
      rm -f "$PID_FILE"
    fi
    ;;

  status)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      if kill -0 "$PID" 2>/dev/null; then
        echo "✓ improvement-loop RUNNING (PID $PID)"
        ps -p "$PID" -o pid,etime,command | tail -1
      else
        echo "✗ improvement-loop NOT RUNNING (stale PID $PID)"
      fi
    else
      echo "✗ improvement-loop NOT RUNNING"
    fi

    # Show last cycle from log
    if [ -f "$H/improvement-log.ndjson" ]; then
      echo ""
      echo "Last cycle:"
      tail -1 "$H/improvement-log.ndjson" | jq -r '. | "  \(.ts) | action: \(.action_taken // "none") | auto: \(.auto_applied)"'
    fi
    ;;

  *)
    echo "Usage: $0 {start|stop|status}"
    exit 1
    ;;
esac
