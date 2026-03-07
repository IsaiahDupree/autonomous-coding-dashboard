#!/bin/zsh
# Launch safari-decoupled-push-arch agent
SLUG="safari-decoupled-push-arch"
ACD_ROOT="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"
TARGET="/Users/isaiahdupree/Documents/Software/Safari Automation"
LOG="$ACD_ROOT/harness/logs/$SLUG.log"
PROMPT="$ACD_ROOT/harness/prompts/$SLUG.md"
FEATURES="$ACD_ROOT/harness/$SLUG-features.json"

mkdir -p "$ACD_ROOT/harness/logs"

PROMPT_CONTENT=$(cat "$PROMPT")
FEATURES_CONTENT=$(cat "$FEATURES")

cd "$TARGET"

claude \
  --model claude-sonnet-4-6 \
  --allowedTools "Bash,Read,Write,Edit,Glob,Grep,WebSearch,WebFetch,mcp__supabase__*" \
  --system-prompt "$PROMPT_CONTENT

## Feature List (JSON)
$FEATURES_CONTENT

## Instructions
Work through features SDPA-001 through SDPA-014 in order. Mark each \"passes\": true in the features JSON at $FEATURES after verifying it works. Commit after each feature." \
  --print "Begin implementing Safari Decoupled Push Architecture. Start with SDPA-001 (Supabase migration)." \
  >> "$LOG" 2>&1 &

echo "Agent PID: $!"
echo "Log: $LOG"
