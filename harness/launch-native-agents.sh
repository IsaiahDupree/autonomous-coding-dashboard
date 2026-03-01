#!/bin/bash
# launch-native-agents.sh
# Launch PRD-111 through PRD-115 (Native Tool Calling Agents) in parallel
# PRD-111 (NTAF base) runs first, then 112-115 in parallel after it completes

set -e

HARNESS_DIR="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
ACTP_DIR="/Users/isaiahdupree/Documents/Software/actp-worker"
LOG_DIR="$HARNESS_DIR/logs/native-agents"

mkdir -p "$LOG_DIR"

echo "=============================================="
echo " EverReach OS — Native Tool Agents Launch"
echo " PRD-111: NTAF Base Class (foundation)"
echo " PRD-112: Social Media Domain Agent"
echo " PRD-113: Content Creation Domain Agent"
echo " PRD-114: Acquisition Domain Agent"
echo " PRD-115: Revenue & Analytics Domain Agent"
echo "=============================================="
echo ""

# Kill any stale harness processes for these PRDs
echo "[0/5] Killing stale harness processes..."
pkill -f "prd-111-native-tool-agent-framework" 2>/dev/null || true
pkill -f "prd-112-social-media-domain-agent" 2>/dev/null || true
pkill -f "prd-113-content-creation-domain-agent" 2>/dev/null || true
pkill -f "prd-114-acquisition-domain-agent" 2>/dev/null || true
pkill -f "prd-115-revenue-analytics-domain-agent" 2>/dev/null || true
sleep 2

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 1: PRD-111 — Native Tool Agent Framework (MUST complete first)
#          All other agents extend this base class.
# ─────────────────────────────────────────────────────────────────────────────
echo "[1/5] Launching PRD-111: Native Tool Agent Framework (NTAF base class)..."
echo "      → This is the foundation. All other agents depend on it."
echo "      → Model: claude-opus-4-5 (critical complexity)"
echo "      → Log: $LOG_DIR/prd-111.log"
echo ""

node "$HARNESS_DIR/run-harness-v2.js" \
  --path "$ACTP_DIR" \
  --id "prd-111-native-tool-agent-framework" \
  --model "claude-opus-4-5" \
  --prompt "$HARNESS_DIR/prompts/prd-111-native-tool-agent-framework.md" \
  --feature-list "$ACTP_DIR/prd-111-features.json" \
  --max-sessions 60 \
  --session-delay 5000 \
  >> "$LOG_DIR/prd-111.log" 2>&1 &

PRD111_PID=$!
echo "      PRD-111 PID: $PRD111_PID"
echo ""

# Wait for PRD-111 to complete before launching domain agents
# Poll every 30s checking for all features passes=true
echo "[1/5] Waiting for PRD-111 to complete (polling every 30s)..."
while true; do
  sleep 30
  if ! kill -0 $PRD111_PID 2>/dev/null; then
    echo "      PRD-111 process completed."
    break
  fi
  PASSES=$(python3 -c "
import json
try:
    data = json.load(open('$ACTP_DIR/prd-111-features.json'))
    total = len(data['features'])
    passed = sum(1 for f in data['features'] if f.get('passes', False))
    print(f'{passed}/{total}')
except: print('?/?')
" 2>/dev/null)
  echo "      PRD-111 progress: $PASSES features passing..."
done

echo ""
echo "[1/5] PRD-111 done — launching domain agents in parallel..."
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 2: PRD-112 through PRD-115 — Domain agents run in parallel
# ─────────────────────────────────────────────────────────────────────────────

echo "[2/5] Launching PRD-112: Safari Social Media Domain Agent..."
echo "      → 20 tools across 12 Safari ports, 1M followers mission"
echo "      → Model: claude-sonnet-4-5"
echo "      → Log: $LOG_DIR/prd-112.log"

node "$HARNESS_DIR/run-harness-v2.js" \
  --path "$ACTP_DIR" \
  --id "prd-112-social-media-domain-agent" \
  --model "claude-sonnet-4-5" \
  --prompt "$HARNESS_DIR/prompts/prd-112-social-media-domain-agent.md" \
  --feature-list "$ACTP_DIR/prd-112-features.json" \
  --max-sessions 80 \
  --session-delay 3000 \
  >> "$LOG_DIR/prd-112.log" 2>&1 &

PRD112_PID=$!
echo "      PRD-112 PID: $PRD112_PID"
echo ""

sleep 5  # Stagger launches slightly to avoid rate limit collision

echo "[3/5] Launching PRD-113: Content Creation Domain Agent..."
echo "      → 22 tools: batch generate → HookLite gate → render → adapt → publish"
echo "      → Model: claude-sonnet-4-5"
echo "      → Log: $LOG_DIR/prd-113.log"

node "$HARNESS_DIR/run-harness-v2.js" \
  --path "$ACTP_DIR" \
  --id "prd-113-content-creation-domain-agent" \
  --model "claude-sonnet-4-5" \
  --prompt "$HARNESS_DIR/prompts/prd-113-content-creation-domain-agent.md" \
  --feature-list "$ACTP_DIR/prd-113-features.json" \
  --max-sessions 80 \
  --session-delay 3000 \
  >> "$LOG_DIR/prd-113.log" 2>&1 &

PRD113_PID=$!
echo "      PRD-113 PID: $PRD113_PID"
echo ""

sleep 5

echo "[4/5] Launching PRD-114: Acquisition Domain Agent..."
echo "      → 24 tools: LinkedIn/Upwork/Gmail/CRM, \$9.5K/month pipeline"
echo "      → Model: claude-sonnet-4-5"
echo "      → Log: $LOG_DIR/prd-114.log"

node "$HARNESS_DIR/run-harness-v2.js" \
  --path "$ACTP_DIR" \
  --id "prd-114-acquisition-domain-agent" \
  --model "claude-sonnet-4-5" \
  --prompt "$HARNESS_DIR/prompts/prd-114-acquisition-domain-agent.md" \
  --feature-list "$ACTP_DIR/prd-114-features.json" \
  --max-sessions 80 \
  --session-delay 3000 \
  >> "$LOG_DIR/prd-114.log" 2>&1 &

PRD114_PID=$!
echo "      PRD-114 PID: $PRD114_PID"
echo ""

sleep 5

echo "[5/5] Launching PRD-115: Revenue & Analytics Domain Agent..."
echo "      → 26 tools: Stripe/Apple/YouTube/cost tracking, weekly Telegram reports"
echo "      → Model: claude-sonnet-4-5"
echo "      → Log: $LOG_DIR/prd-115.log"

node "$HARNESS_DIR/run-harness-v2.js" \
  --path "$ACTP_DIR" \
  --id "prd-115-revenue-analytics-domain-agent" \
  --model "claude-sonnet-4-5" \
  --prompt "$HARNESS_DIR/prompts/prd-115-revenue-analytics-domain-agent.md" \
  --feature-list "$ACTP_DIR/prd-115-features.json" \
  --max-sessions 80 \
  --session-delay 3000 \
  >> "$LOG_DIR/prd-115.log" 2>&1 &

PRD115_PID=$!
echo "      PRD-115 PID: $PRD115_PID"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Status summary
# ─────────────────────────────────────────────────────────────────────────────
echo "=============================================="
echo " All 5 native agent PRDs launched!"
echo "=============================================="
echo ""
echo "  PIDs running in background:"
echo "  PRD-112 (Social Media):    $PRD112_PID"
echo "  PRD-113 (Content):         $PRD113_PID"
echo "  PRD-114 (Acquisition):     $PRD114_PID"
echo "  PRD-115 (Revenue):         $PRD115_PID"
echo ""
echo "  Logs:"
echo "  tail -f $LOG_DIR/prd-112.log"
echo "  tail -f $LOG_DIR/prd-113.log"
echo "  tail -f $LOG_DIR/prd-114.log"
echo "  tail -f $LOG_DIR/prd-115.log"
echo ""
echo "  Monitor feature progress:"
echo "  watch -n 30 \"python3 -c \\\"import json; \\"
echo "    [print(f['project'][:40], sum(1 for x in f['features'] if x.get('passes')), '/', len(f['features'])) \\"
echo "    for f in [json.load(open('$ACTP_DIR/prd-'+n+'-features.json')) \\"
echo "    for n in ['112','113','114','115']]]\\\"\""
echo ""
echo "  To kill all: kill $PRD112_PID $PRD113_PID $PRD114_PID $PRD115_PID"
echo ""

wait $PRD112_PID $PRD113_PID $PRD114_PID $PRD115_PID
echo "All native agent PRDs complete!"
