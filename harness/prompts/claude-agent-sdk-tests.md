# Claude Agent SDK — Test Suite

## Mission
Write pytest tests for the Claude Agent SDK integration in `actp-worker`.
All tests must pass. Use `unittest.mock` — **no real SDK calls, no real Supabase writes**.

Target repo: `/Users/isaiahdupree/Documents/Software/actp-worker`

## Prerequisites
The implementation files must exist first (built by `claude-agent-sdk-impl`):
- `claude_launcher.py`
- `sdk_pipeline.py`
- `workflow_executors.py` (with SdkAgentExecutor)
- `agent_swarm.py` (with claude_sdk engine)
- `config.py` (with SDK vars)

If any are missing, stub them minimally so the tests can at least import.

## Test Files to Create

### `tests/test_claude_launcher.py`
```python
"""Tests for claude_launcher.py — SDK-TEST-001 through SDK-TEST-005"""
import pytest, json, asyncio
from pathlib import Path
from unittest.mock import patch, AsyncMock, MagicMock

def test_domain_agents_defined():
    from claude_launcher import DOMAIN_AGENTS
    expected = ["social-media-agent","acquisition-agent","revenue-agent","content-agent",
                "product-agent","intake-agent","research-agent","planning-agent","builder-agent"]
    for key in expected:
        assert key in DOMAIN_AGENTS, f"Missing agent: {key}"
        agent = DOMAIN_AGENTS[key]
        assert agent.description
        assert agent.prompt
        assert agent.tools
        assert agent.model

def test_semaphore_content_agent_limit():
    from claude_launcher import _get_semaphore, COST_LIMIT_DOMAINS
    sem = _get_semaphore("content-agent")
    assert sem._value == COST_LIMIT_DOMAINS.get("content-agent", 1)

@pytest.mark.asyncio
async def test_launch_sdk_session_mock(tmp_path):
    mock_result = MagicMock()
    mock_result.__class__.__name__ = "ResultMessage"
    mock_result.result = "done"

    async def mock_query(**kwargs):
        yield mock_result

    with patch("claude_launcher.query", mock_query):
        from claude_launcher import launch_sdk_session
        result = await launch_sdk_session("content-agent", "write a post", {}, "task-1", tmp_path)
    assert result["ok"] is True
    assert result["result"] == "done"

@pytest.mark.asyncio
async def test_failure_hook_updates_swarm_state():
    mock_swarm = MagicMock()
    mock_agent = MagicMock()
    mock_swarm._agents = {"coding": mock_agent}
    with patch("claude_launcher.get_swarm", return_value=mock_swarm):
        from claude_launcher import _sdk_failure_hook
        await _sdk_failure_hook("builder-agent", "timeout error", "task-99")
    assert "task-99" in mock_agent.state.last_error
    assert mock_agent.state.status == "error"

def test_write_sdk_checkpoint(tmp_path, monkeypatch):
    monkeypatch.setenv("HOME", str(tmp_path))
    from importlib import reload
    import claude_launcher
    reload(claude_launcher)
    claude_launcher.write_sdk_checkpoint("t1", "intake", {"result": "ok"})
    shared = tmp_path / "openclaw-shared"
    assert (shared / "handoffs.jsonl").exists()
    line = (shared / "handoffs.jsonl").read_text().strip()
    data = json.loads(line)
    assert data["task_id"] == "t1"
    assert data["stage"] == "intake"
    ctx = json.loads((shared / "context.json").read_text())
    assert "sdk_pipeline_t1" in ctx
```

### `tests/test_sdk_pipeline.py`
```python
"""Tests for sdk_pipeline.py — SDK-TEST-006 through SDK-TEST-009"""
import pytest, json
from pathlib import Path
from unittest.mock import patch, AsyncMock

@pytest.mark.asyncio
async def test_resume_empty_dir(tmp_path):
    from sdk_pipeline import resume_pipeline
    result = resume_pipeline(tmp_path)
    assert result in (None, "intake", 0)

@pytest.mark.asyncio
async def test_resume_after_intake_checkpoint(tmp_path):
    checkpoint = {"task_id": "test", "stage": "intake", "result": "ok"}
    (tmp_path / "checkpoint_intake.json").write_text(json.dumps(checkpoint))
    from sdk_pipeline import resume_pipeline
    stage = resume_pipeline(tmp_path)
    assert stage in ("research", 1)

@pytest.mark.asyncio
async def test_run_pipeline_mock(tmp_path):
    async def mock_launch(agent_type, goal, context, task_id, project_dir=None):
        return {"ok": True, "result": f"{agent_type} done", "tool_use_count": 3}

    with patch("sdk_pipeline.launch_sdk_session", mock_launch):
        from sdk_pipeline import run_client_pipeline
        result = await run_client_pipeline("Build me an app", tmp_path)
    assert result.get("ok") or result.get("status") == "complete"

@pytest.mark.asyncio
async def test_run_pipeline_stage_failure(tmp_path):
    call_count = {"n": 0}

    async def mock_launch(agent_type, goal, context, task_id, project_dir=None):
        call_count["n"] += 1
        if agent_type in ("research-agent",):
            return {"ok": False, "error": "research timed out"}
        return {"ok": True, "result": "done", "tool_use_count": 1}

    with patch("sdk_pipeline.launch_sdk_session", mock_launch):
        from sdk_pipeline import run_client_pipeline
        result = await run_client_pipeline("Build me an app", tmp_path)
    # intake checkpoint should be preserved even after research failure
    assert (tmp_path / "checkpoint_intake.json").exists()
```

### `tests/test_sdk_executor.py`
```python
"""Tests for SdkAgentExecutor — SDK-TEST-010 through SDK-TEST-014"""
import pytest
from unittest.mock import patch, AsyncMock

def test_executor_task_type():
    from workflow_executors import SdkAgentExecutor
    assert SdkAgentExecutor().task_type == "sdk_agent"

@pytest.mark.asyncio
async def test_executor_check_available_true():
    with patch("shutil.which", return_value="/usr/local/bin/claude"), \
         patch.dict("os.environ", {"ANTHROPIC_API_KEY": "sk-test"}):
        from workflow_executors import SdkAgentExecutor
        assert await SdkAgentExecutor().check_available() is True

@pytest.mark.asyncio
async def test_executor_check_available_false():
    with patch.dict("os.environ", {}, clear=True):
        from workflow_executors import SdkAgentExecutor
        assert await SdkAgentExecutor().check_available() is False

def test_executor_validate_output_ok():
    from workflow_executors import SdkAgentExecutor
    issues = SdkAgentExecutor().validate_output({"ok": True, "result": "done"})
    assert issues == []

def test_executor_validate_output_failure():
    from workflow_executors import SdkAgentExecutor
    issues = SdkAgentExecutor().validate_output({"ok": False, "error": "timeout"})
    assert len(issues) == 1
    assert "timeout" in issues[0]
```

### `tests/test_sdk_swarm.py`
```python
"""Tests for SDK engine in agent_swarm — SDK-TEST-015 through SDK-TEST-019"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock

def test_sdk_engine_registered():
    from agent_swarm import AGENT2_ENGINES
    assert "claude_sdk" in AGENT2_ENGINES

def test_coding_agent_profile_engine():
    from agent_swarm import AGENT_PROFILES
    coding = next((p for p in AGENT_PROFILES.values() if p.role == "coding"), None)
    assert coding is not None
    assert coding.engine == "claude_sdk"

@pytest.mark.asyncio
async def test_sdk_engine_role_map_coding():
    captured = {}
    async def mock_launch(agent_type, goal, context, task_id, project_dir=None):
        captured["agent_type"] = agent_type
        return {"ok": True, "result": "built it", "tool_use_count": 5}

    packet = MagicMock()
    packet.tool_name = "coding"
    packet.task = "implement feature X"
    packet.context = {}
    packet.task_id = "swarm-1"

    with patch("agent_swarm.launch_sdk_session", mock_launch):
        from agent_swarm import AGENT2_ENGINES
        result = await AGENT2_ENGINES["claude_sdk"](packet, None)
    assert captured["agent_type"] == "builder-agent"

@pytest.mark.asyncio
async def test_sdk_engine_returns_completed():
    async def mock_launch(**kw):
        return {"ok": True, "result": "done", "tool_use_count": 2}
    packet = MagicMock(tool_name="content", task="write post", context={}, task_id="s2")
    with patch("agent_swarm.launch_sdk_session", mock_launch):
        from agent_swarm import AGENT2_ENGINES
        result = await AGENT2_ENGINES["claude_sdk"](packet, None)
    assert result.status == "completed"

@pytest.mark.asyncio
async def test_sdk_engine_failure_returns_failed():
    async def mock_launch(**kw):
        return {"ok": False, "error": "rate limited"}
    packet = MagicMock(tool_name="coding", task="do stuff", context={}, task_id="s3")
    with patch("agent_swarm.launch_sdk_session", mock_launch):
        from agent_swarm import AGENT2_ENGINES
        result = await AGENT2_ENGINES["claude_sdk"](packet, None)
    assert result.status == "failed"
    assert len(result.warnings) > 0

def test_config_sdk_vars():
    import config
    assert hasattr(config, "CLAUDE_CODE_MODEL")
    assert hasattr(config, "CLAUDE_CODE_MAX_CONCURRENT")
    assert hasattr(config, "CLAUDE_CODE_SESSION_TIMEOUT")
    assert hasattr(config, "CLAUDE_CODE_MAX_BUDGET_USD")
    assert hasattr(config, "CLAUDE_CODE_AVAILABLE")
    assert hasattr(config, "CLIENT_PROJECTS_DIR")
```

## Run Command
```bash
cd /Users/isaiahdupree/Documents/Software/actp-worker
pip install pytest pytest-asyncio
pytest tests/test_claude_launcher.py tests/test_sdk_pipeline.py tests/test_sdk_executor.py tests/test_sdk_swarm.py -v
```

All 20 tests must pass. If implementation files are missing, create minimal stubs.
