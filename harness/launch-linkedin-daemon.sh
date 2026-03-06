#!/bin/bash
# Launch LinkedIn Prospect Daemon (24/7)
# Usage:
#   ./harness/launch-linkedin-daemon.sh          # start
#   ./harness/launch-linkedin-daemon.sh stop     # stop
#   ./harness/launch-linkedin-daemon.sh status   # show status

set -e
H="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$H/linkedin-daemon.pid"
LOG_FILE="$H/logs/linkedin-daemon.log"
mkdir -p "$H/logs"

case "${1:-start}" in
  start)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "LinkedIn daemon already running (PID $(cat "$PID_FILE"))"
      exit 0
    fi
    echo "Starting LinkedIn Prospect Daemon..."
    nohup node "$H/linkedin-daemon.js" >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "LinkedIn daemon started (PID $!)"
    echo "Log: $LOG_FILE"
    echo "Queue: $H/linkedin-dm-queue.json"
    echo "State: $H/linkedin-daemon-state.json"
    ;;
  stop)
    if [ -f "$PID_FILE" ]; then
      PID="$(cat "$PID_FILE")"
      if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        echo "LinkedIn daemon stopped (PID $PID)"
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
