#!/bin/bash
# launch-dm-followup-engine.sh — manage the DM follow-up detection engine
# Usage: ./launch-dm-followup-engine.sh [start|stop|status|once|dry-run|test]

H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
PID_FILE="$H/dm-followup-engine.pid"
LOG_FILE="$H/logs/dm-followup-engine.log"
mkdir -p "$H/logs"

CMD="${1:-start}"

case "$CMD" in
  start)
    if pgrep -f "dm-followup-engine.js" > /dev/null 2>&1; then
      echo "[dm-followup] Already running (PID $(cat $PID_FILE 2>/dev/null))"
      exit 0
    fi
    echo "[dm-followup] Starting daemon..."
    nohup node "$H/dm-followup-engine.js" >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "[dm-followup] Started PID $!"
    ;;

  stop)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      kill "$PID" 2>/dev/null && echo "[dm-followup] Stopped PID $PID" || echo "[dm-followup] Not running"
      rm -f "$PID_FILE"
    else
      pkill -f "dm-followup-engine.js" 2>/dev/null && echo "[dm-followup] Stopped" || echo "[dm-followup] Not running"
    fi
    ;;

  status)
    if pgrep -f "dm-followup-engine.js" > /dev/null 2>&1; then
      PID=$(pgrep -f "dm-followup-engine.js")
      echo "[dm-followup] RUNNING (PID $PID)"
    else
      echo "[dm-followup] NOT running"
    fi
    echo ""
    node -e "
      const fs = require('fs');
      const H = '$H';
      // State
      try {
        const s = JSON.parse(fs.readFileSync(\`\${H}/dm-followup-state.json\`, 'utf8'));
        console.log(\`  Last run: \${s.lastRun || 'never'}\`);
        console.log(\`  Total replies found (all time): \${s.totalRepliesFound || 0}\`);
      } catch { console.log('  State: not found'); }
      // Follow-up queues
      for (const p of ['twitter','instagram','tiktok']) {
        try {
          const q = JSON.parse(fs.readFileSync(\`\${H}/\${p}-followup-queue.json\`, 'utf8'));
          const pending = (q.queue||[]).filter(e => e.status === 'pending');
          const approved = (q.queue||[]).filter(e => e.status === 'approved');
          console.log(\`  \${p} followups: pending=\${pending.length} approved=\${approved.length} total=\${q.queue?.length||0}\`);
        } catch { console.log(\`  \${p} followup queue: not found\`); }
      }
      // Reply detections in DM queues
      for (const p of ['twitter','instagram','tiktok']) {
        try {
          const q = JSON.parse(fs.readFileSync(\`\${H}/\${p}-dm-queue.json\`, 'utf8'));
          const replied = (q.queue||[]).filter(e => e.reply_detected);
          console.log(\`  \${p} replied DMs: \${replied.length}\`);
        } catch {}
      }
    " 2>/dev/null
    echo ""
    echo "Last 5 log entries:"
    tail -5 "$LOG_FILE" 2>/dev/null | node -e "
      const rl = require('readline').createInterface({input:process.stdin});
      rl.on('line', l => { try { const e=JSON.parse(l); console.log(\`  [\${e.ts?.slice(11,19)}] \${e.msg}\`); } catch { console.log(\`  \${l}\`); } });
    " 2>/dev/null
    ;;

  once)
    echo "[dm-followup] Running single detection cycle..."
    node "$H/dm-followup-engine.js" --once
    ;;

  dry-run)
    echo "[dm-followup] Dry-run: detecting replies, not queuing follow-ups..."
    node "$H/dm-followup-engine.js" --once --dry-run
    ;;

  test)
    node "$H/dm-followup-engine.js" --test
    ;;

  *)
    echo "Usage: $0 [start|stop|status|once|dry-run|test]"
    exit 1
    ;;
esac
