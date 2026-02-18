#!/bin/bash
# init.sh - Start the development environment for Autonomous Coding Dashboard

set -e

echo "Starting Autonomous Coding Dashboard development environment..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Port configuration
BACKEND_PORT=3434
DASHBOARD_PORT=3535

# Function to check if a port is in use
port_in_use() {
  lsof -ti:$1 > /dev/null 2>&1
}

# Function to kill process on port
kill_port() {
  if port_in_use $1; then
    echo -e "${YELLOW}Killing existing process on port $1...${NC}"
    lsof -ti:$1 | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

# Kill existing processes on our ports
kill_port $BACKEND_PORT
kill_port $DASHBOARD_PORT

# Start backend (Express + Prisma on port 3434)
if [ -d "backend" ]; then
  echo "Starting backend API server on port $BACKEND_PORT..."
  cd backend

  if [ -f "package.json" ]; then
    npm install --silent 2>/dev/null || true
    npx prisma generate --no-hints 2>/dev/null || true
    npm run dev > /tmp/dashboard-backend.log 2>&1 &
    BACKEND_PID=$!
    echo "  Backend PID: $BACKEND_PID"
  fi

  cd "$SCRIPT_DIR"
fi

# Start dashboard (Next.js on port 3535)
if [ -d "dashboard" ]; then
  echo "Starting dashboard on port $DASHBOARD_PORT..."
  cd dashboard

  if [ -f "package.json" ]; then
    npm install --silent 2>/dev/null || true
    DASHBOARD_PORT=$DASHBOARD_PORT npm run dev > /tmp/dashboard-frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "  Dashboard PID: $FRONTEND_PID"
  fi

  cd "$SCRIPT_DIR"
fi

# Wait for servers to start
echo ""
echo "Waiting for servers to start..."
sleep 5

# Health checks
echo ""
echo "Running health checks..."

check_url() {
  if curl -s -o /dev/null -w "%{http_code}" "$1" | grep -q "200\|304"; then
    echo -e "  ${GREEN}OK${NC} $2 is healthy ($1)"
    return 0
  else
    echo -e "  ${RED}FAIL${NC} $2 is not responding ($1)"
    return 1
  fi
}

FRONTEND_OK=false
BACKEND_OK=false

if port_in_use $BACKEND_PORT; then
  if check_url "http://localhost:$BACKEND_PORT/api/health" "Backend API"; then
    BACKEND_OK=true
  elif check_url "http://localhost:$BACKEND_PORT" "Backend API"; then
    BACKEND_OK=true
  fi
else
  echo -e "  ${YELLOW}WARN${NC} Nothing running on port $BACKEND_PORT"
fi

if port_in_use $DASHBOARD_PORT; then
  if check_url "http://localhost:$DASHBOARD_PORT" "Dashboard"; then
    FRONTEND_OK=true
  fi
else
  echo -e "  ${YELLOW}WARN${NC} Nothing running on port $DASHBOARD_PORT"
fi

echo ""
echo "================================"
echo "Development Environment Status"
echo "================================"

if [ "$BACKEND_OK" = true ] || port_in_use $BACKEND_PORT; then
  echo -e "${GREEN}Backend API:${NC}  http://localhost:$BACKEND_PORT"
  echo -e "${GREEN}PCT API:${NC}      http://localhost:$BACKEND_PORT/api/pct"
fi

if [ "$FRONTEND_OK" = true ] || port_in_use $DASHBOARD_PORT; then
  echo -e "${GREEN}Dashboard:${NC}    http://localhost:$DASHBOARD_PORT"
  echo -e "${GREEN}Creative Testing:${NC} http://localhost:$DASHBOARD_PORT/creative-testing"
fi

echo ""
echo "Log files:"
echo "  Backend:   /tmp/dashboard-backend.log"
echo "  Dashboard: /tmp/dashboard-frontend.log"
echo ""
echo "To stop servers, run: kill \$(lsof -ti:$BACKEND_PORT,$DASHBOARD_PORT)"
echo ""

# Exit with success if at least one server is running
if port_in_use $BACKEND_PORT || port_in_use $DASHBOARD_PORT; then
  exit 0
else
  echo -e "${RED}No servers started successfully.${NC}"
  exit 1
fi
