-- Fix: COALESCE type mismatch in save_agent_recommendations
-- The `rec->>'match_factors'` returns text, but `'{}'::jsonb` is jsonb.
-- Cast the text result to jsonb before COALESCE.

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
      COALESCE((rec->>'match_factors')::jsonb, '{}'::jsonb),
      NULLIF(rec->>'distance_km', '')::numeric,
      v_rank,
      COALESCE((rec->>'selected')::boolean, false)
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION save_agent_recommendations(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION save_agent_recommendations(uuid, uuid, jsonb) TO service_role;