#!/bin/bash
# launch-growth-pipeline.sh
# Launch 6 growth gap PRDs (105-110) in parallel via ACD harness
# These close the critical gaps to achieve 100K views/video and 1M followers
#
# PRD-105: Remotion Renderer Auto-Start & Volume Engine   (P0 — CRITICAL)
# PRD-106: HookLite Hard-Reject Gate Integration          (P0 — CRITICAL)
# PRD-107: Cross-Platform Video Adaptation Engine         (P1 — HIGH)
# PRD-108: AI Thumbnail Generator                         (P1 — HIGH)
# PRD-109: Comment Engagement Boost (First 30min)         (P1 — HIGH)
# PRD-110: Content Consistency Dashboard                  (P2 — MEDIUM)

HARNESS_DIR="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
WORKER_DIR="/Users/isaiahdupree/Documents/Software/actp-worker"
LOG_DIR="/tmp/growth-pipeline-logs"
mkdir -p "$LOG_DIR"

echo "======================================================"
echo "  GROWTH PIPELINE LAUNCH — $(date)"
echo "  6 PRDs targeting 100K views/video + 1M followers"
echo "======================================================"

# Kill any stale harness processes
echo "[0] Cleaning up stale harness processes..."
pkill -f "run-harness-v2.js.*prd-105" 2>/dev/null || true
pkill -f "run-harness-v2.js.*prd-106" 2>/dev/null || true
pkill -f "run-harness-v2.js.*prd-107" 2>/dev/null || true
pkill -f "run-harness-v2.js.*prd-108" 2>/dev/null || true
pkill -f "run-harness-v2.js.*prd-109" 2>/dev/null || true
pkill -f "run-harness-v2.js.*prd-110" 2>/dev/null || true
sleep 2

# PRD-105: Renderer Volume Engine (P0 — CRITICAL — use Sonnet)
echo "[1] Launching PRD-105: Renderer Volume Engine (claude-sonnet-4-5)..."
node "$HARNESS_DIR/run-harness-v2.js" \
  --project-root "$WORKER_DIR" \
  --project-id "prd-105-renderer-volume-engine" \
  --model "claude-sonnet-4-5" \
  --prompt "$HARNESS_DIR/prompts/prd-105-renderer-volume-engine.md" \
  --feature-list "$WORKER_DIR/prd-105-features.json" \
  --max-sessions 80 \
  > "$LOG_DIR/prd-105.log" 2>&1 &
PID_105=$!
echo "    PID: $PID_105 | Log: $LOG_DIR/prd-105.log"

sleep 3

# PRD-106: HookLite Gate Integration (P0 — CRITICAL — use Sonnet)
echo "[2] Launching PRD-106: HookLite Gate Integration (claude-sonnet-4-5)..."
node "$HARNESS_DIR/run-harness-v2.js" \
  --project-root "$WORKER_DIR" \
  --project-id "prd-106-hookgate-integration" \
  --model "claude-sonnet-4-5" \
  --prompt "$HARNESS_DIR/prompts/prd-106-hookgate-integration.md" \
  --feature-list "$WORKER_DIR/prd-106-features.json" \
  --max-sessions 80 \
  > "$LOG_DIR/prd-106.log" 2>&1 &
PID_106=$!
echo "    PID: $PID_106 | Log: $LOG_DIR/prd-106.log"

sleep 3

# PRD-107: Cross-Platform Adaptation (P1 — use Sonnet)
echo "[3] Launching PRD-107: Cross-Platform Adaptation (claude-sonnet-4-5)..."
node "$HARNESS_DIR/run-harness-v2.js" \
  --project-root "$WORKER_DIR" \
  --project-id "prd-107-crossplatform-adaptation" \
  --model "claude-sonnet-4-5" \
  --prompt "$HARNESS_DIR/prompts/prd-107-crossplatform-adaptation.md" \
  --feature-list "$WORKER_DIR/prd-107-features.json" \
  --max-sessions 70 \
  > "$LOG_DIR/prd-107.log" 2>&1 &
PID_107=$!
echo "    PID: $PID_107 | Log: $LOG_DIR/prd-107.log"

sleep 3

# PRD-108: AI Thumbnail Generator (P1 — use Haiku for cost efficiency)
echo "[4] Launching PRD-108: AI Thumbnail Generator (claude-haiku-4-5)..."
node "$HARNESS_DIR/run-harness-v2.js" \
  --project-root "$WORKER_DIR" \
  --project-id "prd-108-thumbnail-generator" \
  --model "claude-haiku-4-5" \
  --prompt "$HARNESS_DIR/prompts/prd-108-thumbnail-generator.md" \
  --feature-list "$WORKER_DIR/prd-108-features.json" \
  --max-sessions 70 \
  > "$LOG_DIR/prd-108.log" 2>&1 &
PID_108=$!
echo "    PID: $PID_108 | Log: $LOG_DIR/prd-108.log"

sleep 3

# PRD-109: Comment Engagement Boost (P1 — use Sonnet)
echo "[5] Launching PRD-109: Comment Engagement Boost (claude-sonnet-4-5)..."
node "$HARNESS_DIR/run-harness-v2.js" \
  --project-root "$WORKER_DIR" \
  --project-id "prd-109-comment-engagement-boost" \
  --model "claude-sonnet-4-5" \
  --prompt "$HARNESS_DIR/prompts/prd-109-comment-engagement-boost.md" \
  --feature-list "$WORKER_DIR/prd-109-features.json" \
  --max-sessions 70 \
  > "$LOG_DIR/prd-109.log" 2>&1 &
PID_109=$!
echo "    PID: $PID_109 | Log: $LOG_DIR/prd-109.log"

sleep 3

# PRD-110: Content Consistency Dashboard (P2 — use Haiku for cost efficiency)
echo "[6] Launching PRD-110: Content Consistency Dashboard (claude-haiku-4-5)..."
node "$HARNESS_DIR/run-harness-v2.js" \
  --project-root "$WORKER_DIR" \
  --project-id "prd-110-content-consistency-dashboard" \
  --model "claude-haiku-4-5" \
  --prompt "$HARNESS_DIR/prompts/prd-110-content-consistency-dashboard.md" \
  --feature-list "$WORKER_DIR/prd-110-features.json" \
  --max-sessions 60 \
  > "$LOG_DIR/prd-110.log" 2>&1 &
PID_110=$!
echo "    PID: $PID_110 | Log: $LOG_DIR/prd-110.log"

echo ""
echo "======================================================"
echo "  ALL 6 AGENTS LAUNCHED"
echo "======================================================"
echo "  PRD-105 (Renderer) ..... PID $PID_105"
echo "  PRD-106 (HookGate) ..... PID $PID_106"
echo "  PRD-107 (Adaptation) ... PID $PID_107"
echo "  PRD-108 (Thumbnail) .... PID $PID_108"
echo "  PRD-109 (Engagement) ... PID $PID_109"
echo "  PRD-110 (Dashboard) .... PID $PID_110"
echo ""
echo "  Monitor logs: tail -f $LOG_DIR/prd-105.log"
echo "  All logs:     ls $LOG_DIR/"
echo "======================================================"
