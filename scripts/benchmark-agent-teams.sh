#!/bin/bash
# Benchmark: Agent Teams env var vs Baseline vs Swarm dispatch_parallel
#
# NOTE ON AGENT TEAMS:
#   CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 enables native sub-agent spawning
#   in INTERACTIVE mode (real terminal / tmux). In -p (print) mode, the env var
#   is recognised but sub-agents are not spawned — Claude completes the task solo.
#   This benchmark measures: (A) with env var, (B) without, (C) swarm parallel.
#   Full parallel sub-agent testing requires an interactive tmux session.

RESULTS_DIR="/tmp/at-bench-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"

# Simple single-function task — fast, finishes in ~15-30s each
TASK="Write /tmp/bench_out.py with fibonacci(n) using memoization + 5 inline pytest tests. Be concise. Output the last line: DONE <line_count>"

echo "========================================"
echo "Agent Teams Benchmark (quick — ~60s total)"
echo "Task: fibonacci + 5 tests"
echo "Results: $RESULTS_DIR"
echo "========================================"
echo ""

# ── Approach A: AGENT_TEAMS=1 (env var set, same task as baseline) ─────────
echo "▶ A: CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 ... (running)"
rm -f /tmp/bench_out.py

A_START=$(date +%s)
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude --dangerously-skip-permissions \
  -p "$TASK" < /dev/null > "$RESULTS_DIR/a-teams.txt" 2>&1
A_TIME=$(( $(date +%s) - A_START ))
A_LINES=$(wc -l < /tmp/bench_out.py 2>/dev/null | tr -d ' ')
[ -f /tmp/bench_out.py ] && cp /tmp/bench_out.py "$RESULTS_DIR/a-bench_out.py"

A_TESTS="no-pytest"
if command -v pytest &>/dev/null && [ -f /tmp/bench_out.py ]; then
  pytest /tmp/bench_out.py -q < /dev/null > "$RESULTS_DIR/a-tests.txt" 2>&1 \
    && A_TESTS="PASS" || A_TESTS="FAIL"
fi
echo "  ✓ ${A_TIME}s | ${A_LINES} lines | tests: $A_TESTS"
echo ""

# ── Approach B: AGENT_TEAMS=0 (override to disable, true baseline) ────────
echo "▶ B: CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=0 (baseline) ... (running)"
rm -f /tmp/bench_out.py

B_START=$(date +%s)
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=0 claude --dangerously-skip-permissions \
  -p "$TASK" < /dev/null > "$RESULTS_DIR/b-baseline.txt" 2>&1
B_TIME=$(( $(date +%s) - B_START ))
B_LINES=$(wc -l < /tmp/bench_out.py 2>/dev/null | tr -d ' ')
[ -f /tmp/bench_out.py ] && cp /tmp/bench_out.py "$RESULTS_DIR/b-bench_out.py"

B_TESTS="no-pytest"
if command -v pytest &>/dev/null && [ -f /tmp/bench_out.py ]; then
  pytest /tmp/bench_out.py -q < /dev/null > "$RESULTS_DIR/b-tests.txt" 2>&1 \
    && B_TESTS="PASS" || B_TESTS="FAIL"
fi
echo "  ✓ ${B_TIME}s | ${B_LINES} lines | tests: $B_TESTS"
echo ""

# ── Approach C: agent_swarm.py dispatch (existing stack) ──────────────────
echo "▶ C: agent_swarm dispatch_parallel ... (running)"
rm -f /tmp/bench_out.py

C_START=$(date +%s)
python3 - <<'PYEOF' > "$RESULTS_DIR/c-swarm.txt" 2>&1
import asyncio, sys
sys.path.insert(0, '/Users/isaiahdupree/Documents/Software/actp-worker')
try:
    from agent_swarm import get_swarm
    async def run():
        swarm = get_swarm()
        t = 'Write /tmp/bench_out.py: fibonacci(n) memoized + 5 inline pytest tests. Concise.'
        result = await swarm.dispatch(role='coding', intent=t)
        print(result)
    asyncio.run(run())
except ImportError as e:
    print(f'agent_swarm not available: {e}')
except Exception as e:
    print(f'Error: {e}')
PYEOF
C_TIME=$(( $(date +%s) - C_START ))
C_LINES=$(wc -l < /tmp/bench_out.py 2>/dev/null | tr -d ' ')
[ -f /tmp/bench_out.py ] && cp /tmp/bench_out.py "$RESULTS_DIR/c-bench_out.py"

C_TESTS="no-pytest"
if command -v pytest &>/dev/null && [ -f /tmp/bench_out.py ]; then
  pytest /tmp/bench_out.py -q < /dev/null > "$RESULTS_DIR/c-tests.txt" 2>&1 \
    && C_TESTS="PASS" || C_TESTS="FAIL"
fi
echo "  ✓ ${C_TIME}s | ${C_LINES} lines | tests: $C_TESTS"
echo ""

# ── Summary ────────────────────────────────────────────────────────────────
echo "========================================"
echo "RESULTS"
echo "========================================"
printf "%-38s %8s %8s %8s\n" "Approach" "Time(s)" "Lines" "Tests"
printf "%-38s %8s %8s %8s\n" "------" "------" "-----" "-----"
printf "%-38s %8s %8s %8s\n" "A: claude (AGENT_TEAMS=1)"    "$A_TIME" "$A_LINES" "$A_TESTS"
printf "%-38s %8s %8s %8s\n" "B: claude (AGENT_TEAMS=0 baseline)" "$B_TIME" "$B_LINES" "$B_TESTS"
printf "%-38s %8s %8s %8s\n" "C: agent_swarm dispatch"       "$C_TIME" "$C_LINES" "$C_TESTS"
echo ""
echo "NOTE: Full Agent Teams parallel sub-agents requires interactive mode (tmux)."
echo "      AGENT_TEAMS=1 in -p mode uses the env var but runs solo (same context)."
echo "Logs: $RESULTS_DIR"

# JSON summary
cat > "$RESULTS_DIR/summary.json" <<JSONEOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "task": "fibonacci + 5 pytest tests",
  "note": "agent_teams parallel requires interactive tmux — this tests -p mode",
  "results": {
    "agent_teams_env": {"time_s": $A_TIME, "lines": $A_LINES, "tests": "$A_TESTS"},
    "baseline_no_teams": {"time_s": $B_TIME, "lines": $B_LINES, "tests": "$B_TESTS"},
    "swarm_dispatch": {"time_s": $C_TIME, "lines": $C_LINES, "tests": "$C_TESTS"}
  }
}
JSONEOF
echo "JSON: $RESULTS_DIR/summary.json"
