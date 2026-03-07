#!/bin/bash
# launch-observability.sh — Start/stop/status for local-agent-daemon.js
# Usage: bash harness/launch-observability.sh [start|stop|status|test|logs]

HARNESS="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$HARNESS/local-agent-daemon.pid"
LOG_FILE="$HARNESS/logs/local-agent-daemon.log"

mkdir -p "$HARNESS/logs"

cmd="${1:-status}"

case "$cmd" in
  start)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "[observability] local-agent-daemon already running (PID $(cat "$PID_FILE"))"
      exit 0
    fi
    echo "[observability] Starting local-agent-daemon..."
    nohup /bin/zsh -l -c "node $HARNESS/local-agent-daemon.js" >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 1
    if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "[observability] Started (PID $(cat "$PID_FILE"))"
      echo "[observability] Log: $LOG_FILE"
    else
      echo "[observability] Failed to start — check $LOG_FILE"
      exit 1
    fi
    ;;

  stop)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        rm -f "$PID_FILE"
        echo "[observability] Stopped (PID $PID)"
      else
        echo "[observability] Not running (stale PID file)"
        rm -f "$PID_FILE"
      fi
    else
      PID=$(pgrep -f "local-agent-daemon.js" | head -1)
      if [ -n "$PID" ]; then
        kill "$PID"
        echo "[observability] Stopped (PID $PID)"
      else
        echo "[observability] Not running"
      fi
    fi
    ;;

  restart)
    bash "$0" stop
    sleep 1
    bash "$0" start
    ;;

  status)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "[observability] RUNNING (PID $(cat "$PID_FILE"))"
    else
      PID=$(pgrep -f "local-agent-daemon.js" | head -1)
      if [ -n "$PID" ]; then
        echo "[observability] RUNNING via pgrep (PID $PID)"
      else
        echo "[observability] NOT running"
      fi
    fi
    # Show last heartbeat from log
    if [ -f "$LOG_FILE" ]; then
      LAST=$(grep "Heartbeat sent" "$LOG_FILE" | tail -1)
      if [ -n "$LAST" ]; then
        echo "[observability] $LAST"
      fi
    fi
    ;;

  test)
    echo "[observability] Running preflight check..."
    /bin/zsh -l -c "node $HARNESS/local-agent-daemon.js --test"
    ;;

  logs)
    tail -50 "$LOG_FILE"
    ;;

  *)
    echo "Usage: $0 [start|stop|restart|status|test|logs]"
    exit 1
    ;;
esac
