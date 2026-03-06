#!/bin/bash
# Launch Multi-Platform Prospect Pipeline Daemon (24/7)
# Usage:
#   ./harness/launch-prospect-pipeline.sh          # start
#   ./harness/launch-prospect-pipeline.sh stop     # stop
#   ./harness/launch-prospect-pipeline.sh status   # show status

set -e
H="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$H/prospect-pipeline.pid"
LOG_FILE="$H/logs/prospect-pipeline.log"
mkdir -p "$H/logs"

case "${1:-start}" in
  start)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "Prospect pipeline already running (PID $(cat "$PID_FILE"))"
      exit 0
    fi
    echo "Starting Multi-Platform Prospect Pipeline..."
    nohup node "$H/prospect-pipeline.js" >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "Prospect pipeline started (PID $!)"
    echo "Log: $LOG_FILE"
    echo "Queues: $H/prospect-{ig,tt,tw,threads}-queue.json"
    echo "State: $H/prospect-pipeline-state.json"
    ;;
  stop)
    if [ -f "$PID_FILE" ]; then
      PID="$(cat "$PID_FILE")"
      if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        echo "Prospect pipeline stopped (PID $PID)"
      else
        echo "Daemon PID $PID not running"
      fi
      rm -f "$PID_FILE"
    else
      echo "No PID file found"
    fi
    ;;
  status)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "RUNNING (PID $(cat "$PID_FILE"))"
      echo ""
      echo "Recent log:"
      tail -10 "$LOG_FILE" 2>/dev/null
    else
      echo "STOPPED"
    fi
    ;;
  *)
    echo "Usage: $0 {start|stop|status}"
    exit 1
    ;;
esac
