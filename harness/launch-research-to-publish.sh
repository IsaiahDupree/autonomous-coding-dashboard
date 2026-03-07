#!/bin/zsh -l
# launch-research-to-publish.sh — Research → Content → Publish pipeline control
#
# Usage:
#   ./harness/launch-research-to-publish.sh run-now
#   ./harness/launch-research-to-publish.sh dry-run
#   ./harness/launch-research-to-publish.sh status
#   ./harness/launch-research-to-publish.sh logs

H="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="$H/research-to-publish.js"
STATE="$H/research-to-publish-state.json"
LOG="$H/logs/research-to-publish.log"

mkdir -p "$H/logs"

CMD="${1:-status}"

case "$CMD" in
  run-now)
    echo "[rtp] Running pipeline now..."
    node "$SCRIPT" >> "$LOG" 2>&1
    echo "[rtp] Done (exit $?)"
    ;;

  dry-run)
    echo "[rtp] Dry run — no MPLite/Blotato calls..."
    node "$SCRIPT" --dry-run 2>&1 | tee -a "$LOG"
    ;;

  status)
    echo "=== Research → Publish Status ==="
    if [[ -f "$STATE" ]]; then
      node -e "
        const s = JSON.parse(require('fs').readFileSync('$STATE','utf8'));
        console.log('Last run date : ' + (s.lastRunDate || 'never'));
        console.log('Topics        : ' + (s.topicsProcessed || []).join(', '));
        console.log('Pieces queued : ' + (s.piecesQueued || 0));
        console.log('Medium URL    : ' + (s.mediumUrl || 'none'));
        console.log('Updated at    : ' + (s.updatedAt || 'unknown'));
      " 2>/dev/null || cat "$STATE"
    else
      echo "No state file — pipeline has not run yet"
    fi
    ;;

  logs)
    if [[ -f "$LOG" ]]; then
      tail -100 "$LOG"
    else
      echo "No log file yet"
    fi
    ;;

  topics-only)
    echo "[rtp] Showing planned topics..."
    node "$SCRIPT" --topics-only 2>&1
    ;;

  medium-only)
    echo "[rtp] Publishing Medium article only..."
    node "$SCRIPT" --medium-only >> "$LOG" 2>&1
    echo "[rtp] Done (exit $?)"
    ;;

  *)
    echo "Usage: $0 {run-now|dry-run|status|logs|topics-only|medium-only}"
    exit 1
    ;;
esac
