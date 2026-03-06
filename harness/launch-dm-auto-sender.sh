#!/bin/bash
# launch-dm-auto-sender.sh — Manage the DM Auto-Sender daemon
# Usage: ./launch-dm-auto-sender.sh [start|stop|status|once|test]

H="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$H/dm-auto-sender.pid"
LOG_FILE="$H/logs/dm-auto-sender.log"
CONTROL_FILE="$H/dm-control-state.json"
mkdir -p "$H/logs"

CMD="${1:-status}"

case "$CMD" in
  start)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "✅ dm-auto-sender already running (PID $(cat "$PID_FILE"))"
      exit 0
    fi
    echo "🚀 Starting DM auto-sender daemon..."
    nohup node "$H/dm-auto-sender.js" >> "$LOG_FILE" 2>&1 &
    PID=$!
    echo $PID > "$PID_FILE"
    echo "✅ Started (PID $PID) — log: $LOG_FILE"
    ;;

  stop)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        rm -f "$PID_FILE"
        echo "⏹ Stopped dm-auto-sender (PID $PID)"
      else
        rm -f "$PID_FILE"
        echo "⚠️  PID file stale — cleaned up"
      fi
    else
      pkill -f "dm-auto-sender.js" 2>/dev/null && echo "⏹ Stopped" || echo "⚠️  Not running"
    fi
    ;;

  restart)
    "$0" stop
    sleep 1
    "$0" start
    ;;

  once)
    echo "▶️ Running single tick..."
    node "$H/dm-auto-sender.js" --once
    ;;

  test)
    echo "🔍 DM Auto-Sender State:"
    node "$H/dm-auto-sender.js" --test
    ;;

  status)
    echo "=== DM Auto-Sender Status ==="
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "✅ Running (PID $(cat "$PID_FILE"))"
    else
      echo "❌ Not running"
    fi

    # Show per-platform control state
    if [ -f "$CONTROL_FILE" ]; then
      echo ""
      echo "Control state ($CONTROL_FILE):"
      node -e "
        const fs = require('fs');
        const c = JSON.parse(fs.readFileSync('$CONTROL_FILE', 'utf8'));
        const icons = { twitter: '🐦', instagram: '📸', tiktok: '🎵' };
        const today = new Date().toISOString().slice(0,10);
        for (const [p, s] of Object.entries(c)) {
          if (!icons[p]) continue;
          const sent = s.todayDate === today ? s.todaySent : 0;
          const last = s.lastSentAt ? Math.round((Date.now() - new Date(s.lastSentAt).getTime())/60000) + 'min ago' : 'never';
          console.log('  ' + icons[p] + ' ' + p.padEnd(12) + ' | mode=' + s.mode.padEnd(6) + ' | ' + sent + '/' + s.dailyCap + ' today | interval=' + s.intervalMinutes + 'min | last: ' + last);
        }
      " 2>/dev/null || echo "  (could not parse control state)"
    else
      echo "  (no control state yet — will be created on first run)"
    fi

    # Show recent log
    if [ -f "$LOG_FILE" ]; then
      echo ""
      echo "Last 5 log lines:"
      tail -5 "$LOG_FILE"
    fi
    ;;

  *)
    echo "Usage: $0 [start|stop|restart|status|once|test]"
    echo ""
    echo "  start    — Start daemon in background"
    echo "  stop     — Stop running daemon"
    echo "  restart  — Restart daemon"
    echo "  status   — Show running state + per-platform stats"
    echo "  once     — Run a single tick then exit"
    echo "  test     — Show full state + queue counts"
    exit 1
    ;;
esac
