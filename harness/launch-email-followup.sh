#!/bin/bash
# launch-email-followup.sh — manage the Gmail email follow-up sequence daemon
# Usage: ./launch-email-followup.sh [start|stop|status|dry-run|send-now|logs|init]

H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
PID_FILE="$H/email-followup-sequence.pid"
LOG_FILE="$H/logs/email-followup-sequence.log"
mkdir -p "$H/logs"

# Load env
if [[ -f "$H/../.env" ]]; then set -a; source "$H/../.env"; set +a; fi
if [[ -f "/Users/isaiahdupree/Documents/Software/actp-worker/.env" ]]; then
  set -a; source "/Users/isaiahdupree/Documents/Software/actp-worker/.env"; set +a
fi

CMD="${1:-start}"

case "$CMD" in
  start)
    if pgrep -f "email-followup-sequence.js" > /dev/null 2>&1; then
      echo "[email-seq] Already running (PID $(cat $PID_FILE 2>/dev/null))"
      exit 0
    fi
    echo "[email-seq] Starting daemon..."
    nohup node "$H/email-followup-sequence.js" >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "[email-seq] Started PID $!"
    ;;

  stop)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      kill "$PID" 2>/dev/null && echo "[email-seq] Stopped PID $PID" || echo "[email-seq] Not running"
      rm -f "$PID_FILE"
    else
      pkill -f "email-followup-sequence.js" 2>/dev/null && echo "[email-seq] Stopped" || echo "[email-seq] Not running"
    fi
    ;;

  status)
    if pgrep -f "email-followup-sequence.js" > /dev/null 2>&1; then
      PID=$(pgrep -f "email-followup-sequence.js")
      echo "[email-seq] RUNNING (PID $PID)"
    else
      echo "[email-seq] NOT running"
    fi
    echo ""
    node "$H/email-followup-sequence.js" --status 2>/dev/null
    echo "Last 5 log entries:"
    tail -5 "$LOG_FILE" 2>/dev/null | node -e "
      const rl = require('readline').createInterface({input:process.stdin});
      rl.on('line', l => { try { const e=JSON.parse(l); console.log('  ['+e.ts.slice(11,19)+'] '+e.msg); } catch { console.log('  '+l); } });
    " 2>/dev/null
    ;;

  dry-run)
    echo "[email-seq] Dry-run: generating emails without sending..."
    node "$H/email-followup-sequence.js" --once --dry-run
    ;;

  send-now)
    echo "[email-seq] Running single send cycle now..."
    node "$H/email-followup-sequence.js" --once
    ;;

  init)
    echo "[email-seq] Initializing new Gmail contacts..."
    node "$H/email-followup-sequence.js" --init
    ;;

  logs)
    tail -f "$LOG_FILE"
    ;;

  *)
    echo "Usage: $0 [start|stop|status|dry-run|send-now|init|logs]"
    exit 1
    ;;
esac
