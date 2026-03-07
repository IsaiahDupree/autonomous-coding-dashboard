# PRD: Cloud-Observable Local Automation Mesh

## Goal

Make all local Safari and Chrome automations fully observable from cloud, while enabling cloud to send typed commands down to local workers aligned with business goals. Local systems store only minimal operational state; Obsidian stores only distilled knowledge.

## Architecture

### 3 Planes

**Control plane (cloud/Supabase)**
- Business goals drive what commands are issued
- Command queue with typed, signed payloads
- Policy layer: rate limits, approval gates, constraints
- Full telemetry store: events, results, artifacts

**Execution plane (local Mac)**
- `local-agent-daemon.js` — node registration, heartbeat, command polling
- `safari-worker-adapter.js` — runs Safari commands, emits events
- `chrome-worker-adapter.js` — runs Chrome CDP commands, emits events
- Each daemon already running reports its own worker status

**Observability plane**
- Every status change emitted as structured event to Supabase
- Node health visible in cloud dashboard in near real-time
- `cloud-bridge.js` enhanced to handle full event bus
- Telegram bot `/ops` command shows live fleet status

---

## Supabase Tables (apply via MCP migrations)

### 1. `agent_nodes`
Registered local execution nodes.

```sql
create table agent_nodes (
  node_id text primary key,
  label text,
  status text default 'offline', -- online, stale, offline
  last_heartbeat_at timestamptz,
  capabilities jsonb default '{}',
  browser_status jsonb default '{}',
  worker_status jsonb default '{}',
  queue_depth int default 0,
  active_goal text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 2. `worker_status`
Per-worker state snapshots.

```sql
create table worker_status (
  id uuid primary key default gen_random_uuid(),
  node_id text references agent_nodes(node_id),
  worker_name text, -- safari-worker, chrome-worker, dm-sweep, linkedin-daemon, etc.
  status text,      -- idle, running, blocked, retrying, degraded, needs-reauth, crashed
  current_job text,
  progress_pct int,
  last_action text,
  error text,
  reported_at timestamptz default now()
);
create index on worker_status(node_id, worker_name, reported_at desc);
```

### 3. `command_queue`
Cloud → local commands aligned with business goals.

```sql
create table command_queue (
  command_id text primary key,
  goal_id text,
  node_target text,
  worker_target text,
  command_type text not null,
  priority text default 'normal', -- critical, high, normal, low
  inputs jsonb default '{}',
  constraints jsonb default '{}',
  status text default 'queued', -- queued, received, validated, started, in_progress, waiting, blocked, retrying, completed, failed, cancelled
  issued_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz,
  result jsonb,
  error text,
  retry_count int default 0,
  lease_expires_at timestamptz
);
create index on command_queue(node_target, status);
create index on command_queue(status, priority, issued_at);
```

### 4. `command_events`
Append-only lifecycle log for every command.

```sql
create table command_events (
  event_id uuid primary key default gen_random_uuid(),
  command_id text references command_queue(command_id),
  node_id text,
  worker text,
  status text,
  progress_pct int,
  message text,
  data jsonb,
  timestamp timestamptz default now()
);
create index on command_events(command_id, timestamp);
```

### 5. `browser_sessions`
Browser health snapshots per node.

```sql
create table browser_sessions (
  id uuid primary key default gen_random_uuid(),
  node_id text references agent_nodes(node_id),
  browser text, -- safari, chrome
  profile text,
  status text, -- authenticated, session-expired, captcha, locked, disconnected, healthy
  active_tabs int default 0,
  current_url text,
  last_check_at timestamptz default now(),
  error text
);
create index on browser_sessions(node_id, browser);
```

### 6. `agent_artifacts`
Results, screenshots, extracted data uploaded from local.

```sql
create table agent_artifacts (
  artifact_id uuid primary key default gen_random_uuid(),
  command_id text references command_queue(command_id),
  node_id text,
  artifact_type text, -- screenshot, structured_data, error_dump, research
  storage_path text,
  content jsonb,
  created_at timestamptz default now()
);
```

---

## Files to Build

### 1. `harness/migrations/20260307_observability_mesh.sql`
All 6 table DDLs above in one migration file. Apply via Supabase MCP.

### 2. `harness/local-agent-daemon.js`
Node registration + heartbeat agent. Runs continuously alongside existing daemons.

**Responsibilities:**
- On startup: upsert node record in `agent_nodes` with capabilities, browser status, known workers
- Every 30s: update `agent_nodes.last_heartbeat_at`, `status`, `queue_depth`, `worker_status`
- Every 60s: scan running PIDs (from `watchdog-queue.sh` known processes) and report worker health
- Poll `command_queue` every 10s for queued commands targeting this node
- Dispatch received commands to correct worker adapter
- Emit command_events at each lifecycle stage
- Update `browser_sessions` for Safari and Chrome

**Node ID:** read from env `NODE_ID` or default to `mac-mini-main`

**Worker scan:** check PIDs for known daemons:
- cloud-bridge, linkedin-daemon, instagram-dm-sweep, twitter-dm-sweep, tiktok-dm-sweep
- dm-crm-sync, dm-followup-engine, dm-outreach-daemon, telegram-bot
- obsidian-interlinker, browser-session-daemon, cloud-orchestrator

**Browser health check:**
- Safari: check port 3100/3105/3003/etc respond to /health
- Chrome: check Chrome debug port 9333 responds

### 3. `harness/safari-worker-adapter.js`
Translates typed command payloads into Safari service API calls.

**Supported command_types:**
- `safari_collect_profile` → POST to appropriate Safari service /api/collect
- `safari_send_dm` → POST to DM service (policy: requires_human_approval checked)
- `safari_open_tab` → safari-tab-coordinator claim
- `safari_check_auth` → /health endpoint check
- `safari_screenshot` → playwright or tab screenshot capture
- `safari_search_extract` → send search query, return results
- `safari_refresh_session` → trigger re-auth flow

Each command execution must:
- Emit `started` event to command_events
- Emit `in_progress` with progress_pct as steps complete
- Upload screenshots/data as artifacts if capture_screenshot=true
- Emit `completed` or `failed` with full result/error
- Update command_queue.status

### 4. `harness/chrome-worker-adapter.js`
Translates typed command payloads into Chrome CDP calls (port 9333).

**Supported command_types:**
- `chrome_linkedin_search` → run LinkedIn search via CDP
- `chrome_linkedin_collect_profile` → extract profile data
- `chrome_linkedin_send_connection` → send connection request (approval gate)
- `chrome_screenshot` → full page screenshot
- `chrome_evaluate` → run JS in page context and return result
- `chrome_navigate` → navigate to URL
- `chrome_check_auth` → check LinkedIn session valid

### 5. `harness/observability-api.js`
Lightweight Express routes added to the existing backend (port 3434).

**New routes:**
- `GET /api/obs/nodes` — all node statuses
- `GET /api/obs/nodes/:nodeId` — single node detail
- `GET /api/obs/workers` — all worker statuses
- `GET /api/obs/commands` — recent commands with status
- `GET /api/obs/commands/:commandId` — command detail + events
- `GET /api/obs/browsers` — browser session health
- `POST /api/obs/command` — issue a new command (cloud gateway)
- `GET /api/obs/fleet` — full fleet snapshot (nodes + workers + browsers + queue depth)

### 6. `harness/cloud-bridge.js` (ENHANCE existing)
Add to existing cloud-bridge:
- Subscribe to Supabase Realtime on `command_queue` where `node_target = NODE_ID` and `status = queued`
- On new command received: call `local-agent-daemon.js` dispatch
- Emit heartbeat to `agent_nodes` every 30s via cloud-bridge interval
- Add route handlers for `command:dispatch`, `command:cancel`, `node:query`

### 7. `harness/telegram-bot.js` (ENHANCE existing)
Add commands:
- `/ops` — show full fleet snapshot: nodes, workers, browsers, queue depth
- `/command <type> <inputs_json>` — issue ad-hoc command to local node
- `/node` — show this node's current status
- `/workers` — list all workers with status

### 8. `harness/launch-observability.sh`
Launch script for local-agent-daemon.

```bash
#!/bin/bash
# Usage: bash harness/launch-observability.sh start|stop|status
```

Registers in watchdog-queue.sh as a managed daemon.

---

## Data Flow (end-to-end)

```
Cloud goal planner
  → INSERT into command_queue (status=queued, node_target=mac-mini-main)
  → Supabase Realtime pushes to cloud-bridge.js
  → cloud-bridge dispatches to local-agent-daemon.js
  → local-agent-daemon routes to safari-worker-adapter OR chrome-worker-adapter
  → adapter executes against Safari service API / Chrome CDP
  → adapter emits command_events at each step
  → adapter UPSERTs artifacts into agent_artifacts
  → adapter marks command_queue.status = completed/failed
  → cloud dashboard reads command_events for live progress
  → important results → Obsidian note (if result_type = research/insight)
```

---

## Heartbeat Contract

Every 30 seconds, local-agent-daemon emits:

```json
{
  "node_id": "mac-mini-main",
  "status": "online",
  "last_heartbeat_at": "<iso8601>",
  "queue_depth": 2,
  "active_goal": "prospect and collect market data",
  "worker_status": {
    "linkedin-daemon": "running",
    "instagram-dm-sweep": "idle",
    "twitter-dm-sweep": "idle",
    "tiktok-dm-sweep": "idle",
    "dm-crm-sync": "running",
    "dm-followup-engine": "idle",
    "dm-outreach-daemon": "idle",
    "cloud-bridge": "running",
    "telegram-bot": "running",
    "obsidian-interlinker": "running"
  },
  "browser_status": {
    "safari": {
      "status": "healthy",
      "services_up": 9,
      "services_down": 0
    },
    "chrome": {
      "status": "authenticated",
      "cdp_port": 9333,
      "active_profiles": ["linkedin"]
    }
  }
}
```

---

## Command Types Reference

| command_type | worker | description | approval |
|---|---|---|---|
| safari_collect_profile | safari-worker | Extract profile data from IG/TK/TW/LI | no |
| safari_send_dm | safari-worker | Send DM via Safari service | yes |
| safari_open_tab | safari-worker | Claim/open a Safari tab | no |
| safari_check_auth | safari-worker | Check auth status all services | no |
| safari_screenshot | safari-worker | Screenshot current tab state | no |
| safari_search_extract | safari-worker | Search + extract results | no |
| chrome_linkedin_search | chrome-worker | Run LinkedIn people search | no |
| chrome_linkedin_collect_profile | chrome-worker | Extract LinkedIn profile | no |
| chrome_linkedin_send_connection | chrome-worker | Send connection request | yes |
| chrome_screenshot | chrome-worker | Full page screenshot | no |
| chrome_evaluate | chrome-worker | Run JS in page | no |
| node_status | local-agent-daemon | Return full node snapshot | no |
| obsidian_write | local-agent-daemon | Write/update Obsidian note | no |
| queue_fill | local-agent-daemon | Trigger prospect pipeline queue fill | no |

---

## Obsidian Write Rules

Only write to Obsidian vault when:
- command result_type = `research` or `insight`
- A new skill or capability was discovered
- A business goal status changed materially
- A repeated failure pattern was identified
- A workflow improvement was confirmed

Write to: `~/.memory/vault/PROJECT-MEMORY/observability-log.md` (append, dated)

---

## Acceptance Criteria

1. `agent_nodes` table has live record for `mac-mini-main` that updates every 30s
2. All 10+ running daemons appear in `worker_status` with correct status
3. Safari service health (9 ports) appears in `browser_sessions`
4. Chrome CDP health appears in `browser_sessions`
5. Issuing a command via `POST /api/obs/command` results in visible `command_events` entries
6. `safari_collect_profile` command executes against Safari IG service and returns data
7. `chrome_linkedin_search` command executes via CDP and returns results
8. `GET /api/obs/fleet` returns full snapshot in <500ms
9. Telegram `/ops` shows live fleet status
10. `/ops` correctly shows stale node if heartbeat missed >60s
11. All migrations applied cleanly via Supabase MCP
12. `local-agent-daemon.js` added to `watchdog-queue.sh` so it auto-starts

---

## Do NOT do

- Do not remove or weaken any existing daemons or services
- Do not mock browser calls — use real Safari service APIs and real Chrome CDP
- Do not add approval gates beyond what is listed in command types table
- Do not write noisy telemetry to Obsidian — only distilled insights
- Do not break existing cloud-bridge routes
- Do not create duplicate heartbeat mechanisms — extend existing ones
