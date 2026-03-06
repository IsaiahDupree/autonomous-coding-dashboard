#!/bin/bash
# Launch Instagram Comment Sweep Daemon (24/7, active hours 8am-10pm)
# Usage:
#   ./harness/launch-instagram-comment-sweep.sh          # start
#   ./harness/launch-instagram-comment-sweep.sh stop     # stop
#   ./harness/launch-instagram-comment-sweep.sh status   # show status
#   ./harness/launch-instagram-comment-sweep.sh once     # single sweep then exit
#   ./harness/launch-instagram-comment-sweep.sh dry-run  # generate replies, don't post
#   ./harness/launch-instagram-comment-sweep.sh test     # preflight check only

set -e
H="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$H/instagram-comment-sweep.pid"
LOG_FILE="$H/logs/instagram-comment-sweep.log"
STATE_FILE="$H/instagram-comment-sweep-state.json"
mkdir -p "$H/logs"

case "${1:-start}" in
  start)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "Instagram comment sweep daemon already running (PID $(cat "$PID_FILE"))"
      exit 0
    fi
    echo "Starting Instagram Comment Sweep Daemon..."
    nohup node "$H/instagram-comment-sweep.js" >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "Instagram comment sweep daemon started (PID $!)"
    echo "Log:   $LOG_FILE"
    echo "State: $STATE_FILE"
    ;;
  stop)
    if [ -f "$PID_FILE" ]; then
      PID="$(cat "$PID_FILE")"
      if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        echo "Instagram comment sweep daemon stopped (PID $PID)"
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
      if [ -f "$STATE_FILE" ]; then
        echo "Today's stats:"
        node -e "
          const s = JSON.parse(require('fs').readFileSync('$STATE_FILE','utf8'));
          console.log('  Date:        ' + s.date);
          console.log('  Daily total: ' + (s.dailyTotal||0) + ' / 20');
          console.log('  All-time:    ' + (s.totalAllTime||0));
          console.log('  Per-niche:   ' + JSON.stringify(s.perNiche||{}));
          console.log('  Seen URLs:   ' + Object.keys(s.seenUrls||{}).length);
          console.log('  Last run:    ' + (s.lastRun||'never'));
        " 2>/dev/null || cat "$STATE_FILE"
      fi
      echo ""
      echo "Recent log:"
      tail -15 "$LOG_FILE" 2>/dev/null
    else
      echo "STOPPED"
      if [ -f "$STATE_FILE" ]; then
        echo ""
        echo "Last known state:"
        node -e "
          const s = JSON.parse(require('fs').readFileSync('$STATE_FILE','utf8'));
          console.log('  Date:        ' + s.date);
          console.log('  Daily total: ' + (s.dailyTotal||0) + ' / 20');
          console.log('  Last run:    ' + (s.lastRun||'never'));
        " 2>/dev/null
      fi
    fi
    ;;
  once)
    echo "Running single sweep..."
    node "$H/instagram-comment-sweep.js" --once
    ;;
  dry-run)
    echo "Running dry-run sweep (no posts)..."
    node "$H/instagram-comment-sweep.js" --once --dry-run
    ;;
  test)
    echo "Running preflight check..."
    node "$H/instagram-comment-sweep.js" --test
    ;;
  *)
    echo "Usage: $0 {start|stop|status|once|dry-run|test}"
    exit 1
    ;;
esac
