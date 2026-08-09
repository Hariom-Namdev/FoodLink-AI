/*
# Smart Donation AI Agent — Server Functions

1. Purpose
   SECURITY DEFINER functions that the agent edge function calls (with the
   service role key) to perform privileged operations atomically:
   - `claim_agent_task`: atomically transition a task from pending/awaiting
     to "processing" so two function instances never work on the same task.
   - `update_donation_status`: update a donation's status.
   - `complete_agent_task`: mark a task completed and update the donation
     status to 'claimed' in one call.
   - `log_agent_activity`: append to agent_activity_log.
   - `create_agent_notification`: insert into agent_notifications.
   - `create_claim_for_ngo`: atomically create a claim + update donation status.
   - `complete_donation_delivery`: mark donation as delivered.
   - `seed_ngos`: bulk-insert NGO registry data.

2. Security
   - All functions are SECURITY DEFINER, executable by service_role only.
   - They do not expose any data to anon or authenticated users.
*/

-- ============ claim_agent_task ============
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
      agent_tasks.id AS task_id,
      agent_tasks.donation_id AS donation_id,
      agent_tasks.status AS status,
      agent_tasks.current_ngo_id AS current_ngo_id,
      agent_tasks.notified_ngo_ids AS notified_ngo_ids,
      agent_tasks.timeout_at AS timeout_at
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
      agent_tasks.id AS task_id,
      agent_tasks.donation_id AS donation_id,
      agent_tasks.status AS status,
      agent_tasks.current_ngo_id AS current_ngo_id,
      agent_tasks.notified_ngo_ids AS notified_ngo_ids,
      agent_tasks.timeout_at AS timeout_at
    INTO
      task_id, donation_id, status, current_ngo_id, notified_ngo_ids, timeout_at;
  END IF;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION claim_agent_task(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_agent_task(text) TO service_role;

-- ============ update_donation_status ============
CREATE OR REPLACE FUNCTION update_donation_status(
  p_donation_id uuid,
  p_status text
) RETURNS void AS $$
BEGIN
  UPDATE donations SET status = p_status WHERE id = p_donation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION update_donation_status(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION update_donation_status(uuid, text) TO service_role;

-- ============ log_agent_activity ============
-- p_action is required (no default); all others have defaults and come after.
CREATE OR REPLACE FUNCTION log_agent_activity(
  p_action text,
  p_task_id uuid DEFAULT NULL,
  p_donation_id uuid DEFAULT NULL,
  p_ngo_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
) RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO agent_activity_log (task_id, donation_id, ngo_id, action, details)
  VALUES (p_task_id, p_donation_id, p_ngo_id, p_action, p_details)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION log_agent_activity(text, uuid, uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION log_agent_activity(text, uuid, uuid, uuid, jsonb) TO service_role;

-- ============ create_agent_notification ============
CREATE OR REPLACE FUNCTION create_agent_notification(
  p_task_id uuid,
  p_donation_id uuid,
  p_recipient_type text,
  p_message text,
  p_recipient_id uuid DEFAULT NULL,
  p_ngo_id uuid DEFAULT NULL,
  p_type text DEFAULT 'info'
) RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO agent_notifications (task_id, donation_id, recipient_type, recipient_id, ngo_id, message, type)
  VALUES (p_task_id, p_donation_id, p_recipient_type, p_recipient_id, p_ngo_id, p_message, p_type)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION create_agent_notification(uuid, uuid, text, text, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_agent_notification(uuid, uuid, text, text, uuid, uuid, text) TO service_role;

-- ============ create_claim_for_ngo ============
CREATE OR REPLACE FUNCTION create_claim_for_ngo(
  p_donation_id uuid,
  p_ngo_id uuid,
  p_ngo_name text
) RETURNS uuid AS $$
DECLARE
  v_claim_id uuid;
BEGIN
  INSERT INTO claims (donation_id, ngo_id, ngo_name, status)
  VALUES (p_donation_id, p_ngo_id, p_ngo_name, 'claimed')
  RETURNING id INTO v_claim_id;

  UPDATE donations SET status = 'claimed' WHERE id = p_donation_id;

  RETURN v_claim_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION create_claim_for_ngo(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_claim_for_ngo(uuid, uuid, text) TO service_role;

-- ============ complete_donation_delivery ============
CREATE OR REPLACE FUNCTION complete_donation_delivery(
  p_donation_id uuid,
  p_ngo_id uuid
) RETURNS void AS $$
BEGIN
  UPDATE donations SET status = 'delivered' WHERE id = p_donation_id;
  UPDATE claims SET status = 'delivered'
    WHERE donation_id = p_donation_id AND ngo_id = p_ngo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION complete_donation_delivery(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION complete_donation_delivery(uuid, uuid) TO service_role;

-- ============ seed_ngos ============
CREATE OR REPLACE FUNCTION seed_ngos(
  p_data jsonb
) RETURNS int AS $$
DECLARE
  v_count int;
  item jsonb;
BEGIN
  SELECT count(*) INTO v_count FROM ngos;
  IF v_count > 0 THEN
    RETURN v_count;
  END IF;

  FOR item IN SELECT jsonb_array_elements(p_data)
  LOOP
    INSERT INTO ngos (name, city, lat, lng, capacity, category, phone, email, verified)
    VALUES (
      item->>'name',
      item->>'city',
      NULLIF(item->>'lat','')::numeric,
      NULLIF(item->>'lng','')::numeric,
      COALESCE(NULLIF(item->>'capacity','')::int, 10000),
      item->>'category',
      item->>'phone',
      item->>'email',
      COALESCE(NULLIF(item->>'verified','')::boolean, true)
    );
  END LOOP;

  SELECT count(*) INTO v_count FROM ngos;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION seed_ngos(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION seed_ngos(jsonb) TO service_role;