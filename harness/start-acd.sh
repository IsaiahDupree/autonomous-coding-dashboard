#!/bin/bash
# start-acd.sh — Launch ACD queue with watchdog protection
#
# Usage:
#   ./start-acd.sh              # Kill stale procs, start queue + watchdog
#   ./start-acd.sh --status     # Show current ACD + watchdog status
#   ./start-acd.sh --restart    # Restart queue only (keeps watchdog running)

set -euo pipefail

HARNESS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QUEUE_LOG="$HARNESS_DIR/logs/watchdog-queue.log"
WATCHDOG_LOG="$HARNESS_DIR/logs/watchdog-monitor.log"
QUEUE_SCRIPT="$HARNESS_DIR/run-queue.js"
WATCHDOG_SCRIPT="$HARNESS_DIR/watchdog.js"

mkdir -p "$HARNESS_DIR/logs"

# ── Status ────────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--status" ]]; then
  echo ""
  echo "🛡  ACD Status"
  echo "═══════════════════════════════════"

  QUEUE_PID=$(pgrep -f 'run-queue.js' 2>/dev/null || echo "")
  WATCHDOG_PID=$(pgrep -f 'watchdog.js' 2>/dev/null || echo "")
  HARNESS_PID=$(pgrep -f 'run-harness-v2.js' 2>/dev/null || echo "")

  if [[ -n "$QUEUE_PID" ]]; then
    STATE=$(ps -p $QUEUE_PID -o state= 2>/dev/null || echo "?")
    echo "  Queue:     PID $QUEUE_PID (state: $STATE)"
  else
    echo "  Queue:     ❌ not running"
  fi

  if [[ -n "$WATCHDOG_PID" ]]; then
    echo "  Watchdog:  PID $WATCHDOG_PID ✅"
  else
    echo "  Watchdog:  ❌ not running"
  fi

  if [[ -n "$HARNESS_PID" ]]; then
    echo "  Harness:   PID $HARNESS_PID (active session)"
  fi

  if [[ -f "$HARNESS_DIR/watchdog-heartbeat.json" ]]; then
    node -e "
      const hb = JSON.parse(require('fs').readFileSync('$HARNESS_DIR/watchdog-heartbeat.json'));
      const ageMin = ((Date.now() - new Date(hb.ts).getTime()) / 60000).toFixed(1);
      console.log('  Heartbeat: ' + ageMin + ' min old');
      console.log('  Repo:      ' + (hb.currentRepo || 'idle'));
      console.log('  Passes:    ' + hb.passingCount);
    " 2>/dev/null || echo "  Heartbeat: (parse error)"
  fi

  if [[ -f "$HARNESS_DIR/watchdog-state.json" ]]; then
    node -e "
      const s = JSON.parse(require('fs').readFileSync('$HARNESS_DIR/watchdog-state.json'));
      if (s.restartCount) console.log('  Restarts:  ' + s.restartCount + ' total (last: ' + (s.lastRestart || 'never') + ')');
      if (s.lastRestartReason) console.log('  Last why:  ' + s.lastRestartReason);
    " 2>/dev/null || true
  fi

  if [[ -f "$HARNESS_DIR/queue-status.json" ]]; then
    node -e "
      const qs = JSON.parse(require('fs').readFileSync('$HARNESS_DIR/queue-status.json'));
      const q  = JSON.parse(require('fs').readFileSync('$HARNESS_DIR/repo-queue.json'));
      const completed = new Set(qs.completedRepos || []);
      const pending = q.repos.filter(r => r.enabled && !completed.has(r.id) && r.id !== qs.currentRepo);
      console.log('');
      console.log('  Queue:     ' + completed.size + ' done, 1 active, ' + pending.length + ' pending');
      console.log('  Current:   ' + (qs.currentRepo || 'none'));
      console.log('  Updated:   ' + (qs.lastUpdated || 'never'));
    " 2>/dev/null || true
  fi
  echo ""
  exit 0
fi

# ── Restart queue only ────────────────────────────────────────────────────────
if [[ "${1:-}" == "--restart" ]]; then
  echo "🔄 Restarting queue only..."
  pkill -TERM -f 'run-queue.js'  2>/dev/null || true
  pkill -TERM -f 'run-harness-v2.js' 2>/dev/null || true
  sleep 3
  pkill -KILL -f 'run-queue.js'  2>/dev/null || true
  pkill -KILL -f 'run-harness-v2.js' 2>/dev/null || true
  sleep 1
  nohup node "$QUEUE_SCRIPT" >> "$QUEUE_LOG" 2>&1 &
  echo "  ✅ Queue restarted — PID $!"
  echo "  Log: tail -f $QUEUE_LOG"
  exit 0
fi

# ── Full launch ───────────────────────────────────────────────────────────────
echo ""
echo "🛡  ACD — Full Launch with Watchdog"
echo "═══════════════════════════════════"

# Kill stale processes
echo "🔪 Cleaning up stale processes..."
pkill -TERM -f 'watchdog.js'       2>/dev/null || true
pkill -TERM -f 'run-queue.js'      2>/dev/null || true
pkill -TERM -f 'run-harness-v2.js' 2>/dev/null || true
sleep 3
pkill -KILL -f 'watchdog.js'       2>/dev/null || true
pkill -KILL -f 'run-queue.js'      2>/dev/null || true
pkill -KILL -f 'run-harness-v2.js' 2>/dev/null || true
sleep 1

# Start queue
echo "🚀 Starting run-queue.js..."
nohup node "$QUEUE_SCRIPT" >> "$QUEUE_LOG" 2>&1 &
QUEUE_PID=$!
echo "   PID: $QUEUE_PID"

# Give queue a moment to write its heartbeat
sleep 3

# Start watchdog (monitors queue, restarts if stall/stale)
echo "👀 Starting watchdog..."
nohup node "$WATCHDOG_SCRIPT" --start-queue >> "$WATCHDOG_LOG" 2>&1 &
WATCHDOG_PID=$!
echo "   PID: $WATCHDOG_PID"

echo ""
echo "✅ ACD running with watchdog protection"
echo ""
echo "   Monitor queue:    tail -f $QUEUE_LOG"
echo "   Monitor watchdog: tail -f $WATCHDOG_LOG"
echo "   Status:           $HARNESS_DIR/start-acd.sh --status"
echo "   Restart queue:    $HARNESS_DIR/start-acd.sh --restart"
echo ""
