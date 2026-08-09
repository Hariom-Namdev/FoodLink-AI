/*
# Fix claim_agent_task — rename output params to avoid ambiguity

Drop and recreate with different output param names to avoid collision
with the agent_tasks.status column inside UPDATE statements.
*/

DROP FUNCTION IF EXISTS claim_agent_task(text);

CREATE OR REPLACE FUNCTION claim_agent_task(p_status_filter text DEFAULT 'pending')
RETURNS TABLE (
  p_task_id uuid,
  p_donation_id uuid,
  p_status text,
  p_current_ngo_id uuid,
  p_notified_ngo_ids uuid[],
  p_timeout_at timestamptz
) AS $$
BEGIN
  IF p_status_filter = 'pending' THEN
    UPDATE agent_tasks
      SET status = 'validating', updated_at = now()
      WHERE id = (
        SELECT id FROM agent_tasks
        WHERE status = 'pending'
        ORDER BY created_at
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
    RETURNING
      agent_tasks.id,
      agent_tasks.donation_id,
      agent_tasks.status,
      agent_tasks.current_ngo_id,
      agent_tasks.notified_ngo_ids,
      agent_tasks.timeout_at
    INTO
      p_task_id, p_donation_id, p_status, p_current_ngo_id, p_notified_ngo_ids, p_timeout_at;
  END IF;

  IF p_task_id IS NULL AND p_status_filter = 'pending' THEN
    UPDATE agent_tasks
      SET status = 'validating', updated_at = now()
      WHERE id = (
        SELECT id FROM agent_tasks
        WHERE status = 'awaiting_response'
          AND timeout_at IS NOT NULL
          AND timeout_at < now()
        ORDER BY created_at
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
    RETURNING
      agent_tasks.id,
      agent_tasks.donation_id,
      agent_tasks.status,
      agent_tasks.current_ngo_id,
      agent_tasks.notified_ngo_ids,
      agent_tasks.timeout_at
    INTO
      p_task_id, p_donation_id, p_status, p_current_ngo_id, p_notified_ngo_ids, p_timeout_at;
  END IF;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION claim_agent_task(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_agent_task(text) TO service_role;