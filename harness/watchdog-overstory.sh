#!/bin/zsh -l
# watchdog-overstory.sh — Keeps the Overstory coordinator alive 24/7
# Run once: nohup /bin/zsh -l harness/watchdog-overstory.sh >> harness/logs/overstory-watchdog.log 2>&1 &

ACD_DIR="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"
SESSION_NAME="overstory-coordinator"
LOG="$ACD_DIR/harness/logs/overstory-watchdog.log"
HEARTBEAT="$ACD_DIR/harness/overstory-heartbeat.json"
CHECK_INTERVAL=120  # check every 2 minutes

mkdir -p "$ACD_DIR/harness/logs"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG"
}

write_heartbeat() {
  local status="$1"
  echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"status\":\"$status\",\"session\":\"$SESSION_NAME\"}" > "$HEARTBEAT"
}

log "Overstory watchdog started (PID $$)"
write_heartbeat "watching"

while true; do
  # Check if tmux session is alive
  if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    log "WARN: Coordinator session '$SESSION_NAME' not found — restarting"
    write_heartbeat "restarting"

    cd "$ACD_DIR"
    /bin/zsh -l harness/launch-overstory.sh start >> "$LOG" 2>&1
    sleep 10

    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
      log "OK: Coordinator restarted successfully"
      write_heartbeat "running"
    else
      log "ERROR: Failed to restart coordinator"
      write_heartbeat "error"
    fi
  else
    # Session alive — check if coordinator process is responsive
    coordinator_status=$(ov coordinator status 2>&1 | head -1)
    write_heartbeat "running"

    # Log agent count
    agent_count=$(ov status --json 2>/dev/null | grep -c '"name"' || echo 0)
    log "OK: session alive | agents=$agent_count | $coordinator_status"
  fi

  sleep $CHECK_INTERVAL
done
