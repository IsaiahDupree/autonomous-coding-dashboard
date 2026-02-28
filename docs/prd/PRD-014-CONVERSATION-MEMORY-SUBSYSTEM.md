# PRD-014: Conversation Memory Subsystem

**Status:** Active  
**Priority:** P-1 (agent-core)  
**Target repo:** `agent-core` — `agent/memory/conversation_*.py`  

---

## 1. Problem

Conversation history is currently treated as ad-hoc raw message arrays inside `telegram_adapter.py` and `telegram_ai_engine.py`. It is:

- Not persisted systematically across restarts
- Not managed with the same discipline as episodic/semantic/procedural memory
- Not retrievable as curated context — the full raw buffer is injected on every request
- Not connected to the broader memory system (no summarization, no promotion)
- Not crash-safe (only saved on graceful shutdown)

This causes the agent to feel amnesiac on restart and to suffer token bloat / context noise as conversations grow.

---

## 2. Goal

Implement **conversation history as a first-class managed memory lane** inside `agent-core`, with:

- Formal subsystem modules alongside episodic/semantic/procedural/reflective memory
- Layered storage (raw turns → turn summaries → session summary → promotion candidates)
- Autosave after every turn (crash-safe, not just on-shutdown)
- Curated `ConversationContextPacket` injected at startup and optionally per-request
- Clean separation: **session memory lane** (continuity) vs **long-term memory** (distilled knowledge)

---

## 3. Architecture

### 3.1 New modules

```
agent/memory/
  conversation_store.py          # raw turn append-log + rolling summary (SQLite-backed)
  conversation_state_manager.py  # session state: topics, open loops, pending clarifications
  conversation_summarizer.py     # compress N turns → summary delta; lightweight, no LLM dep
  conversation_retriever.py      # picks what context to inject (recency + relevance + open-loop)
  conversation_checkpoint.py     # save/load ConversationCheckpointSnapshot (JSON file per session)
  conversation_context_builder.py # assembles ConversationContextPacket from all sources
```

### 3.2 New DB tables (migration added to `schema.sql`)

```sql
conversation_sessions   — one row per session (metadata, state, summary)
conversation_turns      — raw turn log (append-only, one row per user+assistant exchange)
```

### 3.3 Canonical contracts

#### `ConversationTurn`
- `turn_id`, `session_id`, `user_text`, `assistant_text`, `intent`, `action_name`, `job_refs[]`, `created_at`

#### `SessionState`
- `session_id`, `status` (`active|paused|resuming|awaiting_clarification|shutdown_clean`)
- `active_topics[]`, `pending_clarifications[]`, `open_loops[]`, `active_job_refs[]`
- `rolling_summary`, `last_intent`, `last_response_type`, `turn_count`

#### `ConversationContextPacket`
- `conversation_id`, `session_status`
- `recent_turn_summaries[]` (last N turns, compressed)
- `rolling_session_summary`
- `active_topics[]`, `active_job_refs[]`, `pending_clarifications[]`, `open_loops[]`
- `resolved_entities_map{}` (e.g. "that task" → job_id)
- `last_response_type`, `context_compiled_at`

#### `ConversationCheckpointSnapshot`
- Full restorable state: session_state + last K turns + summary delta
- Written after every turn + on shutdown

---

## 4. Implementation phases

### Phase 1 — Raw persistence + autosave (minimum useful)
- `conversation_store.py`: append turns to SQLite, maintain rolling summary
- `conversation_checkpoint.py`: JSON file per session, written after every turn
- `conversation_context_builder.py`: assemble packet from last N turns + summary
- Wire into `telegram_adapter.py` `on_turn()` call

### Phase 2 — State management + open loops
- `conversation_state_manager.py`: track active topics, pending clarifications, open loops, job refs
- Extend `ConversationContextPacket` with state fields
- `conversation_retriever.py`: recency + relevance + open-loop priority scoring

### Phase 3 — Summarization + long-term memory promotion
- `conversation_summarizer.py`: lightweight keyword/phrase-based compression (no LLM dep in v1)
- Promotion gate: extract memory candidates after every N turns → `write_if_worthy()`
- Compression policy: summarize every 10 turns; keep last 3 raw turns always

---

## 5. Startup hydration sequence

1. Boot runtime, open DB
2. Load latest `ConversationCheckpointSnapshot` for session
3. Load recent turns window (last 3 raw + rolling summary)
4. Load active job refs + latest progress
5. Build `ConversationContextPacket`
6. Warm interpreter/concierge with packet
7. Mark session `status = resuming`

## 6. Shutdown persistence sequence

1. Flush pending turn to store
2. Write final rolling summary delta
3. Update `SessionState` (topics, open loops, pending clarifications)
4. Write `ConversationCheckpointSnapshot`
5. Emit long-term memory candidates (gated)
6. Mark `status = shutdown_clean`
7. Close stores

## 7. Autosave (crash-safe)

- After every turn: write checkpoint
- If process dies: startup reads latest checkpoint + turn log tail
- No reliance on graceful shutdown hooks

---

## 8. What NOT to do

- Do not inject full raw transcript on every request (token bloat)
- Do not promote every chat detail to long-term memory (noise)
- Do not use an LLM for summarization in v1 (keep it fast, deterministic, offline)

---

## 9. Test requirements

- Unit tests for all 6 modules in `tests/test_conversation_memory.py`
- Tests cover: append turn, load session, build packet, checkpoint round-trip, retriever scoring
- All 460 existing agent-core tests must continue to pass

---

## 10. Files modified / created

| File | Action |
|------|--------|
| `agent/db/schema.sql` | Add `conversation_sessions` + `conversation_turns` tables |
| `agent/utils/ids.py` | Add `session_id()`, `turn_id()` |
| `agent/memory/conversation_store.py` | NEW |
| `agent/memory/conversation_state_manager.py` | NEW |
| `agent/memory/conversation_summarizer.py` | NEW |
| `agent/memory/conversation_retriever.py` | NEW |
| `agent/memory/conversation_checkpoint.py` | NEW |
| `agent/memory/conversation_context_builder.py` | NEW |
| `agent/memory/schemas.py` | Add `ConversationTurn`, `SessionState`, `ConversationContextPacket`, `ConversationCheckpointSnapshot` |
| `agent/memory/writer.py` | Add `write_conversation_turn()` |
| `tests/test_conversation_memory.py` | NEW |
