-- Cross-product analytics materialized views
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_journey AS
SELECT
  su.id as user_id,
  su.email,
  su.created_at as user_created_at,
  array_agg(DISTINCT se.product) as products_used,
  count(DISTINCT se.product) as product_count,
  count(se.id) as total_events,
  min(se.timestamp) as first_event_at,
  max(se.timestamp) as last_event_at,
  jsonb_object_agg(
    se.product,
    se.event_count
  ) as events_by_product
FROM shared_users su
LEFT JOIN (
  SELECT user_id, product, count(*) as event_count
  FROM shared_events
  GROUP BY user_id, product
) se ON se.user_id = su.id
GROUP BY su.id, su.email, su.created_at;

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_product_metrics AS
SELECT
  product,
  date_trunc('day', timestamp) as day,
  count(*) as total_events,
  count(DISTINCT user_id) as unique_users,
  count(DISTINCT session_id) as sessions,
  jsonb_object_agg(event_name, event_count) as events_breakdown
FROM (
  SELECT product, timestamp, user_id, session_id, event_name,
    count(*) OVER (PARTITION BY product, event_name, date_trunc('day', timestamp)) as event_count
  FROM shared_events
) sub
GROUP BY product, date_trunc('day', timestamp);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_entitlement_summary AS
SELECT
  product,
  plan,
  status,
  count(*) as user_count,
  count(*) FILTER (WHERE status = 'active') as active_count,
  count(*) FILTER (WHERE status = 'trialing') as trial_count,
  count(*) FILTER (WHERE status = 'cancelled') as cancelled_count
FROM shared_entitlements
GROUP BY product, plan, status;

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_journey;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_metrics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_entitlement_summary;
END;
$$ LANGUAGE plpgsql;

-- Unique indexes for concurrent refresh
CREATE UNIQUE INDEX idx_mv_user_journey_user ON mv_user_journey(user_id);
CREATE UNIQUE INDEX idx_mv_product_metrics_key ON mv_product_metrics(product, day);
CREATE UNIQUE INDEX idx_mv_entitlement_key ON mv_entitlement_summary(product, plan, status);
