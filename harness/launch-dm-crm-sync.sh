#!/bin/bash
# launch-dm-crm-sync.sh — manage the DM→CRMLite sync daemon
# Usage: ./launch-dm-crm-sync.sh [start|stop|status|once|test]

H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
PID_FILE="$H/dm-crm-sync.pid"
LOG_FILE="$H/logs/dm-crm-sync.log"
mkdir -p "$H/logs"

CMD="${1:-start}"

case "$CMD" in
  start)
    if pgrep -f "dm-crm-sync.js" > /dev/null 2>&1; then
      echo "[dm-crm-sync] Already running (PID $(cat $PID_FILE 2>/dev/null))"
      exit 0
    fi
    echo "[dm-crm-sync] Starting daemon..."
    nohup node "$H/dm-crm-sync.js" >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "[dm-crm-sync] Started PID $!"
    ;;

  stop)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      kill "$PID" 2>/dev/null && echo "[dm-crm-sync] Stopped PID $PID" || echo "[dm-crm-sync] Not running"
      rm -f "$PID_FILE"
    else
      pkill -f "dm-crm-sync.js" 2>/dev/null && echo "[dm-crm-sync] Stopped" || echo "[dm-crm-sync] Not running"
    fi
    ;;

  status)
    if pgrep -f "dm-crm-sync.js" > /dev/null 2>&1; then
      PID=$(pgrep -f "dm-crm-sync.js")
      echo "[dm-crm-sync] RUNNING (PID $PID)"
    else
      echo "[dm-crm-sync] NOT running"
    fi
    echo ""
    node -e "
      const fs = require('fs');
      const H = '$H';
      const platforms = ['twitter','instagram','tiktok','linkedin'];
      for (const p of platforms) {
        try {
          const q = JSON.parse(fs.readFileSync(\`\${H}/\${p}-dm-queue.json\`, 'utf8'));
          const sent = (q.queue||[]).filter(e => e.status === 'sent');
          const synced = sent.filter(e => e.crmlite_synced === true);
          const failed = sent.filter(e => e.crmlite_synced === 'failed');
          const pending = sent.filter(e => !e.crmlite_synced);
          console.log(\`  \${p}: sent=\${sent.length} synced=\${synced.length} pending=\${pending.length} failed=\${failed.length}\`);
        } catch { console.log(\`  \${p}: queue not found\`); }
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
    echo "[dm-crm-sync] Running single sync cycle..."
    node "$H/dm-crm-sync.js" --once
    ;;

  test)
    node "$H/dm-crm-sync.js" --test
    ;;

  *)
    echo "Usage: $0 [start|stop|status|once|test]"
    exit 1
    ;;
esac
