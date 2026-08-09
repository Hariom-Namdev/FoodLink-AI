/*
# Fix claim_agent_task ambiguous column reference

The RETURNING clause references "status" which is ambiguous between the
agent_tasks table column and the output column name. Qualify all column
references with the table name.
*/

CREATE OR REPLACE FUNCTION claim_agent_task(p_status_filter text DEFAULT 'pending')
RETURNS TABLE (
  task_id uuid,
  donation_id uuid,
  status text,
  current_ngo_id uuid,
  notified_ngo_ids uuid[],
  timeout_at timestamptz
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
      task_id, donation_id, status, current_ngo_id, notified_ngo_ids, timeout_at;
  END IF;

  IF task_id IS NULL AND p_status_filter = 'pending' THEN
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
      task_id, donation_id, status, current_ngo_id, notified_ngo_ids, timeout_at;
  END IF;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION claim_agent_task(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_agent_task(text) TO service_role;