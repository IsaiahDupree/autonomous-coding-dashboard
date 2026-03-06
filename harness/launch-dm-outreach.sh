#!/usr/bin/env bash
# DM Outreach Daemon — start|stop|status|test|dry-run
# Usage: bash harness/launch-dm-outreach.sh start|stop|status|test|dry-run
#
# Env overrides (set before calling start):
#   DM_DAILY_LIMIT_IG=10  DM_DAILY_LIMIT_TW=15  DM_DAILY_LIMIT_TT=8
#   DM_CYCLE_MIN=30       DM_ACTIVE_HOURS_START=8  DM_ACTIVE_HOURS_END=20

HARNESS_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$HARNESS_DIR/dm-outreach.pid"
LOG_FILE="$HARNESS_DIR/logs/dm-outreach.log"

mkdir -p "$HARNESS_DIR/logs"

case "${1:-status}" in
  start)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "DM Outreach Daemon already running (PID $(cat "$PID_FILE"))"
      exit 0
    fi
    echo "Starting DM Outreach Daemon..."
    echo "  Limits — IG: ${DM_DAILY_LIMIT_IG:-10}/day  TW: ${DM_DAILY_LIMIT_TW:-15}/day  TT: ${DM_DAILY_LIMIT_TT:-8}/day"
    echo "  Active hours: ${DM_ACTIVE_HOURS_START:-8}:00–${DM_ACTIVE_HOURS_END:-20}:00  Cycle: ${DM_CYCLE_MIN:-30} min"
    nohup node "$HARNESS_DIR/dm-outreach-daemon.js" >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "Started (PID $!, log: $LOG_FILE)"
    ;;

  stop)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        echo "Stopped DM Outreach Daemon (PID $PID)"
      else
        echo "PID $PID not running (stale PID file)"
      fi
      rm -f "$PID_FILE"
    else
      echo "No PID file found"
    fi
    ;;

  status)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      PID=$(cat "$PID_FILE")
      echo "DM Outreach: RUNNING (PID $PID)"
      # Show state summary
      if command -v python3 &>/dev/null && [ -f "$HARNESS_DIR/dm-outreach-state.json" ]; then
        python3 -c "
import json, sys
s = json.load(open('$HARNESS_DIR/dm-outreach-state.json'))
dc = s.get('dailyCounts', {})
print(f\"  Cycle #{s.get('cycleCount',0)} | Total sent: {s.get('totalSent',0)} | Failed: {s.get('totalFailed',0)}\")
for p, d in dc.items():
    print(f\"  {p.upper()}: {d.get('sent',0)} sent today ({d.get('date','')})\")
print(f\"  Next cycle: {s.get('nextCycleAt','—')}\")
" 2>/dev/null
      fi
      echo "  Last log:"
      tail -5 "$LOG_FILE" 2>/dev/null | sed 's/^/    /'
    else
      echo "DM Outreach: STOPPED"
    fi
    ;;

  test)
    node "$HARNESS_DIR/dm-outreach-daemon.js" --test
    ;;

  dry-run)
    echo "Running one dry-run cycle (no DMs will be sent)..."
    node "$HARNESS_DIR/dm-outreach-daemon.js" --once --dry-run
    ;;

  once)
    echo "Running one live cycle..."
    node "$HARNESS_DIR/dm-outreach-daemon.js" --once
    ;;

  *)
    echo "Usage: $0 {start|stop|status|test|dry-run|once}"
    echo ""
    echo "Env vars:"
    echo "  DM_DAILY_LIMIT_IG=10   DM_DAILY_LIMIT_TW=15   DM_DAILY_LIMIT_TT=8"
    echo "  DM_CYCLE_MIN=30        DM_ACTIVE_HOURS_START=8  DM_ACTIVE_HOURS_END=20"
    exit 1
    ;;
esac
