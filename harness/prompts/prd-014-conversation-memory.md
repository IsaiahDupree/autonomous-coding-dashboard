# PRD-014: Conversation Memory Subsystem

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **PRD**: /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/prd/PRD-014-CONVERSATION-MEMORY-SUBSYSTEM.md
- **Priority**: P-1 (agent-core)

## Context

Conversation history in telegram_ai_engine.py is currently ad-hoc raw message arrays. It is not persisted across restarts, not managed with summarization, and not crash-safe (only saved on graceful shutdown). The agent feels amnesiac on restart and suffers token bloat as conversations grow.

### Current Architecture
- `telegram_ai_engine.py` — holds raw `conversation_history` dict per user_id in memory
- `telegram_bot.py` — Telegram command handlers
- No persistent conversation store across restarts

### Target Architecture
```
agent/memory/
  conversation_store.py          # SQLite-backed raw turn append-log
  conversation_state_manager.py  # SessionState: topics, open loops, clarifications
  conversation_summarizer.py     # compress N turns → summary delta (no LLM dep)
  conversation_retriever.py      # picks context by recency + relevance + open-loop
  conversation_checkpoint.py     # save/load ConversationCheckpointSnapshot per session
  conversation_context_builder.py # assembles ConversationContextPacket
```

### DB Tables to Create (Supabase)
- `conversation_sessions` — one row per session (metadata, state, rolling_summary)
- `conversation_turns` — append-only raw turn log (user_text, assistant_text, intent, action_name, job_refs)

## Task

Implement the Conversation Memory Subsystem as described in PRD-014:

1. **Create conversation_store.py** — SQLite + Supabase dual-write append log for turns
2. **ConversationTurn dataclass** — turn_id, session_id, user_text, assistant_text, intent, action_name, job_refs[], created_at
3. **Create conversation_sessions + conversation_turns Supabase tables** via migration
4. **Create conversation_state_manager.py** — SessionState with active_topics, pending_clarifications, open_loops, rolling_summary
5. **Create conversation_summarizer.py** — compress N turns into rolling summary delta (heuristic, no LLM call)
6. **Create conversation_retriever.py** — score and pick which context to inject
7. **Create conversation_checkpoint.py** — JSON snapshot per session, autosave after every turn
8. **Create conversation_context_builder.py** — assemble ConversationContextPacket
9. **Integrate into telegram_ai_engine.py** — replace raw history arrays with ConversationStore reads, inject ConversationContextPacket on startup
10. **Crash-recovery**: on restart, load latest checkpoint and resume

## Testing

```bash
# Unit tests
python3 -m pytest tests/ -v -k "conversation or memory"

# Full test suite (must not regress)
python3 -m pytest tests/ -v

# Live bot test
python3 tests/telegram_live_test.py
```

## Key Files
- `telegram_ai_engine.py` — replace conversation_history dict with ConversationStore
- `agent/memory/` directory (create if not exists)
- `migrations/` or apply via Supabase MCP

## CRITICAL: Feature Tracking

After completing each task, update `prd-014-features.json` in the project root:

```bash
python3 -c "
import json
with open('prd-014-features.json') as f: data = json.load(f)
for feat in data['features']:
    if feat['id'] == 'MEM-001': feat['passes'] = True
with open('prd-014-features.json', 'w') as f: json.dump(data, f, indent=2)
print('Updated MEM-001 to passes=true')
"
```

Do this for EVERY feature you complete.

## Git Workflow

```bash
git add -A && git commit -m "feat(prd-014): <description>"
```

## Constraints
- Do NOT break existing tests (currently 308+)
- SQLite path: `~/.actp/conversation_memory.db`
- Supabase project: ivhfuhxorppptyuofbgq
- No mock data — all DB operations must be real
