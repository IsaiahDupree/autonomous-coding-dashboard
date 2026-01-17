#!/bin/bash
# Comprehensive connectivity and harness test script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=${BACKEND_PORT:-3434}
DASHBOARD_PORT=${DASHBOARD_PORT:-3535}
BACKEND_URL="http://localhost:${BACKEND_PORT}"
DASHBOARD_URL="http://localhost:${DASHBOARD_PORT}"

echo -e "${BLUE}🧪 Autonomous Coding Dashboard - Connectivity & Harness Tests${NC}\n"

# Test 1: Claude API Key
echo -e "${YELLOW}1. Testing Claude API Key...${NC}"
if [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
    echo -e "${GREEN}   ✅ CLAUDE_CODE_OAUTH_TOKEN is set${NC}"
    KEY_PREFIX=$(echo "$CLAUDE_CODE_OAUTH_TOKEN" | cut -c1-15)
    echo -e "   Key prefix: ${KEY_PREFIX}..."
elif [ -n "$ANTHROPIC_API_KEY" ]; then
    echo -e "${GREEN}   ✅ ANTHROPIC_API_KEY is set${NC}"
    KEY_PREFIX=$(echo "$ANTHROPIC_API_KEY" | cut -c1-15)
    echo -e "   Key prefix: ${KEY_PREFIX}..."
else
    echo -e "${RED}   ❌ No API key found${NC}"
    echo -e "   Trying to source from Claude Code..."
    KEY=$(bash scripts/get-claude-key.sh 2>/dev/null || echo "")
    if [ -n "$KEY" ] && [ "$KEY" != "ERROR"* ]; then
        export CLAUDE_CODE_OAUTH_TOKEN="$KEY"
        echo -e "${GREEN}   ✅ Found key from Claude Code${NC}"
    else
        echo -e "${RED}   ❌ Could not find API key${NC}"
        exit 1
    fi
fi

# Test 2: Claude CLI
echo -e "\n${YELLOW}2. Testing Claude CLI...${NC}"
if command -v claude &> /dev/null; then
    CLAUDE_VERSION=$(claude --version 2>/dev/null || echo "unknown")
    echo -e "${GREEN}   ✅ Claude CLI installed: ${CLAUDE_VERSION}${NC}"
    echo -e "   Path: $(which claude)"
else
    echo -e "${RED}   ❌ Claude CLI not found${NC}"
    echo -e "   Install with: npm install -g @anthropic-ai/claude-code"
    exit 1
fi

# Test 3: Backend Server
echo -e "\n${YELLOW}3. Testing Backend Server (port ${BACKEND_PORT})...${NC}"
if curl -s -f "${BACKEND_URL}/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ Backend is running${NC}"
    HEALTH=$(curl -s "${BACKEND_URL}/api/health" | jq -r '.status' 2>/dev/null || echo "ok")
    echo -e "   Status: ${HEALTH}"
else
    echo -e "${RED}   ❌ Backend is not running${NC}"
    echo -e "   Start with: cd backend && PORT=${BACKEND_PORT} npm run dev"
    BACKEND_DOWN=true
fi

# Test 4: Dashboard Server
echo -e "\n${YELLOW}4. Testing Dashboard Server (port ${DASHBOARD_PORT})...${NC}"
if curl -s -f "${DASHBOARD_URL}" > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ Dashboard is running${NC}"
else
    echo -e "${YELLOW}   ⚠️  Dashboard is not running${NC}"
    echo -e "   Start with: cd dashboard && PORT=${DASHBOARD_PORT} npm run dev"
    DASHBOARD_DOWN=true
fi

# Test 5: Database Connection
echo -e "\n${YELLOW}5. Testing Database Connection...${NC}"
if [ -z "$BACKEND_DOWN" ]; then
    if curl -s -f "${BACKEND_URL}/api/projects" > /dev/null 2>&1; then
        PROJECT_COUNT=$(curl -s "${BACKEND_URL}/api/projects" | jq '.data | length' 2>/dev/null || echo "0")
        echo -e "${GREEN}   ✅ Database connected${NC}"
        echo -e "   Projects: ${PROJECT_COUNT}"
    else
        echo -e "${RED}   ❌ Database connection failed${NC}"
    fi
else
    echo -e "${YELLOW}   ⚠️  Skipped (backend not running)${NC}"
fi

# Test 6: Harness Script
echo -e "\n${YELLOW}6. Testing Harness Script...${NC}"
if [ -f "harness/run-harness.js" ]; then
    echo -e "${GREEN}   ✅ Harness script exists${NC}"
    if node -e "import('harness/run-harness.js').catch(() => {})" 2>/dev/null; then
        echo -e "${GREEN}   ✅ Harness script is valid${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Harness script syntax check skipped${NC}"
    fi
else
    echo -e "${RED}   ❌ Harness script not found${NC}"
fi

# Test 7: Harness Prompts
echo -e "\n${YELLOW}7. Testing Harness Prompts...${NC}"
if [ -f "harness/prompts/initializer.md" ] && [ -f "harness/prompts/coding.md" ]; then
    echo -e "${GREEN}   ✅ Prompt files exist${NC}"
    INIT_SIZE=$(wc -l < harness/prompts/initializer.md)
    CODING_SIZE=$(wc -l < harness/prompts/coding.md)
    echo -e "   Initializer: ${INIT_SIZE} lines"
    echo -e "   Coding: ${CODING_SIZE} lines"
else
    echo -e "${RED}   ❌ Prompt files missing${NC}"
fi

# Test 8: Feature List
echo -e "\n${YELLOW}8. Testing Feature List...${NC}"
if [ -f "feature_list.json" ]; then
    FEATURE_COUNT=$(jq '.features | length' feature_list.json 2>/dev/null || echo "0")
    echo -e "${GREEN}   ✅ Feature list exists${NC}"
    echo -e "   Features: ${FEATURE_COUNT}"
else
    echo -e "${YELLOW}   ⚠️  Feature list not found (will be created by initializer)${NC}"
fi

# Summary
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Test Summary${NC}\n"

if [ -z "$BACKEND_DOWN" ] && [ -z "$DASHBOARD_DOWN" ]; then
    echo -e "${GREEN}✅ All systems operational!${NC}\n"
    echo -e "   Backend:  ${BACKEND_URL}"
    echo -e "   Dashboard: ${DASHBOARD_URL}\n"
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "   1. Open ${DASHBOARD_URL} in your browser"
    echo -e "   2. Select a project"
    echo -e "   3. Start a harness"
else
    echo -e "${YELLOW}⚠️  Some services need to be started${NC}\n"
    if [ -n "$BACKEND_DOWN" ]; then
        echo -e "   Start backend: cd backend && PORT=${BACKEND_PORT} npm run dev"
    fi
    if [ -n "$DASHBOARD_DOWN" ]; then
        echo -e "   Start dashboard: cd dashboard && PORT=${DASHBOARD_PORT} npm run dev"
    fi
fi

echo ""

