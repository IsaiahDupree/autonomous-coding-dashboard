#!/bin/bash
# launch-next-action-executor.sh
# Controls the Next-Action Executor daemon
#
# Usage:
#   bash harness/launch-next-action-executor.sh start
#   bash harness/launch-next-action-executor.sh stop
#   bash harness/launch-next-action-executor.sh status
#   bash harness/launch-next-action-executor.sh list       # show overdue actions
#   bash harness/launch-next-action-executor.sh dry-run    # classify + generate, no sends
#   bash harness/launch-next-action-executor.sh once       # run one cycle and exit
#   bash harness/launch-next-action-executor.sh logs       # tail the log

H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
PID_FILE="$H/next-action-executor.pid"
LOG_FILE="$H/logs/next-action-executor.log"
SCRIPT="$H/next-action-executor.js"
CMD="${1:-status}"

mkdir -p "$H/logs"

is_running() {
  if [[ -f "$PID_FILE" ]]; then
    PID=$(cat "$PID_FILE" 2>/dev/null)
    if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

case "$CMD" in
  start)
    if is_running; then
      echo "[next-action-executor] Already running (PID $(cat $PID_FILE))"
      exit 0
    fi
    echo "[next-action-executor] Starting daemon..."
    nohup /bin/zsh -l -c "node $SCRIPT" >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "[next-action-executor] Started (PID $!)"
    ;;

  stop)
    if is_running; then
      PID=$(cat "$PID_FILE")
      kill "$PID" 2>/dev/null && echo "[next-action-executor] Stopped (PID $PID)" || echo "[next-action-executor] Kill failed"
      rm -f "$PID_FILE"
    else
      echo "[next-action-executor] Not running"
    fi
    ;;

  status)
    if is_running; then
      echo "[next-action-executor] RUNNING (PID $(cat $PID_FILE))"
      if [[ -f "$H/next-action-state.json" ]]; then
        echo "  State: $(cat $H/next-action-state.json)"
      fi
    else
      echo "[next-action-executor] STOPPED"
    fi
    ;;

  list)
    echo "[next-action-executor] Listing overdue actions..."
    /bin/zsh -l -c "node $SCRIPT --list --once" 2>&1
    ;;

  dry-run)
    echo "[next-action-executor] Dry run (classify + generate, no sends)..."
    /bin/zsh -l -c "node $SCRIPT --dry-run --once" 2>&1
    ;;

  once)
    echo "[next-action-executor] Running one cycle..."
    /bin/zsh -l -c "node $SCRIPT --once" 2>&1
    ;;

  test)
    echo "[next-action-executor] Running integration tests..."
    /bin/zsh -l -c "node $SCRIPT --test --once" 2>&1
    ;;

  logs)
    echo "[next-action-executor] Tailing $LOG_FILE..."
    tail -f "$LOG_FILE"
    ;;

  *)
    echo "Usage: $0 {start|stop|status|list|dry-run|once|test|logs}"
    exit 1
    ;;
esac
