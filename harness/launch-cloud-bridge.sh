#!/usr/bin/env bash
# Cloud Bridge Daemon launcher — start|stop|status
# Usage: bash harness/launch-cloud-bridge.sh start|stop|status

HARNESS_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$HARNESS_DIR/cloud-bridge.pid"
LOG_FILE="$HARNESS_DIR/logs/cloud-bridge.log"

mkdir -p "$HARNESS_DIR/logs"

case "${1:-status}" in
  start)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "Cloud Bridge already running (PID $(cat "$PID_FILE"))"
      exit 0
    fi
    echo "Starting Cloud Bridge daemon..."
    NOHUP=1 nohup node "$HARNESS_DIR/cloud-bridge.js" >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "Started (PID $!, log: $LOG_FILE)"
    ;;

  stop)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        echo "Stopped Cloud Bridge (PID $PID)"
      else
        echo "PID $PID not running (stale PID file)"
      fi
      rm -f "$PID_FILE"
    else
      echo "No PID file found"
    fi
    ;;

  status)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      PID=$(cat "$PID_FILE")
      echo "Cloud Bridge: RUNNING (PID $PID)"
      # Show last 5 log lines
      tail -5 "$LOG_FILE" 2>/dev/null
    else
      echo "Cloud Bridge: STOPPED"
    fi
    ;;

  test)
    node "$HARNESS_DIR/cloud-bridge.js" --test
    ;;

  *)
    echo "Usage: $0 {start|stop|status|test}"
    exit 1
    ;;
esac
