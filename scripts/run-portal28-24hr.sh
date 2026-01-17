#!/bin/bash
PROJECT_DIR="/Users/isaiahdupree/Documents/Software/Portal28"
LOG_FILE="$PROJECT_DIR/autonomous-harness.log"

echo "🎓 Portal28 Academy - 24 Hour Session"
echo "📅 Started: $(date)"
echo "💳 Plan: Claude Max - Paced Mode"

cd "$PROJECT_DIR"
echo "$(date -Iseconds) 🚀 Portal28 session starting" >> "$LOG_FILE"

for i in $(seq 1 200); do
    PASSING=$(grep -c '"passes": true' feature_list.json 2>/dev/null)
    PASSING=${PASSING:-0}
    
    if [ "$PASSING" -ge 55 ]; then
        echo "🎉 ALL 55 FEATURES COMPLETE!"
        exit 0
    fi
    
    echo ""
    echo "[Session $i] Progress: $PASSING/55 features"
    
    node harness/run-harness-v2.js --max=1 2>&1 | tee -a "$LOG_FILE"
    
    # Check for rate limit in last few lines
    if tail -5 "$LOG_FILE" | grep -q "rate_limit\|hit your limit"; then
        echo "⚠️ Rate limit - waiting 10 minutes"
        sleep 600
    else
        echo "⏳ Pacing: waiting 60s..."
        sleep 60
    fi
done

echo "📊 Session Complete - $PASSING/55 features"
