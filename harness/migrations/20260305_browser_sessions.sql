-- ============================================================
-- Browser Session Booking System
-- Cloud books sessions → local daemon claims + executes them
-- ============================================================

-- Core session booking table
CREATE TABLE IF NOT EXISTS actp_browser_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform      TEXT NOT NULL CHECK (platform IN ('instagram','twitter','tiktok','threads','linkedin','upwork','market')),
  browser       TEXT NOT NULL CHECK (browser IN ('safari','chrome')) DEFAULT 'safari',
  action        TEXT NOT NULL,
  params        JSONB NOT NULL DEFAULT '{}',
  scheduled_at  TIMESTAMPTZ NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled','running','completed','failed','expired')),
  priority      INT NOT NULL DEFAULT 5,
  goal_tag      TEXT,
  claimed_at    TIMESTAMPTZ,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  result        JSONB,
  error         TEXT,
  self_improvement_notes TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_browser_sessions_status_scheduled
  ON actp_browser_sessions (status, scheduled_at)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_browser_sessions_goal_tag
  ON actp_browser_sessions (goal_tag, created_at DESC);

-- Self-improving strategy configs (updated by improvement loop)
CREATE TABLE IF NOT EXISTS actp_strategy_configs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_name  TEXT UNIQUE NOT NULL,
  platform       TEXT,
  params         JSONB NOT NULL DEFAULT '{}',
  performance    JSONB NOT NULL DEFAULT '{}',
  version        INT NOT NULL DEFAULT 1,
  active         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- Improvement analysis events (one row per improvement run)
CREATE TABLE IF NOT EXISTS actp_improvement_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts                TIMESTAMPTZ NOT NULL DEFAULT now(),
  sessions_analyzed INT NOT NULL DEFAULT 0,
  insights          JSONB,
  strategy_updates  JSONB,
  new_session_types JSONB,
  code_fixes_needed JSONB
);

-- Cloud orchestrator events (one row per booking cycle)
CREATE TABLE IF NOT EXISTS actp_orchestrator_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts               TIMESTAMPTZ NOT NULL DEFAULT now(),
  goals_snapshot   JSONB,
  metrics_snapshot JSONB,
  gaps             JSONB,
  sessions_booked  INT NOT NULL DEFAULT 0,
  sessions_skipped INT NOT NULL DEFAULT 0
);

-- Failure events (self-healer picks these up)
CREATE TABLE IF NOT EXISTS actp_failure_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component    TEXT NOT NULL,
  error_type   TEXT NOT NULL,
  error_message TEXT NOT NULL,
  traceback    TEXT,
  context      JSONB DEFAULT '{}',
  severity     TEXT NOT NULL DEFAULT 'medium'
                 CHECK (severity IN ('low','medium','high','critical')),
  count        INT NOT NULL DEFAULT 1,
  healed       BOOLEAN NOT NULL DEFAULT false,
  healed_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_failure_events_dedup
  ON actp_failure_events (component, error_type)
  WHERE healed = false;

-- Seed default strategy configs
INSERT INTO actp_strategy_configs (strategy_name, platform, params, active) VALUES
  ('instagram:prospect_hunt', 'instagram', '{"keywords": ["ai automation", "saas growth", "build in public"], "max_per_session": 20}', true),
  ('twitter:prospect_hunt',   'twitter',   '{"keywords": ["ai tools", "saas founder", "automation"], "max_per_session": 30}', true),
  ('tiktok:prospect_hunt',    'tiktok',    '{"keywords": ["ai automation", "productivity tools"], "max_per_session": 20}', true),
  ('threads:prospect_hunt',   'threads',   '{"keywords": ["saas", "ai tools", "entrepreneur"], "max_per_session": 15}', true),
  ('linkedin:prospect_hunt',  'linkedin',  '{"strategies": ["recent_posts", "company_search", "icp_filter"], "max_per_session": 10}', true),
  ('upwork:job_scan',         'upwork',    '{"max_hours": 4, "skills": ["react", "nextjs", "api", "automation", "claude"], "budget_min": 50}', true)
ON CONFLICT (strategy_name) DO NOTHING;
