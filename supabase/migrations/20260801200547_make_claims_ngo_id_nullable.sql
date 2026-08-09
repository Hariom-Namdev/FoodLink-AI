/*
# Make claims.ngo_id nullable for agent-created claims

The agent creates claims for NGOs from the `ngos` registry (not auth users),
so ngo_id (which references profiles.id) must be nullable. The DEFAULT
auth.uid() stays for user-created claims.
*/

ALTER TABLE claims ALTER COLUMN ngo_id DROP NOT NULL;