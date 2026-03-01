# PRD-040 — Safari Cloud Orchestrator Agent

**Status:** Draft  
**Priority:** P1  
**Domain:** `safari_cloud`  
**Module:** `actp-worker/safari_cloud_agent.py`  
**Supabase Project:** ivhfuhxorppptyuofbgq  
**Safari Automation Script:** `Safari Automation/scripts/safari_cloud_controller.py`

---

## Overview

The Safari Cloud Orchestrator Agent is the coordination layer between cloud-initiated automation requests and the 9 locally-running Safari Automation services (ports 3001–3106). It extends `safari_cloud_controller.py` with intelligent task batching, priority scheduling, rate-limit enforcement, health monitoring, and cross-platform campaign orchestration. The agent reads from `safari_command_queue`, dispatches to the correct local service, writes results back, and triggers Telegram alerts on failures or campaign completions.

---

## Goals

1. Process 100% of `safari_command_queue` items without manual intervention.
2. Enforce per-platform rate limits (IG: 20/day, Twitter: 50/day, TikTok: 30/day, LinkedIn: 50/day).
3. Auto-retry failed commands up to 3 times with exponential backoff.
4. Health-check all 9 Safari services before dispatching; alert if any service is down.
5. Support campaign batching: group related DMs/comments into coordinated multi-step sequences.
6. Provide a CLI that lets the dispatch system queue, monitor, and cancel automation tasks.
7. Maintain a full audit trail of every command executed with timestamps, results, and errors.

---

## Architecture

```
multi_agent_dispatch.py
  └─► safari_cloud_agent.py
        ├─► safari_command_queue (Supabase poll + claim)
        ├─► Health checks: ports 3001,3003,3004,3005,3006,3007,3102,3105,3106
        ├─► Dispatcher:
        │     send_dm      → :3001/:3003/:3102/:3105/api/*/messages/send-to
        │     comment      → :3005/:3007/:3006/:3004/api/*/comments/post
        │     market_research → :3106/api/research/{platform}/search
        │     sync         → crm_brain.py --sync
        │     navigate     → osascript Safari URL
        │     score        → crm_brain.py --score
        │     generate     → crm_brain.py --generate
        │     pipeline     → crm_brain.py --pipeline
        └─► Telegram alerts (failures, rate limits, campaign completion)
```

---

## Service Port Map

| Service | Port | DM Endpoint | Comment Endpoint |
|---------|------|-------------|-----------------|
| instagram-dm | 3001 | `POST /api/messages/send-to` | — |
| twitter-dm | 3003 | `POST /api/twitter/messages/send-to` | — |
| threads-comments | 3004 | — | `POST /api/threads/comments/post` |
| instagram-comments | 3005 | — | `POST /api/instagram/comments/post` |
| tiktok-comments | 3006 | — | `POST /api/tiktok/comments/post` |
| twitter-comments | 3007 | — | `POST /api/twitter/comments/post` |
| tiktok-dm | 3102 | `POST /api/tiktok/messages/send-to` | — |
| linkedin-automation | 3105 | `POST /api/linkedin/messages/send-to` | — |
| market-research | 3106 | — | `POST /api/research/{platform}/search` |

---

## Supabase Tables

### `safari_command_queue` (existing — extend with new columns)
```sql
ALTER TABLE safari_command_queue ADD COLUMN IF NOT EXISTS
  retry_count    INTEGER DEFAULT 0,
  next_retry_at  TIMESTAMPTZ,
  campaign_id    TEXT,
  batch_id       TEXT,
  worker_id      TEXT;
```

### `safari_campaign_runs` (new)
```sql
CREATE TABLE safari_campaign_runs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id  TEXT NOT NULL,
  campaign_type TEXT,   -- dm_sequence | comment_warmup | research_sweep
  platform     TEXT,
  total_tasks  INTEGER DEFAULT 0,
  completed    INTEGER DEFAULT 0,
  failed       INTEGER DEFAULT 0,
  status       TEXT DEFAULT 'running',
  started_at   TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  result       JSONB
);
```

### `safari_service_health` (new)
```sql
CREATE TABLE safari_service_health (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT NOT NULL,
  port         INTEGER NOT NULL,
  status       TEXT,   -- healthy | down | timeout
  response_ms  INTEGER,
  checked_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(service_name)
);
```

---

## CLI Interface

```bash
python3 safari_cloud_agent.py --daemon                  # poll queue every 30s forever
python3 safari_cloud_agent.py --run-once                # process all pending, exit
python3 safari_cloud_agent.py --status                  # queue stats + service health
python3 safari_cloud_agent.py --health                  # ping all 9 services, report
python3 safari_cloud_agent.py --enqueue-dm instagram target_handle "Hey! Great content"
python3 safari_cloud_agent.py --enqueue-comment twitter https://x.com/... "Great point"
python3 safari_cloud_agent.py --enqueue-research twitter "ai automation" 50
python3 safari_cloud_agent.py --campaign warmup --platform twitter --handles handle1,handle2
python3 safari_cloud_agent.py --retry-failed             # retry all failed commands
python3 safari_cloud_agent.py --cancel COMMAND_ID        # cancel a pending command
python3 safari_cloud_agent.py --history --limit 50       # recent completed commands
python3 safari_cloud_agent.py --rate-limits              # show daily usage per platform
```

### Dispatch Integration
```python
AGENTS["safari_cloud"] = {
    "run":      ("safari_cloud_agent.py", ["--run-once"]),
    "status":   ("safari_cloud_agent.py", ["--status"]),
    "health":   ("safari_cloud_agent.py", ["--health"]),
    "retry":    ("safari_cloud_agent.py", ["--retry-failed"]),
    "limits":   ("safari_cloud_agent.py", ["--rate-limits"]),
}
```

---

## Rate Limit Enforcement

```python
DAILY_LIMITS = {
    "instagram": {"dm": 20, "comment": 50},
    "twitter":   {"dm": 50, "comment": 100},
    "tiktok":    {"dm": 30, "comment": 50},
    "linkedin":  {"dm": 50, "comment": 20},
    "threads":   {"dm": 0,  "comment": 80},
}
```

Rate limit state tracked in `safari_rate_limits` Supabase table with daily reset at midnight UTC.

---

## Campaign Orchestration

A **campaign** is a coordinated sequence:
1. `comment_warmup`: comment on 3 posts from target, wait 24h
2. `first_dm`: DM with value-add message referencing their content
3. `follow_up`: if no reply in 72h, send follow-up
4. `final_touch`: if still no reply, send one final message + mark as `cold`

Campaign state machine: `queued → warmup → dm_sent → awaiting_reply → replied / cold`

---

## Cron Schedule

| Job | Schedule | Action |
|-----|----------|--------|
| `safari_queue_processor` | Every 15 min | `--run-once` |
| `safari_health_check`    | Every 1h     | `--health` |
| `safari_retry_failed`    | Every 2h     | `--retry-failed` |
| `safari_rate_reset`      | Daily midnight | reset daily counters |

---

## Telegram Alerts

```
⚠️ Safari Service Down: twitter-dm (port 3003)
Last healthy: 2h ago. Queue: 12 pending DMs blocked.

✅ Campaign Complete: comment_warmup × 5 targets
Platform: Twitter | Completed: 5/5 | Time: 4m 23s

🚫 Rate Limit Hit: Instagram DMs (20/20 today)
Next available: Tomorrow 00:00 UTC
```

---

## Acceptance Criteria

- [ ] `--health` returns status for all 9 services within 5 seconds
- [ ] `--run-once` processes all `pending` queue items and marks them `completed` or `failed`
- [ ] Rate limits are enforced: no more than daily max per platform per action
- [ ] Failed commands are auto-retried up to 3 times with exponential backoff
- [ ] `--campaign warmup` creates a 3-step comment sequence in the queue
- [ ] `--status` shows queue depth by platform, completion rate, rate limit usage
- [ ] Telegram alert fires when any service goes down
- [ ] All commands get result JSON written back to `safari_command_queue.result`
- [ ] `multi_agent_dispatch.py --domain safari_cloud --task status` runs cleanly

---

## ACD Enhancement Tasks

1. Implement `safari_cloud_agent.py` with all CLI flags
2. Create Supabase migrations for `safari_campaign_runs`, `safari_service_health`, `safari_rate_limits`
3. Implement campaign orchestration state machine
4. Add per-platform rate limit tracking with daily reset
5. Wire health check results into `safari_service_health` table
6. Add Telegram alert for service-down events
7. Implement `--enqueue-dm` as a convenience wrapper for inserting to `safari_command_queue`
8. Add `--history` view with filtering by platform, action, status
