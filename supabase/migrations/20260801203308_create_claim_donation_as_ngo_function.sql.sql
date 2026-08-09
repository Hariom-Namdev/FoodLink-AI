/*
# NGO claim donation function

1. Purpose
   Allows an authenticated NGO user to manually claim an available donation
   from the "Available Food Donations" page. This atomically:
   - Checks the donation is still 'available' (prevents double-claims)
   - Inserts a claim row owned by the NGO
   - Updates the donation status to 'claimed'
   - Marks the agent_task (if any) as completed so the AI Agent stops
     notifying other NGOs about this donation.

2. Security
   - SECURITY DEFINER so it can write to agent_tasks (which authenticated
     users cannot do directly).
   - Executable by authenticated users only.
   - Uses auth.uid() to identify the claiming NGO — never trusts a
     client-supplied ngo_id.
*/

CREATE OR REPLACE FUNCTION claim_donation_as_ngo(p_donation_id uuid)
RETURNS uuid AS $$
DECLARE
  v_claim_id uuid;
  v_ngo_name text;
BEGIN
  -- Get the NGO's display name from their profile
  SELECT COALESCE(organization, full_name, 'NGO') INTO v_ngo_name
  FROM profiles WHERE id = auth.uid();

  IF v_ngo_name IS NULL THEN
    RAISE EXCEPTION 'Authenticated NGO profile not found';
  END IF;

  -- Atomically claim: only if donation is still available
  INSERT INTO claims (donation_id, ngo_id, ngo_name, status)
  SELECT p_donation_id, auth.uid(), v_ngo_name, 'claimed'
  FROM donations
  WHERE id = p_donation_id AND status = 'available'
  RETURNING id INTO v_claim_id;

  IF v_claim_id IS NULL THEN
    RAISE EXCEPTION 'Donation is no longer available or does not exist';
  END IF;

  -- Update donation status
  UPDATE donations SET status = 'claimed' WHERE id = p_donation_id;

  -- Mark any agent_task as completed so the AI Agent stops processing
  UPDATE agent_tasks
    SET status = 'completed', current_ngo_id = NULL, timeout_at = NULL
    WHERE donation_id = p_donation_id AND status NOT IN ('completed', 'failed');

  RETURN v_claim_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION claim_donation_as_ngo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION claim_donation_as_ngo(uuid) TO authenticated;
