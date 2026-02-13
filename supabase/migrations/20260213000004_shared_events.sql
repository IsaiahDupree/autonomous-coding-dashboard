-- shared_events: cross-product analytics events
CREATE TABLE IF NOT EXISTS shared_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES shared_users(id) ON DELETE SET NULL,
  anonymous_id VARCHAR(255), -- for pre-auth tracking
  product VARCHAR(50) NOT NULL,
  event_name VARCHAR(255) NOT NULL,
  properties JSONB DEFAULT '{}',
  context JSONB DEFAULT '{}', -- {ip, user_agent, page_url, referrer, utm_*}
  session_id VARCHAR(255),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Partition by month for performance (or just index well)
CREATE INDEX idx_events_user ON shared_events(user_id);
CREATE INDEX idx_events_product ON shared_events(product);
CREATE INDEX idx_events_name ON shared_events(event_name);
CREATE INDEX idx_events_timestamp ON shared_events(timestamp);
CREATE INDEX idx_events_session ON shared_events(session_id);
CREATE INDEX idx_events_product_name ON shared_events(product, event_name);
