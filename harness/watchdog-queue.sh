#!/bin/bash
# watchdog-queue.sh
# Keeps run-queue.js running through all targets.
# On each restart it re-reads repo-queue.json, so newly added entries
# (like the 6 MCP servers) are automatically picked up.
# Already-complete repos are skipped via isRepoComplete() check.

H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
LOG="$H/logs/watchdog-queue.log"
mkdir -p "$H/logs"

# Don't start if run-queue is already running (avoid double-run)
if pgrep -f "run-queue.js" > /dev/null 2>&1; then
  echo "[watchdog] run-queue.js already running — monitoring only" | tee -a "$LOG"
fi

RUN=0
while true; do
  RUN=$((RUN + 1))
  echo "[watchdog] $(date '+%Y-%m-%d %H:%M:%S') — Starting run-queue.js pass #$RUN" | tee -a "$LOG"

  # Wait for any existing run-queue.js to finish before starting a new one
  while pgrep -f "run-queue.js" > /dev/null 2>&1; do
    sleep 30
  done

  echo "[watchdog] $(date '+%Y-%m-%d %H:%M:%S') — Launching run-queue.js (pass #$RUN)" | tee -a "$LOG"
  node "$H/run-queue.js" >> "$LOG" 2>&1
  EXIT=$?
  echo "[watchdog] $(date '+%Y-%m-%d %H:%M:%S') — run-queue.js exited (code=$EXIT)" | tee -a "$LOG"

  # Check if all repos are complete
  INCOMPLETE=$(node -e "
    const fs = require('fs');
    const q = JSON.parse(fs.readFileSync('$H/repo-queue.json','utf8'));
    const count = q.repos.filter(r => {
      if (r.enabled === false) return false;
      if (!fs.existsSync(r.featureList)) return true;
      try {
        const d = JSON.parse(fs.readFileSync(r.featureList,'utf8'));
        const feats = d.features || [];
        return feats.length === 0 || feats.some(f => !f.passes);
      } catch(e) { return true; }
    }).length;
    process.stdout.write(String(count));
  " 2>/dev/null)

  echo "[watchdog] Incomplete repos remaining: $INCOMPLETE" | tee -a "$LOG"

  if [ "$INCOMPLETE" = "0" ]; then
    echo "[watchdog] All repos complete — watchdog exiting." | tee -a "$LOG"
    exit 0
  fi

  echo "[watchdog] Sleeping 60s before next pass..." | tee -a "$LOG"
  sleep 60
done
