#!/bin/bash
# Harness Status Monitor

echo "═══════════════════════════════════════════════════════════"
echo "       AUTONOMOUS CODING HARNESS - STATUS REPORT"
echo "═══════════════════════════════════════════════════════════"
echo ""

cd /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard

# Check if harness is running
HARNESS_PID=$(ps aux | grep "run-harness" | grep -v grep | awk '{print $2}')
if [ -n "$HARNESS_PID" ]; then
    echo "🟢 HARNESS STATUS: RUNNING (PID: $HARNESS_PID)"
else
    echo "🔴 HARNESS STATUS: STOPPED"
fi
echo ""

# Read status file
if [ -f harness-status.json ]; then
    echo "📊 SESSION INFO:"
    echo "   Type: $(cat harness-status.json | grep sessionType | cut -d'"' -f4)"
    echo "   Last Update: $(cat harness-status.json | grep lastUpdated | cut -d'"' -f4)"
    echo ""
fi

# Feature progress
if [ -f feature_list.json ]; then
    TOTAL=$(cat feature_list.json | grep -c '"id":')
    PASSING=$(cat feature_list.json | grep -c '"passes": true')
    PENDING=$((TOTAL - PASSING))
    PERCENT=$((PASSING * 100 / TOTAL))
    
    echo "📈 FEATURE PROGRESS:"
    echo "   ✅ Passing: $PASSING"
    echo "   ⏳ Pending: $PENDING"
    echo "   📊 Total: $TOTAL"
    echo ""
    echo "   Progress: [$PERCENT%]"
    printf "   "
    for i in $(seq 1 $((PERCENT / 5))); do printf "█"; done
    for i in $(seq 1 $((20 - PERCENT / 5))); do printf "░"; done
    echo ""
    echo ""
    
    echo "📋 NEXT FEATURES TO IMPLEMENT:"
    cat feature_list.json | grep -A2 '"passes": false' | grep '"description"' | head -5 | sed 's/.*"description": "/   • /' | sed 's/",$//'
fi
echo ""

# Recent activity
if [ -f claude-progress.txt ]; then
    echo "📝 RECENT ACTIVITY:"
    tail -10 claude-progress.txt | sed 's/^/   /'
fi
echo ""
echo "═══════════════════════════════════════════════════════════"
