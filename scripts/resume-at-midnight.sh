#!/bin/bash
# Resume BlogCanvas harness after rate limit reset at midnight EST

echo "═══════════════════════════════════════════════════════════════"
echo "  BlogCanvas Harness - Waiting for Rate Limit Reset (12am)"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Current time: $(date)"
echo "  Rate limit resets at: 12:00 AM EST"
echo "  Progress: 37/40 features (92.5%)"
echo "  Remaining: feat-038, feat-039, feat-040"
echo ""

# Wait until 12:05am (00:05)
while true; do
    CURRENT_HOUR=$(date +%H)
    CURRENT_MIN=$(date +%M)
    
    # Check if it's after midnight (hour 0) and past 5 minutes
    if [ "$CURRENT_HOUR" -eq "0" ] && [ "$CURRENT_MIN" -ge "5" ]; then
        echo ""
        echo "✅ Rate limit should be reset! Starting harness..."
        break
    fi
    
    echo -ne "\r  Waiting... Current time: $(date +%H:%M:%S)  "
    sleep 60
done

# Start the harness
cd /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard
./scripts/run-blogcanvas-16hr.sh
