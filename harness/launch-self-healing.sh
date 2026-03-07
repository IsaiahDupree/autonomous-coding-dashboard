#!/bin/bash
# launch-self-healing.sh (SH-007)
# Starts the self-healing system: service-monitor + overstory-bridge + doctor-daemon
#
# Usage:
#   bash harness/launch-self-healing.sh start
#   bash harness/launch-self-healing.sh stop
#   bash harness/launch-self-healing.sh status

H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
LOG_DIR="$H/logs"
mkdir -p "$LOG_DIR"

CMD="${1:-status}"

# PID files
SM_PID_FILE="$H/service-monitor.pid"
OB_PID_FILE="$H/overstory-bridge.pid"

is_running() {
  local pidfile="$1"
  if [[ -f "$pidfile" ]]; then
    local pid=$(cat "$pidfile" 2>/dev/null)
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      echo "$pid"
      return 0
    fi
  fi
  return 1
}

start_daemon() {
  local name="$1"
  local script="$2"
  local pidfile="$3"
  local logfile="$4"

  if pid=$(is_running "$pidfile"); then
    echo "[self-healing] $name already running (PID $pid)"
    return
  fi

  echo "[self-healing] Starting $name..."
  nohup node "$script" >> "$logfile" 2>&1 &
  local new_pid=$!
  echo "$new_pid" > "$pidfile"
  echo "[self-healing] $name started (PID $new_pid)"
}

stop_daemon() {
  local name="$1"
  local pidfile="$2"

  if pid=$(is_running "$pidfile"); then
    echo "[self-healing] Stopping $name (PID $pid)..."
    kill "$pid" 2>/dev/null
    rm -f "$pidfile"
    echo "[self-healing] $name stopped"
  else
    echo "[self-healing] $name not running"
  fi
}

case "$CMD" in
  start)
    echo "=== Starting Self-Healing System ==="

    # Start service-monitor
    start_daemon "service-monitor" "$H/service-monitor.js" "$SM_PID_FILE" "$LOG_DIR/service-monitor.log"

    # Start overstory-bridge
    start_daemon "overstory-bridge" "$H/overstory-bridge.js" "$OB_PID_FILE" "$LOG_DIR/overstory-bridge.log"

    # Ensure doctor-daemon is running
    if ! pgrep -f "doctor-daemon.js" > /dev/null 2>&1; then
      echo "[self-healing] Starting doctor-daemon..."
      nohup node "$H/doctor-daemon.js" >> "$LOG_DIR/doctor-daemon.log" 2>&1 &
      echo "[self-healing] doctor-daemon started (PID $!)"
    else
      echo "[self-healing] doctor-daemon already running"
    fi

    echo "=== Self-Healing System Active ==="
    ;;

  stop)
    echo "=== Stopping Self-Healing System ==="
    stop_daemon "service-monitor" "$SM_PID_FILE"
    stop_daemon "overstory-bridge" "$OB_PID_FILE"
    echo "=== Self-Healing System Stopped ==="
    echo "(doctor-daemon left running — it serves other purposes)"
    ;;

  status)
    echo "=== Self-Healing System Status ==="

    if pid=$(is_running "$SM_PID_FILE"); then
      echo "  service-monitor:   RUNNING (PID $pid)"
    else
      echo "  service-monitor:   STOPPED"
    fi

    if pid=$(is_running "$OB_PID_FILE"); then
      echo "  overstory-bridge:  RUNNING (PID $pid)"
    else
      echo "  overstory-bridge:  STOPPED"
    fi

    if pgrep -f "doctor-daemon.js" > /dev/null 2>&1; then
      echo "  doctor-daemon:     RUNNING"
    else
      echo "  doctor-daemon:     STOPPED"
    fi

    # Show healing stats if available
    if [[ -f "$H/healing-stats.json" ]]; then
      echo ""
      echo "  Healing Stats:"
      node -e "
        const s = JSON.parse(require('fs').readFileSync('$H/healing-stats.json','utf8'));
        console.log('    Total attempts: ' + s.total_attempts);
        console.log('    Successes:      ' + s.successes);
        console.log('    Failures:       ' + s.failures);
        const rate = s.total_attempts > 0 ? ((s.successes / s.total_attempts) * 100).toFixed(0) : 'N/A';
        console.log('    Success rate:   ' + rate + '%');
        console.log('    Avg MTTR:       ' + s.mttr_seconds + 's');
      " 2>/dev/null
    fi

    # Show service health if available
    if [[ -f "$H/service-health.json" ]]; then
      echo ""
      echo "  Service Health:"
      node -e "
        const h = JSON.parse(require('fs').readFileSync('$H/service-health.json','utf8'));
        for (const s of h.services || []) {
          const icon = s.status === 'up' ? '●' : '○';
          console.log('    ' + icon + ' :' + s.port + ' ' + s.name.padEnd(14) + s.status.padEnd(8) + s.uptime_pct + '% uptime');
        }
      " 2>/dev/null
    fi
    echo ""
    ;;

  *)
    echo "Usage: bash harness/launch-self-healing.sh {start|stop|status}"
    exit 1
    ;;
esac
