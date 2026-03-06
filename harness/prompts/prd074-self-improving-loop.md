# Agent Prompt: Self-Improving Loop Module (PRD-074)

## Your mission
Add the `self_improve.py` module to the `company-orchestrator` repo. This module runs after every completed task: it reflects on what happened, extracts lessons, writes them to the 3-layer memory system, proposes prompt improvements, and generates follow-up tasks. This is what makes the system get smarter over time.

## Target repo
`/Users/isaiahdupree/Documents/Software/company-orchestrator`

Add files to the existing project. Do NOT recreate files already created by PRD-070/071/072.

## Files to create/modify
```
modules/reflector.py           ← Claude-powered reflection + lesson extraction (NEW)
modules/knowledge_writer.py    ← writes to 3-layer memory vault (NEW)
modules/prompt_evolver.py      ← proposes + applies diffs to prompt files (NEW)
modules/task_proposer.py       ← generates follow-up tasks from lessons (NEW)
self_improve.py                ← CLI entry point (NEW)
tests/test_self_improve.py     ← pytest tests (NEW)
```

## 3-Layer memory paths (already exist)
```python
MEMORY_VAULT = os.path.expanduser("~/.memory/vault")
DAILY_NOTES  = f"{MEMORY_VAULT}/DAILY-NOTES"          # Layer 2 — append daily
KNOWLEDGE    = f"{MEMORY_VAULT}/KNOWLEDGE-GRAPH.md"   # Layer 1 — structured facts
TACIT        = f"{MEMORY_VAULT}/TACIT-KNOWLEDGE.md"   # Layer 3 — rules/patterns
```

## Lesson schema
```python
@dataclass
class Lesson:
    insight: str          # one-sentence lesson
    category: str         # "engineering" | "marketing" | "ops" | "meta"
    confidence: int       # 1-5 (only apply to prompts if >= 4)
    affects_agent: str    # which agent's prompt this applies to
    source_task_id: str
    ts: str
```

## Prompt files to potentially evolve
```
/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/prompts/
```
Only update files in this directory. Always git commit with message: `refine(prompt): <lesson summary>`.

## Rollback guard
Before updating a prompt, snapshot the current version. After the next 5 tasks using that agent, compare success rate. If success rate drops >10%, git revert the prompt commit.

## CLI
```bash
python self_improve.py --reflect --task-id <id>   # replay reflection for a task
python self_improve.py --digest                    # generate weekly strategy digest
python self_improve.py --promote                   # run memory_promote_candidates()
python self_improve.py --status                    # show last 5 lessons + prompt changes
```

## PRD
See: `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/prd/PRD-074-SELF-IMPROVING-LOOP.md`

## Tests
`tests/test_self_improve.py`: test lesson schema validation, dedup logic, confidence threshold gating, knowledge writer (mock file I/O), task proposer output shape. Run: `python -m pytest tests/test_self_improve.py -x -q`.
