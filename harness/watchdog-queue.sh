#!/bin/bash
# watchdog-queue.sh
# Keeps run-queue.js running through all targets.
# On each restart it re-reads repo-queue.json, so newly added entries
# (like the 6 MCP servers) are automatically picked up.
# Already-complete repos are skipped via isRepoComplete() check.

H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
LOG="$H/logs/watchdog-queue.log"
mkdir -p "$H/logs"

# Self-sync: keep ~/.acd-watchdog.sh in sync so LaunchAgent always has latest version
if ! diff -q "$H/watchdog-queue.sh" "$HOME/.acd-watchdog.sh" > /dev/null 2>&1; then
  cp "$H/watchdog-queue.sh" "$HOME/.acd-watchdog.sh" && chmod +x "$HOME/.acd-watchdog.sh"
  echo "[watchdog] Synced ~/.acd-watchdog.sh" | tee -a "$LOG"
fi

# Load environment variables
if [[ -f "$H/.env" ]]; then
  set -a; source "$H/.env"; set +a
fi

# Run Safari tab coordinator once on startup (registers each platform's Safari tab)
echo "[watchdog] Running Safari tab coordinator..." | tee -a "$LOG"
node "$H/safari-tab-coordinator.js" --open >> "$H/logs/safari-tab-coordinator.log" 2>&1 &

# Start local-agent-daemon (observability mesh) if not already running
if ! pgrep -f "local-agent-daemon.js" > /dev/null 2>&1; then
  echo "[watchdog] Starting local-agent-daemon..." | tee -a "$LOG"
  nohup node "$H/local-agent-daemon.js" >> "$H/logs/local-agent-daemon.log" 2>&1 &
  echo $! > "$H/local-agent-daemon.pid"
  echo "[watchdog] Local Agent Daemon PID: $!" | tee -a "$LOG"
else
  echo "[watchdog] local-agent-daemon already running" | tee -a "$LOG"
fi

# Start obsidian-interlinker if not already running
if ! pgrep -f "obsidian-interlinker.js" > /dev/null 2>&1; then
  echo "[watchdog] Starting obsidian-interlinker..." | tee -a "$LOG"
  nohup node "$H/obsidian-interlinker.js" >> "$H/logs/obsidian-interlinker.log" 2>&1 &
  echo $! > "$H/obsidian-interlinker.pid"
  echo "[watchdog] Obsidian Interlinker PID: $!" | tee -a "$LOG"
else
  echo "[watchdog] obsidian-interlinker already running" | tee -a "$LOG"
fi

# Start node-heartbeat if not already running
if ! pgrep -f "node-heartbeat.js" > /dev/null 2>&1; then
  echo "[watchdog] Starting node-heartbeat..." | tee -a "$LOG"
  nohup node "$H/node-heartbeat.js" >> "$H/logs/node-heartbeat.log" 2>&1 &
  echo $! > "$H/node-heartbeat.pid"
  echo "[watchdog] Node Heartbeat PID: $!" | tee -a "$LOG"
else
  echo "[watchdog] node-heartbeat already running" | tee -a "$LOG"
fi

# Start safari-tab-watchdog if not already running (auto-recovers missing Safari tabs)
if ! pgrep -f "safari-tab-watchdog.js" > /dev/null 2>&1; then
  echo "[watchdog] Starting safari-tab-watchdog..." | tee -a "$LOG"
  nohup node "$H/safari-tab-watchdog.js" >> "$H/logs/safari-tab-watchdog.log" 2>&1 &
  echo $! > "$H/safari-tab-watchdog.pid"
  echo "[watchdog] Safari Tab Watchdog PID: $!" | tee -a "$LOG"
else
  echo "[watchdog] safari-tab-watchdog already running" | tee -a "$LOG"
fi

# Start cloud-bridge if not already running
if ! pgrep -f "cloud-bridge.js" > /dev/null 2>&1; then
  echo "[watchdog] Starting cloud-bridge..." | tee -a "$LOG"
  nohup node "$H/cloud-bridge.js" >> "$H/logs/cloud-bridge.log" 2>&1 &
  echo $! > "$H/cloud-bridge.pid"
  echo "[watchdog] Cloud Bridge PID: $!" | tee -a "$LOG"
else
  echo "[watchdog] cloud-bridge already running" | tee -a "$LOG"
fi

# Start browser-session-daemon if not already running
if ! pgrep -f "browser-session-daemon.js" > /dev/null 2>&1; then
  echo "[watchdog] Starting browser-session-daemon..." | tee -a "$LOG"
  nohup node "$H/browser-session-daemon.js" >> "$H/logs/browser-session-daemon.log" 2>&1 &
  echo $! > "$H/browser-session-daemon.pid"
  echo "[watchdog] Browser Session Daemon PID: $!" | tee -a "$LOG"
else
  echo "[watchdog] browser-session-daemon already running" | tee -a "$LOG"
fi

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

# Start DM→CRMLite sync daemon if not already running
if ! pgrep -f "dm-crm-sync.js" > /dev/null 2>&1; then
  echo "[watchdog] Starting dm-crm-sync..." | tee -a "$LOG"
  nohup node "$H/dm-crm-sync.js" >> "$H/logs/dm-crm-sync.log" 2>&1 &
  CRM_PID=$!
  echo $CRM_PID > "$H/dm-crm-sync.pid"
  echo "[watchdog] DM→CRMLite sync PID: $CRM_PID" | tee -a "$LOG"
else
  echo "[watchdog] dm-crm-sync already running" | tee -a "$LOG"
fi

# Start DM follow-up engine if not already running
if ! pgrep -f "dm-followup-engine.js" > /dev/null 2>&1; then
  echo "[watchdog] Starting dm-followup-engine..." | tee -a "$LOG"
  nohup node "$H/dm-followup-engine.js" >> "$H/logs/dm-followup-engine.log" 2>&1 &
  FU_PID=$!
  echo $FU_PID > "$H/dm-followup-engine.pid"
  echo "[watchdog] DM follow-up engine PID: $FU_PID" | tee -a "$LOG"
else
  echo "[watchdog] dm-followup-engine already running" | tee -a "$LOG"
fi

# Start DM outreach daemon (IG/TW/TT daily sends) if not already running
if ! pgrep -f "dm-outreach-daemon.js" > /dev/null 2>&1; then
  echo "[watchdog] Starting dm-outreach-daemon..." | tee -a "$LOG"
  nohup node "$H/dm-outreach-daemon.js" >> "$H/logs/dm-outreach.log" 2>&1 &
  DO_PID=$!
  echo $DO_PID > "$H/dm-outreach.pid"
  echo "[watchdog] DM Outreach Daemon PID: $DO_PID" | tee -a "$LOG"
else
  echo "[watchdog] dm-outreach-daemon already running" | tee -a "$LOG"
fi

# Start LinkedIn Chrome agent if not already running
if ! pgrep -f "linkedin-chrome-agent.js" > /dev/null 2>&1; then
  echo "[watchdog] Starting linkedin-chrome-agent..." | tee -a "$LOG"
  nohup node "$H/linkedin-chrome-agent.js" >> "$H/logs/linkedin-chrome-agent.log" 2>&1 &
  CA_PID=$!
  echo $CA_PID > "$H/linkedin-chrome-agent.pid"
  echo "[watchdog] LinkedIn Chrome Agent PID: $CA_PID" | tee -a "$LOG"
else
  echo "[watchdog] linkedin-chrome-agent already running" | tee -a "$LOG"
fi

# Start LinkedIn inbox monitor if not already running
if ! pgrep -f "linkedin-inbox-monitor.js" > /dev/null 2>&1; then
  echo "[watchdog] Starting linkedin-inbox-monitor..." | tee -a "$LOG"
  nohup node "$H/linkedin-inbox-monitor.js" >> "$H/logs/linkedin-inbox-monitor.log" 2>&1 &
  IM_PID=$!
  echo $IM_PID > "$H/linkedin-inbox-monitor.pid"
  echo "[watchdog] LinkedIn Inbox Monitor PID: $IM_PID" | tee -a "$LOG"
else
  echo "[watchdog] linkedin-inbox-monitor already running" | tee -a "$LOG"
fi

# Start YouTube content daemon if not already running
if ! pgrep -f "youtube-content-daemon.js" > /dev/null 2>&1; then
  echo "[watchdog] Starting youtube-content-daemon..." | tee -a "$LOG"
  nohup node "$H/youtube-content-daemon.js" >> "$H/logs/youtube-content-daemon.log" 2>&1 &
  YT_PID=$!
  echo $YT_PID > "$H/youtube-content-daemon.pid"
  echo "[watchdog] YouTube Content Daemon PID: $YT_PID" | tee -a "$LOG"
else
  echo "[watchdog] youtube-content-daemon already running" | tee -a "$LOG"
fi

# Start cron-manager if not already running (SDPA-014)
if ! pgrep -f "cron-manager.js" > /dev/null 2>&1; then
  echo "[watchdog] Starting cron-manager..." | tee -a "$LOG"
  nohup node "$H/cron-manager.js" >> "$H/logs/cron-manager.log" 2>&1 &
  CM_PID=$!
  echo $CM_PID > "$H/cron-manager.pid"
  echo "[watchdog] Cron Manager PID: $CM_PID" | tee -a "$LOG"
else
  echo "[watchdog] cron-manager already running" | tee -a "$LOG"
fi

# ── Telegram notifier ────────────────────────────────────────────────────────
TELEGRAM_TOKEN="${TELEGRAM_BOT_TOKEN:-8794428438:AAHIkgi_S9EYTr_8GcaDmjv4IlsdF3tYJEc}"
TELEGRAM_CHAT="${TELEGRAM_CHAT_ID:-7070052335}"

send_telegram() {
  local msg="$1"
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT}" \
    -d "text=${msg}" \
    -d "parse_mode=HTML" \
    > /dev/null 2>&1 || true
}

# Don't start if run-queue is already running (avoid double-run)
if pgrep -f "run-queue.js" > /dev/null 2>&1; then
  echo "[watchdog] run-queue.js already running — monitoring only" | tee -a "$LOG"
fi

# Track idle state for rate-limiting notifications (notify every 30min max)
LAST_IDLE_NOTIFY=0
IDLE_NOTIFY_INTERVAL=1800  # 30 minutes

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

  # Notify on crash (non-zero exit, not a clean "all done" exit)
  if [ "$EXIT" -ne 0 ]; then
    MSG="&#x26A0;&#xFE0F; ACD run-queue crashed (exit $EXIT) at $(date '+%H:%M:%S')%0ARestarting automatically in 30s.%0AAdd new tasks: send me a PRD or use /dispatch"
    echo "[watchdog] Sending crash notification to Telegram" | tee -a "$LOG"
    send_telegram "$MSG"
  fi

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
    NOW=$(date +%s)
    SINCE_LAST=$((NOW - LAST_IDLE_NOTIFY))
    if [ "$SINCE_LAST" -ge "$IDLE_NOTIFY_INTERVAL" ]; then
      MSG="&#x1F4A4; ACD is idle — queue empty at $(date '+%H:%M:%S')%0AAll projects complete. Ready for new coding tasks!%0ASend me a PRD description or use /dispatch to add work."
      echo "[watchdog] Sending idle notification to Telegram" | tee -a "$LOG"
      send_telegram "$MSG"
      LAST_IDLE_NOTIFY=$NOW
    fi
    echo "[watchdog] Queue empty — sleeping 5min before recheck..." | tee -a "$LOG"
    sleep 300
    continue
  fi

  # Health-check cron-manager on port 3302 — restart if down (SDPA-014)
  if ! curl -s --max-time 3 http://localhost:3302/health > /dev/null 2>&1; then
    echo "[watchdog] $(date '+%Y-%m-%d %H:%M:%S') — cron-manager :3302 unreachable — restarting" | tee -a "$LOG"
    pkill -f "cron-manager.js" 2>/dev/null || true
    sleep 2
    nohup node "$H/cron-manager.js" >> "$H/logs/cron-manager.log" 2>&1 &
    CM_PID=$!
    echo $CM_PID > "$H/cron-manager.pid"
    echo "[watchdog] Cron Manager restarted (PID: $CM_PID)" | tee -a "$LOG"
  fi

  echo "[watchdog] Sleeping 30s before next pass..." | tee -a "$LOG"
  sleep 30
done
