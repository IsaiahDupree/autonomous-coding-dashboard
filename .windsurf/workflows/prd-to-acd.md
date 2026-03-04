---
description: Turn any codebase gap or fix list into a PRD, feature list, and running ACD agent
---

# PRD to ACD Workflow

## Step 1: Research the target

Read the target package key files: src/api/server.ts, src/api/mcp-server.ts, src/automation/, types.ts, any docs/PRDs/. Identify missing endpoints, broken flows, fragile code. Each gap = one feature.

## Step 2: Write the harness prompt (PRD)

Create: harness/prompts/{slug}.md

Template structure:

    # {Project} - {Category} Fixes

    ## Project
    /absolute/path/to/target/package

    ## Context
    What already exists and what this batch addresses (2-3 sentences).

    ## Instructions
    - Implement each feature exactly as specified
    - After EACH feature: run npx tsc --noEmit from the package root
    - At the end: run npm run build and create a git commit
    - Update harness/{slug}-features.json after each: set passes=true, status=completed

    ---

    ## FEAT-001: Short descriptive title

    **Problem**: What is broken or missing.

    **Fix**:
    1. File: src/api/server.ts - add function doX(arg: string): Promise<Result>
    2. Route: POST /api/foo/bar accepting { field: string } returning { result: string }
    3. Export from src/automation/index.ts

Rules for good features:
- One feature = one atomic change (one endpoint, one function, one behavior)
- Always name the exact file, function signature, and route
- No vague features -- 'improve reliability' is rejected; 'add waitForSelector(sel, 5000) using MutationObserver' is accepted
- State the acceptance condition (tsc clean + expected return shape)

## Step 3: Create the feature list JSON

Create: harness/{slug}-features.json

```json
{
  "project": "{slug}",
  "version": "1.0.0",
  "description": "Short description of this batch",
  "features": [
    {
      "id": "FEAT-001",
      "name": "Exact title matching PRD heading",
      "category": "api",
      "priority": 1,
      "passes": false
    }
  ]
}
```

Harness validation rules (enforced at startup):
- Every feature requires id AND name (or description) -- missing either rejects the entire list
- All passes=false at creation time -- the ACD sets them true as it completes
- ID prefix conventions: IG- Instagram, TW- Twitter, TK- TikTok, LI- LinkedIn, LS- LinkedIn-scale, UW- Upwork
- Keep batches to 6-10 features max for reliability

## Step 4: Create the launch script

Create: harness/launch-{slug}.sh

CRITICAL: Use single long lines -- no backslash line continuations (they cause arg-parsing failures in bash).

```bash
#!/bin/bash
H="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness"
ROOT="/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard"
TARGET="/absolute/path/to/target/package"
mkdir -p "$H/logs"

node "$ROOT/harness/run-harness-v2.js" --path="$TARGET" --project={slug} --model=claude-sonnet-4-5-20250929 --fallback-model=claude-haiku-4-5-20251001 --max-retries=3 --prompt="$H/prompts/{slug}.md" --feature-list="$H/{slug}-features.json" --adaptive-delay --force-coding --until-complete >> "$H/logs/{slug}.log" 2>&1 &
echo "PID=$!"
```

CLI flag reference for run-harness-v2.js:

    --path             Absolute path to target repo (sets Claude Code cwd)
    --prompt           Absolute path to .md PRD/instructions file
    --feature-list     Absolute path to .json feature tracker
    --project          Slug for log naming and progress tracking
    --force-coding     Skip initializer session, go straight to coding
    --until-complete   Run until all features pass (max 100 sessions)
    --adaptive-delay   Sawtooth 1-5 min delay between sessions
    --model            Primary Claude model
    --fallback-model   Used after rate-limit resets

## Step 5: Launch and monitor

1. Make executable and launch
```bash
chmod +x harness/launch-{slug}.sh && bash harness/launch-{slug}.sh
```

2. Confirm startup -- expect within 3 seconds
```bash
head -12 harness/logs/{slug}.log
```
Expected output:
```
Auth: Claude OAuth token confirmed
Agent Harness v2 Starting
Feature list validated: N features
Starting session #1 (CODING) with model: claude-sonnet-4-5-20250929
Progress: 0/N features (0.0%)
```

3. Watch live progress
```bash
tail -f harness/logs/{slug}.log | grep -E "(validated|Starting session|Progress|passes|completed|error)"
```

4. Check JSON completion at any time
```bash
cat harness/{slug}-features.json | python3 -c "import sys,json; d=json.load(sys.stdin); done=[f for f in d['features'] if f.get('passes')]; print(str(len(done))+'/'+str(len(d['features']))+' done')"
```

## Common mistakes to avoid

- Feature list missing name field: harness rejects entire list -- id + name (or description) are both required
- Backslash line continuations in shell scripts: bash parses them as literal filenames; use single long lines
- Relative paths in --path/--prompt/--feature-list: always use absolute paths
- Spaces in paths unquoted: always double-quote path vars -- --path=$SA/packages/my package wont work
- Vague prompt instructions: Claude hallucinates; name exact files and function signatures
- Too many features per batch: keep to 6-10 max; large batches cause context drift
- Wrong Project path in prompt: sets Claude Code cwd; wrong path means wrong files get edited
