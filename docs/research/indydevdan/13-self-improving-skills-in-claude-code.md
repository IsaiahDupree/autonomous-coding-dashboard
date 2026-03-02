# Self-Improving Skills in Claude Code
**Video**: https://www.youtube.com/watch?v=-4nUCaMNBR8  
**Channel**: @indydevdan  
**Researched**: 2026-03-01

---

## Core Problem Solved

Every Claude Code session starts from zero. Corrections made in one session are forgotten by the next. The same mistakes repeat forever. This is a fundamental LLM limitation — preferences aren't persisted and without some form of memory, you're repeating yourself forever.

**Core rule: Correct once, never again.**

---

## Key Concepts

### Self-Improving Skill Loop

A `reflect` skill that, when triggered, analyzes the current session context and:
1. Scans for correction signals, success patterns, and observations
2. Classifies each by confidence level
3. Proposes changes to the target SKILL.md
4. On approval → edits the file → commits to Git → pushes

### Confidence Levels

| Level | Trigger | Where Written |
|-------|---------|---------------|
| 🔴 **HIGH** | Direct correction, "never/always" language, explicit mistake | `## Rules (Never/Always)` section |
| 🟡 **MEDIUM** | Patterns that worked well, user approved without modification | `## Patterns (What Works)` section |
| 🔵 **LOW** | Single-session preference, context-specific | `## Observations (Review Later)` section |

### Two Modes

**Manual mode** — User calls `/reflect` or `just reflect` at any point:
- Interactive: shows proposed diff for review
- User can accept (Y), reject (n), or modify with natural language
- Full control over what gets written to SKILL.md

**Automatic mode** — Claude Code `stop` hook fires `stop-reflect.sh` on session end:
- Silent: shows one notification line when done
- Only processes HIGH and MEDIUM signals automatically
- LOW signals logged to `~/.claude/reflect-log.txt` only
- Controlled by `~/.claude/reflect-config.json` toggle

### Toggle Mechanism
```
reflect on   → enables auto mode
reflect off  → disables auto mode
reflect status → shows current config
```

### Git Version History

Every SKILL.md update commits with format:
```
reflect(skill-name): [HIGH/MEDIUM/LOW] <summary>

Signals: N HIGH, M MEDIUM, L LOW
Session: YYYY-MM-DD
```

This gives you a full history of how each skill evolved — you can see all the things the system learned over time, and roll back if needed.

---

## Architecture Insights

### Skills Are Markdown, Not Embeddings

Key insight from the video: because skills are plain markdown files, you get:
- Natural language readability (you can audit what the agent "knows")
- Git version control with full diff history
- Zero infrastructure complexity (no embeddings, no vector DB)
- Rollback with `git checkout HEAD~1 -- skills/my-skill/SKILL.md`

### Claude Code Hooks

The `stop` hook pattern binds a shell script to fire when Claude finishes:
```json
{
  "hooks": {
    "stop": ["~/.claude/hooks/stop-reflect.sh"]
  }
}
```

The script receives the session context and invokes the reflect mechanism.

### Scope of Reflection

Skills that can self-improve:
- `skills/*/SKILL.md` — individual skill pivot files
- `harness/prompts/*.md` — agent-specific executor prompts
- `harness/prompts/AGENTIC_BASE.md` — global agent behavioral rules
- Any markdown file referenced in the session

---

## ACTP Integration

### skill_improver.py

The Python implementation of the reflect engine:
- `reflect` command — manual mode with OpenAI extraction
- `reflect-auto` command — silent mode for stop hook
- `extract_signals_openai()` — GPT-4o-mini powered signal extraction
- `extract_signals_heuristic()` — fallback regex-based extraction
- `apply_signals_to_skill()` — writes signals to correct SKILL.md section
- `git_commit_skill()` — stages, commits, pushes changes
- `sync_to_actp_memory()` — maps signals to 3-layer Obsidian memory

### 3-Layer Memory Mapping

| Signal Confidence | ACTP Memory Target | Method |
|-------------------|-------------------|--------|
| HIGH | `~/.memory/vault/TACIT-KNOWLEDGE.md` | `memory_write_lesson(importance=8.5)` |
| MEDIUM | `~/.memory/vault/KNOWLEDGE-GRAPH.md` | `memory_write_knowledge()` + `memory_promote_candidates()` |
| LOW | `~/.memory/vault/DAILY-NOTES/YYYY-MM-DD.md` | `memory_write_daily_note()` |

### New Skill Directory

```
skills/self-improving-skills/
  SKILL.md                     ← pivot file
  justfile                     ← just reflect, reflect-on/off, reflect-status
  hooks/
    stop-reflect.sh            ← Claude Code stop hook
    reflect-config.json        ← config template (auto: false by default)
  sub-agents/
    reflect-manual.md          ← manual reflection sub-agent
    reflect-auto.md            ← automatic reflection sub-agent
```

---

## Key Quotes / Philosophy

> "Every conversation effectively starts from zero."

> "Your preferences aren't persisted and effectively without some form of memory you're going to be repeating yourself forever."

> "Corrections are all signals that could be good memories. Approvals are further confirmations."

> "The goal with this is to correct once and then never again."

> "You can see how those skills evolve over time and how your system gets smarter over time as you have conversations with it."

---

## Implementation Decisions for ACTP

1. **OpenAI extraction over pure heuristics** — GPT-4o-mini analyzes conversation text for signals more accurately than regex
2. **Auto mode off by default** — user starts manual, enables auto when confident in the reflect quality
3. **LOW signals never auto-committed** — only user review commits LOW observations
4. **Memory sync after every reflect** — HIGH signals go directly to TACIT-KNOWLEDGE.md so next session picks them up
5. **Git in both repos** — skills/ directory lives in the Software root (multi-repo), each skill tracked in its own path

---

## Files Created

- `skills/self-improving-skills/SKILL.md`
- `skills/self-improving-skills/justfile`
- `skills/self-improving-skills/sub-agents/reflect-manual.md`
- `skills/self-improving-skills/sub-agents/reflect-auto.md`
- `skills/self-improving-skills/hooks/stop-reflect.sh`
- `skills/self-improving-skills/hooks/reflect-config.json`
- `actp-worker/skill_improver.py`
- Updated `AGENTS.md` (added to skills table)
