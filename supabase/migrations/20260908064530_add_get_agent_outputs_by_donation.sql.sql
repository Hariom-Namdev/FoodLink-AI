-- Add function to get agent outputs filtered by donation_id
-- Used by the AI Agents panel to show per-donation agent results

CREATE OR REPLACE FUNCTION public.get_agent_outputs_by_donation(
  p_donation_id uuid,
  p_agent_type text DEFAULT NULL
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
    WHERE donation_id = p_donation_id AND agent_type = p_agent_type
    ORDER BY created_at DESC
    LIMIT 5;
  ELSE
    RETURN QUERY
    SELECT * FROM agent_outputs
    WHERE donation_id = p_donation_id
    ORDER BY created_at DESC
    LIMIT 20;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION get_agent_outputs_by_donation(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_agent_outputs_by_donation(uuid, text) TO authenticated;
