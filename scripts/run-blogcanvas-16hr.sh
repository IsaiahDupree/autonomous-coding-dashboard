#!/bin/bash
# Run autonomous harness on BlogCanvas for 16 hours (57600 seconds)

set -e

DURATION=57600  # 16 hours in seconds
START_TIME=$(date +%s)
END_TIME=$((START_TIME + DURATION))

BLOGCANVAS_DIR="/Users/isaiahdupree/Documents/Software/BlogCanvas"
HARNESS_DIR="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
LOG_FILE="${BLOGCANVAS_DIR}/autonomous-harness.log"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "═══════════════════════════════════════════════════════════════════════"
echo "  ${BLUE}AUTONOMOUS CODING HARNESS - BLOGCANVAS 16-HOUR SESSION${NC}"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "  📁 Project: ${BLOGCANVAS_DIR}"
echo "  ⏱️  Duration: 16 hours"
echo "  🚀 Started: $(date)"
echo "  🏁 Will run until: $(date -r $END_TIME 2>/dev/null || date -d @$END_TIME)"
echo "  📝 Log file: ${LOG_FILE}"
echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo ""

# Check if Claude CLI is installed
if ! command -v claude &> /dev/null; then
    echo "${RED}❌ Claude CLI not found${NC}"
    echo "   Install with: npm install -g @anthropic-ai/claude-code"
    exit 1
fi

# Check if BlogCanvas directory exists
if [ ! -d "$BLOGCANVAS_DIR" ]; then
    echo "${RED}❌ BlogCanvas directory not found: ${BLOGCANVAS_DIR}${NC}"
    exit 1
fi

# Copy harness files to BlogCanvas if not present
if [ ! -d "${BLOGCANVAS_DIR}/harness" ]; then
    echo "${YELLOW}📦 Setting up harness in BlogCanvas...${NC}"
    mkdir -p "${BLOGCANVAS_DIR}/harness/prompts"
    cp "${HARNESS_DIR}/run-harness-v2.js" "${BLOGCANVAS_DIR}/harness/" 2>/dev/null || true
    cp "${HARNESS_DIR}/prompts/initializer.md" "${BLOGCANVAS_DIR}/harness/prompts/" 2>/dev/null || true
fi

# Copy BlogCanvas-specific coding prompt
if [ -f "${HARNESS_DIR}/prompts/blogcanvas-coding.md" ]; then
    cp "${HARNESS_DIR}/prompts/blogcanvas-coding.md" "${BLOGCANVAS_DIR}/harness/prompts/coding.md"
    echo "${GREEN}✅ BlogCanvas coding prompt installed${NC}"
fi

# Initialize progress file if not exists
if [ ! -f "${BLOGCANVAS_DIR}/claude-progress.txt" ]; then
    echo "=== BlogCanvas Autonomous Development Log ===" > "${BLOGCANVAS_DIR}/claude-progress.txt"
    echo "Started: $(date)" >> "${BLOGCANVAS_DIR}/claude-progress.txt"
    echo "" >> "${BLOGCANVAS_DIR}/claude-progress.txt"
fi

# Change to BlogCanvas directory
cd "$BLOGCANVAS_DIR"

# Store PID for monitoring
echo $$ > "${BLOGCANVAS_DIR}/harness-16hr.pid"

SESSION_COUNT=0

# Run harness until time expires or all features complete
while [ $(date +%s) -lt $END_TIME ]; do
    SESSION_COUNT=$((SESSION_COUNT + 1))
    ELAPSED=$(($(date +%s) - START_TIME))
    ELAPSED_HOURS=$((ELAPSED / 3600))
    ELAPSED_MINS=$(((ELAPSED % 3600) / 60))
    
    echo ""
    echo "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo "  Session #${SESSION_COUNT} | Elapsed: ${ELAPSED_HOURS}h ${ELAPSED_MINS}m"
    echo "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo "[$(date)] Starting harness session..."
    
    # Run the harness with v2 (better error handling)
    PROJECT_ROOT="$BLOGCANVAS_DIR" node "${BLOGCANVAS_DIR}/harness/run-harness-v2.js" -c --max=10 2>&1 | tee -a "$LOG_FILE"
    
    # Check if all features are complete
    if [ -f "${BLOGCANVAS_DIR}/feature_list.json" ]; then
        PASSING=$(grep -c '"passes": true' "${BLOGCANVAS_DIR}/feature_list.json" 2>/dev/null || echo 0)
        TOTAL=$(grep -c '"id":' "${BLOGCANVAS_DIR}/feature_list.json" 2>/dev/null || echo 0)
        
        if [ "$TOTAL" -gt 0 ] && [ "$PASSING" -eq "$TOTAL" ]; then
            echo ""
            echo "${GREEN}🎉 ALL FEATURES COMPLETE! ($PASSING/$TOTAL)${NC}"
            echo "Completed at: $(date)" >> "${BLOGCANVAS_DIR}/claude-progress.txt"
            rm -f "${BLOGCANVAS_DIR}/harness-16hr.pid"
            exit 0
        fi
        
        echo "[$(date)] Session ended. Progress: $PASSING/$TOTAL features"
    else
        echo "[$(date)] Feature list not found - initializer may need to run"
    fi
    
    # Check remaining time
    REMAINING=$((END_TIME - $(date +%s)))
    if [ $REMAINING -lt 300 ]; then
        echo "${YELLOW}⏰ Less than 5 minutes remaining - wrapping up${NC}"
        break
    fi
    
    echo "Waiting 30 seconds before next session..."
    sleep 30
done

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "  ${GREEN}16-HOUR SESSION COMPLETE${NC}"
echo "  Ended: $(date)"
echo "  Total Sessions: ${SESSION_COUNT}"
if [ -f "${BLOGCANVAS_DIR}/feature_list.json" ]; then
    FINAL_PASSING=$(grep -c '"passes": true' "${BLOGCANVAS_DIR}/feature_list.json" 2>/dev/null || echo 0)
    FINAL_TOTAL=$(grep -c '"id":' "${BLOGCANVAS_DIR}/feature_list.json" 2>/dev/null || echo 0)
    echo "  Final Progress: ${FINAL_PASSING}/${FINAL_TOTAL} features"
fi
echo "═══════════════════════════════════════════════════════════════════════"

rm -f "${BLOGCANVAS_DIR}/harness-16hr.pid"
