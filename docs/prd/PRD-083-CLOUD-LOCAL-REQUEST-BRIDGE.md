# PRD-083: Cloud ↔ Local Request Bridge
**Priority:** P1 | **Owner:** ACD Agent

## Goal
Any cloud service (Vercel, Supabase cron, external webhook) can send commands to local Safari/Chrome automations and receive results. The local machine is the execution layer; the cloud is the control plane.

## Architecture
```
Cloud (Supabase) ──→ browser_command_queue table
                              ↓
                   Local Bridge Daemon (polls every 10s)
                              ↓
         ┌────────────────────┼────────────────────┐
    Safari :3100          Chrome CDP             Safari :3003
   (IG DM)            (LinkedIn Search)         (TW DM)
         └────────────────────┼────────────────────┘
                              ↓
                   Result → Supabase browser_results table
```

## Supabase Tables (new)

### `browser_command_queue`
```sql
id uuid PRIMARY KEY,
platform text, -- instagram|twitter|linkedin|tiktok|threads|upwork
action text,   -- search|dm|comment|navigate|extract
params jsonb,  -- { keywords, username, message, url, ... }
status text DEFAULT 'pending', -- pending|processing|done|failed
priority int DEFAULT 5,
created_at timestamptz DEFAULT now(),
claimed_at timestamptz,
completed_at timestamptz
```

### `browser_results`
```sql
id uuid PRIMARY KEY,
command_id uuid REFERENCES browser_command_queue(id),
platform text,
action text,
result jsonb,  -- { prospects: [...], success: true, error: null }
created_at timestamptz DEFAULT now()
```

## Local Bridge Daemon (`harness/cloud-bridge.js`)
```
Every 10 seconds:
1. SELECT * FROM browser_command_queue WHERE status='pending' ORDER BY priority DESC LIMIT 5
2. For each command: UPDATE status='processing', claimed_at=now()
3. Route to correct handler:
   - instagram/search → POST :3005/api/instagram/search/hashtag
   - twitter/dm → POST :3003/api/twitter/dm/send
   - linkedin/search → node harness/linkedin-chrome-search.js (CDP)
   - tiktok/search → POST :3006/api/tiktok/search/keyword
4. INSERT into browser_results
5. UPDATE command status='done'/'failed'
```

## Cloud Trigger Points
- Polsia orchestrator (Vercel cron): INSERT command → local executes → result in Supabase
- CRMLite: when contact needs DM → INSERT dm command → local sends → result logged
- AdLite: when prospect needs research → INSERT search command → results fed back
- Any webhook: POST /api/browser-command → Supabase insert → local picks up

## Files to Create
- `harness/cloud-bridge.js` — polls Supabase, routes commands to correct Safari/Chrome service
- `harness/launch-cloud-bridge.sh` — start/stop/status
- Supabase migration: `browser_command_queue` + `browser_results` tables
- Backend route: `GET /api/bridge/status` — shows pending/processing/done counts
- Dashboard panel: Cloud Bridge section in Queue tab

## Security
- Commands validated against allowlist: only known platform+action combos
- Max 100 commands/hour rate limit
- Results never contain credentials or PII beyond what was in the original command
- Supabase RLS: only service role can insert commands

## Success Metrics
- <15s latency from cloud insert to local execution start
- 95% command completion rate
- Bridge handles 500+ commands/day without restart
- Zero failed authentications (proper key rotation)

## Dependencies
- Supabase project: ivhfuhxorppptyuofbgq
- SUPABASE_SERVICE_ROLE_KEY in actp-worker/.env
- All Safari services running (watchdog-safari.sh)
- Chrome CDP running (start-chrome-debug.sh)
