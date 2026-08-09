/*
# Auto-create agent task on new donation

1. Purpose
   When a restaurant creates a donation (INSERT into donations), this trigger
   automatically creates a row in agent_tasks with status 'pending'. The
   Smart Donation AI Agent edge function polls agent_tasks and picks up any
   pending task on its next cycle — no manual intervention needed.

2. Changes
   - `create_agent_task_on_donation()` PL/pgSQL function (SECURITY DEFINER)
     so it can write to agent_tasks even when the INSERT runs as an
     authenticated user (who has no write permission on agent_tasks).
   - AFTER INSERT trigger on donations.

3. Security
   - The function runs with definer privileges (service role / postgres).
   - It only inserts into agent_tasks; it never modifies the donation.
*/

CREATE OR REPLACE FUNCTION create_agent_task_on_donation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO agent_tasks (donation_id, status)
  VALUES (NEW.id, 'pending')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_create_agent_task_on_donation ON donations;
CREATE TRIGGER trg_create_agent_task_on_donation
  AFTER INSERT ON donations
  FOR EACH ROW EXECUTE FUNCTION create_agent_task_on_donation();