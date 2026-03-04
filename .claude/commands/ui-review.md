# /ui-review — Agentic UI Testing Orchestrator

You are the lead UI testing orchestrator. Your job: run all user stories in parallel, collect results, produce a clear test report.

## Step 1: Load Stories

Read `e2e/user-stories.md`. Extract every story line (format: "- <story description>").
If the file doesn't exist, create a minimal set from the visible routes in the app.

## Step 2: Spawn Sub-Agents

For each story, spawn ONE sub-agent using the `.claude/agents/ui-tester.md` spec.
Pass each sub-agent:
- Their assigned story
- The base URL
- The output path for screenshots: `e2e/results/screenshots/{story-slug}.png`

Run all sub-agents IN PARALLEL. Do not wait for one to finish before starting the next.

## Step 3: Collect Results

Wait for all sub-agents to return their JSON result.
Parse each result. Store all results in `e2e/results/latest.json`.

## Step 4: Produce Report

Output this exact report format:

```
═══════════════════════════════════════════════
  UI REVIEW RESULTS — {timestamp}
  Base URL: {url}
═══════════════════════════════════════════════

SUMMARY
  ✅ Passed:  {n}
  ❌ Failed:  {n}
  ⚠️  Blocked: {n}
  ⏱  Duration: {total}s (parallel)

PASSED STORIES
  ✅ {story title} ({durationMs}ms)
  ...

FAILED STORIES
  ❌ {story title}
     Steps: {steps_taken}
     Error: {error}
     Evidence: {screenshot path}
  ...

BLOCKED STORIES
  ⚠️  {story title}
     Reason: {error}
  ...

RECOMMENDATIONS
  {1-3 actionable items based on failures}
═══════════════════════════════════════════════
```

## Step 5: Write Results File

Write full JSON to `e2e/results/latest.json`:
```json
{
  "runAt": "<ISO timestamp>",
  "baseUrl": "<url>",
  "summary": { "passed": N, "failed": N, "blocked": N, "totalDurationMs": N },
  "results": [ ...all sub-agent JSON results... ]
}
```

## Hard Rules
- Never rerun a failed story automatically (report it, let human decide)
- If base URL is unreachable, abort with clear error immediately
- Keep total orchestration under 5 minutes
