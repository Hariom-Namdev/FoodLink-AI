/*
# Smart Donation AI Agent — Schema

1. Purpose
   Supports a custom backend AI Agent that automatically manages the full
   food donation lifecycle: detect new donations, validate, find nearest NGO,
   notify, wait for response, update status, and log every action.

2. New Tables
   - `ngos` — registry of NGOs with location (city, lat, lng) and capacity.
     Seeded from the app's existing NGO dataset so the agent has real
     candidates to match against. Independent from auth.users so the agent
     can read/write without auth constraints.
     - `id` uuid PK
     - `name` text
     - `city` text
     - `lat` numeric, `lng` numeric
     - `capacity` int (meals per day)
     - `category` text
     - `phone` text, `email` text
     - `verified` boolean
   - `agent_tasks` — one row per donation that the agent must process.
     - `id` uuid PK
     - `donation_id` uuid FK -> donations.id
     - `status` text (pending | validating | notifying | awaiting_response | completed | failed)
     - `current_ngo_id` uuid (the NGO currently being notified)
     - `notified_ngo_ids` uuid[] (NGOs already tried, to avoid re-notifying)
     - `retry_count` int
     - `timeout_at` timestamptz (when the current NGO wait expires)
     - `error` text (last error message if failed)
     - `created_at`, `updated_at` timestamptz
   - `agent_activity_log` — append-only log of every action the agent takes.
     - `id` uuid PK
     - `task_id` uuid (nullable, FK -> agent_tasks.id)
     - `donation_id` uuid (nullable, FK -> donations.id)
     - `ngo_id` uuid (nullable, FK -> ngos.id)
     - `action` text (e.g. "donation_detected", "validated", "ngo_notified", "ngo_accepted", "ngo_rejected", "ngo_timeout", "status_updated", "donor_notified")
     - `details` jsonb (structured context about the action)
     - `created_at` timestamptz
   - `agent_notifications` — notifications directed at donors and NGOs.
     - `id` uuid PK
     - `task_id` uuid FK -> agent_tasks.id
     - `donation_id` uuid FK -> donations.id
     - `recipient_type` text (donor | ngo)
     - `recipient_id` uuid (profile id for donor, ngo id for ngo)
     - `ngo_id` uuid (nullable, which NGO this is for)
     - `message` text
     - `type` text (info | accept_request | accepted | rejected | timeout | completed)
     - `read` boolean default false
     - `created_at` timestamptz

3. Security
   - RLS enabled on agent_tasks, agent_activity_log, agent_notifications.
   - All authenticated users can SELECT (dashboard displays agent activity).
   - Only the service role (agent edge functions) can INSERT/UPDATE/DELETE.
     The frontend never writes to these tables directly.
   - `ngos` table: public read (anon + authenticated), no writes from frontend.

4. Notes
   - The agent_tasks table is the durable queue. Edge function instances are
     ephemeral, so all state lives here: which NGOs were tried, which is
     current, when the timeout expires.
   - A trigger on donations INSERT creates the initial agent_task so the
     agent picks it up on its next poll cycle.
*/

-- ============ ngos table ============
CREATE TABLE IF NOT EXISTS ngos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL DEFAULT '',
  lat numeric DEFAULT NULL,
  lng numeric DEFAULT NULL,
  capacity int NOT NULL DEFAULT 10000,
  category text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  verified boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE ngos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_ngos_public" ON ngos;
CREATE POLICY "read_ngos_public" ON ngos FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_ngos_city ON ngos(city);

-- ============ agent_tasks table ============
CREATE TABLE IF NOT EXISTS agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id uuid NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','validating','notifying','awaiting_response','completed','failed')),
  current_ngo_id uuid DEFAULT NULL,
  notified_ngo_ids uuid[] DEFAULT '{}',
  retry_count int NOT NULL DEFAULT 0,
  timeout_at timestamptz DEFAULT NULL,
  error text DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_agent_tasks" ON agent_tasks;
CREATE POLICY "read_agent_tasks" ON agent_tasks FOR SELECT
  TO authenticated USING (true);

-- Only service role writes (agent edge functions use service role key)
DROP POLICY IF EXISTS "write_agent_tasks_service" ON agent_tasks;
CREATE POLICY "write_agent_tasks_service" ON agent_tasks FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_donation ON agent_tasks(donation_id);

-- ============ agent_activity_log table ============
CREATE TABLE IF NOT EXISTS agent_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid DEFAULT NULL REFERENCES agent_tasks(id) ON DELETE CASCADE,
  donation_id uuid DEFAULT NULL REFERENCES donations(id) ON DELETE CASCADE,
  ngo_id uuid DEFAULT NULL REFERENCES ngos(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE agent_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_agent_activity_log" ON agent_activity_log;
CREATE POLICY "read_agent_activity_log" ON agent_activity_log FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "write_agent_activity_log_service" ON agent_activity_log;
CREATE POLICY "write_agent_activity_log_service" ON agent_activity_log FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_agent_activity_log_task ON agent_activity_log(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_activity_log_donation ON agent_activity_log(donation_id);
CREATE INDEX IF NOT EXISTS idx_agent_activity_log_created ON agent_activity_log(created_at DESC);

-- ============ agent_notifications table ============
CREATE TABLE IF NOT EXISTS agent_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES agent_tasks(id) ON DELETE CASCADE,
  donation_id uuid NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  recipient_type text NOT NULL CHECK (recipient_type IN ('donor','ngo')),
  recipient_id uuid DEFAULT NULL,
  ngo_id uuid DEFAULT NULL REFERENCES ngos(id) ON DELETE SET NULL,
  message text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info','accept_request','accepted','rejected','timeout','completed')),
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE agent_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_agent_notifications" ON agent_notifications;
CREATE POLICY "read_agent_notifications" ON agent_notifications FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "write_agent_notifications_service" ON agent_notifications;
CREATE POLICY "write_agent_notifications_service" ON agent_notifications FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_agent_notifications_donation ON agent_notifications(donation_id);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_recipient ON agent_notifications(recipient_id);

-- ============ updated_at trigger for agent_tasks ============
CREATE OR REPLACE FUNCTION update_agent_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_tasks_updated_at ON agent_tasks;
CREATE TRIGGER trg_agent_tasks_updated_at
  BEFORE UPDATE ON agent_tasks
  FOR EACH ROW EXECUTE FUNCTION update_agent_tasks_updated_at();