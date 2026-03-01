# PRD-122: Claude Code Agent Launcher

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **Feature List**: /Users/isaiahdupree/Documents/Software/actp-worker/prd-122-features.json
- **Depends On**: PRD-111 (NativeToolAgent base), PRD-116 (Worker Daemon), PRD-121 (MCP Registry)
- **Priority**: P0 — this IS the terminal; it spawns Claude Code sessions with full native tool calling + MCP

## Context

The architecture requires a **terminal** that can spin up Claude Code agents on demand. "Claude Code" here means the `claude` CLI tool (`claude-code`) which runs an interactive coding agent session with:
- Native tool calling (Bash, file read/write, web fetch built-in)
- MCP server connectivity (via `--mcp-config` flag)
- Domain-specific system prompts (via `--system-prompt` flag)
- Non-interactive programmatic mode (via `--print` flag for one-shot tasks)

The `ClaudeCodeAgentLauncher` is the **main terminal** of EverReach OS. It:
1. Receives a task from `actp_agent_tasks` (dispatched by PRD-117 Task Bridge)
2. Builds a `claude` CLI invocation with the correct MCP config + system prompt + goal
3. Spawns it as an asyncio subprocess
4. Streams output (captures tool calls, status updates) to Supabase
5. Returns the result back via the Task Bridge

This means **any** domain agent can be powered by a live Claude Code session — not just the Python wrapper agents in PRD-112 to PRD-120, but full interactive coding agents that can write files, run bash, search the web, and call any MCP tool in the registry.

## Architecture

```
ClaudeCodeAgentLauncher (claude_launcher.py)
    ├── MCPConfigBuilder    — build .mcp.json for a given agent domain
    ├── SystemPromptBuilder — compose domain-specific system prompt file
    ├── AgentSession        — one running `claude` subprocess with I/O streaming
    ├── SessionPool         — manage N concurrent sessions (max per domain)
    ├── OutputParser        — parse claude --print JSON output: tool_uses + result
    ├── SessionLogger       — stream session events to actp_claude_sessions
    └── LauncherHealthRoute — GET /api/launcher/sessions

Terminal spawn pattern:
    claude \
      --print \
      --output-format json \
      --system-prompt /tmp/domain-prompt-{agent_type}.md \
      --mcp-config /tmp/mcp-config-{agent_type}.json \
      --allowedTools "Bash,Read,Write,WebFetch,mcp__*" \
      "{goal}"
```

## Task

### MCPConfigBuilder
1. `MCPConfigBuilder.build_for_domain(agent_type)` — SELECT active MCP servers for domain from actp_mcp_registry via MCPRegistry.get_servers_for_domain(), return MCP config dict
2. `MCPConfigBuilder.to_json(config_dict)` — serialize to `.mcp.json` format:
   ```json
   {
     "mcpServers": {
       "server-name": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-github"],
         "env": {"GITHUB_PERSONAL_ACCESS_TOKEN": "..."}
       }
     }
   }
   ```
3. `MCPConfigBuilder.write_temp_config(agent_type, config_dict)` — write to `/tmp/mcp-config-{agent_type}.json`, return path
4. `MCPConfigBuilder.inject_env_vars(config_dict)` — substitute `{ENV_VAR}` placeholders in config with os.environ values
5. `MCPConfigBuilder.get_tool_allowlist(agent_type)` — return comma-separated allowed tools string:
   - All agents: `Bash,Read,Write,WebFetch`
   - social-media-agent: `+mcp__brave-search__brave_web_search,mcp__playwright__navigate`
   - acquisition-agent: `+mcp__github__search_repositories,mcp__slack__send_message`
   - revenue-agent: `+mcp__stripe__get_customer,mcp__stripe__list_payments`
   - content-agent: `+mcp__brave-search__brave_web_search,mcp__filesystem__write_file`
   - product-agent: `+mcp__stripe__create_coupon,mcp__github__create_issue`

### SystemPromptBuilder
6. `SystemPromptBuilder.build_for_domain(agent_type)` — SELECT system_prompt FROM actp_agent_prompts WHERE agent_type=X AND active=true (PRD-120 manages these)
7. `SystemPromptBuilder.add_mcp_tool_descriptions(prompt, mcp_tools)` — append section listing available MCP tools with their descriptions, so Claude knows what to call
8. `SystemPromptBuilder.add_task_context(prompt, task_context)` — append task-specific context dict as structured section
9. `SystemPromptBuilder.write_temp_prompt(agent_type, prompt_text)` — write to `/tmp/domain-prompt-{agent_type}.md`, return path
10. `SystemPromptBuilder.get_everreach_base_prompt()` — shared base context injected into all agent prompts:
    ```
    You are an agent in the EverReach OS — an autonomous revenue and audience growth system.
    Business goals: $5K+/month revenue (March 2026), 1M followers per platform, 100K+ avg views.
    AI cost constraint: $400/month total. Batch all generation (10+ pieces per call).
    Always act toward these goals. Log all actions. Complete tasks fully without asking.
    ```

### AgentSession
11. `AgentSession.__init__(agent_type, goal, context, task_id)` — store params, build MCP config + prompt paths
12. `AgentSession.start()` — asyncio subprocess:
    ```python
    cmd = [
      "claude", "--print", "--output-format", "json",
      "--system-prompt", prompt_path,
      "--mcp-config", mcp_config_path,
      "--allowedTools", tool_allowlist,
      goal
    ]
    proc = await asyncio.create_subprocess_exec(*cmd, stdout=PIPE, stderr=PIPE)
    ```
13. `AgentSession.stream_output()` — asyncio: read stdout lines, parse JSON chunks (tool_use, text, result), yield events
14. `AgentSession.wait_for_completion(timeout=300)` — await proc.wait() with timeout, return {returncode, stdout, stderr}
15. `AgentSession.get_tool_uses()` — parse all tool_use events from streamed output, return list of {tool_name, input, output}
16. `AgentSession.get_final_result()` — parse last result block from JSON output stream
17. `AgentSession.cancel()` — proc.terminate(), await proc.wait()
18. `AgentSession.get_cost_estimate()` — parse usage block from claude output: input_tokens + output_tokens → cost via model pricing

### SessionPool
19. `SessionPool.MAX_CONCURRENT` — dict: {agent_type: max_sessions} default 2 per domain, 1 for content-agent (cost control)
20. `SessionPool.acquire(agent_type)` — asyncio semaphore per agent_type, await slot
21. `SessionPool.release(agent_type)` — release semaphore slot
22. `SessionPool.get_active_count(agent_type)` — current running sessions
23. `SessionPool.get_all_active()` — {agent_type: count} across all domains
24. `SessionPool.run_session(agent_type, goal, context, task_id)` — acquire → AgentSession.start() → stream → release, return result

### OutputParser
25. `OutputParser.parse_json_stream(stdout_bytes)` — parse newline-delimited JSON events from `claude --output-format json` stream
26. `OutputParser.extract_tool_uses(events)` — filter events where type='tool_use', return list
27. `OutputParser.extract_result(events)` — find last event where type='result', return text content
28. `OutputParser.extract_usage(events)` — find usage event: {input_tokens, output_tokens, cache_read, cache_creation}
29. `OutputParser.detect_error(events, returncode)` — if returncode != 0 or any error event, return error message

### SessionLogger
30. `SessionLogger.log_start(session_id, agent_type, goal, task_id)` — INSERT actp_claude_sessions: id, agent_type, goal, task_id FK, status='running', started_at
31. `SessionLogger.log_tool_use(session_id, tool_name, input_summary, output_summary)` — INSERT actp_claude_tool_uses: session_id, tool_name, input_summary, output_summary, called_at
32. `SessionLogger.log_completion(session_id, result, tool_use_count, tokens_in, tokens_out, cost_usd)` — UPDATE actp_claude_sessions: status='completed', result, tool_use_count, tokens_in, tokens_out, cost_usd, completed_at
33. `SessionLogger.log_failure(session_id, error)` — UPDATE status='failed', error_message, completed_at

### Launcher (main integration)
34. `ClaudeCodeAgentLauncher.launch(agent_type, goal, context, task_id, priority)` — full pipeline:
    1. Build MCP config for domain → write to /tmp
    2. Build + write system prompt
    3. SessionPool.acquire(agent_type)
    4. AgentSession.start() → stream_output()
    5. SessionLogger.log_tool_uses as they stream
    6. wait_for_completion(timeout=300)
    7. SessionLogger.log_completion()
    8. POST result back via TaskBridge.complete_task(task_id, result)
    9. SessionPool.release()
35. `ClaudeCodeAgentLauncher.launch_from_queue()` — poll actp_agent_tasks for pending tasks, dispatch to launch() for each
36. `ClaudeCodeAgentLauncher.launch_batch(tasks_list)` — asyncio.gather N sessions up to SessionPool limits
37. `ClaudeCodeAgentLauncher.get_session_history(agent_type, limit=20)` — SELECT from actp_claude_sessions
38. `ClaudeCodeAgentLauncher.estimate_cost(agent_type, goal_length)` — heuristic: goal_length * 2 input tokens + expected tool calls * 500 tokens, return estimated $

### Integration with Worker Daemon (PRD-116)
39. `worker.py` modification: add `ClaudeCodeAgentLauncher` as additional task handler alongside Python domain agents. Tasks with `use_claude_code=true` in context get routed to launcher instead of Python agent
40. `DailyRoutineScheduler` modification: add `launch_from_queue()` coroutine to async tasks in worker event loop

### Supabase Migrations
41. Migration: `actp_claude_sessions` — id uuid PK, agent_type text, goal text, task_id uuid FK actp_agent_tasks, status text, result text, tool_use_count int, tokens_in int, tokens_out int, cost_usd numeric(8,4), error_message text, mcp_servers_used text[], started_at, completed_at
42. Migration: `actp_claude_tool_uses` — id uuid PK, session_id uuid FK actp_claude_sessions, tool_name text, source text (native/mcp), input_summary text, output_summary text, called_at timestamptz
43. Add column to `actp_agent_tasks`: `use_claude_code bool default false`, `claude_session_id uuid FK actp_claude_sessions`

### Health Routes
44. `GET /api/launcher/sessions` — active sessions by agent_type, last 10 completed with costs
45. `GET /api/launcher/stats` — total sessions today, total cost today, avg duration, tool use distribution
46. `GET /api/launcher/mcp-config/:agent_type` — current MCP config for an agent type (for debugging)
47. `POST /api/launcher/launch` — manually launch a Claude Code session: {agent_type, goal, context}

### Tests
48. `test_mcp_config_builder_generates_valid_json()` — mock registry returning 2 servers, verify output is valid .mcp.json with mcpServers key
49. `test_system_prompt_includes_mcp_tool_descriptions()` — verify prompt text contains MCP tool names from registry
50. `test_agent_session_parses_tool_uses_from_stream()` — mock claude JSON output with 2 tool_use events, verify extracted correctly
51. `test_session_pool_limits_concurrent_sessions()` — mock MAX_CONCURRENT=1, try 2 simultaneous sessions, verify 2nd waits
52. `test_launcher_logs_cost_to_anthropic_cost_log()` — mock session completion with token counts, verify anthropic_cost_log row inserted
53. `test_launch_from_queue_dispatches_claude_code_tasks()` — seed task with use_claude_code=true, verify AgentSession.start() called

## Claude Code CLI Requirements
- **Install**: `npm install -g @anthropic-ai/claude-code` (or `pip install claude-code`)
- **Auth**: `ANTHROPIC_API_KEY` in environment
- **Version**: requires claude-code >= 1.0 (supports `--output-format json` and `--mcp-config`)
- **MCP flag**: `--mcp-config /path/to/.mcp.json` — loads all listed servers before session

## Environment Variables
- `CLAUDE_CODE_BIN` — path to claude binary (default: `claude`, assumes in PATH)
- `CLAUDE_CODE_MODEL` — model to use (default: `claude-sonnet-4-5`, override with `claude-opus-4-5` for complex tasks)
- `CLAUDE_CODE_MAX_CONCURRENT` — default max concurrent sessions (default: 2)
- `CLAUDE_CODE_SESSION_TIMEOUT` — max seconds per session (default: 300)
- `ENABLE_CLAUDE_CODE_LAUNCHER=true`
