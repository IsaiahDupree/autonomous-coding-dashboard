# Claude Agent SDK Implementation — actp-worker

## Mission
Implement the `claude-agent-sdk` integration into the `actp-worker` system as specified in:
- `docs/prd/PRD-SDK-INTEGRATION-MAP.md` (6 integration points — full code provided)
- `docs/prd/PRD-CLAUDE-AGENT-SDK-CLIENT-WORK-SYSTEM.md` (pipeline architecture)

Target repo: `/Users/isaiahdupree/Documents/Software/actp-worker`

## Context
The `actp-worker` already has:
- `worker.py` line ~465: `if CLAUDE_CODE_AVAILABLE: loops.append(claude_code_launcher_loop())`
- `agent_swarm.py`: 6-role swarm, `AGENT2_ENGINES` dict, `SelfHealingLoop`, `claude_code_unstructured` engine
- `workflow_executors.py`: 17 executors registered via `register_all()`
- `dual_agent.py`: `ExecutionResult`, `TaskPacket` types
- `config.py`: central config with env vars
- `supabase` client available via `create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY)`

The SDK is already installed:
```bash
/Users/isaiahdupree/Documents/Software/NanoBot/.venv/bin/pip show claude-agent-sdk
# claude-agent-sdk v0.1.45
```

## Implementation Order

### Step 1 — config.py additions
Add to the bottom of `actp-worker/config.py`:
```python
import shutil
CLAUDE_CODE_MODEL           = os.getenv("CLAUDE_CODE_MODEL", "claude-sonnet-4-5")
CLAUDE_CODE_MAX_CONCURRENT  = int(os.getenv("CLAUDE_CODE_MAX_CONCURRENT", "2"))
CLAUDE_CODE_SESSION_TIMEOUT = int(os.getenv("CLAUDE_CODE_SESSION_TIMEOUT", "300"))
CLAUDE_CODE_MAX_BUDGET_USD  = float(os.getenv("CLAUDE_CODE_MAX_BUDGET_USD", "2.0"))
CLAUDE_CODE_AVAILABLE       = (
    os.getenv("ENABLE_CLAUDE_CODE_LAUNCHER", "false").lower() == "true"
    and shutil.which("claude") is not None
)
CLIENT_PROJECTS_DIR = os.getenv("CLIENT_PROJECTS_DIR", "/tmp/actp-sessions")
```

### Step 2 — Create actp-worker/claude_launcher.py
Full implementation as specified in PRD-SDK-INTEGRATION-MAP.md Section 1:
- `DOMAIN_AGENTS` dict with 8 `AgentDefinition` entries
- `launch_sdk_session()` with semaphore + query() async loop + error handling
- `claude_code_launcher_loop()` polling `actp_agent_tasks`
- `_handle_task()` dispatcher
- `write_sdk_checkpoint()` to `~/openclaw-shared/`
- `_sdk_failure_hook()` bridge to SelfHealingLoop
- `AgentHealthMonitor` dataclass with pre/post hooks
- `build_self_healing_options()` returning `ClaudeAgentOptions` with hooks

Import pattern:
```python
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition
```
Note: SDK is installed at `/Users/isaiahdupree/Documents/Software/NanoBot/.venv`. If not importable from system Python, install:
```bash
pip install claude-agent-sdk
```

### Step 3 — Create actp-worker/sdk_pipeline.py
Full pipeline orchestrator:
- `run_client_pipeline(proposal_text, project_dir)` — 5 stages
- `resume_pipeline(project_dir)` — checkpoint recovery from last successful stage
- Uses `build_self_healing_options()` from claude_launcher

### Step 4 — workflow_executors.py: Add SdkAgentExecutor
Add `SdkAgentExecutor` class following `BaseExecutor` pattern (see other executors in file).
Add `register_executor(SdkAgentExecutor())` to `register_all()`.

### Step 5 — agent_swarm.py: Add _sdk_engine
Add `_sdk_engine()` async function to `AGENT2_ENGINES` dict as `"claude_sdk"` key.
Update `coding` role profile: change `engine` from `"claude_code_unstructured"` to `"claude_sdk"`.

### Step 6 — Supabase migration
Create `actp_agent_tasks` table:
```sql
CREATE TABLE IF NOT EXISTS actp_agent_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_type TEXT NOT NULL DEFAULT 'content-agent',
    goal TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
    use_claude_code BOOLEAN NOT NULL DEFAULT false,
    priority INTEGER NOT NULL DEFAULT 0,
    result JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX ON actp_agent_tasks(status, use_claude_code, priority DESC);
```
Apply via: Supabase project `ivhfuhxorppptyuofbgq`

### Step 7 — Seed workflow definition
Seed `client-proposal-to-delivery` workflow to `actp_workflow_definitions` with 6 steps as specified in PRD-CLAUDE-AGENT-SDK-CLIENT-WORK-SYSTEM.md Section 8.

### Step 8 — worker.py + .env.example
Add `ENABLE_CLAUDE_CODE_LAUNCHER=false` to `.env.example` with all SDK env vars.
Verify `worker.py` correctly gates the `claude_code_launcher_loop()` call behind `CLAUDE_CODE_AVAILABLE`.

## Tests
After implementation, verify:
```bash
cd /Users/isaiahdupree/Documents/Software/actp-worker

# 1. Import test
python3 -c "from claude_launcher import DOMAIN_AGENTS, launch_sdk_session; print(f'{len(DOMAIN_AGENTS)} agents defined')"

# 2. Config test
python3 -c "import config; print('CLAUDE_CODE_AVAILABLE:', config.CLAUDE_CODE_AVAILABLE)"

# 3. Executor registration test
python3 -c "from workflow_executors import get_executor; e = get_executor('sdk_agent'); print('SdkAgentExecutor:', e)"

# 4. Swarm engine test
python3 -c "from agent_swarm import AGENT2_ENGINES; print('claude_sdk engine:', 'claude_sdk' in AGENT2_ENGINES)"

# 5. Pipeline smoke test (no actual SDK call)
python3 -c "from sdk_pipeline import resume_pipeline; import tempfile, pathlib; d=pathlib.Path(tempfile.mkdtemp()); print('resume_pipeline:', resume_pipeline(d))"
```

All 5 tests must pass before marking features complete.
