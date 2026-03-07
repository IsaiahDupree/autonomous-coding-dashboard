-- RPC function for segment evaluation (dynamic SQL)
CREATE OR REPLACE FUNCTION gdp_evaluate_segment(segment_query TEXT)
RETURNS TABLE(person_id UUID) AS $$
BEGIN
  RETURN QUERY EXECUTE segment_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function for event source counts
CREATE OR REPLACE FUNCTION gdp_event_source_counts()
RETURNS TABLE(source TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
    SELECT e.source, COUNT(*)::BIGINT
    FROM gdp_event e
    GROUP BY e.source
    ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
