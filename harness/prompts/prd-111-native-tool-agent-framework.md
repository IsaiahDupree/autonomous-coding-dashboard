# PRD-111: Native Tool Agent Framework (NTAF)

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **Feature List**: /Users/isaiahdupree/Documents/Software/actp-worker/prd-111-features.json
- **Priority**: P0 (CRITICAL — foundation for all domain agents PRD-112 through PRD-115)

## Context

All current agents in actp-worker use hardcoded Python logic to call APIs directly. This PRD implements a **Native Tool Agent Framework** where Claude (via the Anthropic API `tool_use` message format) is the decision-maker — Claude itself decides which tools to call, in what order, based on a goal. This mirrors ElizaOS's composable agent runtime and OpenClaw's hub-and-spoke pattern.

The framework:
1. Agent receives a goal string from the Cognitive Orchestrator (PRD-100)
2. Agent calls Anthropic API with `tools=[]` — tool schemas defining what it can do
3. Claude responds with `tool_use` blocks — choosing tools autonomously
4. Python executes the chosen tools, returns results
5. Results feed back to Claude as `tool_result` blocks
6. Loop continues until Claude says `end_turn` (goal achieved) or max iterations
7. Agent reports outcome back to orchestrator via Supabase
8. If agent crashes, AgentSpawner (PRD-101) auto-restarts it

## Architecture

```
NativeToolAgent (native_tool_agent.py) — BASE CLASS
      ├── ToolRegistry          — register/lookup Python functions by tool name
      ├── ClaudeToolRunner      — call Anthropic API with tools, handle tool_use loop
      ├── AgentMemory           — short-term (messages list) + long-term (Supabase)
      ├── SelfHealingMixin      — health check, error counting, auto-restart signal
      └── AgentReporter         — report outcomes to actp_agent_runs in Supabase
```

## Task

### ToolRegistry
1. `ToolRegistry.__init__()` — dict: tool_name → (handler_fn, schema_dict)
2. `ToolRegistry.register(name, fn, description, input_schema)` — add tool to registry
3. `ToolRegistry.get_tool_schemas()` — return list of Anthropic-format tool dicts for API call
4. `ToolRegistry.get_handler(tool_name)` — return Python function for a tool name
5. `ToolRegistry.list_tools()` — return list of registered tool names
6. `ToolRegistry.validate_schema(tool_name, input_dict)` — jsonschema validate tool inputs

### ClaudeToolRunner
7. `ClaudeToolRunner.__init__(model, system_prompt, registry, max_iterations=20)` — init with model + registry
8. `ClaudeToolRunner.run(goal, initial_context=None)` — main loop: goal → tool calls → results → repeat
9. `ClaudeToolRunner._build_initial_message(goal, context)` — format first user message
10. `ClaudeToolRunner._call_claude(messages)` — POST to Anthropic API with tools, return response
11. `ClaudeToolRunner._extract_tool_calls(response)` — parse tool_use blocks from response content
12. `ClaudeToolRunner._execute_tool(tool_name, tool_input)` — call registered handler, catch exceptions
13. `ClaudeToolRunner._build_tool_results(tool_calls, results)` — format tool_result blocks for next message
14. `ClaudeToolRunner._is_done(response)` — True if stop_reason == 'end_turn' or no tool_use blocks
15. `ClaudeToolRunner.get_final_text(response)` — extract final text response from Claude
16. `ClaudeToolRunner._handle_tool_error(tool_name, error)` — return error tool_result, log

### AgentMemory
17. `AgentMemory.__init__(agent_id)` — init short-term (messages list) + Supabase client
18. `AgentMemory.add_message(role, content)` — append to short-term messages list
19. `AgentMemory.get_messages()` — return full messages list for API call
20. `AgentMemory.trim_messages(max_tokens=50000)` — remove oldest messages to stay in context
21. `AgentMemory.save_to_supabase(run_id, key, value)` — persist important facts to actp_agent_memory
22. `AgentMemory.load_from_supabase(agent_id, key)` — retrieve persisted facts
23. `AgentMemory.save_run_summary(run_id, goal, outcome, tools_used)` — store run summary

### SelfHealingMixin
24. `SelfHealingMixin.increment_error_count()` — track consecutive errors
25. `SelfHealingMixin.reset_error_count()` — reset on success
26. `SelfHealingMixin.is_unhealthy(threshold=5)` — True if consecutive errors >= threshold
27. `SelfHealingMixin.request_restart()` — write restart signal to actp_agent_registry
28. `SelfHealingMixin.health_check()` — return dict: status, error_count, last_run_at, uptime

### AgentReporter
29. `AgentReporter.start_run(agent_id, goal)` — insert run row in actp_agent_runs, return run_id
30. `AgentReporter.update_run(run_id, status, tools_used, iterations)` — update run row
31. `AgentReporter.complete_run(run_id, outcome, duration_ms)` — mark run complete
32. `AgentReporter.fail_run(run_id, error, iterations)` — mark run failed, trigger self-heal check
33. `AgentReporter.get_run_history(agent_id, limit=10)` — recent runs for an agent

### NativeToolAgent Base Class
34. `NativeToolAgent.__init__(agent_id, model, system_prompt)` — wire up all components
35. `NativeToolAgent.register_tool(name, fn, description, input_schema)` — delegate to ToolRegistry
36. `NativeToolAgent.run(goal, context=None)` — orchestrate: start_run → claude_loop → complete_run
37. `NativeToolAgent.run_as_daemon(poll_interval=30)` — asyncio loop: poll actp_agent_tasks for goals, run each
38. `NativeToolAgent.get_next_task()` — claim task from actp_agent_tasks WHERE agent_type=self.agent_type
39. `NativeToolAgent.report_health()` — update actp_agent_registry with health_check() result

### Supabase Tables
40. Migration `actp_agent_runs` — id, agent_id, agent_type, goal, status, tools_used jsonb, iterations, outcome text, duration_ms, started_at, completed_at
41. Migration `actp_agent_memory` — agent_id, key, value text, updated_at (dedup on agent_id, key)
42. Migration `actp_agent_tasks` — id, agent_type, goal, context jsonb, status, priority, created_at, claimed_at, completed_at
43. Migration `actp_tool_call_log` — run_id FK, tool_name, tool_input jsonb, tool_result text, duration_ms, called_at, success bool
44. `create_task(agent_type, goal, context, priority)` — insert into actp_agent_tasks (called by Orchestrator PRD-100)
45. `claim_task(agent_type)` — atomic UPDATE SET status='claimed' WHERE status='pending' AND agent_type=X LIMIT 1

### Environment Variables
46. `ANTHROPIC_API_KEY` — Anthropic API key (already exists in .env)
47. `NATIVE_AGENT_MODEL` — default model (claude-opus-4-5 for orchestrators, claude-sonnet-4-5 for domain agents)
48. `NATIVE_AGENT_MAX_ITERATIONS` — default 20, override per agent (default: 20)

### Health Server Routes
49. `GET /api/native-agents/status` — all agents: agent_id, type, status, last_run_at, error_count
50. `GET /api/native-agents/:agent_id/runs` — run history for specific agent
51. `POST /api/native-agents/task` — create task for an agent (used by orchestrator)
52. `GET /api/native-agents/tool-calls` — recent tool calls across all agents

### Tests
53. `test_tool_registry_registers_and_retrieves()` — register tool, verify schema + handler returned
54. `test_claude_tool_runner_executes_single_tool()` — mock Anthropic response with tool_use, verify tool called
55. `test_claude_tool_runner_loop_until_end_turn()` — mock 3 tool calls then end_turn, verify 3 executions
56. `test_agent_memory_trim_long_context()` — add 100 messages, trim to 50K tokens, verify trimmed
57. `test_self_healing_requests_restart_after_threshold()` — 5 errors, verify restart signal sent
58. `test_agent_reporter_complete_run_lifecycle()` — start → update → complete, verify all DB rows

## Key Files
- `native_tool_agent.py` (new — base class used by PRD-112 through PRD-115)
- `tool_registry.py` (new — tool registration + schema management)
- `worker.py` (register all 4 domain agents in daemon)
- `health_server.py` (add /api/native-agents routes)

## Testing
```bash
python3 native_tool_agent.py --test  # run self-test with mock tools
python3 -m pytest tests/test_native_tool_agent.py -v
```
