#!/bin/bash
# watchdog-queue.sh
# Keeps run-queue.js running through all targets.
# On each restart it re-reads repo-queue.json, so newly added entries
# (like the 6 MCP servers) are automatically picked up.
# Already-complete repos are skipped via isRepoComplete() check.

H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
LOG="$H/logs/watchdog-queue.log"
mkdir -p "$H/logs"

# Start doctor-daemon if not already running
if ! pgrep -f "doctor-daemon.js" > /dev/null 2>&1; then
  echo "[watchdog] Starting doctor-daemon..." | tee -a "$LOG"
  nohup node "$H/doctor-daemon.js" >> "$H/logs/doctor-daemon.log" 2>&1 &
  echo "[watchdog] Doctor daemon PID: $!" | tee -a "$LOG"
else
  echo "[watchdog] doctor-daemon already running" | tee -a "$LOG"
fi

# Start twitter-comment-sweep daemon if not already running
if ! pgrep -f "twitter-comment-sweep.js" > /dev/null 2>&1; then
  echo "[watchdog] Starting twitter-comment-sweep..." | tee -a "$LOG"
  nohup node "$H/twitter-comment-sweep.js" >> "$H/logs/twitter-comment-sweep.log" 2>&1 &
  TW_PID=$!
  echo $TW_PID > "$H/twitter-comment-sweep.pid"
  echo "[watchdog] Twitter comment sweep PID: $TW_PID" | tee -a "$LOG"
else
  echo "[watchdog] twitter-comment-sweep already running" | tee -a "$LOG"
fi

# Start threads-comment-sweep daemon if not already running
if ! pgrep -f "threads-comment-sweep.js" > /dev/null 2>&1; then
  echo "[watchdog] Starting threads-comment-sweep..." | tee -a "$LOG"
  nohup node "$H/threads-comment-sweep.js" >> "$H/logs/threads-comment-sweep.log" 2>&1 &
  TH_PID=$!
  echo $TH_PID > "$H/threads-comment-sweep.pid"
  echo "[watchdog] Threads comment sweep PID: $TH_PID" | tee -a "$LOG"
else
  echo "[watchdog] threads-comment-sweep already running" | tee -a "$LOG"
fi

# Start tiktok-comment-sweep daemon if not already running
if ! pgrep -f "tiktok-comment-sweep.js" > /dev/null 2>&1; then
  echo "[watchdog] Starting tiktok-comment-sweep..." | tee -a "$LOG"
  nohup node "$H/tiktok-comment-sweep.js" >> "$H/logs/tiktok-comment-sweep.log" 2>&1 &
  TK_PID=$!
  echo $TK_PID > "$H/tiktok-comment-sweep.pid"
  echo "[watchdog] TikTok comment sweep PID: $TK_PID" | tee -a "$LOG"
else
  echo "[watchdog] tiktok-comment-sweep already running" | tee -a "$LOG"
fi

# Start DM sweep daemons (approval-queue-based, no auto-send)
for DM_DAEMON in twitter-dm-sweep instagram-dm-sweep tiktok-dm-sweep; do
  if ! pgrep -f "${DM_DAEMON}.js" > /dev/null 2>&1; then
    echo "[watchdog] Starting ${DM_DAEMON}..." | tee -a "$LOG"
    nohup node "$H/${DM_DAEMON}.js" >> "$H/logs/${DM_DAEMON}.log" 2>&1 &
    DM_PID=$!
    echo $DM_PID > "$H/${DM_DAEMON}.pid"
    echo "[watchdog] ${DM_DAEMON} PID: $DM_PID" | tee -a "$LOG"
  else
    echo "[watchdog] ${DM_DAEMON} already running" | tee -a "$LOG"
  fi
done

# Start instagram-comment-sweep daemon if not already running
if ! pgrep -f "instagram-comment-sweep.js" > /dev/null 2>&1; then
  echo "[watchdog] Starting instagram-comment-sweep..." | tee -a "$LOG"
  nohup node "$H/instagram-comment-sweep.js" >> "$H/logs/instagram-comment-sweep.log" 2>&1 &
  IG_PID=$!
  echo $IG_PID > "$H/instagram-comment-sweep.pid"
  echo "[watchdog] Instagram comment sweep PID: $IG_PID" | tee -a "$LOG"
else
  echo "[watchdog] instagram-comment-sweep already running" | tee -a "$LOG"
fi

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
