# PRD-010: Layered Executor Architecture Upgrade
**Status**: Draft  
**Priority**: P1 — Architecture  
**Source**: IndyDevDan Research Synthesis (Videos 2, 3, 7, 12)  
**Created**: 2026-03-01  
**Owner**: ACTP Core

---

## 1. Problem Statement

The current `workflow_executors.py` is a flat registry of executors with no structural hierarchy. As the executor count grows (currently 12+), several architectural weaknesses emerge:

1. **No specialization boundary** — all executors share the same `BaseExecutor` interface regardless of domain (publishing vs. research vs. AI generation)
2. **No parallel coordination** — executor tasks are always dispatched serially even when independent
3. **No output contracts** — `validate_output()` is a stub; each executor silently accepts bad data
4. **No execution trace** — no cross-executor span tracking for debugging workflow failures
5. **No capability composition** — can't chain or compose two executors without workflow engine involvement

---

## 2. Goals

| Goal | Metric |
|------|--------|
| Reduce average workflow step failure rate | < 2% per step |
| Enable parallel execution of independent steps | ≥ 2x throughput improvement |
| Self-healing on transient errors | Auto-retry ≥ 80% of transient failures |
| Output validation coverage | 100% of executors define `validate_output()` |
| Full execution trace per workflow run | Available in Supabase + logs |

---

## 3. Layered Architecture Design

Inspired by IndyDevDan's "4-Layer Claude Code Skill" pattern applied to executor specialization:

```
Layer 4: Workflow Orchestration (workflow-engine, Vercel DAG)
           ↓ dispatches workflow tasks
Layer 3: Domain Executor Groups (specialized executor families)
           ↓ inherits shared contract + validation
Layer 2: BaseExecutor + Standard Contract (validate, heartbeat, retry)
           ↓ core execution primitives
Layer 1: Service Clients (safari_executor, remotion_runner, market_research_client...)
```

### Layer 3: Domain Executor Families

Replace flat `BaseExecutor` with 4 domain-specific base classes:

```python
class ResearchExecutor(BaseExecutor):
    """Base for all data-gathering executors (safari_research, market_research)."""
    domain = "research"
    required_output_keys = ["post_count"] | ["query"]

class PublishingExecutor(BaseExecutor):
    """Base for all content distribution executors (blotato_*, safari_upload)."""
    domain = "publishing"
    required_output_keys = ["platform", "post_url" | "publish_count"]
    
    def validate_output(self, output: dict) -> list[str]:
        issues = super().validate_output(output)
        if "platform" not in output:
            issues.append(f"{self.task_type}: missing 'platform' in output")
        return issues

class GenerativeExecutor(BaseExecutor):
    """Base for all AI/video generation executors (remotion_render, sora_generate)."""
    domain = "generative"
    required_output_keys = ["video_url" | "video_path"]

class InfraExecutor(BaseExecutor):
    """Base for all data/state executors (save_content, crm_dm_sync)."""
    domain = "infra"
    required_output_keys = ["status"]
```

---

## 4. Key Feature Implementations

### 4.1 Typed Output Contracts

Each domain base class enforces required output keys automatically:

```python
def validate_output(self, output: dict) -> list[str]:
    issues = super().validate_output(output)
    # Check at least one required_output_key is present
    if not any(k in output for k in self.required_output_keys):
        issues.append(
            f"{self.task_type}: output missing required keys "
            f"(expected one of: {self.required_output_keys})"
        )
    return issues
```

### 4.2 Built-in Retry with Backoff

Add to `BaseExecutor`:

```python
async def execute_with_retry(
    self, input_data: dict, heartbeat_fn=None,
    max_retries: int = 2, base_delay: float = 2.0,
) -> dict:
    for attempt in range(max_retries + 1):
        try:
            output = await self.execute(input_data, heartbeat_fn)
            issues = self.validate_output(output)
            if not issues:
                return output
            if attempt == max_retries:
                raise RuntimeError(f"Output validation failed after {max_retries} retries: {issues}")
        except Exception as exc:
            if not self._is_retryable(exc) or attempt == max_retries:
                raise
            delay = base_delay * (2 ** attempt)
            logger.warning(f"[executor] {self.task_type} attempt {attempt+1} failed, retry in {delay}s: {exc}")
            await asyncio.sleep(delay)

def _is_retryable(self, exc: Exception) -> bool:
    return any(kw in str(exc).lower() for kw in ("timeout", "connection", "503", "rate limit", "429"))
```

### 4.3 Execution Span Tracing

Add span context to every execution:

```python
@dataclass
class ExecutionSpan:
    executor_type: str
    task_id: str
    workflow_execution_id: str | None
    started_at: float
    ended_at: float | None = None
    status: str = "running"
    output_keys: list[str] = field(default_factory=list)
    validation_issues: list[str] = field(default_factory=list)
    error: str | None = None

# Written to actp_execution_spans table for offline analysis
```

### 4.4 Parallel Step Groups

Extend `workflow-engine` to support `parallel_group` executor type:

```json
{
  "slug": "research-parallel",
  "executor_type": "parallel_group",
  "config": {
    "tasks": [
      {"task_type": "market_research", "input": {"platform": "twitter"}},
      {"task_type": "market_research", "input": {"platform": "tiktok"}},
      {"task_type": "safari_research", "input": {"topic": "ai_tools"}}
    ],
    "fail_strategy": "continue"
  }
}
```

Worker-side uses `execute_parallel()` (already implemented) to fan out.

### 4.5 Executor Composition (Pipelines)

Allow executors to be composed into inline micro-pipelines without full workflow overhead:

```python
class ExecutorPipeline:
    """Chain executors where output of step N becomes input of step N+1."""
    
    def __init__(self, steps: list[tuple[str, dict]]):
        self.steps = steps  # [(task_type, static_input_overrides), ...]
    
    async def run(self, initial_input: dict, heartbeat_fn=None) -> dict:
        context = initial_input.copy()
        for task_type, overrides in self.steps:
            executor = get_executor(task_type)
            merged = {**context, **overrides}
            output = await executor.execute_with_retry(merged, heartbeat_fn)
            context.update(output)  # merge output into context for next step
        return context
```

---

## 5. Migration Plan

### Phase 1 (Week 1) — Foundation
- [ ] Create `ResearchExecutor`, `PublishingExecutor`, `GenerativeExecutor`, `InfraExecutor` domain bases
- [ ] Migrate all 12 executors to their respective domain base
- [ ] Add `required_output_keys` to each domain base and verify `validate_output()` coverage

### Phase 2 (Week 2) — Reliability
- [ ] Add `execute_with_retry()` to `BaseExecutor`
- [ ] Add `_is_retryable()` with timeout/rate-limit detection
- [ ] Add `ExecutionSpan` tracing and `actp_execution_spans` Supabase table

### Phase 3 (Week 3) — Parallelism
- [ ] Add `parallel_group` executor type to workflow-engine (TypeScript)
- [ ] Wire `execute_parallel()` to workflow task poller for fan-out dispatch
- [ ] Add `ExecutorPipeline` utility class

### Phase 4 (Week 4) — Observability
- [ ] Surface execution spans in ACTPDash as a workflow step timeline
- [ ] Add alerting for executors with >5% validation_issue rate (last 24h)
- [ ] Add `executor_health` endpoint to actp-worker `/api/status`

---

## 6. New Files

```
actp-worker/
  executor_domains.py      — Domain base classes (ResearchExecutor, PublishingExecutor, etc.)
  executor_pipeline.py     — ExecutorPipeline composition utility
  executor_tracing.py      — ExecutionSpan dataclass + Supabase writer
  tests/
    test_executor_contracts.py  — Validate all executors have validate_output coverage
    test_executor_pipeline.py   — Pipeline composition tests
    test_execute_parallel.py    — Parallel execution + partial failure tests
```

---

## 7. Supabase Schema Addition

```sql
create table actp_execution_spans (
  id            uuid primary key default gen_random_uuid(),
  executor_type text not null,
  task_id       text not null,
  workflow_execution_id uuid references actp_workflow_executions(id),
  started_at    timestamptz not null,
  ended_at      timestamptz,
  duration_ms   integer,
  status        text not null default 'running',  -- running | completed | failed | partial_failure
  output_keys   text[],
  validation_issues text[],
  error         text,
  created_at    timestamptz default now()
);

create index on actp_execution_spans (executor_type, status, started_at desc);
create index on actp_execution_spans (workflow_execution_id);
```

---

## 8. Success Criteria

- [ ] All 12+ executors have explicit `validate_output()` with domain-specific checks
- [ ] Zero executors in the flat `BaseExecutor` — all in a domain subclass
- [ ] Parallel research steps run in ≤ 60% of previous serial time
- [ ] `actp_execution_spans` populated for every workflow run
- [ ] 0 regressions on existing 207 pytest suite

---

## References

- `actp-worker/workflow_executors.py` — current executor implementations
- `harness/prompts/AGENTIC_BASE.md` — agent behavioral contract
- `docs/research/indydevdan/00-SYNTHESIS-AND-INTEGRATION.md` — source research
- IndyDevDan Video 2: 4-Layer CLI Skill Architecture
- IndyDevDan Video 3: Multi-Agent Orchestration with Specialization
- IndyDevDan Video 7: Agent Threads + Parallel Execution
- IndyDevDan Video 12: Zero to Agent Skill
