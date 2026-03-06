# PRD: Cloud ↔ Local Request Bridge
## Cloud Dispatches Tasks → Local Executes → Cloud Gets Results

**Status:** Draft  
**Date:** 2026-03-05  
**Source:** Founder voice memo — autonomous system vision  
**Scope:** Bidirectional data pipeline between cloud (Supabase/Vercel services) and local machine (browsers, Claude Code, Passport drive)

---

## 1. Problem Statement

Our autonomous system has two sides:
- **Cloud:** Supabase, Vercel services (workflow engine, CRMLite, etc.) — always-on, can receive webhooks, stores state
- **Local:** Safari/Chrome browser agents, Claude Code, Passport drive, Remotion — can only be triggered locally

We need a **reliable, bidirectional bridge** so that:
- Cloud can queue tasks for local execution ("go scrape Instagram followers for keyword X")
- Local can push results back to cloud ("here are 200 prospects")
- Local can request data from cloud ("what's the current goal progress?")
- Cloud can monitor local health and trigger self-healing

This bridge is the nervous system connecting everything.

---

## 2. Existing Infrastructure to Build On

| Component | Location | Status |
|-----------|----------|--------|
| actp-worker health server | localhost:8765 | ✅ Running |
| Supabase realtime | ivhfuhxorppptyuofbgq | ✅ Available |
| workflow_task_poller.py | actp-worker/ | ✅ Polls actp_workflow_tasks |
| DataPlane class | data_plane.py | ✅ Unified cloud R/W |
| ACTP worker heartbeats | actp_worker_heartbeats | ✅ Written every 30s |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CLOUD (Vercel/Supabase)           │
│                                                     │
│  workflow_engine  ──→  actp_cloud_tasks (table)     │
│  cognitive_goals  ──→  actp_cloud_tasks             │
│  external webhook ──→  actp_cloud_tasks             │
│                                ↑                    │
│                    actp_task_results (table)         │
│                    actp_local_health (table)         │
└─────────────────────────┬───────────────────────────┘
                          │ Supabase REST/Realtime
┌─────────────────────────▼───────────────────────────┐
│              LOCAL MACHINE (actp-worker)             │
│                                                     │
│  CloudTaskPoller ──→ BrowserAgentClient             │
│                  ──→ ClaudeCodeLauncher              │
│                  ──→ ProspectPipeline                │
│                  ──→ UpworkPipeline                  │
│                  ──→ SelfHealer                      │
│                                                     │
│  ResultUploader  ──→ actp_task_results              │
│  HealthReporter  ──→ actp_local_health              │
└─────────────────────────────────────────────────────┘
```

---

## 4. Features

### CLB-001 — Cloud Task Table (Supabase)

New table: `actp_cloud_tasks`
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
task_type text NOT NULL,        -- browser.search, prospect.sweep, upwork.scan, code.fix, etc.
payload jsonb NOT NULL,         -- task-specific params
priority int DEFAULT 0,
status text DEFAULT 'pending',  -- pending | claimed | running | done | failed
claimed_by text,                -- worker_id
claimed_at timestamptz,
result jsonb,
error text,
created_at timestamptz DEFAULT now(),
completed_at timestamptz,
callback_url text               -- optional webhook on completion
```

Index: `(status, priority DESC, created_at ASC)` for efficient polling

### CLB-002 — Cloud Task Poller (Local)

Extends existing `workflow_task_poller.py` pattern:

```python
async def cloud_task_poller():
    while True:
        task = await supabase.rpc("claim_cloud_task", {
            "p_worker_id": WORKER_ID,
            "p_task_types": SUPPORTED_TASK_TYPES
        }).execute()
        if task.data:
            await dispatch_cloud_task(task.data)
        await asyncio.sleep(10)
```

Task type routing:
- `browser.*` → BrowserAgentClient (BAC-002)
- `prospect.*` → ProspectPipeline (PAP-001)
- `upwork.*` → UpworkPipeline (UAF-001)
- `code.fix` → SelfHealer (SHD-003)
- `data.export` → DataExporter
- `agent.*` → AgentSwarm

### CLB-003 — Result Uploader

After any local task completes:
```python
await supabase.table("actp_cloud_tasks").update({
    "status": "done",
    "result": result_data,
    "completed_at": now()
}).eq("id", task_id).execute()

if task.callback_url:
    await httpx.post(task.callback_url, json=result_data)
```

Large results (lists of prospects, screenshots) stored in Supabase Storage, result contains URL reference.

### CLB-004 — Local Health Reporter

Every 60s, local worker writes to `actp_local_health`:
```json
{
  "worker_id": "worker-local-01",
  "timestamp": "2026-03-05T00:30:00Z",
  "services": {
    "safari_instagram": { "status": "ok", "port": 3001, "last_action": "60s ago" },
    "safari_tiktok": { "status": "ok", "port": 3102 },
    "linkedin_chrome": { "status": "degraded", "error": "Chrome not open" },
    "market_research": { "status": "ok", "port": 3106 }
  },
  "active_tasks": 2,
  "queue_depth": 5,
  "passport_drive": { "mounted": true, "free_gb": 342 },
  "cpu_pct": 12.4,
  "mem_pct": 34.1
}
```

Cloud services can read this to make scheduling decisions (don't send browser tasks if all browsers offline).

### CLB-005 — Realtime Subscriptions (Local → Cloud Push)

For time-sensitive events, use Supabase Realtime (no polling delay):

Local emits via Realtime channel `actp:local-events`:
- Agent task started/completed
- Failure event
- Prospect batch ready
- Build deployed

Cloud workflow engine listens and advances workflow steps immediately on task completion (vs waiting for next poll cycle).

### CLB-006 — Cloud → Local Webhook Endpoint

Local worker exposes: `POST /api/cloud/trigger` (localhost:8765)

For cases where cloud needs instant local execution (not via polling delay):
```json
{
  "task_type": "browser.screenshot",
  "payload": { "platform": "instagram", "url": "..." },
  "auth": "CLOUD_TRIGGER_KEY"
}
```

Requires: Tailscale or ngrok tunnel so cloud can reach local machine's 8765 port
Config: `CLOUD_TRIGGER_URL`, `CLOUD_TRIGGER_KEY`

### CLB-007 — Data Export API

Local can pull any cloud data for use in local tasks:

```python
class DataBridge:
    async def get_pending_prospects(self, limit=50) -> list[Prospect]
    async def get_business_goals(self) -> dict
    async def get_active_campaigns(self) -> list[Campaign]
    async def get_crm_contacts(self, status="new") -> list[Contact]
    async def push_prospects(self, prospects: list[Prospect]) -> int
    async def push_job_applications(self, apps: list[Application]) -> int
    async def log_activity(self, event: ActivityEvent) -> None
```

Built on top of existing `DataPlane` class.

### CLB-008 — Task Priority Queue (Supabase RPC)

```sql
CREATE OR REPLACE FUNCTION claim_cloud_task(
    p_worker_id text,
    p_task_types text[]
) RETURNS actp_cloud_tasks AS $$
DECLARE
    v_task actp_cloud_tasks;
BEGIN
    SELECT * INTO v_task
    FROM actp_cloud_tasks
    WHERE status = 'pending'
      AND task_type = ANY(p_task_types)
    ORDER BY priority DESC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
    
    IF FOUND THEN
        UPDATE actp_cloud_tasks
        SET status = 'claimed', claimed_by = p_worker_id, claimed_at = now()
        WHERE id = v_task.id;
    END IF;
    
    RETURN v_task;
END;
$$ LANGUAGE plpgsql;
```

---

## 5. Implementation Order

1. CLB-001: Create `actp_cloud_tasks` table + CLB-008 RPC
2. CLB-002: Cloud task poller in actp-worker (extend workflow poller)
3. CLB-003: Result uploader
4. CLB-004: Local health reporter (extend heartbeat_agent.py)
5. CLB-007: DataBridge class (thin wrapper on DataPlane)
6. CLB-005: Realtime subscriptions
7. CLB-006: Webhook endpoint + Tailscale tunnel docs

---

## 6. Key Files to Create/Modify

```
actp-worker/
  cloud_task_poller.py       # NEW — polls actp_cloud_tasks, dispatches
  cloud_task_dispatcher.py   # NEW — routes task_type → executor
  data_bridge.py             # NEW — wraps DataPlane for bridge use cases
  health_reporter.py         # EXTEND heartbeat_agent.py with CLB-004 payload

supabase/migrations/
  YYYYMMDD_cloud_tasks.sql   # NEW — actp_cloud_tasks table + RPC
```

---

## 7. Acceptance Criteria

- [ ] Cloud inserts task to `actp_cloud_tasks` → local claims + executes within 15s
- [ ] Result of browser.search task appears in `actp_cloud_tasks.result` within 2 min
- [ ] Local health written to Supabase every 60s with all service statuses
- [ ] `claim_cloud_task` RPC has no race conditions under concurrent workers
- [ ] DataBridge.push_prospects() successfully upserts 100 prospects in <5s
