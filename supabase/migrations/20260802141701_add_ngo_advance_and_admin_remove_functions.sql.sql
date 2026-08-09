/*
# NGO status advancement + Admin removal functions

1. Purpose
   - advance_donation_status: lets the NGO who claimed a donation advance
     its status (claimed → picked → delivered). Logs every action to
     agent_activity_log and notifies both donor and NGO.
   - admin_remove_donation: lets an admin remove an expired/invalid/fake
     donation. Sets status to 'removed', logs to agent_activity_log,
     notifies the donor, and cancels any active agent task.

2. Schema changes
   - Add 'removed' to donations.status CHECK constraint.

3. Security
   - Both functions are SECURITY DEFINER so they can write to
     agent_activity_log, agent_notifications, and agent_tasks.
   - advance_donation_status: callable by authenticated; verifies the
     caller is the NGO that owns the claim.
   - admin_remove_donation: callable by authenticated; verifies the
     caller's profile role is 'admin'.
*/

-- Extend donations status to include 'removed'
ALTER TABLE donations DROP CONSTRAINT IF EXISTS donations_status_check;
ALTER TABLE donations ADD CONSTRAINT donations_status_check
  CHECK (status IN ('available','claimed','picked','delivered','removed'));

-- ============ advance_donation_status ============
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
BEGIN
  IF p_new_status NOT IN ('picked','delivered') THEN
    RAISE EXCEPTION 'Target status must be picked or delivered';
  END IF;

  -- Get the donation
  SELECT * INTO v_donation FROM donations WHERE id = p_donation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Donation not found';
  END IF;

  v_old_status := v_donation.status;

  -- Validate transition
  IF v_old_status = 'claimed' AND p_new_status != 'picked' THEN
    RAISE EXCEPTION 'Can only advance from claimed to picked';
  END IF;
  IF v_old_status = 'picked' AND p_new_status != 'delivered' THEN
    RAISE EXCEPTION 'Can only advance from picked to delivered';
  END IF;
  IF v_old_status NOT IN ('claimed','picked') THEN
    RAISE EXCEPTION 'Donation is not in a claimable state (current: %)', v_old_status;
  END IF;

  -- Find the claim owned by this NGO
  SELECT * INTO v_claim FROM claims
    WHERE donation_id = p_donation_id AND ngo_id = auth.uid()
    LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You have not claimed this donation';
  END IF;

  -- Get NGO name
  SELECT COALESCE(organization, full_name, 'NGO') INTO v_ngo_name
    FROM profiles WHERE id = auth.uid();

  -- Get the agent task id if one exists
  SELECT id INTO v_task_id FROM agent_tasks
    WHERE donation_id = p_donation_id LIMIT 1;

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
    auth.uid(),
    'status_updated',
    jsonb_build_object(
      'from', v_old_status,
      'to', p_new_status,
      'ngo_name', v_ngo_name,
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
    auth.uid(),
    CASE WHEN p_new_status = 'picked'
      THEN CONCAT('You have marked "', v_donation.food_item, '" as picked up.')
      ELSE CONCAT('You have marked "', v_donation.food_item, '" as delivered. Great job!')
    END,
    CASE WHEN p_new_status = 'picked' THEN 'info' ELSE 'completed' END
  );

  -- If delivered, mark agent task as completed
  IF p_new_status = 'delivered' AND v_task_id IS NOT NULL THEN
    UPDATE agent_tasks
      SET status = 'completed', current_ngo_id = NULL, timeout_at = NULL
      WHERE id = v_task_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION advance_donation_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION advance_donation_status(uuid, text) TO authenticated;

-- ============ admin_remove_donation ============
CREATE OR REPLACE FUNCTION admin_remove_donation(
  p_donation_id uuid,
  p_reason text DEFAULT 'Removed by admin'
) RETURNS void AS $$
DECLARE
  v_donation record;
  v_admin_role text;
  v_task_id uuid;
BEGIN
  -- Verify caller is admin
  SELECT role INTO v_admin_role FROM profiles WHERE id = auth.uid();
  IF v_admin_role IS NULL THEN
    RAISE EXCEPTION 'Authenticated profile not found';
  END IF;
  IF v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can remove donations';
  END IF;

  -- Get the donation
  SELECT * INTO v_donation FROM donations WHERE id = p_donation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Donation not found';
  END IF;

  -- Get the agent task id if one exists
  SELECT id INTO v_task_id FROM agent_tasks
    WHERE donation_id = p_donation_id LIMIT 1;

  -- Update donation status to 'removed'
  UPDATE donations SET status = 'removed' WHERE id = p_donation_id;

  -- Cancel any active claim
  UPDATE claims SET status = 'cancelled'
    WHERE donation_id = p_donation_id AND status NOT IN ('delivered','cancelled');

  -- Mark agent task as failed
  IF v_task_id IS NOT NULL THEN
    UPDATE agent_tasks
      SET status = 'failed', error = p_reason, current_ngo_id = NULL, timeout_at = NULL
      WHERE id = v_task_id AND status NOT IN ('completed','failed');
  END IF;

  -- Log to agent activity
  INSERT INTO agent_activity_log (task_id, donation_id, action, details)
  VALUES (
    v_task_id,
    p_donation_id,
    'donation_removed',
    jsonb_build_object(
      'reason', p_reason,
      'food_item', v_donation.food_item,
      'restaurant_name', v_donation.restaurant_name,
      'previous_status', v_donation.status,
      'removed_by', 'admin'
    )
  );

  -- Notify donor
  INSERT INTO agent_notifications (task_id, donation_id, recipient_type, recipient_id, message, type)
  VALUES (
    v_task_id,
    p_donation_id,
    'donor',
    v_donation.restaurant_id,
    CONCAT('Your donation "', v_donation.food_item, '" has been removed by an administrator. Reason: ', p_reason),
    'rejected'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION admin_remove_donation(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_remove_donation(uuid, text) TO authenticated;
