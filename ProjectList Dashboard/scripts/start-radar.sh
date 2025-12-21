#!/bin/zsh
# Start Project Radar Dashboard on Mac Startup
# 
# To enable startup:
# 1. chmod +x start-radar.sh
# 2. Add to Login Items in System Settings OR
# 3. Use the provided .plist for launchd

RADAR_DIR="$HOME/Documents/Software/ProjectList Dashboard"
LOG_FILE="$RADAR_DIR/radar.log"
PORT=4000

cd "$RADAR_DIR"

echo "[$(date)] Starting Project Radar..." >> "$LOG_FILE"

# Check if already running on this port
if lsof -i :$PORT > /dev/null 2>&1; then
    echo "[$(date)] Port $PORT already in use, skipping server start" >> "$LOG_FILE"
else
    # Start the dev server in background
    npm run dev >> "$LOG_FILE" 2>&1 &
    echo "[$(date)] Server started on port $PORT" >> "$LOG_FILE"
fi

# Wait for server to be ready
sleep 3

# Open dashboard in default browser
open "http://localhost:$PORT"

echo "[$(date)] Dashboard opened" >> "$LOG_FILE"
