#!/bin/bash
# launch-agent-prds-111-120.sh
# Launch PRD-111 through PRD-120 — Native Tool Calling Agent stack
# Phase 1: PRD-111 (NTAF base class — all agents extend it)
# Phase 2: PRD-112 through PRD-115 (domain agents in parallel)
# Phase 3: PRD-116 through PRD-120 (infra + orchestration in parallel)

H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
ACTP="/Users/isaiahdupree/Documents/Software/actp-worker"
LOG_DIR="$H/logs/agent-prds"
OPUS="claude-opus-4-6"
SONNET="claude-sonnet-4-5-20250929"

mkdir -p "$LOG_DIR"

echo "============================================================"
echo " EverReach OS — Agent PRD Stack Launch (PRD-111 → PRD-120)"
echo "============================================================"
echo ""

launch() {
  local id=$1 model=$2 prompt=$3 features=$4 max_sessions=${5:-80}
  local logfile="$LOG_DIR/${id}.log"
  echo "  🚀 $id  →  $logfile"
  node "$H/run-harness-v2.js" \
    --path="$ACTP" \
    --project="$id" \
    --model="$model" \
    --fallback-model="$SONNET" \
    --max-retries=3 \
    --prompt="$H/prompts/${prompt}" \
    --feature-list="$ACTP/${features}" \
    --adaptive-delay \
    --force-coding \
    --until-complete \
    >> "$logfile" 2>&1 &
  echo "     PID=$!"
}

# Kill any stale processes for these PRDs
echo "[cleanup] Killing stale processes..."
for n in 111 112 113 114 115 116 117 118 119 120; do
  pkill -f "prd-${n}-" 2>/dev/null || true
done
sleep 2

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 1 — PRD-111: Native Tool Agent Framework (base class, must finish first)
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[Phase 1] PRD-111: Native Tool Agent Framework (NTAF base class)"
echo "         All domain agents extend this — must complete first."
echo ""

launch "prd-111-native-tool-agent-framework" \
  "$OPUS" \
  "prd-111-native-tool-agent-framework.md" \
  "prd-111-features.json" \
  60

PRD111_PID=$!

echo ""
echo "  Waiting for PRD-111 to complete (polling every 30s)..."
while true; do
  sleep 30
  if ! kill -0 $PRD111_PID 2>/dev/null; then
    echo "  ✅ PRD-111 process finished."
    break
  fi
  PASSES=$(python3 -c "
import json
try:
    d = json.load(open('$ACTP/prd-111-features.json'))
    t = len(d['features'])
    p = sum(1 for f in d['features'] if f.get('passes', False))
    print(f'{p}/{t}')
except: print('?/?')
" 2>/dev/null)
  echo "  PRD-111 progress: $PASSES features..."
done

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 2 — PRD-112 through PRD-115: Domain agents (parallel)
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[Phase 2] Launching domain agents in parallel (PRD-112 → PRD-115)..."
echo ""

launch "prd-112-social-media-domain-agent" \
  "$SONNET" \
  "prd-112-social-media-domain-agent.md" \
  "prd-112-features.json"
PRD112_PID=$!
sleep 5

launch "prd-113-content-creation-domain-agent" \
  "$SONNET" \
  "prd-113-content-creation-domain-agent.md" \
  "prd-113-features.json"
PRD113_PID=$!
sleep 5

launch "prd-114-acquisition-domain-agent" \
  "$SONNET" \
  "prd-114-acquisition-domain-agent.md" \
  "prd-114-features.json"
PRD114_PID=$!
sleep 5

launch "prd-115-revenue-analytics-domain-agent" \
  "$SONNET" \
  "prd-115-revenue-analytics-domain-agent.md" \
  "prd-115-features.json"
PRD115_PID=$!

echo ""
echo "  Phase 2 PIDs: $PRD112_PID $PRD113_PID $PRD114_PID $PRD115_PID"
echo "  Waiting for all Phase 2 agents to complete..."
wait $PRD112_PID $PRD113_PID $PRD114_PID $PRD115_PID
echo "  ✅ Phase 2 complete."

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 3 — PRD-116 through PRD-120: Infra + orchestration (parallel)
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[Phase 3] Launching infra/orchestration PRDs in parallel (PRD-116 → PRD-120)..."
echo ""

launch "prd-116-agent-worker-daemon" \
  "$SONNET" \
  "prd-116-agent-worker-daemon.md" \
  "prd-116-features.json"
PRD116_PID=$!
sleep 5

launch "prd-117-orchestrator-task-bridge" \
  "$SONNET" \
  "prd-117-orchestrator-task-bridge.md" \
  "prd-117-features.json"
PRD117_PID=$!
sleep 5

launch "prd-118-validation-parallel-runner" \
  "$SONNET" \
  "prd-118-validation-parallel-runner.md" \
  "prd-118-features.json"
PRD118_PID=$!
sleep 5

launch "prd-119-product-launch-agent" \
  "$OPUS" \
  "prd-119-product-launch-agent.md" \
  "prd-119-features.json"
PRD119_PID=$!
sleep 5

launch "prd-120-cross-agent-goal-optimizer" \
  "$OPUS" \
  "prd-120-cross-agent-goal-optimizer.md" \
  "prd-120-features.json"
PRD120_PID=$!

echo ""
echo "  Phase 3 PIDs: $PRD116_PID $PRD117_PID $PRD118_PID $PRD119_PID $PRD120_PID"

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "============================================================"
echo " All 10 agent PRDs launched!"
echo "============================================================"
echo ""
echo "  Logs dir: $LOG_DIR"
echo ""
echo "  Monitor:"
for n in 112 113 114 115 116 117 118 119 120; do
  echo "    tail -f $LOG_DIR/prd-${n}-*.log"
done
echo ""
echo "  Kill all Phase 3:"
echo "    kill $PRD116_PID $PRD117_PID $PRD118_PID $PRD119_PID $PRD120_PID"
echo ""

wait $PRD116_PID $PRD117_PID $PRD118_PID $PRD119_PID $PRD120_PID
echo "✅ All 10 agent PRDs (111-120) complete!"
