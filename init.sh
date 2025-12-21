#!/bin/bash
# init.sh - Start the development environment for Autonomous Coding Dashboard

set -e

echo "🚀 Starting Autonomous Coding Dashboard development environment..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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
kill_port 3000
kill_port 8080

# Check for backend
if [ -d "backend" ]; then
  echo "Starting backend server..."
  cd backend
  
  if [ -f "package.json" ]; then
    npm install --silent 2>/dev/null || true
    npm run dev > /tmp/dashboard-backend.log 2>&1 &
    BACKEND_PID=$!
    echo "  Backend PID: $BACKEND_PID"
  elif [ -f "requirements.txt" ]; then
    pip install -r requirements.txt -q 2>/dev/null || true
    python app.py > /tmp/dashboard-backend.log 2>&1 &
    BACKEND_PID=$!
    echo "  Backend PID: $BACKEND_PID"
  fi
  
  cd "$SCRIPT_DIR"
fi

# Check for frontend
if [ -d "frontend" ]; then
  echo "Starting frontend server..."
  cd frontend
  
  if [ -f "package.json" ]; then
    npm install --silent 2>/dev/null || true
    npm run dev > /tmp/dashboard-frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "  Frontend PID: $FRONTEND_PID"
  fi
  
  cd "$SCRIPT_DIR"
fi

# If no frontend/backend dirs, try to serve static files
if [ ! -d "frontend" ] && [ ! -d "backend" ]; then
  echo "No frontend/backend directories found."
  echo "Starting simple HTTP server for static files..."
  
  if command -v python3 &> /dev/null; then
    python3 -m http.server 3000 > /tmp/dashboard-server.log 2>&1 &
    SERVER_PID=$!
    echo "  Server PID: $SERVER_PID"
  elif command -v npx &> /dev/null; then
    npx -y serve -l 3000 > /tmp/dashboard-server.log 2>&1 &
    SERVER_PID=$!
    echo "  Server PID: $SERVER_PID"
  else
    echo -e "${RED}No suitable server found. Install Python 3 or Node.js.${NC}"
    exit 1
  fi
fi

# Wait for servers to start
echo ""
echo "Waiting for servers to start..."
sleep 3

# Health checks
echo ""
echo "Running health checks..."

check_url() {
  if curl -s -o /dev/null -w "%{http_code}" "$1" | grep -q "200\|304"; then
    echo -e "  ${GREEN}✓${NC} $2 is healthy ($1)"
    return 0
  else
    echo -e "  ${RED}✗${NC} $2 is not responding ($1)"
    return 1
  fi
}

FRONTEND_OK=false
BACKEND_OK=false

if port_in_use 3000; then
  if check_url "http://localhost:3000" "Frontend"; then
    FRONTEND_OK=true
  fi
else
  echo -e "  ${YELLOW}⚠${NC} Nothing running on port 3000"
fi

if port_in_use 8080; then
  if check_url "http://localhost:8080/health" "Backend"; then
    BACKEND_OK=true
  elif check_url "http://localhost:8080" "Backend"; then
    BACKEND_OK=true
  fi
fi

echo ""
echo "================================"
echo "Development Environment Status"
echo "================================"

if [ "$FRONTEND_OK" = true ] || port_in_use 3000; then
  echo -e "${GREEN}Frontend:${NC} http://localhost:3000"
fi

if [ "$BACKEND_OK" = true ] || port_in_use 8080; then
  echo -e "${GREEN}Backend:${NC}  http://localhost:8080"
fi

echo ""
echo "Log files:"
echo "  Backend:  /tmp/dashboard-backend.log"
echo "  Frontend: /tmp/dashboard-frontend.log"
echo ""
echo "To stop servers, run: kill \$(lsof -ti:3000,8080)"
echo ""

# Exit with success if at least one server is running
if port_in_use 3000 || port_in_use 8080; then
  exit 0
else
  echo -e "${RED}No servers started successfully.${NC}"
  exit 1
fi
