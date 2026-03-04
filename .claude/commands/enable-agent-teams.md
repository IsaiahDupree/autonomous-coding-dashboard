# Enable Claude Code Agent Teams

**Skill**: Read /Users/isaiahdupree/Documents/Software/skills/multi-orchestrator/SKILL.md before proceeding. Apply the Agent Teams patterns from that skill.

**Video reference**: https://www.youtube.com/watch?v=oC3F2SFaF9w (Claude Code Agent Teams)

**Auth model**: OAuth ONLY — Claude Max subscription, NOT Anthropic API key. No new credentials needed.

---

## Your Task

Enable `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` across this stack so Agent Teams work in every Claude Code session and harness run.

## Implementation Steps

### Step 1: Enable globally in Claude Code settings

Read `~/.claude/settings.json`. If it exists, add the env var to the `env` block (create the block if missing). If it doesn't exist, create it:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Preserve ALL existing keys — only add, never overwrite.

### Step 2: Update harness scripts

Search for harness scripts in `harness/` that invoke `claude` CLI. Prepend the env var to each `claude` invocation:

```bash
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude --dangerously-skip-permissions ...
```

Or add `export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` at the top of each shell script.

### Step 3: Update justfile

In the `justfile` at the root of this repo, add the env var to the `ui-review` and `automate` recipes. Also add a new `agent-teams-test` recipe:

```makefile
# Test that Agent Teams are enabled
agent-teams-test:
    CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude --dangerously-skip-permissions \
      -p "Verify Agent Teams are enabled. Check ~/.claude/settings.json for CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS. Report: enabled or not enabled, and what model/subscription tier is active."
```

### Step 4: Update agent_swarm.py (if present)

Search for `agent_swarm.py` in `/Users/isaiahdupree/Documents/Software/actp-worker/`. If found:

- Find where the `coding` agent spawns Claude Code subprocesses
- Add `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` to the subprocess environment
- If using `os.environ` or `subprocess.run(env=...)`, add the key there

### Step 5: Verify

Run:
```bash
cat ~/.claude/settings.json | grep -A2 AGENT_TEAMS
```

Expected output should show `"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"`.

Then run a quick Agent Teams test:
```bash
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude --dangerously-skip-permissions \
  -p "Confirm Agent Teams are active. List available agent team commands or capabilities visible in this session. Keep response brief."
```

## Hard Rules

- NEVER remove existing `~/.claude/settings.json` keys
- NEVER add an Anthropic API key — this is OAuth only
- If `~/.claude/settings.json` cannot be found, try `~/.claude/settings.local.json`
- If Claude Max subscription is required and not confirmed, report back to user before proceeding

## Report Format

When done, output:
```
Agent Teams Enablement Report
==============================
~/.claude/settings.json: ✅ updated / ❌ not found
Harness scripts updated: N files
justfile updated: ✅ / ❌
agent_swarm.py updated: ✅ / ❌ / not found
Verification: PASS / FAIL
Notes: ...
```
