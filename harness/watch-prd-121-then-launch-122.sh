#!/bin/bash
# Watches prd-121 progress and auto-launches prd-122 when prd-121 hits 100%.
# Run: bash watch-prd-121-then-launch-122.sh &

HARNESS="$HOME/Documents/Software/autonomous-coding-dashboard/harness/run-harness-v2.js"
ACTP="$HOME/Documents/Software/actp-worker"
PROMPTS="$HOME/Documents/Software/autonomous-coding-dashboard/harness/prompts"
FEATURES_121="$ACTP/prd-121-features.json"
FEATURES_122="$ACTP/prd-122-features.json"
LOG="$HOME/Documents/Software/autonomous-coding-dashboard/harness/logs/watch-121-122.log"
POLL_SECS=30

log() {
  echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') $*" | tee -a "$LOG"
}

log "🔍 Watch started — polling prd-121 every ${POLL_SECS}s"

while true; do
  # Parse prd-121 feature progress
  RESULT=$(python3 -c "
import json, sys
try:
    with open('$FEATURES_121') as f:
        d = json.load(f)
    feats = d.get('features', d) if isinstance(d, dict) else d
    total = len(feats)
    passes = sum(1 for f in feats if f.get('passes') == True)
    print(f'{passes}/{total}')
except Exception as e:
    print(f'ERR:{e}')
" 2>/dev/null)

  if [[ "$RESULT" == ERR:* ]]; then
    log "⚠️  Could not read features: $RESULT"
    sleep "$POLL_SECS"
    continue
  fi

  PASSES=$(echo "$RESULT" | cut -d'/' -f1)
  TOTAL=$(echo "$RESULT" | cut -d'/' -f2)

  log "📊 prd-121 progress: $PASSES/$TOTAL"

  if [[ "$TOTAL" -gt 0 && "$PASSES" -eq "$TOTAL" ]]; then
    log "✅ prd-121 COMPLETE ($PASSES/$TOTAL) — checking prd-122..."

    # Don't double-launch if prd-122 is already running
    if ps aux | grep "run-harness-v2" | grep -q "prd-122-claude-code-agent-launcher"; then
      log "ℹ️  prd-122 is already running — exiting watch."
      exit 0
    fi

    log "🚀 Launching prd-122 (Claude Code Agent Launcher)..."
    nohup node "$HARNESS" \
      --path="$ACTP" \
      --project=prd-122-claude-code-agent-launcher \
      --model=claude-sonnet-4-5-20250929 \
      --fallback-model=claude-haiku-4-5-20251001 \
      --max-retries=3 \
      --prompt="$PROMPTS/prd-122-claude-code-agent-launcher.md" \
      --feature-list="$FEATURES_122" \
      --adaptive-delay \
      --force-coding \
      --until-complete \
      >> "$HOME/Documents/Software/autonomous-coding-dashboard/harness/logs/agent-prds/prd-122-claude-code-agent-launcher.log" 2>&1 &

    PRD122_PID=$!
    log "✅ prd-122 launched with PID $PRD122_PID — watch complete."
    exit 0
  fi

  sleep "$POLL_SECS"
done
