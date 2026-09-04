-- ============ Agent Recommendations Table ============
-- Stores ranked NGO match recommendations from the Donation Matching Agent.
-- Each row is one NGO recommendation for one donation, with a match score,
-- reasoning, and match factors broken down by category.

CREATE TABLE IF NOT EXISTS agent_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES agent_tasks(id) ON DELETE CASCADE,
  donation_id uuid NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  ngo_id uuid NOT NULL REFERENCES ngos(id) ON DELETE CASCADE,

  -- Match score 0-100
  match_score integer NOT NULL DEFAULT 0,

  -- AI reasoning text (human-readable explanation)
  reasoning text NOT NULL DEFAULT '',

  -- Individual factor scores as JSONB
  -- e.g. {"distance": 85, "capacity": 90, "category_fit": 75, "urgency": 80, "freshness": 95}
  match_factors jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Distance in km from donation to NGO
  distance_km numeric DEFAULT NULL,

  -- Rank among all candidates for this donation (1 = best)
  rank integer NOT NULL DEFAULT 0,

  -- Whether this NGO was selected by the agent
  selected boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agent_recs_donation_id ON agent_recommendations(donation_id);
CREATE INDEX IF NOT EXISTS idx_agent_recs_task_id ON agent_recommendations(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_recs_rank ON agent_recommendations(donation_id, rank);
CREATE INDEX IF NOT EXISTS idx_agent_recs_created_at ON agent_recommendations(created_at DESC);

-- Enable RLS
ALTER TABLE agent_recommendations ENABLE ROW LEVEL SECURITY;

-- Admins can read all recommendations
CREATE POLICY "admin_read_agent_recommendations" ON agent_recommendations FOR SELECT
  TO authenticated USING (public.is_current_user_admin());

-- Service role can do everything (for edge function)
CREATE POLICY "service_all_agent_recommendations" ON agent_recommendations FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- ============ Add agent_type to agent_tasks ============
-- Allows the admin dashboard to filter/group tasks by agent type.
-- Default 'donation_matching' for existing tasks.
ALTER TABLE agent_tasks ADD COLUMN IF NOT EXISTS agent_type text NOT NULL DEFAULT 'donation_matching';

-- Add index for agent_type filtering
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent_type ON agent_tasks(agent_type);

-- ============ SECURITY DEFINER: save_agent_recommendations ============
-- Called by the edge function (service_role) to bulk-insert recommendations.
CREATE OR REPLACE FUNCTION public.save_agent_recommendations(
  p_task_id uuid,
  p_donation_id uuid,
  p_recommendations jsonb
) RETURNS void AS $$
DECLARE
  rec jsonb;
  v_rank integer := 0;
BEGIN
  -- Delete old recommendations for this task (in case of reprocessing)
  DELETE FROM agent_recommendations WHERE task_id = p_task_id;

  FOR rec IN SELECT jsonb_array_elements(p_recommendations)
  LOOP
    v_rank := v_rank + 1;
    INSERT INTO agent_recommendations (
      task_id, donation_id, ngo_id, match_score, reasoning,
      match_factors, distance_km, rank, selected
    ) VALUES (
      p_task_id,
      p_donation_id,
      (rec->>'ngo_id')::uuid,
      COALESCE((rec->>'match_score')::int, 0),
      COALESCE(rec->>'reasoning', ''),
      COALESCE(rec->>'match_factors', '{}'::jsonb),
      NULLIF(rec->>'distance_km', '')::numeric,
      v_rank,
      COALESCE((rec->>'selected')::boolean, false)
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION save_agent_recommendations(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION save_agent_recommendations(uuid, uuid, jsonb) TO service_role;

-- ============ SECURITY DEFINER: get_donation_recommendations ============
-- Called by the admin dashboard (authenticated) to fetch recommendations
-- for a specific donation, with NGO details joined.
CREATE OR REPLACE FUNCTION public.get_donation_recommendations(
  p_donation_id uuid
) RETURNS TABLE (
  id uuid,
  task_id uuid,
  donation_id uuid,
  ngo_id uuid,
  ngo_name text,
  ngo_city text,
  ngo_category text,
  ngo_capacity integer,
  match_score integer,
  reasoning text,
  match_factors jsonb,
  distance_km numeric,
  rank integer,
  selected boolean,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.id,
    ar.task_id,
    ar.donation_id,
    ar.ngo_id,
    n.name AS ngo_name,
    n.city AS ngo_city,
    n.category AS ngo_category,
    n.capacity AS ngo_capacity,
    ar.match_score,
    ar.reasoning,
    ar.match_factors,
    ar.distance_km,
    ar.rank,
    ar.selected,
    ar.created_at
  FROM agent_recommendations ar
  JOIN ngos n ON n.id = ar.ngo_id
  WHERE ar.donation_id = p_donation_id
  ORDER BY ar.rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION get_donation_recommendations(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_donation_recommendations(uuid) TO authenticated;

-- ============ SECURITY DEFINER: get_agent_summary ============
-- Returns a summary of all agents for the admin dashboard.
-- Designed to be extensible: returns agent_type, count, status counts.
CREATE OR REPLACE FUNCTION public.get_agent_summary()
RETURNS TABLE (
  agent_type text,
  total_tasks bigint,
  pending_tasks bigint,
  completed_tasks bigint,
  failed_tasks bigint,
  total_recommendations bigint,
  avg_match_score numeric
) AS $$
BEGIN
  RETURN QUERY
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
  GROUP BY at.agent_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION get_agent_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_agent_summary() TO authenticated;