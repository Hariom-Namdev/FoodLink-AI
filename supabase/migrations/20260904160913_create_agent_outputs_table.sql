-- ============ Agent Outputs Table ============
-- Stores outputs from all 5 AI agents. Each agent writes its analysis
-- results here as structured JSONB, queryable by agent_type.

CREATE TABLE IF NOT EXISTS agent_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type text NOT NULL,
  donation_id uuid REFERENCES donations(id) ON DELETE CASCADE,
  ngo_id uuid REFERENCES ngos(id) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL DEFAULT '',
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_outputs_agent_type ON agent_outputs(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_outputs_donation_id ON agent_outputs(donation_id);
CREATE INDEX IF NOT EXISTS idx_agent_outputs_created_at ON agent_outputs(created_at DESC);

ALTER TABLE agent_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_agent_outputs" ON agent_outputs FOR SELECT
  TO authenticated USING (public.is_current_user_admin());

CREATE POLICY "service_all_agent_outputs" ON agent_outputs FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- ============ SECURITY DEFINER: save_agent_output ============
CREATE OR REPLACE FUNCTION public.save_agent_output(
  p_agent_type text,
  p_severity text,
  p_title text,
  p_summary text,
  p_output jsonb,
  p_donation_id uuid DEFAULT NULL,
  p_ngo_id uuid DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO agent_outputs (
    agent_type, severity, title, summary, output, donation_id, ngo_id
  ) VALUES (
    p_agent_type, p_severity, p_title, p_summary, p_output, p_donation_id, p_ngo_id
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION save_agent_output(text, text, text, text, jsonb, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION save_agent_output(text, text, text, text, jsonb, uuid, uuid) TO service_role;

-- ============ SECURITY DEFINER: get_agent_outputs ============
CREATE OR REPLACE FUNCTION public.get_agent_outputs(
  p_agent_type text DEFAULT NULL,
  p_limit integer DEFAULT 20
) RETURNS TABLE (
  id uuid,
  agent_type text,
  donation_id uuid,
  ngo_id uuid,
  severity text,
  title text,
  summary text,
  output jsonb,
  created_at timestamptz
) AS $$
BEGIN
  IF p_agent_type IS NOT NULL THEN
    RETURN QUERY
    SELECT * FROM agent_outputs
    WHERE agent_type = p_agent_type
    ORDER BY created_at DESC
    LIMIT p_limit;
  ELSE
    RETURN QUERY
    SELECT * FROM agent_outputs
    ORDER BY created_at DESC
    LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION get_agent_outputs(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_agent_outputs(text, integer) TO authenticated;

-- ============ Drop and recreate get_agent_summary with new columns ============
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
      COUNT(*) FILTER (WHERE at.status = 'failed')::bigint AS failed_tasks,
      COALESCE((
        SELECT COUNT(*) FROM agent_recommendations ar WHERE ar.task_id = at.id
      ), 0)::bigint AS total_recommendations,
      COALESCE((
        SELECT AVG(match_score) FROM agent_recommendations ar WHERE ar.task_id = at.id AND ar.rank = 1
      ), 0)::numeric AS avg_match_score
    FROM agent_tasks at
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
    COALESCE(ts.total_recommendations, 0)::bigint AS total_recommendations,
    COALESCE(ts.avg_match_score, 0)::numeric AS avg_match_score,
    COALESCE(os.total_outputs, 0)::bigint AS total_outputs,
    os.latest_output_at
  FROM agent_types t
  LEFT JOIN task_stats ts ON ts.agent_type = t.agent_type
  LEFT JOIN output_stats os ON os.agent_type = t.agent_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION get_agent_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_agent_summary() TO authenticated;