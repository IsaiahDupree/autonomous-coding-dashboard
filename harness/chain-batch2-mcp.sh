#!/bin/bash
# chain-batch2-mcp.sh
# Watches batch 1 (crmlite-mcp, social-mcp, analytics-mcp) and launches
# batch 2 (memory-mcp, mplite-mcp, campaigns-mcp) once all are complete.
# Run in background: bash harness/chain-batch2-mcp.sh &

H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"

is_complete() {
  local slug=$1
  local json="$H/$slug-features.json"
  if [ ! -f "$json" ]; then echo 0; return; fi
  python3 -c "
import sys, json
d = json.load(open('$json'))
done = sum(1 for f in d['features'] if f.get('passes'))
total = len(d['features'])
print(1 if done == total else 0)
"
}

echo "[chain] Monitoring batch 1: crmlite-mcp, social-mcp, analytics-mcp"
echo "[chain] Will launch batch 2 (memory-mcp, mplite-mcp, campaigns-mcp) when all complete"

while true; do
  c1=$(is_complete crmlite-mcp)
  c2=$(is_complete social-mcp)
  c3=$(is_complete analytics-mcp)

  echo "[chain] $(date '+%H:%M:%S') — crmlite-mcp=$c1 social-mcp=$c2 analytics-mcp=$c3"

  if [ "$c1" = "1" ] && [ "$c2" = "1" ] && [ "$c3" = "1" ]; then
    echo "[chain] Batch 1 complete! Scaffolding and launching batch 2..."

    for dir in memory-mcp mplite-mcp campaigns-mcp; do
      mkdir -p "/Users/isaiahdupree/Documents/Software/$dir"
      cd "/Users/isaiahdupree/Documents/Software/$dir"
      git init -q 2>/dev/null || true
      echo '{}' > harness-metrics.json
    done

    chmod +x "$H/launch-memory-mcp.sh" "$H/launch-mplite-mcp.sh" "$H/launch-campaigns-mcp.sh"

    bash "$H/launch-memory-mcp.sh"
    sleep 2
    bash "$H/launch-mplite-mcp.sh"
    sleep 2
    bash "$H/launch-campaigns-mcp.sh"

    echo "[chain] Batch 2 launched. PIDs logged above."
    exit 0
  fi

  sleep 120
done
