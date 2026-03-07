#!/bin/bash
# Live Ops Dashboard — start / stop / status / open
# Usage: bash harness/launch-live-ops.sh [start|stop|status|open]

HARNESS="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$HARNESS/live-ops.pid"
LOG_FILE="$HARNESS/logs/live-ops.log"
PORT="${LIVE_OPS_PORT:-3456}"

mkdir -p "$HARNESS/logs"

cmd="${1:-status}"

case "$cmd" in
  start)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "[live-ops] Already running (PID $(cat "$PID_FILE"))"
      echo "[live-ops] Dashboard: http://localhost:$PORT"
      exit 0
    fi
    echo "[live-ops] Starting on :$PORT..."
    nohup /bin/zsh -l -c "node $HARNESS/live-ops-server.js" >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 1
    if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "[live-ops] Started (PID $(cat "$PID_FILE"))"
      echo "[live-ops] Dashboard: http://localhost:$PORT"
    else
      echo "[live-ops] Failed to start — check $LOG_FILE"
      exit 1
    fi
    ;;

  stop)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        rm -f "$PID_FILE"
        echo "[live-ops] Stopped (PID $PID)"
      else
        echo "[live-ops] Not running (stale PID file)"
        rm -f "$PID_FILE"
      fi
    else
      # Try pgrep fallback
      PID=$(pgrep -f "live-ops-server.js" | head -1)
      if [ -n "$PID" ]; then
        kill "$PID"
        echo "[live-ops] Stopped (PID $PID)"
      else
        echo "[live-ops] Not running"
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
      echo "[live-ops] RUNNING (PID $(cat "$PID_FILE"))"
      echo "[live-ops] Dashboard: http://localhost:$PORT"
      curl -s "http://localhost:$PORT/api/health" && echo ""
    else
      PID=$(pgrep -f "live-ops-server.js" | head -1)
      if [ -n "$PID" ]; then
        echo "[live-ops] RUNNING via pgrep (PID $PID)"
        echo "[live-ops] Dashboard: http://localhost:$PORT"
      else
        echo "[live-ops] NOT running"
      fi
    fi
    ;;

  open)
    bash "$0" start
    sleep 0.5
    open "http://localhost:$PORT"
    ;;

  logs)
    tail -50 "$LOG_FILE"
    ;;

  *)
    echo "Usage: $0 [start|stop|restart|status|open|logs]"
    exit 1
    ;;
esac
