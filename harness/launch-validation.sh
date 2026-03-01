#!/bin/bash
# launch-validation.sh
# Pre-flight ACD validation — run BEFORE launching any agent scripts
# Validates: feature list pass rates, pytest suites, DB migrations, env vars, Safari ports, cloud services
#
# Usage:
#   bash launch-validation.sh              # Full validation (with pytest)
#   bash launch-validation.sh --fast       # Fast only (no pytest, <15s)
#   bash launch-validation.sh --fix        # Auto-apply missing DB migrations
#   bash launch-validation.sh --ci         # CI mode: JSON output + exit code

set -e

HARNESS_DIR="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
ACTP_DIR="/Users/isaiahdupree/Documents/Software/actp-worker"
LOG_DIR="$HARNESS_DIR/logs/validation"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

mkdir -p "$LOG_DIR"

MODE="full"
if [[ "$*" == *"--fast"* ]]; then MODE="fast"; fi
if [[ "$*" == *"--fix"* ]]; then MODE="fix"; fi
if [[ "$*" == *"--ci"* ]]; then MODE="ci"; fi

if [[ "$MODE" != "ci" ]]; then
  echo "============================================================"
  echo " EverReach OS — Pre-Flight Validation ($MODE mode)"
  echo " Timestamp: $TIMESTAMP"
  echo "============================================================"
  echo ""
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 1: Check Python + required packages
# ─────────────────────────────────────────────────────────────────────────────
if [[ "$MODE" != "ci" ]]; then
  echo "[1/6] Checking Python environment..."
fi

cd "$ACTP_DIR"

if ! python3 -c "import anthropic, supabase, aiohttp, apscheduler" 2>/dev/null; then
  echo "  ⚠️  Some packages missing. Installing..."
  pip3 install anthropic supabase aiohttp apscheduler python-dotenv --quiet
fi

if [[ "$MODE" != "ci" ]]; then
  echo "  ✅ Python environment OK"
  echo ""
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 2: Run validation based on mode
# ─────────────────────────────────────────────────────────────────────────────
if [[ "$MODE" == "full" ]]; then
  if [[ "$MODE" != "ci" ]]; then echo "[2/6] Running full validation (includes pytest)..."; fi
  python3 validate.py 2>&1 | tee "$LOG_DIR/validation-$TIMESTAMP.log"
  EXIT_CODE=${PIPESTATUS[0]}

elif [[ "$MODE" == "fast" ]]; then
  if [[ "$MODE" != "ci" ]]; then echo "[2/6] Running fast validation (no pytest)..."; fi
  python3 validate.py --fast 2>&1 | tee "$LOG_DIR/validation-fast-$TIMESTAMP.log"
  EXIT_CODE=${PIPESTATUS[0]}

elif [[ "$MODE" == "fix" ]]; then
  if [[ "$MODE" != "ci" ]]; then echo "[2/6] Running fast validation + auto-fixing missing tables..."; fi
  python3 validate.py --fast --fix-missing-tables 2>&1 | tee "$LOG_DIR/validation-fix-$TIMESTAMP.log"
  EXIT_CODE=${PIPESTATUS[0]}

elif [[ "$MODE" == "ci" ]]; then
  python3 validate.py --json 2>&1
  EXIT_CODE=$?
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 3: Print launch recommendation (non-CI modes)
# ─────────────────────────────────────────────────────────────────────────────
if [[ "$MODE" != "ci" ]]; then
  echo ""
  echo "============================================================"
  if [[ $EXIT_CODE -eq 0 ]]; then
    echo " ✅ VALIDATION PASSED — Safe to launch agents"
    echo ""
    echo "  Run in sequence:"
    echo "  bash $HARNESS_DIR/launch-native-agents.sh"
    echo "  bash $HARNESS_DIR/launch-cognitive-arch.sh"
    echo "  bash $HARNESS_DIR/launch-growth-pipeline.sh"
    echo ""
    echo "  Or start the worker daemon directly:"
    echo "  cd $ACTP_DIR && python3 worker.py"
  else
    echo " ❌ VALIDATION FAILED — Fix issues before launching"
    echo ""
    echo "  Review the log:"
    echo "  cat $LOG_DIR/validation-$TIMESTAMP.log"
    echo ""
    echo "  Quick fixes:"
    echo "  bash $HARNESS_DIR/launch-validation.sh --fix    # auto-fix DB tables"
    echo "  python3 $ACTP_DIR/validate.py --fast            # recheck quickly"
  fi
  echo "============================================================"
fi

exit $EXIT_CODE
