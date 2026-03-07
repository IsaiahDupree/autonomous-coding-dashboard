#!/bin/bash
# launch-obsidian-interlinker.sh — manage the Obsidian interlinking daemon

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/obsidian-interlinker.pid"
LOG_FILE="$SCRIPT_DIR/logs/obsidian-interlinker.log"

mkdir -p "$SCRIPT_DIR/logs"

case "${1:-start}" in
  start)
    if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "Already running (PID $(cat "$PID_FILE"))"
      exit 0
    fi
    nohup /opt/homebrew/bin/node "$SCRIPT_DIR/obsidian-interlinker.js" >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 1
    if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "Started Obsidian Interlinker (PID $(cat "$PID_FILE"))"
      echo "Watching: $HOME/.memory/vault"
      echo "Log: $LOG_FILE"
      echo "Activity log: $SCRIPT_DIR/obsidian-interlinker-log.ndjson"
    else
      echo "Process exited immediately — check $LOG_FILE"
      exit 1
    fi
    ;;

  stop)
    if [[ -f "$PID_FILE" ]]; then
      PID=$(cat "$PID_FILE")
      if kill "$PID" 2>/dev/null; then
        echo "Stopped PID $PID"
      else
        echo "Not running (stale PID $PID)"
      fi
      rm -f "$PID_FILE"
    else
      echo "Not running"
    fi
    ;;

  restart)
    "$0" stop
    sleep 1
    "$0" start
    ;;

  status)
    if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "RUNNING (PID $(cat "$PID_FILE"))"
      echo ""
      echo "Recent activity (obsidian-interlinker-log.ndjson):"
      tail -8 "$SCRIPT_DIR/obsidian-interlinker-log.ndjson" 2>/dev/null | \
        node -e "
          const rl = require('readline').createInterface({ input: process.stdin });
          rl.on('line', l => {
            try {
              const o = JSON.parse(l);
              const t = o.ts.slice(11, 19);
              const extra = o.file ? \`  \${o.file}\` : (o.message ? \`  \${o.message}\` : '');
              const links = o.addedLinks ? \`  +\${o.addedLinks} links\` : '';
              const rel   = o.relatedCount ? \`  \${o.relatedCount} related\` : '';
              console.log(\`  \${t}  \${o.event}\${extra}\${links}\${rel}\`);
            } catch {}
          });
        " 2>/dev/null || tail -8 "$SCRIPT_DIR/obsidian-interlinker-log.ndjson" 2>/dev/null
    else
      echo "NOT RUNNING"
      rm -f "$PID_FILE"
    fi
    ;;

  scan)
    echo "One-shot scan of entire vault (writes [[links]])..."
    /opt/homebrew/bin/node "$SCRIPT_DIR/obsidian-interlinker.js" --scan
    ;;

  dry-run)
    echo "Dry-run scan (preview only, no writes)..."
    /opt/homebrew/bin/node "$SCRIPT_DIR/obsidian-interlinker.js" --scan --dry-run
    ;;

  *)
    echo "Usage: $0 {start|stop|restart|status|scan|dry-run}"
    echo ""
    echo "  start    — start daemon (watches vault for new/changed notes)"
    echo "  stop     — stop daemon"
    echo "  restart  — stop then start"
    echo "  status   — show running state + recent activity"
    echo "  scan     — one-shot full vault interlink (no daemon)"
    echo "  dry-run  — preview what scan would change (no writes)"
    exit 1
    ;;
esac
