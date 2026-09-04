-- Fix get_agent_outputs: ambiguous column reference
DROP FUNCTION IF EXISTS public.get_agent_outputs(text, integer) CASCADE;

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
    SELECT ao.id, ao.agent_type, ao.donation_id, ao.ngo_id, ao.severity,
           ao.title, ao.summary, ao.output, ao.created_at
    FROM agent_outputs ao
    WHERE ao.agent_type = p_agent_type
    ORDER BY ao.created_at DESC
    LIMIT p_limit;
  ELSE
    RETURN QUERY
    SELECT ao.id, ao.agent_type, ao.donation_id, ao.ngo_id, ao.severity,
           ao.title, ao.summary, ao.output, ao.created_at
    FROM agent_outputs ao
    ORDER BY ao.created_at DESC
    LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION get_agent_outputs(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_agent_outputs(text, integer) TO authenticated;