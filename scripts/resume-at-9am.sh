#!/bin/bash
# Resume BlogCanvas harness after rate limit reset at 9am EST

echo "═══════════════════════════════════════════════════════════════"
echo "  BlogCanvas Harness - Waiting for Rate Limit Reset (9am)"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Current time: $(date)"
echo "  Rate limit resets at: 9:00 AM EST"
echo "  Progress: 22/25 features (88%)"
echo "  Remaining: feat-023, feat-024, feat-025"
echo ""

# Wait until 9:05am
TARGET_HOUR=9
TARGET_MIN=5

while true; do
    CURRENT_HOUR=$(date +%H)
    CURRENT_MIN=$(date +%M)
    
    if [ "$CURRENT_HOUR" -ge "$TARGET_HOUR" ]; then
        if [ "$CURRENT_HOUR" -gt "$TARGET_HOUR" ] || [ "$CURRENT_MIN" -ge "$TARGET_MIN" ]; then
            echo ""
            echo "✅ Rate limit should be reset! Starting harness..."
            break
        fi
    fi
    
    echo -ne "\r  Waiting... Current time: $(date +%H:%M:%S)  "
    sleep 60
done

# Start the harness
cd /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard
./scripts/run-blogcanvas-16hr.sh
