#!/bin/bash
# launch-reply-crm-bridge.sh
# Manage the Reply-to-CRM Bridge daemon

H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
PID_FILE="$H/reply-crm-bridge.pid"
LOG_FILE="$H/logs/reply-crm-bridge.log"
SCRIPT="$H/reply-crm-bridge.js"

mkdir -p "$H/logs"

# Load environment
if [[ -f "$H/../actp-worker/.env" ]]; then
  set -a; source "/Users/isaiahdupree/Documents/Software/actp-worker/.env"; set +a
fi

CMD="${1:-status}"

is_running() {
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid=$(cat "$PID_FILE" 2>/dev/null)
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

case "$CMD" in
  start)
    if is_running; then
      echo "[reply-bridge] Already running (PID $(cat $PID_FILE))"
      exit 0
    fi
    echo "[reply-bridge] Starting daemon..."
    nohup node "$SCRIPT" >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "[reply-bridge] Started (PID $!)"
    ;;

  stop)
    if is_running; then
      PID=$(cat "$PID_FILE")
      echo "[reply-bridge] Stopping PID $PID..."
      kill "$PID" 2>/dev/null
      rm -f "$PID_FILE"
      echo "[reply-bridge] Stopped"
    else
      echo "[reply-bridge] Not running"
    fi
    ;;

  status)
    if is_running; then
      echo "[reply-bridge] RUNNING (PID $(cat $PID_FILE))"
      if [[ -f "$H/reply-bridge-state.json" ]]; then
        echo "[reply-bridge] State:"
        cat "$H/reply-bridge-state.json" | node -e "
          const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
          console.log('  lastRun:', d.lastRunAt || 'never');
          console.log('  totalReplies:', d.totalRepliesFound || 0);
          for (const [p,t] of Object.entries(d.lastScan||{})) console.log('  ' + p + ' cursor:', t);
        " 2>/dev/null || cat "$H/reply-bridge-state.json"
      fi
    else
      echo "[reply-bridge] NOT RUNNING"
    fi
    ;;

  scan-now|scan_now)
    echo "[reply-bridge] Running one-shot scan..."
    node "$SCRIPT" --once
    ;;

  dry-run|dry_run)
    echo "[reply-bridge] Running dry-run scan (no CRM writes)..."
    node "$SCRIPT" --once --dry-run
    ;;

  logs)
    if [[ -f "$LOG_FILE" ]]; then
      tail -f "$LOG_FILE"
    else
      echo "[reply-bridge] No log file yet at $LOG_FILE"
    fi
    ;;

  restart)
    bash "$0" stop
    sleep 1
    bash "$0" start
    ;;

  *)
    echo "Usage: $0 {start|stop|status|scan-now|dry-run|logs|restart}"
    exit 1
    ;;
esac
