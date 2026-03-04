#!/bin/bash
cd /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard
node harness/run-harness-v2.js \
  --prompt harness/prompts/acd-autonomous.md \
  --features harness/acd-autonomous-features.json \
  --slug acd-autonomous \
  --adaptive-delay \
  --run-until-complete \
  > harness/logs/acd-autonomous.log 2>&1 &
echo "acd-autonomous agent started. PID=$!"
echo "Logs: tail -f harness/logs/acd-autonomous.log"
