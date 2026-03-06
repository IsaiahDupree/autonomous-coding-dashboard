#!/bin/bash
# LinkedIn Hub — Unified Start/Stop/Status
# Usage: ./harness/launch-linkedin-hub.sh start|stop|status|test

set -euo pipefail

HARNESS_DIR="$(cd "$(dirname "$0")" && pwd)"
LOGS_DIR="$HARNESS_DIR/logs"
mkdir -p "$LOGS_DIR"

CHROME_SCRIPT="$HARNESS_DIR/start-chrome-debug.sh"
DISCOVERY_DAEMON="$HARNESS_DIR/linkedin-daemon.js"
ENGAGEMENT_DAEMON="$HARNESS_DIR/linkedin-engagement-daemon.js"
FOLLOWUP_ENGINE="$HARNESS_DIR/linkedin-followup-engine.js"

DISCOVERY_PID="$HARNESS_DIR/linkedin-daemon.pid"
ENGAGEMENT_PID="$HARNESS_DIR/linkedin-engagement-daemon.pid"
FOLLOWUP_PID="$HARNESS_DIR/linkedin-followup-engine.pid"

CONNECTION_SENDER="$HARNESS_DIR/linkedin-connection-sender.js"
DM_SENDER="$HARNESS_DIR/linkedin-dm-sender.js"
INBOX_MONITOR="$HARNESS_DIR/linkedin-inbox-monitor.js"
INBOX_PID="$HARNESS_DIR/linkedin-inbox-monitor.pid"

SAFARI_LI_PORT=3105
CDP_URL="http://localhost:9333"

# ── Helper ───────────────────────────────────────────────────────────────────
is_running() {
  local pid_file="$1"
  if [ -f "$pid_file" ]; then
    local pid
    pid=$(cat "$pid_file" 2>/dev/null || echo "")
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

start_daemon() {
  local name="$1"
  local script="$2"
  local pid_file="$3"
  local log_file="$4"

  if is_running "$pid_file"; then
    local pid
    pid=$(cat "$pid_file")
    echo "  ✓ $name already running (PID $pid)"
    return
  fi

  nohup node "$script" >> "$log_file" 2>&1 &
  echo $! > "$pid_file"
  echo "  ✓ $name started (PID $!)"
}

stop_daemon() {
  local name="$1"
  local pid_file="$2"

  if is_running "$pid_file"; then
    local pid
    pid=$(cat "$pid_file")
    kill "$pid" 2>/dev/null || true
    rm -f "$pid_file"
    echo "  ✓ $name stopped (PID $pid)"
  else
    rm -f "$pid_file"
    echo "  - $name not running"
  fi
}

queue_count() {
  local file="$1"
  if [ -f "$file" ]; then
    node -e "const q=JSON.parse(require('fs').readFileSync('$file','utf-8'));console.log(q.filter(i=>i.status==='pending_approval').length)" 2>/dev/null || echo "?"
  else
    echo "0"
  fi
}

# ── Commands ─────────────────────────────────────────────────────────────────
CMD="${1:-status}"

case "$CMD" in
start)
  echo "Starting LinkedIn Hub..."
  echo ""

  # Check Chrome CDP
  if curl -s --max-time 2 "$CDP_URL/json" > /dev/null 2>&1; then
    echo "  ✓ Chrome CDP: UP ($CDP_URL)"
  else
    echo "  ⚠ Chrome CDP: DOWN — run: $CHROME_SCRIPT start"
  fi

  # Check Safari LinkedIn service
  if curl -s --max-time 2 "http://localhost:$SAFARI_LI_PORT/health" > /dev/null 2>&1; then
    echo "  ✓ Safari LinkedIn :$SAFARI_LI_PORT: UP"
  else
    echo "  ⚠ Safari LinkedIn :$SAFARI_LI_PORT: DOWN (non-blocking)"
  fi

  echo ""
  start_daemon "Discovery Daemon"    "$DISCOVERY_DAEMON"  "$DISCOVERY_PID"  "$LOGS_DIR/linkedin-daemon.log"
  start_daemon "Engagement Daemon"   "$ENGAGEMENT_DAEMON" "$ENGAGEMENT_PID" "$LOGS_DIR/linkedin-engagement.log"
  start_daemon "Follow-up Engine"    "$FOLLOWUP_ENGINE"   "$FOLLOWUP_PID"   "$LOGS_DIR/linkedin-followup.log"
  start_daemon "Inbox Monitor"       "$INBOX_MONITOR"     "$INBOX_PID"      "$LOGS_DIR/linkedin-inbox.log"

  echo ""
  echo "  Manual triggers (run on demand):"
  echo "    node $CONNECTION_SENDER --dry-run   # preview connection requests"
  echo "    node $DM_SENDER --dry-run           # preview DM sends"
  echo ""
  echo "LinkedIn Hub started. Dashboard: http://localhost:3535"
  ;;

stop)
  echo "Stopping LinkedIn Hub..."
  echo ""
  stop_daemon "Discovery Daemon"  "$DISCOVERY_PID"
  stop_daemon "Engagement Daemon" "$ENGAGEMENT_PID"
  stop_daemon "Follow-up Engine"  "$FOLLOWUP_PID"
  stop_daemon "Inbox Monitor"    "$INBOX_PID"
  echo ""
  echo "LinkedIn Hub stopped."
  ;;

status)
  echo "═══ LinkedIn Hub Status ═══"
  echo ""

  # Chrome CDP
  if curl -s --max-time 2 "$CDP_URL/json" > /dev/null 2>&1; then
    echo "  Chrome CDP     : UP"
  else
    echo "  Chrome CDP     : DOWN"
  fi

  # Safari LinkedIn
  if curl -s --max-time 2 "http://localhost:$SAFARI_LI_PORT/health" > /dev/null 2>&1; then
    echo "  Safari LI :$SAFARI_LI_PORT : UP"
  else
    echo "  Safari LI :$SAFARI_LI_PORT : DOWN"
  fi

  echo ""

  # Daemons
  if is_running "$DISCOVERY_PID"; then
    echo "  Discovery Daemon  : RUNNING (PID $(cat "$DISCOVERY_PID")) | pending: $(queue_count "$HARNESS_DIR/linkedin-dm-queue.json")"
  else
    echo "  Discovery Daemon  : STOPPED"
  fi

  if is_running "$ENGAGEMENT_PID"; then
    echo "  Engagement Daemon : RUNNING (PID $(cat "$ENGAGEMENT_PID")) | pending: $(queue_count "$HARNESS_DIR/linkedin-engagement-queue.json")"
  else
    echo "  Engagement Daemon : STOPPED"
  fi

  if is_running "$FOLLOWUP_PID"; then
    echo "  Follow-up Engine  : RUNNING (PID $(cat "$FOLLOWUP_PID")) | pending: $(queue_count "$HARNESS_DIR/linkedin-followup-queue.json")"
  else
    echo "  Follow-up Engine  : STOPPED"
  fi

  if is_running "$INBOX_PID"; then
    echo "  Inbox Monitor     : RUNNING (PID $(cat "$INBOX_PID")) | replies: $(node -e "try{const s=JSON.parse(require('fs').readFileSync('$HARNESS_DIR/linkedin-inbox-state.json','utf-8'));console.log(s.totalRepliesFound||0);}catch{console.log(0);}" 2>/dev/null || echo "?")"
  else
    echo "  Inbox Monitor     : STOPPED"
  fi

  echo ""
  echo "  Sender state:"
  echo "    Connections today: $(node -e "try{const s=JSON.parse(require('fs').readFileSync('$HARNESS_DIR/linkedin-connection-state.json','utf-8'));console.log(s.sentToday+'/15 daily, '+s.sentThisWeek+'/80 weekly');}catch{console.log('no state');}" 2>/dev/null || echo "?")"
  echo "    DMs sent today:    $(node -e "try{const s=JSON.parse(require('fs').readFileSync('$HARNESS_DIR/linkedin-dm-sender-state.json','utf-8'));console.log(s.sentToday+'/10');}catch{console.log('no state');}" 2>/dev/null || echo "?")"

  echo ""
  echo "  Recent Discovery log:"
  tail -5 "$LOGS_DIR/linkedin-daemon.log" 2>/dev/null | sed 's/^/    /' || echo "    (no log)"
  echo ""
  echo "  Recent Engagement log:"
  tail -5 "$LOGS_DIR/linkedin-engagement.log" 2>/dev/null | sed 's/^/    /' || echo "    (no log)"
  echo ""
  echo "  Recent Follow-up log:"
  tail -5 "$LOGS_DIR/linkedin-followup.log" 2>/dev/null | sed 's/^/    /' || echo "    (no log)"
  ;;

test)
  echo "═══ LinkedIn Hub Preflight ═══"
  echo ""

  echo "1. Chrome CDP ($CDP_URL):"
  if curl -s --max-time 3 "$CDP_URL/json" > /dev/null 2>&1; then
    echo "   ✓ ALIVE"
  else
    echo "   ✗ DOWN — launch with: $CHROME_SCRIPT start"
  fi

  echo "2. Safari LinkedIn (:$SAFARI_LI_PORT):"
  if curl -s --max-time 3 "http://localhost:$SAFARI_LI_PORT/health" > /dev/null 2>&1; then
    echo "   ✓ UP"
  else
    echo "   ✗ DOWN (daemons will use Chrome fallback)"
  fi

  echo "3. Discovery daemon preflight:"
  node "$DISCOVERY_DAEMON" --test 2>/dev/null | node -e "const d=require('fs').readFileSync('/dev/stdin','utf-8'); try { const j=JSON.parse(d); console.log('   linkedin_up:', j.linkedin_up, '| crmlite_key:', j.crmlite_key, '| queue:', j.queue_length); } catch { console.log('   ', d.slice(0,120)); }" 2>/dev/null || echo "   (could not run preflight)"

  echo "4. Inbox monitor preflight:"
  node "$INBOX_MONITOR" --test 2>/dev/null || echo "   (could not run preflight)"

  echo ""
  echo "All checks complete."
  ;;

*)
  echo "Usage: $0 start|stop|status|test"
  exit 1
  ;;
esac
