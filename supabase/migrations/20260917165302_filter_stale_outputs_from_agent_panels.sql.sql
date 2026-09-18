/*
# Filter stale outputs from operational agent panels

1. Purpose
- The Admin AI Agents panel was showing stale outputs for delivered/removed donations.
- Operational agents (expiry_prediction, fraud_detection, route_optimization) should
  only show outputs linked to currently active donations (available, claimed, picked).
- Impact analytics should show only its platform-wide summary (donation_id IS NULL),
  since per-donation impact outputs are only viewed via the per-donation selector.
- Donation matching outputs are unaffected (they are loaded via agent_tasks, not this function).

2. Modified database objects
- `public.get_agent_outputs(text, integer)` is recreated with a LEFT JOIN to donations
  and a status filter for operational agent types.
- No tables, columns, or rows are deleted or changed.

3. Security
- The function remains SECURITY DEFINER with search_path = public.
- Execution remains restricted to the authenticated role.
*/

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
    -- Impact analytics: only show platform-wide summaries (donation_id IS NULL)
    IF p_agent_type = 'impact_analytics' THEN
      RETURN QUERY
      SELECT ao.id, ao.agent_type, ao.donation_id, ao.ngo_id, ao.severity,
             ao.title, ao.summary, ao.output, ao.created_at
      FROM public.agent_outputs ao
      WHERE ao.agent_type = p_agent_type
        AND ao.donation_id IS NULL
      ORDER BY ao.created_at DESC
      LIMIT p_limit;
    -- Operational agents: only show outputs linked to active donations
    ELSIF p_agent_type IN ('expiry_prediction', 'fraud_detection', 'route_optimization') THEN
      RETURN QUERY
      SELECT ao.id, ao.agent_type, ao.donation_id, ao.ngo_id, ao.severity,
             ao.title, ao.summary, ao.output, ao.created_at
      FROM public.agent_outputs ao
      LEFT JOIN public.donations d ON d.id = ao.donation_id
      WHERE ao.agent_type = p_agent_type
        AND (
          ao.donation_id IS NULL
          OR d.status IN ('available', 'claimed', 'picked')
        )
      ORDER BY ao.created_at DESC
      LIMIT p_limit;
    ELSE
      RETURN QUERY
      SELECT ao.id, ao.agent_type, ao.donation_id, ao.ngo_id, ao.severity,
             ao.title, ao.summary, ao.output, ao.created_at
      FROM public.agent_outputs ao
      WHERE ao.agent_type = p_agent_type
      ORDER BY ao.created_at DESC
      LIMIT p_limit;
    END IF;
  ELSE
    RETURN QUERY
    SELECT ao.id, ao.agent_type, ao.donation_id, ao.ngo_id, ao.severity,
           ao.title, ao.summary, ao.output, ao.created_at
    FROM public.agent_outputs ao
    ORDER BY ao.created_at DESC
    LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.get_agent_outputs(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_agent_outputs(text, integer) TO authenticated;