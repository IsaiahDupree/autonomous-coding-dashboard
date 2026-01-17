#!/bin/bash
# Resume BlogCanvas harness after rate limit reset at 4am EST

echo "═══════════════════════════════════════════════════════════════"
echo "  BlogCanvas Harness - Waiting for Rate Limit Reset"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Current time: $(date)"
echo "  Rate limit resets at: 4:00 AM EST"
echo ""

# Calculate seconds until 4:05am EST
TARGET_HOUR=4
TARGET_MIN=5

while true; do
    CURRENT_HOUR=$(date +%H)
    CURRENT_MIN=$(date +%M)
    
    if [ "$CURRENT_HOUR" -ge "$TARGET_HOUR" ] && [ "$CURRENT_HOUR" -lt 12 ]; then
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
