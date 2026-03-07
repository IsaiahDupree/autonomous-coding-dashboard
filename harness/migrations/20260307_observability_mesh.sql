-- ============================================================
-- Observability Mesh — 6 tables
-- Cloud-observable local automation mesh for mac-mini-main
-- ============================================================

-- 1. agent_nodes: registered local execution nodes
CREATE TABLE IF NOT EXISTS agent_nodes (
  node_id            text PRIMARY KEY,
  label              text,
  status             text DEFAULT 'offline',  -- online, stale, offline
  last_heartbeat_at  timestamptz,
  capabilities       jsonb DEFAULT '{}',
  browser_status     jsonb DEFAULT '{}',
  worker_status      jsonb DEFAULT '{}',
  queue_depth        int DEFAULT 0,
  active_goal        text,
  metadata           jsonb DEFAULT '{}',
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

-- 2. worker_status: per-worker state snapshots
CREATE TABLE IF NOT EXISTS worker_status (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id       text REFERENCES agent_nodes(node_id),
  worker_name   text,  -- safari-worker, chrome-worker, dm-sweep, linkedin-daemon, etc.
  status        text,  -- idle, running, blocked, retrying, degraded, needs-reauth, crashed
  current_job   text,
  progress_pct  int,
  last_action   text,
  error         text,
  reported_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worker_status_node_worker_ts
  ON worker_status (node_id, worker_name, reported_at DESC);

-- 3. command_queue: cloud → local typed commands
CREATE TABLE IF NOT EXISTS command_queue (
  command_id      text PRIMARY KEY,
  goal_id         text,
  node_target     text,
  worker_target   text,
  command_type    text NOT NULL,
  priority        text DEFAULT 'normal',  -- critical, high, normal, low
  inputs          jsonb DEFAULT '{}',
  constraints     jsonb DEFAULT '{}',
  status          text DEFAULT 'queued',
    -- queued, received, validated, started, in_progress, waiting,
    -- blocked, retrying, completed, failed, cancelled
  issued_at       timestamptz DEFAULT now(),
  started_at      timestamptz,
  completed_at    timestamptz,
  result          jsonb,
  error           text,
  retry_count     int DEFAULT 0,
  lease_expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_command_queue_node_status
  ON command_queue (node_target, status);

CREATE INDEX IF NOT EXISTS idx_command_queue_status_priority_issued
  ON command_queue (status, priority, issued_at);

-- 4. command_events: append-only lifecycle log
CREATE TABLE IF NOT EXISTS command_events (
  event_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id   text REFERENCES command_queue(command_id),
  node_id      text,
  worker       text,
  status       text,
  progress_pct int,
  message      text,
  data         jsonb,
  timestamp    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_command_events_command_ts
  ON command_events (command_id, timestamp);

-- 5. browser_sessions: browser health snapshots per node
CREATE TABLE IF NOT EXISTS browser_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id       text REFERENCES agent_nodes(node_id),
  browser       text,  -- safari, chrome
  profile       text,
  status        text,  -- authenticated, session-expired, captcha, locked, disconnected, healthy
  active_tabs   int DEFAULT 0,
  current_url   text,
  last_check_at timestamptz DEFAULT now(),
  error         text
);

CREATE INDEX IF NOT EXISTS idx_browser_sessions_node_browser
  ON browser_sessions (node_id, browser);

-- 6. agent_artifacts: results and screenshots uploaded from local
CREATE TABLE IF NOT EXISTS agent_artifacts (
  artifact_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id    text REFERENCES command_queue(command_id),
  node_id       text,
  artifact_type text,  -- screenshot, structured_data, error_dump, research
  storage_path  text,
  content       jsonb,
  created_at    timestamptz DEFAULT now()
);
