#!/bin/zsh -l
# launch-overstory.sh — Start the Overstory 24/7 autonomous coordinator
# Usage: bash harness/launch-overstory.sh [start|stop|status|attach]

set -e

ACD_DIR="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"
SESSION_NAME="overstory-coordinator"
PID_FILE="$ACD_DIR/harness/overstory-coordinator.pid"
LOG_FILE="$ACD_DIR/harness/logs/overstory-coordinator.log"

mkdir -p "$ACD_DIR/harness/logs"

cmd="${1:-start}"

case "$cmd" in
  start)
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
      echo "Coordinator already running in tmux session: $SESSION_NAME"
      echo "Use: tmux attach -t $SESSION_NAME"
      exit 0
    fi

    echo "Starting Overstory coordinator in tmux session: $SESSION_NAME"

    # Start cron-manager if not already running (SDPA-014)
    if ! pgrep -f "cron-manager.js" > /dev/null 2>&1; then
      echo "Starting cron-manager..."
      nohup node "$ACD_DIR/harness/cron-manager.js" >> "$ACD_DIR/harness/logs/cron-manager.log" 2>&1 &
      CM_PID=$!
      echo $CM_PID > "$ACD_DIR/harness/cron-manager.pid"
      echo "Cron Manager started (PID=$CM_PID) → $ACD_DIR/harness/logs/cron-manager.log"
    else
      echo "cron-manager already running"
    fi

    tmux new-session -d -s "$SESSION_NAME" -x 220 -y 50

    # Pane 0: Coordinator Claude Code session
    tmux send-keys -t "$SESSION_NAME:0" "cd '$ACD_DIR'" Enter
    tmux send-keys -t "$SESSION_NAME:0" "echo '=== Overstory Coordinator Started ===' | tee -a '$LOG_FILE'" Enter
    tmux send-keys -t "$SESSION_NAME:0" "ov prime --compact 2>&1 | tee -a '$LOG_FILE'" Enter
    sleep 2

    # Start coordinator with the context primed
    tmux send-keys -t "$SESSION_NAME:0" "ov coordinator start --watchdog 2>&1 | tee -a '$LOG_FILE'" Enter

    echo $$ > "$PID_FILE"
    echo "Coordinator started. Session: $SESSION_NAME"
    echo "Attach: tmux attach -t $SESSION_NAME"
    echo "Status: ov status"
    echo "Log:    tail -f $LOG_FILE"
    ;;

  stop)
    echo "Stopping Overstory coordinator..."
    ov coordinator stop 2>/dev/null || true
    tmux kill-session -t "$SESSION_NAME" 2>/dev/null && echo "Tmux session killed" || echo "No session found"
    rm -f "$PID_FILE"
    ;;

  status)
    echo "=== Overstory Status ==="
    ov coordinator status 2>&1 || echo "Coordinator not running"
    echo ""
    echo "=== Active Agents ==="
    ov status 2>&1 || echo "No agents"
    echo ""
    echo "=== Issue Queue ==="
    sd ready 2>&1 || echo "No issues"
    echo ""
    echo "=== Tmux Session ==="
    tmux ls 2>&1 | grep overstory || echo "No overstory tmux sessions"
    ;;

  attach)
    tmux attach -t "$SESSION_NAME" 2>/dev/null || echo "Session $SESSION_NAME not found. Run: bash harness/launch-overstory.sh start"
    ;;

  restart)
    "$0" stop
    sleep 2
    "$0" start
    ;;

  *)
    echo "Usage: $0 [start|stop|status|attach|restart]"
    exit 1
    ;;
esac
