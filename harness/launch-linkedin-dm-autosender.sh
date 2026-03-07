#!/bin/bash
# launch-linkedin-dm-autosender.sh — LinkedIn DM Auto-Sender control script
# Usage: bash harness/launch-linkedin-dm-autosender.sh [start|stop|status|dry-run|send-approved|logs]

HARNESS="$(cd "$(dirname "$0")" && pwd)"
DAEMON="$HARNESS/linkedin-dm-autosender.js"
PID_FILE="$HARNESS/linkedin-dm-autosender.pid"
LOG_FILE="$HARNESS/logs/linkedin-dm-autosender.log"
STATE_FILE="$HARNESS/linkedin-dm-state.json"
QUEUE_FILE="$HARNESS/linkedin-dm-queue.json"

mkdir -p "$HARNESS/logs"

cmd="${1:-status}"

case "$cmd" in
  start)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "[li-dm-sender] Already running (PID $(cat "$PID_FILE"))"
      exit 0
    fi
    echo "[li-dm-sender] Starting daemon..."
    nohup /bin/zsh -l -c "node $DAEMON" >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 1
    if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "[li-dm-sender] Started (PID $(cat "$PID_FILE"))"
    else
      echo "[li-dm-sender] Failed to start — check $LOG_FILE"
      exit 1
    fi
    ;;

  stop)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        rm -f "$PID_FILE"
        echo "[li-dm-sender] Stopped (PID $PID)"
      else
        echo "[li-dm-sender] Not running (stale PID file)"
        rm -f "$PID_FILE"
      fi
    else
      PID=$(pgrep -f "linkedin-dm-autosender.js" | head -1)
      if [ -n "$PID" ]; then
        kill "$PID"
        echo "[li-dm-sender] Stopped (PID $PID)"
      else
        echo "[li-dm-sender] Not running"
      fi
    fi
    ;;

  restart)
    bash "$0" stop
    sleep 1
    bash "$0" start
    ;;

  status)
    # Running?
    RUNNING=false
    PID=""
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      RUNNING=true
      PID=$(cat "$PID_FILE")
    else
      PID=$(pgrep -f "linkedin-dm-autosender.js" | head -1)
      [ -n "$PID" ] && RUNNING=true
    fi

    if $RUNNING; then
      echo "[li-dm-sender] RUNNING (PID $PID)"
    else
      echo "[li-dm-sender] NOT running"
    fi

    # Today's counts from state file
    if [ -f "$STATE_FILE" ]; then
      CONN_SENT=$(node -e "try{const s=JSON.parse(require('fs').readFileSync('$STATE_FILE','utf8'));process.stdout.write(String(s.connectionsSent||0));}catch{process.stdout.write('0');}" 2>/dev/null)
      MSG_SENT=$(node -e "try{const s=JSON.parse(require('fs').readFileSync('$STATE_FILE','utf8'));process.stdout.write(String(s.messagesSent||0));}catch{process.stdout.write('0');}" 2>/dev/null)
      LAST_RUN=$(node -e "try{const s=JSON.parse(require('fs').readFileSync('$STATE_FILE','utf8'));process.stdout.write(s.lastRunAt||'never');}catch{process.stdout.write('never');}" 2>/dev/null)
      echo "[li-dm-sender] Today: ${CONN_SENT}/20 connections, ${MSG_SENT}/30 messages"
      echo "[li-dm-sender] Last run: $LAST_RUN"
    fi

    # Queue depth
    if [ -f "$QUEUE_FILE" ]; then
      TOTAL=$(node -e "try{const q=JSON.parse(require('fs').readFileSync('$QUEUE_FILE','utf8'));process.stdout.write(String(q.length));}catch{process.stdout.write('?');}" 2>/dev/null)
      APPROVED=$(node -e "try{const q=JSON.parse(require('fs').readFileSync('$QUEUE_FILE','utf8'));process.stdout.write(String(q.filter(e=>e.status==='approved').length));}catch{process.stdout.write('?');}" 2>/dev/null)
      CONN_REQ=$(node -e "try{const q=JSON.parse(require('fs').readFileSync('$QUEUE_FILE','utf8'));process.stdout.write(String(q.filter(e=>e.status==='connection_requested').length));}catch{process.stdout.write('?');}" 2>/dev/null)
      SENT=$(node -e "try{const q=JSON.parse(require('fs').readFileSync('$QUEUE_FILE','utf8'));process.stdout.write(String(q.filter(e=>e.status==='sent').length));}catch{process.stdout.write('?');}" 2>/dev/null)
      echo "[li-dm-sender] Queue: $TOTAL total | $APPROVED approved | $CONN_REQ connection_requested | $SENT sent"
    fi

    # Next run estimate (daemon only)
    if $RUNNING; then
      INTERVAL_MIN=${LI_SEND_INTERVAL_MINUTES:-30}
      echo "[li-dm-sender] Next cycle: ~${INTERVAL_MIN}min intervals"
    fi
    ;;

  dry-run)
    echo "[li-dm-sender] Running dry-run cycle (no actual sends)..."
    /bin/zsh -l -c "node $DAEMON --dry-run --once"
    ;;

  send-approved)
    echo "[li-dm-sender] Running one send cycle for approved entries..."
    /bin/zsh -l -c "node $DAEMON --send-approved"
    ;;

  logs)
    tail -80 "$LOG_FILE"
    ;;

  *)
    echo "Usage: $0 [start|stop|restart|status|dry-run|send-approved|logs]"
    echo ""
    echo "  start         Start the daemon in background"
    echo "  stop          Stop the daemon"
    echo "  restart       Stop then start"
    echo "  status        Show running state, today's counts, queue depth"
    echo "  dry-run       Run one cycle logging what would be sent (no sends)"
    echo "  send-approved Run one send cycle in foreground"
    echo "  logs          Tail the log file"
    exit 1
    ;;
esac
