#!/bin/bash
# Comprehensive post-deployment test suite

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

cd "$(dirname "$0")/.."

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🧪 Post-Deployment Test Suite${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

PASSED=0
FAILED=0
WARNINGS=0

test_pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

test_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

test_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

# Test 1: Service Health
echo -e "${CYAN}1. Service Health Checks${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Backend
if curl -s -f http://localhost:3434/api/health > /dev/null 2>&1; then
    HEALTH=$(curl -s http://localhost:3434/api/health | jq -r '.status' 2>/dev/null || echo "ok")
    test_pass "Backend server (port 3434) - Status: $HEALTH"
else
    test_fail "Backend server (port 3434) - Not responding"
fi

# Dashboard
if curl -s -f http://localhost:3535 > /dev/null 2>&1; then
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3535)
    test_pass "Dashboard server (port 3535) - HTTP $STATUS"
else
    test_fail "Dashboard server (port 3535) - Not responding"
fi

echo ""

# Test 2: API Endpoints
echo -e "${CYAN}2. API Endpoint Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Health endpoint
if curl -s http://localhost:3434/api/health | jq -e '.status' > /dev/null 2>&1; then
    test_pass "GET /api/health - Returns valid JSON"
else
    test_fail "GET /api/health - Invalid response"
fi

# Projects endpoint
PROJECTS_RESPONSE=$(curl -s http://localhost:3434/api/projects 2>/dev/null)
if echo "$PROJECTS_RESPONSE" | jq -e '.data' > /dev/null 2>&1; then
    PROJECT_COUNT=$(echo "$PROJECTS_RESPONSE" | jq '.data | length' 2>/dev/null || echo "0")
    test_pass "GET /api/projects - Returns $PROJECT_COUNT projects"
else
    test_warn "GET /api/projects - May have database issues (non-blocking)"
fi

# Root endpoint
if curl -s http://localhost:3434/ | jq -e '.name' > /dev/null 2>&1; then
    test_pass "GET / - API info endpoint working"
else
    test_warn "GET / - May have issues"
fi

echo ""

# Test 3: Harness Components
echo -e "${CYAN}3. Harness Component Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Harness script
if [ -f "harness/run-harness.js" ]; then
    if node -c harness/run-harness.js > /dev/null 2>&1; then
        test_pass "Harness script - Valid JavaScript syntax"
    else
        test_fail "Harness script - Syntax errors"
    fi
else
    test_fail "Harness script - File not found"
fi

# Feature list
if [ -f "feature_list.json" ]; then
    FEATURE_COUNT=$(jq '.features | length' feature_list.json 2>/dev/null || echo "0")
    if [ "$FEATURE_COUNT" -gt 0 ]; then
        test_pass "Feature list - $FEATURE_COUNT features defined"
    else
        test_warn "Feature list - Empty or invalid"
    fi
else
    test_warn "Feature list - Not found (will be created by initializer)"
fi

# Prompts
if [ -f "harness/prompts/initializer.md" ] && [ -f "harness/prompts/coding.md" ]; then
    INIT_LINES=$(wc -l < harness/prompts/initializer.md)
    CODING_LINES=$(wc -l < harness/prompts/coding.md)
    test_pass "Prompt files - Initializer ($INIT_LINES lines), Coding ($CODING_LINES lines)"
else
    test_fail "Prompt files - Missing"
fi

echo ""

# Test 4: Claude CLI
echo -e "${CYAN}4. Claude CLI Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v claude &> /dev/null; then
    CLAUDE_VERSION=$(claude --version 2>/dev/null || echo "unknown")
    test_pass "Claude CLI - Installed ($CLAUDE_VERSION)"
else
    test_fail "Claude CLI - Not found"
fi

echo ""

# Test 5: API Key
echo -e "${CYAN}5. API Key Configuration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
    KEY_PREFIX=$(echo "$CLAUDE_CODE_OAUTH_TOKEN" | cut -c1-20)
    test_pass "API Key - Found in environment ($KEY_PREFIX...)"
elif [ -n "$ANTHROPIC_API_KEY" ]; then
    KEY_PREFIX=$(echo "$ANTHROPIC_API_KEY" | cut -c1-20)
    test_pass "API Key - Found in environment ($KEY_PREFIX...)"
else
    KEY=$(bash scripts/get-claude-key.sh 2>/dev/null || echo "")
    if [ -n "$KEY" ] && [ "$KEY" != "ERROR"* ]; then
        KEY_PREFIX=$(echo "$KEY" | cut -c1-20)
        test_pass "API Key - Sourced from Claude Code ($KEY_PREFIX...)"
    else
        test_fail "API Key - Not found"
    fi
fi

echo ""

# Test 6: Port Configuration
echo -e "${CYAN}6. Port Configuration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

BACKEND_PORT=${BACKEND_PORT:-3434}
DASHBOARD_PORT=${DASHBOARD_PORT:-3535}

if lsof -ti:$BACKEND_PORT > /dev/null 2>&1; then
    test_pass "Backend port $BACKEND_PORT - In use (correct)"
else
    test_fail "Backend port $BACKEND_PORT - Not in use"
fi

if lsof -ti:$DASHBOARD_PORT > /dev/null 2>&1; then
    test_pass "Dashboard port $DASHBOARD_PORT - In use (correct)"
else
    test_fail "Dashboard port $DASHBOARD_PORT - Not in use"
fi

echo ""

# Test 7: File Permissions
echo -e "${CYAN}7. File Permissions${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -x "scripts/test-connectivity.sh" ]; then
    test_pass "Test scripts - Executable"
else
    test_warn "Test scripts - Some may not be executable"
fi

if [ -r "harness/run-harness.js" ] && [ -r "feature_list.json" ]; then
    test_pass "Harness files - Readable"
else
    test_fail "Harness files - Permission issues"
fi

echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Test Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

TOTAL=$((PASSED + FAILED + WARNINGS))

echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo -e "   Total: $TOTAL tests"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All critical tests passed!${NC}"
    echo ""
    echo -e "${CYAN}Next steps:${NC}"
    echo "   1. Open dashboard: http://localhost:3535"
    echo "   2. Test harness: cd harness && node run-harness.js --max=2"
    echo "   3. Monitor progress in dashboard"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed. Review above for details.${NC}"
    exit 1
fi

