#!/usr/bin/env bash
# Launch Upwork Autonomous Agent
# Searches for gigs, scores them, builds deliverables, deploys, and sends proposals with demo URLs
# Port: 3107 (upwork-hunter service)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPWORK_HUNTER_DIR="/Users/isaiahdupree/Documents/Software/Safari Automation/packages/upwork-hunter"
PID_FILE="$SCRIPT_DIR/upwork-agent.pid"
LOG_FILE="$SCRIPT_DIR/logs/upwork-agent.log"
SERVICE_PORT=3107

# Ensure log directory exists
mkdir -p "$SCRIPT_DIR/logs"

# Function to check if service is running
is_running() {
  if [ -f "$PID_FILE" ]; then
    local pid=$(cat "$PID_FILE")
    if ps -p "$pid" > /dev/null 2>&1; then
      return 0
    fi
  fi
  return 1
}

# Function to get service health
get_health() {
  curl -s --max-time 2 "http://localhost:$SERVICE_PORT/health" 2>/dev/null || echo '{"status":"down"}'
}

# Start service
start() {
  if is_running; then
    echo "⚠️  Upwork agent already running (PID $(cat "$PID_FILE"))"
    return 1
  fi

  echo "🚀 Starting Upwork autonomous agent..."
  cd "$UPWORK_HUNTER_DIR"

  # Start server in background
  nohup npx tsx src/api/server.ts >> "$LOG_FILE" 2>&1 &
  local pid=$!
  echo $pid > "$PID_FILE"

  # Wait for service to be ready
  echo "Waiting for service on port $SERVICE_PORT..."
  for i in {1..30}; do
    if curl -s --max-time 1 "http://localhost:$SERVICE_PORT/health" > /dev/null 2>&1; then
      echo "✅ Upwork agent started successfully (PID $pid)"
      echo "📊 Health check:"
      get_health | jq -r 'to_entries | map("  \(.key): \(.value)") | .[]' 2>/dev/null || get_health
      return 0
    fi
    sleep 1
  done

  echo "❌ Service failed to start (timeout)"
  return 1
}

# Stop service
stop() {
  if ! is_running; then
    echo "⚠️  Upwork agent not running"
    rm -f "$PID_FILE"
    return 1
  fi

  local pid=$(cat "$PID_FILE")
  echo "🛑 Stopping Upwork agent (PID $pid)..."
  kill "$pid" 2>/dev/null || true

  # Wait for graceful shutdown
  for i in {1..10}; do
    if ! ps -p "$pid" > /dev/null 2>&1; then
      echo "✅ Upwork agent stopped"
      rm -f "$PID_FILE"
      return 0
    fi
    sleep 1
  done

  # Force kill if still running
  echo "⚠️  Force killing process..."
  kill -9 "$pid" 2>/dev/null || true
  rm -f "$PID_FILE"
  echo "✅ Upwork agent stopped (forced)"
}

# Restart service
restart() {
  echo "🔄 Restarting Upwork agent..."
  stop || true
  sleep 2
  start
}

# Show status
status() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 Upwork Autonomous Agent Status"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if is_running; then
    local pid=$(cat "$PID_FILE")
    echo "Status: ✅ RUNNING (PID $pid)"
    echo ""
    echo "Health Check:"
    local health=$(get_health)
    echo "$health" | jq '.' 2>/dev/null || echo "$health"
    echo ""
    echo "Service: http://localhost:$SERVICE_PORT"
    echo "Logs: $LOG_FILE"
  else
    echo "Status: ❌ STOPPED"
    echo ""
    echo "Start with: $0 start"
  fi

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Show logs
logs() {
  if [ -f "$LOG_FILE" ]; then
    tail -f "$LOG_FILE"
  else
    echo "❌ Log file not found: $LOG_FILE"
    return 1
  fi
}

# Main
case "${1:-status}" in
  start)
    start
    ;;
  stop)
    stop
    ;;
  restart)
    restart
    ;;
  status)
    status
    ;;
  logs)
    logs
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|logs}"
    echo ""
    echo "Commands:"
    echo "  start    - Start the Upwork agent"
    echo "  stop     - Stop the Upwork agent"
    echo "  restart  - Restart the Upwork agent"
    echo "  status   - Show current status and health"
    echo "  logs     - Tail the log file"
    exit 1
    ;;
esac
