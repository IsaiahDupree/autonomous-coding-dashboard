#!/bin/bash
# Full harness test - runs a complete autonomous coding session

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKEND_PORT=${BACKEND_PORT:-3434}
PROJECT_ID=${1:-""}
MAX_SESSIONS=${2:-3}  # Default to 3 sessions for testing

echo -e "${BLUE}🚀 Full Harness Test - Autonomous Coding${NC}\n"

# Source API key
if [ -z "$CLAUDE_CODE_OAUTH_TOKEN" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
    KEY=$(bash scripts/get-claude-key.sh 2>/dev/null || echo "")
    if [ -n "$KEY" ] && [ "$KEY" != "ERROR"* ]; then
        export CLAUDE_CODE_OAUTH_TOKEN="$KEY"
        echo -e "${GREEN}✅ Sourced API key from Claude Code${NC}\n"
    else
        echo -e "${RED}❌ Could not find API key${NC}"
        exit 1
    fi
fi

# Check backend
BACKEND_URL="http://localhost:${BACKEND_PORT}"
if ! curl -s -f "${BACKEND_URL}/api/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend not running on port ${BACKEND_PORT}${NC}"
    echo -e "   Start with: cd backend && PORT=${BACKEND_PORT} npm run dev"
    exit 1
fi

# Get or create project
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}Creating test project...${NC}"
    PROJECT_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/projects" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "Test Autonomous Project",
            "description": "Test project for harness verification",
            "touchLevel": "medium",
            "profitPotential": "medium",
            "difficulty": "medium",
            "automationMode": "hybrid"
        }')
    
    PROJECT_ID=$(echo "$PROJECT_RESPONSE" | jq -r '.data.id' 2>/dev/null || echo "")
    if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" == "null" ]; then
        echo -e "${RED}❌ Failed to create project${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Created project: ${PROJECT_ID}${NC}\n"
else
    echo -e "${YELLOW}Using project: ${PROJECT_ID}${NC}\n"
fi

# Start harness
echo -e "${YELLOW}Starting harness...${NC}"
HARNESS_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/projects/${PROJECT_ID}/harness/start" \
    -H "Content-Type: application/json" \
    -d "{
        \"continuous\": true,
        \"maxSessions\": ${MAX_SESSIONS},
        \"sessionDelayMs\": 5000,
        \"projectPath\": \"$(pwd)\"
    }")

HARNESS_STATUS=$(echo "$HARNESS_RESPONSE" | jq -r '.data.status' 2>/dev/null || echo "")
if [ "$HARNESS_STATUS" != "running" ]; then
    echo -e "${RED}❌ Failed to start harness${NC}"
    echo "$HARNESS_RESPONSE" | jq '.' 2>/dev/null || echo "$HARNESS_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Harness started${NC}"
echo -e "   Status: ${HARNESS_STATUS}"
echo -e "   Max sessions: ${MAX_SESSIONS}\n"

# Monitor progress
echo -e "${BLUE}Monitoring harness progress...${NC}\n"
echo -e "Press Ctrl+C to stop monitoring (harness will continue)\n"

SESSION=0
while [ $SESSION -lt $MAX_SESSIONS ]; do
    sleep 10
    
    # Check status
    STATUS_RESPONSE=$(curl -s "${BACKEND_URL}/api/projects/${PROJECT_ID}/harness/status")
    STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.data.status' 2>/dev/null || echo "unknown")
    
    # Get features
    FEATURES_RESPONSE=$(curl -s "${BACKEND_URL}/api/projects/${PROJECT_ID}/features")
    FEATURES=$(echo "$FEATURES_RESPONSE" | jq '.data' 2>/dev/null || echo "[]")
    TOTAL=$(echo "$FEATURES" | jq 'length' 2>/dev/null || echo "0")
    PASSING=$(echo "$FEATURES" | jq '[.[] | select(.status == "passing")] | length' 2>/dev/null || echo "0")
    
    # Get agent runs
    RUNS_RESPONSE=$(curl -s "${BACKEND_URL}/api/projects/${PROJECT_ID}/agent-runs")
    RUNS=$(echo "$RUNS_RESPONSE" | jq '.data' 2>/dev/null || echo "[]")
    RUN_COUNT=$(echo "$RUNS" | jq 'length' 2>/dev/null || echo "0")
    
    echo -e "\r${YELLOW}[$(date +%H:%M:%S)]${NC} Status: ${STATUS} | Runs: ${RUN_COUNT} | Features: ${PASSING}/${TOTAL} passing"
    
    if [ "$STATUS" != "running" ]; then
        echo -e "\n${YELLOW}Harness stopped${NC}"
        break
    fi
    
    SESSION=$((SESSION + 1))
done

# Final status
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Final Status${NC}\n"

FEATURES_RESPONSE=$(curl -s "${BACKEND_URL}/api/projects/${PROJECT_ID}/features")
FEATURES=$(echo "$FEATURES_RESPONSE" | jq '.data' 2>/dev/null || echo "[]")
TOTAL=$(echo "$FEATURES" | jq 'length' 2>/dev/null || echo "0")
PASSING=$(echo "$FEATURES" | jq '[.[] | select(.status == "passing")] | length' 2>/dev/null || echo "0")
PENDING=$(echo "$FEATURES" | jq '[.[] | select(.status == "pending")] | length' 2>/dev/null || echo "0")

echo -e "   Project ID: ${PROJECT_ID}"
echo -e "   Total Features: ${TOTAL}"
echo -e "   Passing: ${GREEN}${PASSING}${NC}"
echo -e "   Pending: ${YELLOW}${PENDING}${NC}"

if [ "$TOTAL" -gt 0 ]; then
    PERCENT=$((PASSING * 100 / TOTAL))
    echo -e "   Progress: ${PERCENT}%"
fi

echo -e "\n${GREEN}✅ Test complete!${NC}"
echo -e "   View dashboard: http://localhost:3535"
echo -e "   Project ID: ${PROJECT_ID}"

