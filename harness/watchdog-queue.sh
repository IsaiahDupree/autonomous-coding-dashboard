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

# Unset CLAUDECODE so harness can spawn nested claude sessions
unset CLAUDECODE

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

# Start twitter-research-agent once per day (24h minimum interval)
TWITTER_RESEARCH_LAUNCH="/Users/isaiahdupree/Documents/Software/Safari Automation/packages/market-research/src/research-agent/launch-twitter-research-agent.sh"
TWITTER_RESEARCH_LAST_RUN_FILE="/tmp/twitter-research-agent-last-run"
TWITTER_RESEARCH_INTERVAL=$((24 * 60 * 60)) # 24 hours in seconds
if [[ -f "$TWITTER_RESEARCH_LAUNCH" ]]; then
  LAST_RUN=0
  if [[ -f "$TWITTER_RESEARCH_LAST_RUN_FILE" ]]; then
    LAST_RUN=$(cat "$TWITTER_RESEARCH_LAST_RUN_FILE" 2>/dev/null || echo 0)
  fi
  NOW_TS=$(date +%s)
  SINCE_LAST=$((NOW_TS - LAST_RUN))
  if [[ "$SINCE_LAST" -ge "$TWITTER_RESEARCH_INTERVAL" ]]; then
    echo "[watchdog] Starting twitter-research-agent (last run: ${SINCE_LAST}s ago)..." | tee -a "$LOG"
    echo "$NOW_TS" > "$TWITTER_RESEARCH_LAST_RUN_FILE"
    nohup /bin/zsh -l "$TWITTER_RESEARCH_LAUNCH" run-now >> "$H/logs/twitter-research-agent.log" 2>&1 &
    echo "[watchdog] Twitter Research Agent started (PID: $!)" | tee -a "$LOG"
  else
    echo "[watchdog] twitter-research-agent skipped (ran ${SINCE_LAST}s ago, interval=${TWITTER_RESEARCH_INTERVAL}s)" | tee -a "$LOG"
  fi
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

# Start LinkedIn DM auto-sender if not already running
if ! pgrep -f "linkedin-dm-autosender.js" > /dev/null 2>&1; then
  echo "[watchdog] Starting linkedin-dm-autosender..." | tee -a "$LOG"
  nohup node "$H/linkedin-dm-autosender.js" >> "$H/logs/linkedin-dm-autosender.log" 2>&1 &
  LI_DM_PID=$!
  echo $LI_DM_PID > "$H/linkedin-dm-autosender.pid"
  echo "[watchdog] LinkedIn DM Auto-Sender PID: $LI_DM_PID" | tee -a "$LOG"
else
  echo "[watchdog] linkedin-dm-autosender already running" | tee -a "$LOG"
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

# Start research-to-publish once per day (runs after twitter-research-agent)
RTP_LAST_RUN_FILE="/tmp/research-to-publish-last-run"
RTP_INTERVAL=$((24 * 60 * 60))
RTP_LAST_RUN=0
if [[ -f "$RTP_LAST_RUN_FILE" ]]; then
  RTP_LAST_RUN=$(cat "$RTP_LAST_RUN_FILE" 2>/dev/null || echo 0)
fi
NOW_TS=$(date +%s)
RTP_SINCE=$((NOW_TS - RTP_LAST_RUN))
if [[ "$RTP_SINCE" -ge "$RTP_INTERVAL" ]]; then
  echo "[watchdog] Starting research-to-publish (last run: ${RTP_SINCE}s ago)..." | tee -a "$LOG"
  echo "$NOW_TS" > "$RTP_LAST_RUN_FILE"
  nohup /bin/zsh -l "$H/launch-research-to-publish.sh" run-now >> "$H/logs/research-to-publish.log" 2>&1 &
  echo "[watchdog] Research-to-publish started (PID: $!)" | tee -a "$LOG"
else
  echo "[watchdog] research-to-publish skipped (ran ${RTP_SINCE}s ago)" | tee -a "$LOG"
fi

# Start next-action-executor if not already running
if ! pgrep -f "next-action-executor.js" > /dev/null 2>&1; then
  echo "[watchdog] Starting next-action-executor..." | tee -a "$LOG"
  nohup node "$H/next-action-executor.js" >> "$H/logs/next-action-executor.log" 2>&1 &
  NAE_PID=$!
  echo $NAE_PID > "$H/next-action-executor.pid"
  echo "[watchdog] Next-Action Executor PID: $NAE_PID" | tee -a "$LOG"
else
  echo "[watchdog] next-action-executor already running" | tee -a "$LOG"
fi

# Start reply-crm-bridge if not already running
if ! pgrep -f "reply-crm-bridge.js" > /dev/null 2>&1; then
  echo "[watchdog] Starting reply-crm-bridge..." | tee -a "$LOG"
  nohup node "$H/reply-crm-bridge.js" >> "$H/logs/reply-crm-bridge.log" 2>&1 &
  RCB_PID=$!
  echo $RCB_PID > "$H/reply-crm-bridge.pid"
  echo "[watchdog] Reply-CRM Bridge PID: $RCB_PID" | tee -a "$LOG"
else
  echo "[watchdog] reply-crm-bridge already running" | tee -a "$LOG"
fi

# Start email follow-up sequence daemon if not already running
if ! pgrep -f "email-followup-sequence.js" > /dev/null 2>&1; then
  echo "[watchdog] Starting email-followup-sequence..." | tee -a "$LOG"
  nohup node "$H/email-followup-sequence.js" >> "$H/logs/email-followup-sequence.log" 2>&1 &
  EFS_PID=$!
  echo $EFS_PID > "$H/email-followup-sequence.pid"
  echo "[watchdog] Email Follow-up Sequence PID: $EFS_PID" | tee -a "$LOG"
else
  echo "[watchdog] email-followup-sequence already running" | tee -a "$LOG"
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

# Parallel workers: run 2 run-queue.js instances simultaneously
PARALLEL_WORKERS=2

# Track idle state for rate-limiting notifications (notify every 30min max)
LAST_IDLE_NOTIFY=0
IDLE_NOTIFY_INTERVAL=1800  # 30 minutes

RUN=0
while true; do
  RUN=$((RUN + 1))
  echo "[watchdog] $(date '+%Y-%m-%d %H:%M:%S') — Starting ${PARALLEL_WORKERS}-worker pass #$RUN" | tee -a "$LOG"

  # Wait for any existing run-queue workers to finish before starting new ones
  while pgrep -f "run-queue.js" > /dev/null 2>&1; do
    sleep 30
  done

  # Launch all workers in parallel, each handling a different slot of the queue
  PIDS=()
  for SLOT in $(seq 0 $((PARALLEL_WORKERS - 1))); do
    WORKER_LOG="$H/logs/run-queue-worker${SLOT}.log"
    echo "[watchdog] $(date '+%Y-%m-%d %H:%M:%S') — Launching worker $SLOT (pass #$RUN)" | tee -a "$LOG"
    node "$H/run-queue.js" --slot=$SLOT --total-slots=$PARALLEL_WORKERS --generate >> "$WORKER_LOG" 2>&1 &
    PIDS+=($!)
  done

  # Wait for all workers to finish
  EXITS=()
  for PID in "${PIDS[@]}"; do
    wait "$PID"
    EXITS+=($?)
  done

  # Report per-worker results
  for i in "${!EXITS[@]}"; do
    EXIT="${EXITS[$i]}"
    echo "[watchdog] $(date '+%Y-%m-%d %H:%M:%S') — worker $i exited (code=$EXIT)" | tee -a "$LOG"
    if [ "$EXIT" -ne 0 ]; then
      MSG="&#x26A0;&#xFE0F; ACD worker $i crashed (exit $EXIT) at $(date '+%H:%M:%S')%0ARestarting automatically in 30s."
      echo "[watchdog] Sending crash notification to Telegram" | tee -a "$LOG"
      send_telegram "$MSG"
    fi
  done

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
