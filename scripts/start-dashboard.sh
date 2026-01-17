#!/bin/bash
# Start dashboard with proper configuration

set -e

cd "$(dirname "$0")/../dashboard"

# Set port
export DASHBOARD_PORT=${DASHBOARD_PORT:-3535}
export NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:3434}
export NEXT_PUBLIC_BACKEND_PORT=${NEXT_PUBLIC_BACKEND_PORT:-3434}

echo "🚀 Starting dashboard on port ${DASHBOARD_PORT}..."
echo "   Dashboard URL: http://localhost:${DASHBOARD_PORT}"
echo "   Backend URL: ${NEXT_PUBLIC_API_URL}"

npm run dev

