# PRD-009: OpenQualls Bot Reliability

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **PRD**: /docs/prd/PRD-009-OPENQUALLS-BOT-RELIABILITY.md
- **Priority**: P0 (CRITICAL)

## Context

The OpenQualls Telegram bot uses Claude CLI (haiku) for LLM responses. Tool calling works but is unreliable — the TOOL_CALL instruction gets buried in 8K+ char prompts. The `--system-prompt` CLI flag returns empty; everything must go via `-p`.

### Current Architecture
- `telegram_ai_engine.py` — core AI engine, Claude CLI subprocess calls
- `telegram_bot.py` — Telegram bot handlers
- `health_server.py` — HTTP API including `/api/test-prompt`
- `tests/telegram_live_test.py` — automated test harness for all 11 tools

### What Works
- Claude CLI via `-p` flag with `--output-format json`
- Conversational responses (no tool needed)
- Tool execution pipeline (_execute_tool)
- Follow-up Claude call to summarize tool results
- XML stripping from responses

### What's Broken
- Tool calling only works ~25% of the time (4/16 tests pass)
- Claude ignores TOOL_CALL instruction when prompt >5K chars
- Conversation history pollution between test runs
- No /reset command to clear history

## Task

Fix the OpenQualls bot tool calling to achieve ≥90% reliability:

1. **Trim SYSTEM_PROMPT** to ≤2000 chars — remove verbose API key listings, keep role + rules
2. **Compress tool definitions** to one-line format: `Tool: name — desc (params: p1, p2)`
3. **Add 2 few-shot examples** in system prompt showing TOOL_CALL usage
4. **Add /reset command** in telegram_bot.py to clear conversation history
5. **Auto-trim history** to last 6 messages per user
6. **Add retry logic** — if Claude returns empty, retry once with shorter prompt
7. **Add typing indicator** — sendChatAction("typing") while processing
8. **Run tests**: `python3 tests/telegram_live_test.py` — target ≥14/16 passing

## Testing

```bash
# Unit tests
python3 -m pytest tests/test_ai_engine.py -v

# Live bot test (requires running worker)
python3 tests/telegram_live_test.py

# Single test
python3 tests/telegram_live_test.py --test heartbeat
```

## Key Files
- `telegram_ai_engine.py` (lines 28-33: config, 1098-1144: tool prompt/parse, 1147-1192: _call_claude, 1221-1326: _chat_inner)
- `telegram_bot.py` (command handlers)
- `health_server.py` (line 273: /api/test-prompt)
- `tests/telegram_live_test.py` (full test harness)

## Constraints
- Do NOT switch away from Claude CLI — it uses ACD's OAuth (no extra API key)
- Model MUST be claude-haiku-4-5-20251001 (cheap, fast)
- Do NOT break existing 135 unit tests
- WORKER_SECRET required on /api/test-prompt endpoint
