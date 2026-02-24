# PRD-009: OpenQualls Bot Reliability & Tool Calling

## Priority: P0 (CRITICAL — blocks all other automation)
## Target: actp-worker
## Status: IN PROGRESS

---

## Problem Statement

The OpenQualls Telegram bot is the **primary human interface** to the entire ACTP + ACD ecosystem. It currently uses Claude CLI (haiku) for LLM responses with a prompt-based TOOL_CALL format. The bot can respond conversationally but **tool calling is unreliable** — Claude sometimes ignores the TOOL_CALL instruction when the prompt is too long, returning empty responses after XML stripping.

Without reliable tool calling, the bot cannot:
- Run heartbeat checks
- Dispatch ACTP topics (121 service topics)
- Delegate coding tasks to ACD
- Pull platform stats or revenue data
- Manage coding sessions

## Root Causes (Diagnosed)

1. **Conversation history pollution** — accumulated messages for test user IDs cause Claude to see stale context and skip tools
2. **Prompt structure** — TOOL_CALL instruction gets buried in 8K+ char prompts (system + tools + history + instruction)
3. **No conversation reset** — no way to clear history per user; test runs contaminate future runs
4. **CLI subprocess overhead** — Claude CLI via `-p` takes 3-10s per call; follow-up calls double latency
5. **`--system-prompt` flag broken** — returns empty with current Claude CLI version; must embed in `-p`

## Requirements

### R1: Reliable Tool Calling (MUST HAVE)
- Claude MUST emit `TOOL_CALL: {"name": "...", "arguments": {...}}` when the user's request needs data or action
- Tool call detection rate must be ≥95% across all 11 tool types
- Conversational requests (greetings, questions) must NOT trigger tool calls

### R2: Conversation Management (MUST HAVE)
- `/reset` command to clear conversation history
- Auto-trim history to last 6 messages (3 user + 3 assistant)
- Unique user session isolation (no cross-contamination)
- History entries must include timestamps for staleness detection

### R3: Prompt Engineering (MUST HAVE)
- System prompt ≤2000 chars (trim from current 3622)
- Tool definitions ≤2000 chars (trim from current 4759 — use concise format)
- TOOL_CALL instruction placed at END of user prompt (closest to generation)
- Few-shot example in system prompt showing correct TOOL_CALL usage

### R4: Response Quality (MUST HAVE)
- No raw XML `<function=...>` in responses
- No raw `TOOL_CALL:` lines in responses
- No empty responses — always return meaningful text
- Tool results summarized by Claude follow-up call
- Fallback: if follow-up fails, return formatted tool result directly

### R5: Performance (SHOULD HAVE)
- First response (no tool) in ≤5s
- Tool call + follow-up in ≤15s
- Increase CHAT_TIMEOUT to 35s
- Show "typing" indicator in Telegram while processing

### R6: Test Harness (MUST HAVE)
- `/api/test-prompt` endpoint on health server (port 8765)
- `tests/telegram_live_test.py` — automated test for all 11 tools + conversational
- Unique user_id per test to prevent history pollution
- ≥90% pass rate across all test prompts
- Mac Telegram osascript integration for visual confirmation

## Implementation Plan

### Phase 1: Prompt Optimization
1. Trim SYSTEM_PROMPT to ≤2000 chars (remove verbose descriptions, keep role + rules)
2. Compress tool definitions to one-line format: `Tool: name — description (params: p1, p2)`
3. Add 2 few-shot examples in system prompt:
   - User asks "check system health" → TOOL_CALL: dispatch_actp_topic
   - User asks "hello" → conversational response (no TOOL_CALL)
4. Move TOOL_CALL instruction to END of user message portion

### Phase 2: Conversation Fixes
1. Add `/reset` command handler in telegram_bot.py
2. Implement auto-trim: keep only last 6 messages per user
3. Add `clear_history(user_id)` function to telegram_ai_engine.py
4. Truncate assistant messages in history to 200 chars max

### Phase 3: Response Pipeline Hardening
1. Add retry logic: if Claude returns empty, retry once with simplified prompt
2. If tool execution returns error, format error message instead of empty
3. Increase tool execution timeout to 15s (some tools hit Supabase/Safari)
4. Add "thinking..." typing indicator via Telegram sendChatAction

### Phase 4: Test Suite
1. Fix `tests/telegram_live_test.py` to use unique user_ids (DONE)
2. Add all 11 tool types + conversational test
3. Target: 14/16 tests passing (≥87.5%)
4. Add `--telegram` flag for osascript visual testing

## Success Criteria

| Metric | Target |
|--------|--------|
| Tool call detection rate | ≥95% (15/16 test prompts) |
| Response time (no tool) | ≤5s |
| Response time (with tool) | ≤15s |
| Empty response rate | 0% |
| XML/TOOL_CALL leak rate | 0% |
| Test suite pass rate | ≥87.5% |

## Files to Modify

- `telegram_ai_engine.py` — prompt optimization, conversation management, retry logic
- `telegram_bot.py` — /reset command, typing indicator
- `health_server.py` — /api/test-prompt endpoint (DONE)
- `tests/telegram_live_test.py` — full test harness (DONE, needs fixes)
- `tests/test_ai_engine.py` — unit tests for new functions

## Dependencies

- Claude CLI at `/opt/homebrew/bin/claude` (installed, OAuth working)
- Model: `claude-haiku-4-5-20251001`
- Telegram Bot Token in `.env`
- All ACTP services running (for tool execution)
