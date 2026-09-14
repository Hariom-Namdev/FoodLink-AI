/*
# Fix per-donation agent output lookup

1. Purpose
- Corrects the Admin AI Agents panel lookup that retrieves the latest agent results for one donation.
- Qualifies the `agent_outputs.donation_id` column so it cannot be confused with the function parameter.

2. Modified database objects
- `public.get_agent_outputs_by_donation(uuid, text)` is recreated with an unambiguous table alias.
- No tables, columns, rows, or existing agent outputs are deleted or changed.

3. Security
- The function remains `SECURITY DEFINER` with `search_path = public`.
- Execution remains restricted to the authenticated role.

4. Important notes
- Results remain limited to the most recent 20 outputs for a donation, or 5 outputs for a selected agent type.
- This fixes reads only; agent output creation and lifecycle behavior are unchanged.
*/

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
    SELECT ao.id, ao.agent_type, ao.donation_id, ao.ngo_id, ao.severity,
           ao.title, ao.summary, ao.output, ao.created_at
    FROM public.agent_outputs AS ao
    WHERE ao.donation_id = p_donation_id
      AND ao.agent_type = p_agent_type
    ORDER BY ao.created_at DESC
    LIMIT 5;
  ELSE
    RETURN QUERY
    SELECT ao.id, ao.agent_type, ao.donation_id, ao.ngo_id, ao.severity,
           ao.title, ao.summary, ao.output, ao.created_at
    FROM public.agent_outputs AS ao
    WHERE ao.donation_id = p_donation_id
    ORDER BY ao.created_at DESC
    LIMIT 20;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.get_agent_outputs_by_donation(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_agent_outputs_by_donation(uuid, text) TO authenticated;