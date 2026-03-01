# Mission: PRD-203 — EverReach OS Claude Coding Agent (ECCA) with MCP Access

## Working Directory
`/Users/isaiahdupree/Documents/Software/actp-worker`

## Feature List
`/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/features/prd-203-claude-coding-agent.json`

## Goal
Build the **EverReach Claude Coding Agent (ECCA)** — a specialized sub-agent spawned from the `HybridOrchestrator` (PRD-200) that handles all client code work: $2K/mo retainer automation scripts, $2K+ Upwork projects, and batch generation of 21 Rork Expo apps. Uses Claude 3.5 Sonnet for planning/generation and Claude Haiku for cost-efficient evaluation. Connects as an MCP client to a suite of code-specific MCP servers for repo access, sandboxed execution, linting, and vector-DB code retrieval.

**Dependencies**: PRD-200 (`HybridOrchestrator`, `docker-compose.yml`, `VectorDB`), PRD-202 (`vector_db.py`, `embedder.py`).

## Architecture

```
HybridOrchestrator.spawn_coding_agent(task, client_id)
         ↓
   CodingAgent (Claude 3.5 Sonnet + Haiku)
         ↓
   MCPClientManager connects to:
   ┌─────────────────┬──────────────────┬────────────────────┐
   │ code-context    │ code-assistant   │ code-execution     │
   │ :8100           │ :8101            │ :8102 (sandboxed)  │
   ├─────────────────┼──────────────────┼────────────────────┤
   │ vector-code     │ linter           │ client-github      │
   │ :8103           │ :8104            │ :810X (per-client) │
   └─────────────────┴──────────────────┴────────────────────┘
         ↓
   Closed Loop: plan → retrieve → write → execute → lint → test → evaluate → iterate? → deliver → store
```

## Files to Create

```
coding_agent/
  __init__.py
  agent.py                 # CodingAgent: lifecycle, run_task(), spawn via HybridOrchestrator
  llm.py                   # Claude Sonnet planner + Haiku evaluator
  models.py                # CodeTask, TaskResult, SubTask dataclasses
  context.py               # CodeContext: rolling 20-action window, summarize old
  budget.py                # TokenBudget: track per-task, switch model at 70%
  mcp_client.py            # MCPClientManager: connect/disconnect/discover tools
  steps/
    plan.py                # plan_task() → subtasks + stack + approach
    retrieve.py            # retrieve_context() → similar snippets from vector-db MCP
    write.py               # write_code() with retrieved snippets as few-shot
    execute.py             # execute_code() via code-execution MCP sandbox
    lint.py                # lint_and_fix() via linter MCP (max 3 cycles)
    test.py                # generate_tests() + run_tests() via code-execution MCP
    evaluate.py            # evaluate_output() via Haiku → quality score
    deliver.py             # commit via GitHub MCP or bundle + ClientPortal upload

mcp_servers/
  code_context/
    server.py              # MCP server: list_files, read_file, search_code, get_structure
    Dockerfile
  code_assistant/
    server.py              # MCP server: generate_diff, apply_diff, create_file, refactor
    Dockerfile
  code_execution/
    server.py              # MCP server: run_python, run_node, run_bash (sandboxed)
    Dockerfile
  vector_code/
    server.py              # MCP server: store_snippet, search_similar, get_pattern
    Dockerfile
  linter/
    server.py              # MCP server: lint_js, lint_python, fix_lint
    Dockerfile
  client_github/
    server.py              # MCP server: per-client GitHub OAuth, clone/commit/pr
    Dockerfile
  mcp_servers.json         # Registry: server_name → {image, port, env_vars, capabilities}

client_manager.py          # create_client_mcp_config(), spin client GitHub server
retainer_tasks.py          # ContentAutomationTask for $2K/mo retainer work
upwork_webhook.py          # POST /webhooks/upwork → CodeTask → spawn CodingAgent
rork_batch.py              # batch_rork_apps(app_specs[21]) parallel generation
daily_code_loop.py         # APScheduler 09:00: process pending actp_code_tasks
batch_write.py             # batch_generate(subtasks[]) — single Claude call for 10+
vector_code.py             # embed_code_snippet, find_similar_code, pattern_library

k8s/mcp-servers/
  code-context-deployment.yaml
  code-assistant-deployment.yaml
  code-execution-deployment.yaml
  vector-code-deployment.yaml
  linter-deployment.yaml

docs/claude-coding-agent.md
tests/test_claude_coding_agent.py   # All tests marked @pytest.mark.prd203
```

## Supabase Migrations
```sql
CREATE TABLE IF NOT EXISTS actp_client_mcp_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL UNIQUE,
  github_token_encrypted text,
  repo_url text,
  mcp_server_port int,
  active bool DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS actp_code_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  title text NOT NULL,
  description text,
  stack text NOT NULL,  -- 'react-native', 'python', 'typescript', etc.
  status text NOT NULL DEFAULT 'pending',  -- pending|running|delivered|failed
  deliverable_url text,
  iterations int DEFAULT 0,
  quality_score numeric(3,1),
  tokens_used int,
  cost_usd numeric(8,4),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
```

## Key Implementation Details

### CodingAgent core
```python
class CodingAgent:
    STATES = ["IDLE", "PLANNING", "CODING", "TESTING", "DELIVERING", "ERROR", "FAILED"]

    async def run_task(self, task: CodeTask) -> TaskResult:
        self._set_state("PLANNING")
        plan = await plan_task(task, self.llm)

        self._set_state("CODING")
        results = []
        for subtask in plan.subtasks:
            snippets = await retrieve_context(subtask, self.mcp)
            code = await write_code(subtask, snippets, self.budget)
            code = await lint_and_fix(code, subtask.lang, self.mcp)
            exec_result = await execute_code(code, self.mcp)
            test_result = await run_tests(code, subtask.stack, self.mcp)
            quality = await evaluate_output(code, test_result, exec_result, self.llm)

            for attempt in range(3):
                if quality.score >= 7:
                    break
                code = await write_code(subtask, snippets, self.budget,
                                        issues=quality.issues)
                quality = await evaluate_output(code, test_result, exec_result, self.llm)

            results.append(CodeResult(subtask, code, quality))

        self._set_state("DELIVERING")
        deliverable = await deliver(results, task, self.mcp)
        await store_snippets(results, task.client_id, self.mcp)
        self._set_state("IDLE")
        return TaskResult(task, deliverable, results)
```

### MCP servers — all implement the MCP protocol (JSON-RPC over stdio/HTTP)
```python
# code_execution/server.py — sandboxed runner
async def run_python(code: str, timeout: int = 30) -> dict:
    container = docker.run(
        "python:3.12-slim",
        command=["python", "-c", code],
        network_mode="none",
        mem_limit="256m",
        cpu_quota=50000,
        remove=True,
        timeout=timeout,
    )
    return {"stdout": container.stdout, "stderr": container.stderr,
            "exit_code": container.exit_code, "passed": container.exit_code == 0}
```

### Batch generation (cost optimization)
```python
# batch_write.py — single call for 10 subtasks vs 10 calls
async def batch_generate(subtasks: list[SubTask], snippets_map: dict) -> list[str]:
    prompt = build_batch_prompt(subtasks, snippets_map)
    response = await claude_sonnet(prompt, response_format={"type": "json_array"})
    return [item["code"] for item in response]
    # ~80% token reduction vs sequential calls
```

### Upwork webhook → autonomous task
```python
@app.post("/webhooks/upwork")
async def upwork_webhook(payload: dict):
    task = CodeTask(
        client_id=payload["client_id"],
        title=payload["job_title"],
        description=payload["job_description"],
        stack=detect_stack(payload["job_description"]),
    )
    await supabase.table("actp_code_tasks").insert(task.dict())
    agent_id = await orchestrator.spawn_coding_agent(task, task.client_id)
    return {"agent_id": agent_id, "task_id": task.id, "eta_hours": 2}
```

## Rules
1. All tests in `tests/test_claude_coding_agent.py` marked `@pytest.mark.prd203`
2. MCP servers communicate via HTTP (not stdio) for Docker compatibility — use FastAPI as transport
3. `code-execution` server MUST use Docker-in-Docker isolation — never `exec()` on host
4. Claude API calls always go through `budget.py` — track every call to `actp_cost_log`
5. `client_github` server GitHub token stored encrypted — use `SYNC_ENCRYPTION_KEY` from PRD-200
6. All test mocks: MCP calls mocked via `unittest.mock.AsyncMock`, Claude calls via mock LLM

## Validation
```bash
python -m pytest tests/test_claude_coding_agent.py -v -m prd203

# Test MCP server starts
docker compose up code-context code-execution linter -d
curl http://localhost:8100/tools

# Test full task (mock mode)
python -m coding_agent.agent --task "Write a Python hello world" --dry-run
```

## Final Steps
Mark features `passes: true` per batch of 10. Commit:
```
git commit -m "feat(prd-203): EverReach OS Claude Coding Agent + MCP servers — XX/50 features"
```
