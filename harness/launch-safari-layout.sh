#!/usr/bin/env bash
# Safari Tab Layout — enforce 1 Safari instance, 1 tab per platform
# Usage: bash harness/launch-safari-layout.sh [claim|open|status|reset]
#
#   claim   — register existing open platform tabs with each service (default)
#   open    — open any missing platform tabs, then claim all
#   status  — show which tab each service is currently tracking
#   reset   — clear all claims, then re-discover and claim

HARNESS_DIR="$(cd "$(dirname "$0")" && pwd)"

case "${1:-claim}" in
  claim)
    echo "Claiming existing Safari tabs for each platform..."
    node "$HARNESS_DIR/safari-tab-coordinator.js"
    ;;
  open)
    echo "Opening missing platform tabs + claiming all..."
    node "$HARNESS_DIR/safari-tab-coordinator.js" --open
    ;;
  status)
    node "$HARNESS_DIR/safari-tab-coordinator.js" --status
    ;;
  reset)
    echo "Resetting all tab claims..."
    node "$HARNESS_DIR/safari-tab-coordinator.js" --reset --open
    ;;
  *)
    echo "Usage: $0 {claim|open|status|reset}"
    echo ""
    echo "  claim   Register existing open platform tabs with each service (default)"
    echo "  open    Open any missing tabs in Safari, then claim all"
    echo "  status  Show which Safari tab each service currently owns"
    echo "  reset   Clear all claims and re-discover"
    exit 1
    ;;
esac
