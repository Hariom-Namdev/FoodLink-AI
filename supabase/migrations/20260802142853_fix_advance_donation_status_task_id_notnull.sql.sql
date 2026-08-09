/*
# Fix advance_donation_status: ensure task_id is never NULL for notifications

agent_notifications.task_id is NOT NULL. For manual UI claims there is no
agent_tasks record, so the previous version inserted NULL → constraint error.

Fix: if no agent task exists for the donation, create one (status 'completed')
before inserting notifications. This gives us a valid task_id to use.
*/

CREATE OR REPLACE FUNCTION advance_donation_status(
  p_donation_id uuid,
  p_new_status text
) RETURNS void AS $$
DECLARE
  v_claim record;
  v_donation record;
  v_ngo_name text;
  v_task_id uuid;
  v_old_status text;
  v_log_ngo_id uuid;
BEGIN
  IF p_new_status NOT IN ('picked','delivered') THEN
    RAISE EXCEPTION 'Target status must be picked or delivered';
  END IF;

  SELECT * INTO v_donation FROM donations WHERE id = p_donation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Donation not found';
  END IF;

  v_old_status := v_donation.status;

  IF v_old_status = 'claimed' AND p_new_status != 'picked' THEN
    RAISE EXCEPTION 'Can only advance from claimed to picked';
  END IF;
  IF v_old_status = 'picked' AND p_new_status != 'delivered' THEN
    RAISE EXCEPTION 'Can only advance from picked to delivered';
  END IF;
  IF v_old_status NOT IN ('claimed','picked') THEN
    RAISE EXCEPTION 'Donation is not in a claimable state (current: %)', v_old_status;
  END IF;

  SELECT * INTO v_claim FROM claims
    WHERE donation_id = p_donation_id AND ngo_id = auth.uid()
    LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You have not claimed this donation';
  END IF;

  v_log_ngo_id := v_claim.ngo_registry_id;

  SELECT COALESCE(organization, full_name, 'NGO') INTO v_ngo_name
    FROM profiles WHERE id = auth.uid();

  -- Get the agent task id; if none exists (manual UI claim), create one
  SELECT id INTO v_task_id FROM agent_tasks
    WHERE donation_id = p_donation_id LIMIT 1;

  IF v_task_id IS NULL THEN
    INSERT INTO agent_tasks (donation_id, status)
    VALUES (p_donation_id, 'completed')
    RETURNING id INTO v_task_id;
  END IF;

  -- Update donation status
  UPDATE donations SET status = p_new_status WHERE id = p_donation_id;

  -- Update claim status
  UPDATE claims SET status = p_new_status
    WHERE donation_id = p_donation_id AND ngo_id = auth.uid();

  -- Log to agent activity
  INSERT INTO agent_activity_log (task_id, donation_id, ngo_id, action, details)
  VALUES (
    v_task_id,
    p_donation_id,
    v_log_ngo_id,
    'status_updated',
    jsonb_build_object(
      'from', v_old_status,
      'to', p_new_status,
      'ngo_name', v_ngo_name,
      'ngo_profile_id', auth.uid(),
      'food_item', v_donation.food_item,
      'restaurant_name', v_donation.restaurant_name,
      'updated_by', 'ngo'
    )
  );

  -- Notify donor
  INSERT INTO agent_notifications (task_id, donation_id, recipient_type, recipient_id, message, type)
  VALUES (
    v_task_id,
    p_donation_id,
    'donor',
    v_donation.restaurant_id,
    CASE WHEN p_new_status = 'picked'
      THEN CONCAT('Your donation "', v_donation.food_item, '" has been picked up by ', v_ngo_name, '. It is on its way!')
      ELSE CONCAT('Your donation "', v_donation.food_item, '" has been delivered by ', v_ngo_name, '. Thank you for feeding ', v_donation.meals::text, ' people!')
    END,
    CASE WHEN p_new_status = 'picked' THEN 'info' ELSE 'completed' END
  );

  -- Notify NGO
  INSERT INTO agent_notifications (task_id, donation_id, recipient_type, ngo_id, message, type)
  VALUES (
    v_task_id,
    p_donation_id,
    'ngo',
    v_log_ngo_id,
    CASE WHEN p_new_status = 'picked'
      THEN CONCAT('You have marked "', v_donation.food_item, '" as picked up.')
      ELSE CONCAT('You have marked "', v_donation.food_item, '" as delivered. Great job!')
    END,
    CASE WHEN p_new_status = 'picked' THEN 'info' ELSE 'completed' END
  );

  -- If delivered, mark agent task as completed
  IF p_new_status = 'delivered' THEN
    UPDATE agent_tasks
      SET status = 'completed', current_ngo_id = NULL, timeout_at = NULL
      WHERE id = v_task_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION advance_donation_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION advance_donation_status(uuid, text) TO authenticated;
