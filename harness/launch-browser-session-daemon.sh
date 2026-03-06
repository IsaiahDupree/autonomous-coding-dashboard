#!/bin/zsh -l
# launch-browser-session-daemon.sh
# Starts both the cloud orchestrator (books sessions) and the local browser session daemon (executes them)
# Usage: bash harness/launch-browser-session-daemon.sh [start|stop|status|attach]

set -e

ACD_DIR="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"
SESSION_NAME="browser-session-system"
LOG_DIR="$ACD_DIR/harness/logs"

mkdir -p "$LOG_DIR"

cmd="${1:-start}"

case "$cmd" in
  start)
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
      echo "Browser session system already running: tmux attach -t $SESSION_NAME"
      exit 0
    fi

    echo "Starting browser session system..."
    tmux new-session -d -s "$SESSION_NAME" -x 220 -y 50

    # Window 0: Cloud Orchestrator (books sessions from goal gaps)
    tmux rename-window -t "$SESSION_NAME:0" "cloud-orchestrator"
    tmux send-keys -t "$SESSION_NAME:0" "cd '$ACD_DIR' && echo '=== Cloud Orchestrator ===' && node harness/cloud-orchestrator.js 2>&1 | tee -a '$LOG_DIR/cloud-orchestrator.log'" Enter

    # Window 1: Local Browser Session Daemon (executes booked sessions)
    tmux new-window -t "$SESSION_NAME" -n "browser-daemon"
    tmux send-keys -t "$SESSION_NAME:1" "cd '$ACD_DIR' && sleep 5 && echo '=== Browser Session Daemon ===' && node harness/browser-session-daemon.js 2>&1 | tee -a '$LOG_DIR/browser-session-daemon.log'" Enter

    # Window 2: Overstory Coordinator (builds the code)
    tmux new-window -t "$SESSION_NAME" -n "overstory"
    tmux send-keys -t "$SESSION_NAME:2" "cd '$ACD_DIR' && sleep 10 && bash harness/launch-overstory.sh start 2>&1" Enter

    # Window 3: Status dashboard (refreshes every 60s)
    tmux new-window -t "$SESSION_NAME" -n "status"
    tmux send-keys -t "$SESSION_NAME:3" "cd '$ACD_DIR' && while true; do clear; echo '=== $(date) ==='; node harness/cloud-orchestrator.js --status 2>/dev/null; echo ''; ov status 2>/dev/null | head -20; sleep 60; done" Enter

    tmux select-window -t "$SESSION_NAME:0"

    echo "System started in tmux session: $SESSION_NAME"
    echo ""
    echo "Windows:"
    echo "  0: cloud-orchestrator  — books sessions from goal gaps every hour"
    echo "  1: browser-daemon      — claims + executes booked sessions"
    echo "  2: overstory           — builds new code features"
    echo "  3: status              — live status dashboard"
    echo ""
    echo "Attach:  tmux attach -t $SESSION_NAME"
    echo "Switch:  Ctrl+B then 0/1/2/3"
    ;;

  stop)
    echo "Stopping browser session system..."
    ov coordinator stop 2>/dev/null || true
    tmux kill-session -t "$SESSION_NAME" 2>/dev/null && echo "Session killed" || echo "No session found"
    ;;

  status)
    echo "=== Browser Session System Status ==="
    echo ""
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
      echo "Tmux: RUNNING ($SESSION_NAME)"
      tmux list-windows -t "$SESSION_NAME" 2>/dev/null
    else
      echo "Tmux: NOT running"
    fi
    echo ""
    echo "=== Goal Progress ==="
    node "$ACD_DIR/harness/cloud-orchestrator.js" --status 2>/dev/null || echo "(orchestrator not running)"
    echo ""
    echo "=== Overstory Agent Swarm ==="
    ov status 2>/dev/null | head -15 || echo "(no active agents)"
    echo ""
    echo "=== Watchdog Heartbeat ==="
    cat "$ACD_DIR/harness/overstory-heartbeat.json" 2>/dev/null || echo "(no heartbeat)"
    ;;

  attach)
    tmux attach -t "$SESSION_NAME" 2>/dev/null || echo "Session not found. Run: bash harness/launch-browser-session-daemon.sh start"
    ;;

  restart)
    "$0" stop
    sleep 3
    "$0" start
    ;;

  apply-migration)
    echo "Applying Supabase migration..."
    echo "Copy harness/migrations/20260305_browser_sessions.sql and run via Supabase dashboard SQL editor"
    echo "Or use: mcp0_apply_migration tool in Claude"
    cat "$ACD_DIR/harness/migrations/20260305_browser_sessions.sql"
    ;;

  *)
    echo "Usage: $0 [start|stop|status|attach|restart|apply-migration]"
    exit 1
    ;;
esac
