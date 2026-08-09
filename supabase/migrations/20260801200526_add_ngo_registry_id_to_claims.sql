/*
# Add ngo_registry_id to claims for agent-created claims

1. Purpose
   The Smart Donation AI Agent matches donations to NGOs from the `ngos`
   registry table (which is independent of auth.users). The existing `claims`
   table has `ngo_id` FK → profiles(id), which the agent's NGOs don't have.
   Add a nullable `ngo_registry_id` column that references `ngos(id)` so the
   agent can create claims for registry NGOs. The existing `ngo_id` column
   stays for user-authenticated claims.

2. Changes
   - Add `ngo_registry_id uuid REFERENCES ngos(id) ON DELETE SET NULL` to claims.
   - Update `create_claim_for_ngo` to set ngo_registry_id instead of ngo_id
     when the NGO is from the registry.
   - Add a new function `create_claim_for_registry_ngo` that creates a claim
     with ngo_registry_id and null ngo_id (bypassing the profiles FK).

3. Security
   - No RLS policy changes needed (service role bypasses RLS).
*/

-- Add ngo_registry_id column to claims
ALTER TABLE claims ADD COLUMN IF NOT EXISTS ngo_registry_id uuid REFERENCES ngos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_claims_ngo_registry ON claims(ngo_registry_id);

-- Drop the old function and recreate with registry support
DROP FUNCTION IF EXISTS create_claim_for_ngo(uuid, uuid, text);

CREATE OR REPLACE FUNCTION create_claim_for_ngo(
  p_donation_id uuid,
  p_ngo_id uuid,
  p_ngo_name text
) RETURNS uuid AS $$
DECLARE
  v_claim_id uuid;
  v_is_registry boolean;
BEGIN
  -- Check if this NGO is in the registry (not a profile)
  SELECT EXISTS(SELECT 1 FROM ngos WHERE id = p_ngo_id) INTO v_is_registry;

  IF v_is_registry THEN
    INSERT INTO claims (donation_id, ngo_id, ngo_registry_id, ngo_name, status)
    VALUES (p_donation_id, NULL, p_ngo_id, p_ngo_name, 'claimed')
    RETURNING id INTO v_claim_id;
  ELSE
    INSERT INTO claims (donation_id, ngo_id, ngo_name, status)
    VALUES (p_donation_id, p_ngo_id, p_ngo_name, 'claimed')
    RETURNING id INTO v_claim_id;
  END IF;

  UPDATE donations SET status = 'claimed' WHERE id = p_donation_id;

  RETURN v_claim_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION create_claim_for_ngo(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_claim_for_ngo(uuid, uuid, text) TO service_role;

-- Also update complete_donation_delivery to work with registry NGOs
DROP FUNCTION IF EXISTS complete_donation_delivery(uuid, uuid);

CREATE OR REPLACE FUNCTION complete_donation_delivery(
  p_donation_id uuid,
  p_ngo_id uuid
) RETURNS void AS $$
BEGIN
  UPDATE donations SET status = 'delivered' WHERE id = p_donation_id;
  UPDATE claims SET status = 'delivered'
    WHERE donation_id = p_donation_id
      AND (ngo_id = p_ngo_id OR ngo_registry_id = p_ngo_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION complete_donation_delivery(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION complete_donation_delivery(uuid, uuid) TO service_role;