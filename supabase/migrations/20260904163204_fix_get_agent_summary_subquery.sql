-- Fix get_agent_summary: correlated subqueries referencing at.id inside GROUP BY
DROP FUNCTION IF EXISTS public.get_agent_summary() CASCADE;

CREATE OR REPLACE FUNCTION public.get_agent_summary()
RETURNS TABLE (
  agent_type text,
  total_tasks bigint,
  pending_tasks bigint,
  completed_tasks bigint,
  failed_tasks bigint,
  total_recommendations bigint,
  avg_match_score numeric,
  total_outputs bigint,
  latest_output_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  WITH agent_types AS (
    SELECT unnest(ARRAY[
      'donation_matching',
      'expiry_prediction',
      'route_optimization',
      'fraud_detection',
      'impact_analytics'
    ]) AS agent_type
  ),
  task_stats AS (
    SELECT
      at.agent_type,
      COUNT(*)::bigint AS total_tasks,
      COUNT(*) FILTER (WHERE at.status IN ('pending','validating','notifying','awaiting_response'))::bigint AS pending_tasks,
      COUNT(*) FILTER (WHERE at.status = 'completed')::bigint AS completed_tasks,
      COUNT(*) FILTER (WHERE at.status = 'failed')::bigint AS failed_tasks
    FROM agent_tasks at
    GROUP BY at.agent_type
  ),
  rec_stats AS (
    SELECT
      at.agent_type,
      COUNT(ar.id)::bigint AS total_recommendations,
      COALESCE(AVG(ar.match_score) FILTER (WHERE ar.rank = 1), 0)::numeric AS avg_match_score
    FROM agent_tasks at
    LEFT JOIN agent_recommendations ar ON ar.task_id = at.id
    GROUP BY at.agent_type
  ),
  output_stats AS (
    SELECT
      ao.agent_type,
      COUNT(*)::bigint AS total_outputs,
      MAX(ao.created_at) AS latest_output_at
    FROM agent_outputs ao
    GROUP BY ao.agent_type
  )
  SELECT
    t.agent_type,
    COALESCE(ts.total_tasks, 0)::bigint AS total_tasks,
    COALESCE(ts.pending_tasks, 0)::bigint AS pending_tasks,
    COALESCE(ts.completed_tasks, 0)::bigint AS completed_tasks,
    COALESCE(ts.failed_tasks, 0)::bigint AS failed_tasks,
    COALESCE(rs.total_recommendations, 0)::bigint AS total_recommendations,
    COALESCE(rs.avg_match_score, 0)::numeric AS avg_match_score,
    COALESCE(os.total_outputs, 0)::bigint AS total_outputs,
    os.latest_output_at
  FROM agent_types t
  LEFT JOIN task_stats ts ON ts.agent_type = t.agent_type
  LEFT JOIN rec_stats rs ON rs.agent_type = t.agent_type
  LEFT JOIN output_stats os ON os.agent_type = t.agent_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION get_agent_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_agent_summary() TO authenticated;