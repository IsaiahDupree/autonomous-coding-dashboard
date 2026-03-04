#!/bin/bash
H=/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness
ROOT=/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard
mkdir -p $H/logs

node $ROOT/harness/run-harness-v2.js --path=$ROOT --project=acd-mcp-skill --model=claude-sonnet-4-6 --fallback-model=claude-haiku-4-5-20251001 --max-retries=3 --prompt=$H/prompts/acd-mcp-skill.md --feature-list=$H/acd-mcp-skill-features.json --adaptive-delay --force-coding --until-complete >> $H/logs/acd-mcp-skill.log 2>&1 &
echo PID=$!
