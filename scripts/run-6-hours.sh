#!/bin/bash
# Run harness for 6 hours

set -e

PROJECT_ROOT="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"

echo "═══════════════════════════════════════════════════════════"
echo "  AUTONOMOUS CODING HARNESS - 6 HOUR SESSION"
echo "═══════════════════════════════════════════════════════════"
echo "Started: $(date)"
echo "Duration: 6 hours"
echo "Log file: ${PROJECT_ROOT}/harness-output.log"
echo "═══════════════════════════════════════════════════════════"
echo ""

cd "${PROJECT_ROOT}"
node harness/run-harness-v2.js \
  --continuous \
  --duration-hours 6 \
  --max-sessions 10000 \
  2>&1 | tee -a harness-output.log
