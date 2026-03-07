#!/bin/zsh
# safari-profile-setup.sh (SDPA-011)
# ====================================
# Verifies the Safari Automation profile window is open and on a platform page.
# Sets SAFARI_AUTOMATION_WINDOW to the window index of the first window
# that contains any automation platform URL.
#
# Usage:
#   ./harness/safari-profile-setup.sh
#   SAFARI_AUTOMATION_WINDOW=$(./harness/safari-profile-setup.sh --export)

AUTOMATION_PLATFORMS="linkedin.com|instagram.com|x.com|tiktok.com|threads.com|threads.net"
TARGET_WINDOW=${SAFARI_AUTOMATION_WINDOW:-1}

echo "=== Safari Profile Setup ==="
echo ""

# Check if Safari is running
if ! pgrep -x Safari > /dev/null 2>&1; then
  echo "ERROR: Safari is not running. Open Safari and navigate to the automation profile first."
  exit 1
fi

# Get Safari window/tab info via AppleScript
TABS=$(osascript <<'APPLESCRIPT'
tell application "Safari"
  set output to ""
  set wCount to count of windows
  repeat with w from 1 to wCount
    try
      set tCount to count of tabs of window w
      repeat with t from 1 to tCount
        try
          set tabURL to URL of tab t of window w
          if tabURL is missing value then set tabURL to ""
          set output to output & w & "," & t & "," & tabURL & "
"
        end try
      end repeat
    end try
  end repeat
  return output
end tell
APPLESCRIPT
)

if [ -z "$TABS" ]; then
  echo "ERROR: Could not read Safari tabs. Ensure Safari has Allow JavaScript from Apple Events enabled."
  echo "       Safari → Settings → Advanced → Allow JavaScript from Apple Events"
  exit 1
fi

echo "Current Safari windows/tabs:"
echo "$TABS" | while IFS=, read -r w t url; do
  [ -z "$w" ] && continue
  echo "  Window $w, Tab $t: $url"
done
echo ""

# Find first window containing an automation platform
AUTOMATION_WINDOW=""
echo "$TABS" | while IFS=, read -r w t url; do
  [ -z "$w" ] && continue
  if echo "$url" | grep -qE "$AUTOMATION_PLATFORMS"; then
    if [ -z "$AUTOMATION_WINDOW" ]; then
      AUTOMATION_WINDOW=$w
      echo "FOUND: Automation window detected at window $w (URL: $url)"
    fi
  fi
done

# Re-evaluate (shell subshell issue workaround)
AUTOMATION_WINDOW=$(echo "$TABS" | while IFS=, read -r w t url; do
  [ -z "$w" ] && continue
  if echo "$url" | grep -qE "$AUTOMATION_PLATFORMS"; then
    echo $w
    break
  fi
done)

if [ -z "$AUTOMATION_WINDOW" ]; then
  echo "WARNING: No automation platform tab found in any Safari window."
  echo "         Open LinkedIn, Instagram, TikTok, Twitter, or Threads in Safari first."
  echo "         Using default window: $TARGET_WINDOW"
  AUTOMATION_WINDOW=$TARGET_WINDOW
else
  echo "Automation window: $AUTOMATION_WINDOW"
fi

if [ "$1" = "--export" ]; then
  echo "$AUTOMATION_WINDOW"
else
  echo ""
  echo "To set this as your automation window:"
  echo "  export SAFARI_AUTOMATION_WINDOW=$AUTOMATION_WINDOW"
  echo ""
  echo "Or add to your .env:"
  echo "  SAFARI_AUTOMATION_WINDOW=$AUTOMATION_WINDOW"
fi
