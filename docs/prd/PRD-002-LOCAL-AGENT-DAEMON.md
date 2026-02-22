# PRD-002: Local Agent Daemon v2

## Status: Draft
## Author: Isaiah Dupree
## Created: 2026-02-22
## Priority: P0 — Required for all local task execution
## Depends On: PRD-001 (Workflow Engine)

---

## 1. Problem Statement

The current `actp-worker` is a Python asyncio daemon with 7 hardcoded polling loops (heartbeat, Remotion, MPLite, research, scoring, publishing, metrics). Each loop independently fires on a fixed timer. This design has critical limitations:

1. **No task routing** — The worker can't receive arbitrary tasks from the Workflow Engine. It only knows its 7 loops.
2. **No capability registration** — The cloud doesn't know what the local machine can do (has Remotion installed? Safari available? Blotato running?).
3. **No task prioritization** — All loops run at fixed intervals regardless of whether there's urgent work.
4. **No graceful task lifecycle** — No heartbeats per-task, no progress reporting, no partial output.
5. **No multi-worker support** — Can't run multiple workers (e.g., one Mac for Remotion, another for Safari uploads).

The Local Agent Daemon v2 upgrades actp-worker into a **general-purpose local task executor** that integrates with the Workflow Engine's `actp_workflow_tasks` table while maintaining backward compatibility with existing polling loops.

---

## 2. Solution Overview

A redesigned Python daemon that:
- **Registers capabilities** with the cloud on startup (what task types it can handle)
- **Polls `actp_workflow_tasks`** for work matching its capabilities
- **Executes tasks** via pluggable executor modules (Safari, Remotion, Blotato, etc.)
- **Reports progress** with per-task heartbeats and incremental output
- **Maintains backward compat** by keeping existing polling loops as "legacy mode"
- **Supports multiple workers** with unique IDs and capability-based task routing

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  LOCAL AGENT DAEMON v2                    │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Capability  │  │  Task        │  │  Health       │  │
│  │  Registry    │  │  Poller      │  │  Server       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘  │
│         │                 │                  │           │
│         │          ┌──────┴───────┐          │           │
│         │          │  Task Router │          │           │
│         │          └──┬──┬──┬──┬──┘          │           │
│         │             │  │  │  │             │           │
│         │    ┌────────┘  │  │  └────────┐    │           │
│         │    ▼           ▼  ▼           ▼    │           │
│         │ ┌────────┐ ┌─────────┐ ┌────────┐ │           │
│         │ │Safari  │ │Remotion │ │Blotato │ │           │
│         │ │Executor│ │Executor │ │Executor│ │           │
│         │ └────────┘ └─────────┘ └────────┘ │           │
│         │                                    │           │
│  ┌──────┴────────────────────────────────────┴────────┐  │
│  │              Legacy Polling Loops                   │  │
│  │  (research, scoring, publishing, metrics crons)     │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Heartbeat Manager                      │  │
│  │  (worker-level + per-task heartbeats)               │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Capability Registration

On startup, the daemon registers with Supabase:

```python
# actp_worker_registrations table
{
  "worker_id": "worker-macbook-01",
  "hostname": "Isaiahs-MacBook-Pro.local",
  "capabilities": [
    "safari_research",
    "safari_upload",
    "remotion_render",
    "blotato_upload"
  ],
  "max_concurrent_tasks": 3,
  "status": "online",
  "version": "2.0.0",
  "system_info": {
    "os": "macOS 15.3",
    "cpu_cores": 12,
    "memory_gb": 36,
    "has_safari": true,
    "has_remotion": true,
    "has_blotato": false,
    "remotion_project_dir": "/Users/isaiahdupree/Documents/Software/Remotion"
  },
  "registered_at": "2026-02-22T16:00:00Z",
  "last_heartbeat": "2026-02-22T16:00:00Z"
}
```

Capabilities are auto-detected:
- `safari_research` / `safari_upload` → macOS + Safari binary exists
- `remotion_render` → `REMOTION_PROJECT_DIR` env var set + `npx remotion` works
- `blotato_upload` → Blotato HTTP API responds on localhost

---

## 5. Task Polling & Execution

### Polling Loop

```python
async def task_poller(self):
    """Main task polling loop — replaces individual service polling."""
    while self.running:
        if self.active_tasks < self.max_concurrent:
            # Poll for tasks matching our capabilities
            task = await self.claim_next_task()
            if task:
                asyncio.create_task(self.execute_task(task))
        await asyncio.sleep(2)  # 2-second poll interval
```

### Claiming Tasks

```sql
-- Atomic claim via Supabase RPC
UPDATE actp_workflow_tasks
SET status = 'claimed',
    claimed_by = $worker_id,
    claimed_at = now()
WHERE id = (
  SELECT id FROM actp_workflow_tasks
  WHERE status = 'pending'
    AND task_type = ANY($capabilities)
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
RETURNING *;
```

### Task Execution

```python
async def execute_task(self, task: WorkflowTask):
    """Route task to appropriate executor."""
    self.active_tasks += 1
    try:
        executor = self.executors.get(task.task_type)
        if not executor:
            await self.fail_task(task.id, f"No executor for {task.task_type}")
            return

        # Start per-task heartbeat
        heartbeat = asyncio.create_task(
            self.task_heartbeat(task.id, interval=15)
        )

        # Execute with timeout
        result = await asyncio.wait_for(
            executor.execute(task.input_data),
            timeout=task.timeout_minutes * 60
        )

        heartbeat.cancel()
        await self.complete_task(task.id, result)

    except asyncio.TimeoutError:
        await self.fail_task(task.id, "Task timed out")
    except Exception as e:
        await self.fail_task(task.id, str(e))
    finally:
        self.active_tasks -= 1
```

---

## 6. Executor Modules

Each executor is a pluggable Python class:

### Base Interface

```python
class TaskExecutor(ABC):
    """Base class for all task executors."""

    @abstractmethod
    def task_type(self) -> str:
        """The task_type this executor handles."""
        ...

    @abstractmethod
    async def execute(self, input_data: dict) -> dict:
        """Execute the task and return output data."""
        ...

    @abstractmethod
    async def check_available(self) -> bool:
        """Check if this executor's dependencies are available."""
        ...
```

### Safari Research Executor

```python
class SafariResearchExecutor(TaskExecutor):
    """Execute market research via Safari automation."""

    def task_type(self) -> str:
        return "safari_research"

    async def execute(self, input_data: dict) -> dict:
        research_type = input_data["research_type"]
        platforms = input_data.get("platforms", ["tiktok", "instagram"])
        max_items = input_data.get("max_items", 50)

        items = []
        for platform in platforms:
            if platform == "tiktok":
                result = await self._scrape_tiktok(input_data)
            elif platform == "instagram":
                result = await self._scrape_instagram(input_data)
            elif platform == "youtube":
                result = await self._scrape_youtube(input_data)
            items.extend(result)

        return {
            "items": items[:max_items],
            "platforms_scraped": platforms,
            "item_count": len(items),
            "scraped_at": datetime.utcnow().isoformat()
        }

    async def _scrape_tiktok(self, params: dict) -> list:
        """Use osascript to drive Safari to TikTok trending/search."""
        script = self._build_tiktok_script(params)
        proc = await asyncio.create_subprocess_exec(
            "osascript", "-e", script,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        return self._parse_research_output(stdout.decode())
```

### Remotion Render Executor

```python
class RemotionRenderExecutor(TaskExecutor):
    """Render video via local Remotion installation."""

    def task_type(self) -> str:
        return "remotion_render"

    async def execute(self, input_data: dict) -> dict:
        composition = input_data.get("composition", "MainVideo")
        props = input_data.get("props", {})
        output_dir = Path(self.project_dir) / "out"
        output_file = output_dir / f"{uuid4().hex[:8]}.mp4"

        # Write props to temp file
        props_file = Path(tempfile.mktemp(suffix=".json"))
        props_file.write_text(json.dumps(props))

        cmd = [
            "npx", "remotion", "render",
            composition,
            str(output_file),
            "--props", str(props_file),
            "--codec", "h264",
            "--log", "verbose"
        ]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=self.project_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()

        if proc.returncode != 0:
            raise RuntimeError(f"Remotion render failed: {stderr.decode()}")

        # Upload to Supabase Storage
        video_url = await self._upload_to_storage(output_file)

        return {
            "video_url": video_url,
            "file_size_bytes": output_file.stat().st_size,
            "render_duration_ms": ...,
            "composition": composition
        }
```

### Safari Upload Executor

```python
class SafariUploadExecutor(TaskExecutor):
    """Upload content to social platforms via Safari automation."""

    def task_type(self) -> str:
        return "safari_upload"

    async def execute(self, input_data: dict) -> dict:
        platform = input_data["platform"]
        video_url = input_data["video_url"]
        caption = input_data["caption"]

        # Download video to local temp
        local_path = await self._download_video(video_url)

        if platform == "tiktok":
            post_url = await self._upload_tiktok(local_path, caption)
        elif platform == "instagram":
            post_url = await self._upload_instagram(local_path, caption)
        elif platform == "youtube":
            post_url = await self._upload_youtube(local_path, caption)
        else:
            raise ValueError(f"Unsupported platform: {platform}")

        return {
            "post_url": post_url,
            "platform": platform,
            "published_at": datetime.utcnow().isoformat()
        }
```

---

## 7. Data Model Additions

### `actp_worker_registrations`
```sql
CREATE TABLE actp_worker_registrations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id         TEXT UNIQUE NOT NULL,
  hostname          TEXT,
  capabilities      TEXT[] NOT NULL,
  max_concurrent    INT DEFAULT 3,
  status            TEXT DEFAULT 'online',
  version           TEXT,
  system_info       JSONB,
  registered_at     TIMESTAMPTZ DEFAULT now(),
  last_heartbeat    TIMESTAMPTZ DEFAULT now()
);
```

---

## 8. Configuration

```env
# Worker identity
WORKER_ID=worker-macbook-01
WORKER_VERSION=2.0.0

# Supabase connection
SUPABASE_URL=https://ivhfuhxorppptyuofbgq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...

# Capability configuration
REMOTION_PROJECT_DIR=/Users/isaiahdupree/Documents/Software/Remotion
MAX_CONCURRENT_TASKS=3
TASK_POLL_INTERVAL_SECONDS=2
TASK_HEARTBEAT_INTERVAL_SECONDS=15

# Legacy polling loops (backward compat — disable when workflows handle these)
ENABLE_LEGACY_RESEARCH_POLLER=false
ENABLE_LEGACY_SCORING_POLLER=false
ENABLE_LEGACY_PUBLISHING_POLLER=false
ENABLE_LEGACY_METRICS_POLLER=false
ENABLE_LEGACY_REMOTION_POLLER=false
ENABLE_LEGACY_MPLITE_POLLER=false

# Feature flags
ENABLE_WORKFLOW_TASKS=true
ENABLE_CAPABILITY_REGISTRATION=true
```

---

## 9. Startup Sequence

```
1. Load configuration from .env
2. Connect to Supabase
3. Auto-detect capabilities (Safari, Remotion, Blotato)
4. Register capabilities in actp_worker_registrations
5. Initialize executor modules for detected capabilities
6. Start worker heartbeat loop (30s → actp_worker_heartbeats)
7. Start task poller loop (2s → actp_workflow_tasks)
8. Start legacy polling loops (if enabled)
9. Start health server on :8765
10. Log: "Agent daemon v2 online — capabilities: [safari_research, ...]"
```

---

## 10. Health Server v2

```
GET http://localhost:8765/health
```
```json
{
  "worker_id": "worker-macbook-01",
  "version": "2.0.0",
  "status": "online",
  "uptime_seconds": 3600,
  "capabilities": ["safari_research", "safari_upload", "remotion_render"],
  "active_tasks": 1,
  "max_concurrent": 3,
  "tasks_completed": 42,
  "tasks_failed": 2,
  "current_tasks": [
    {
      "task_id": "abc-123",
      "task_type": "remotion_render",
      "started_at": "2026-02-22T16:30:00Z",
      "elapsed_seconds": 45
    }
  ],
  "legacy_loops": {
    "research": "disabled",
    "scoring": "disabled",
    "remotion": "disabled"
  }
}
```

---

## 11. Failure Modes

| Failure | Detection | Mitigation |
|---------|-----------|------------|
| Worker crash mid-task | Heartbeat stops | Engine timeout resets tasks to pending |
| Safari crashes | osascript returns non-zero | Task fails, engine retries |
| Remotion OOM | Process killed by OS | Detect exit code, fail task with memory info |
| Supabase unreachable | Connection error | Exponential backoff; cache tasks locally |
| Multiple workers claim same task | `FOR UPDATE SKIP LOCKED` | Only one wins the lock |
| Capability becomes unavailable mid-run | Executor `check_available()` fails | Remove capability, reject new tasks of that type |

---

## 12. Migration from v1

The v2 daemon is **backward compatible**:

1. **Phase 1**: Deploy v2 with `ENABLE_WORKFLOW_TASKS=false` — runs exactly like v1
2. **Phase 2**: Enable `ENABLE_WORKFLOW_TASKS=true` alongside legacy loops — both active
3. **Phase 3**: Workflow Engine handles all orchestration — disable legacy loops one by one
4. **Phase 4**: Remove legacy loop code

---

## 13. Success Metrics

| Metric | Target |
|--------|--------|
| Task claim latency | < 5 seconds from pending to claimed |
| Task success rate | > 95% |
| Worker uptime | > 99% during business hours |
| Capability detection accuracy | 100% |
| Concurrent task throughput | 3 tasks simultaneously |

---

## 14. Implementation Plan

| Phase | Scope | Estimate |
|-------|-------|----------|
| Phase 1 | Base daemon + capability registration + task poller | 2 days |
| Phase 2 | Safari Research Executor | 2 days |
| Phase 3 | Remotion Render Executor | 1 day |
| Phase 4 | Safari Upload Executor + Blotato Executor | 2 days |
| Phase 5 | Health server v2 + per-task heartbeats | 1 day |
| Phase 6 | Legacy loop migration + feature flags | 1 day |
