#!/bin/bash
# start-chrome-debug.sh — Launch Chrome with remote debugging for LinkedIn automation
#
# Reuses your real Chrome Default profile (already logged into LinkedIn).
# Chrome must be CLOSED before running this, since a profile can't be opened twice.
#
# Usage:
#   ./harness/start-chrome-debug.sh          # close Chrome first, then run this
#   ./harness/start-chrome-debug.sh stop     # kill the debug Chrome
#   ./harness/start-chrome-debug.sh status   # check if running

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
# Use the harness profile — separate from Default so CDP works (Chrome blocks CDP on Default).
# LinkedIn session is established via auto-login with LINKEDIN_EMAIL + LINKEDIN_PASSWORD.
HARNESS_PROFILE_DIR="$(cd "$(dirname "$0")" && pwd)/.chrome-linkedin-profile"
CDP_PORT=9333   # separate from Chrome's internal debugging port 9222
H="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$H/.chrome-debug.pid"

cdp_alive() {
  curl -sf --max-time 2 "http://localhost:${CDP_PORT}/json/version" 2>/dev/null | grep -q "Browser"
}

chrome_running_normally() {
  pgrep -x "Google Chrome" > /dev/null 2>&1
}

case "${1:-start}" in
  start)
    if cdp_alive; then
      echo "Chrome debug already running on port ${CDP_PORT}"
      ./harness/start-chrome-debug.sh status 2>/dev/null || true
      exit 0
    fi

    # Regular Chrome can be open — we use a separate HARNESS_PROFILE_DIR so
    # there is no profile lock conflict between the two Chrome instances.
    echo "Launching Chrome with debug port ${CDP_PORT} using harness LinkedIn profile..."
    mkdir -p "${HARNESS_PROFILE_DIR}"

    "$CHROME" \
      --remote-debugging-port=${CDP_PORT} \
      --user-data-dir="${HARNESS_PROFILE_DIR}" \
      --profile-directory="Default" \
      --no-first-run \
      --no-default-browser-check \
      --disable-blink-features=AutomationControlled \
      --disable-infobars \
      --window-size=1280,800 \
      "https://www.linkedin.com/feed/" &

    CHROME_PID=$!
    echo $CHROME_PID > "$PID_FILE"
    echo "Chrome launching (PID $CHROME_PID)..."

    # Wait for CDP to become available (up to 15s)
    for i in $(seq 1 15); do
      sleep 1
      if cdp_alive; then
        echo ""
        echo "Chrome ready — CDP on http://localhost:${CDP_PORT}"
        echo "LinkedIn should already be logged in (using your Default profile)."
        echo "Leave Chrome running — the daemon connects to it automatically."
        exit 0
      fi
    done

    echo "Chrome started (PID $CHROME_PID) but CDP not responding yet."
    echo "Check: curl -s http://localhost:${CDP_PORT}/json/version"
    ;;

  stop)
    if [ -f "$PID_FILE" ]; then
      PID="$(cat "$PID_FILE")"
      if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" && echo "Chrome debug stopped (PID $PID)"
      else
        echo "PID $PID not running"
      fi
      rm -f "$PID_FILE"
    else
      PID=$(lsof -ti tcp:${CDP_PORT} 2>/dev/null | head -1)
      if [ -n "$PID" ]; then
        kill "$PID" && echo "Chrome debug stopped (PID $PID)"
      else
        echo "No Chrome debug instance found on port ${CDP_PORT}"
      fi
    fi
    ;;

  status)
    if cdp_alive; then
      VERSION=$(curl -s "http://localhost:${CDP_PORT}/json/version" | python3 -c \
        "import sys,json; d=json.load(sys.stdin); print(d.get('Browser','?'))" 2>/dev/null || echo "?")
      TABS=$(curl -s "http://localhost:${CDP_PORT}/json" | python3 -c \
        "import sys,json; t=json.load(sys.stdin); print(len([x for x in t if x.get('type')=='page']))" 2>/dev/null || echo "?")
      echo "RUNNING — ${VERSION} — ${TABS} tab(s)"
      echo "CDP: http://localhost:${CDP_PORT}"
    else
      echo "STOPPED"
    fi
    ;;

  *)
    echo "Usage: $0 {start|stop|status}"
    exit 1
    ;;
esac
