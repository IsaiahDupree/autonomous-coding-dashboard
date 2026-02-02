-- ACD Target Metrics Schema
-- Tracks per-target usage, costs, and performance

CREATE TABLE IF NOT EXISTS targets (
    id SERIAL PRIMARY KEY,
    target_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    path VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    target_id VARCHAR(100) NOT NULL REFERENCES targets(target_id),
    session_number INTEGER NOT NULL,
    
    -- Timing
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- Tokens
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,
    cache_write_tokens INTEGER DEFAULT 0,
    
    -- Cost
    cost_usd DECIMAL(10, 6) DEFAULT 0,
    
    -- Results
    status VARCHAR(50) DEFAULT 'running', -- running, completed, failed, rate_limited
    features_before INTEGER DEFAULT 0,
    features_after INTEGER DEFAULT 0,
    features_completed INTEGER DEFAULT 0,
    commits_made INTEGER DEFAULT 0,
    
    -- Error tracking
    error_type VARCHAR(50),
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS target_daily_stats (
    id SERIAL PRIMARY KEY,
    target_id VARCHAR(100) NOT NULL REFERENCES targets(target_id),
    date DATE NOT NULL,
    
    sessions_count INTEGER DEFAULT 0,
    sessions_successful INTEGER DEFAULT 0,
    sessions_failed INTEGER DEFAULT 0,
    
    total_input_tokens INTEGER DEFAULT 0,
    total_output_tokens INTEGER DEFAULT 0,
    total_cost_usd DECIMAL(10, 6) DEFAULT 0,
    
    features_completed INTEGER DEFAULT 0,
    commits_made INTEGER DEFAULT 0,
    
    avg_session_duration_ms INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(target_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_target ON sessions(target_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_daily_stats_target_date ON target_daily_stats(target_id, date);

-- View for target summaries
CREATE OR REPLACE VIEW target_summaries AS
SELECT 
    t.target_id,
    t.name,
    COUNT(s.id) as total_sessions,
    SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END) as successful_sessions,
    SUM(CASE WHEN s.status = 'failed' THEN 1 ELSE 0 END) as failed_sessions,
    SUM(s.input_tokens) as total_input_tokens,
    SUM(s.output_tokens) as total_output_tokens,
    SUM(s.cost_usd) as total_cost_usd,
    SUM(s.features_completed) as total_features_completed,
    SUM(s.commits_made) as total_commits,
    AVG(s.duration_ms) as avg_session_duration_ms,
    MAX(s.started_at) as last_session_at
FROM targets t
LEFT JOIN sessions s ON t.target_id = s.target_id
GROUP BY t.target_id, t.name;
