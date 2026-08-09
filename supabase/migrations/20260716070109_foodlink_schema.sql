/*
# FoodLink AI — Core Schema

1. Purpose
   Multi-user food donation platform. Users sign up as one of four roles
   (restaurant, ngo, volunteer, admin). Restaurants create donations;
   NGOs claim them; volunteers deliver them. Admins oversee everything.

2. New Tables
   - `profiles` — extends auth.users with role + org info (1:1 with auth.users)
     - `id` uuid PK = auth.users.id
     - `full_name` text
     - `role` text (restaurant | ngo | volunteer | admin)
     - `organization` text
     - `phone` text
     - `city` text
     - `created_at` timestamptz
   - `donations` — surplus food listings created by restaurants
     - `id` uuid PK
     - `restaurant_id` uuid FK -> profiles.id (owner)
     - `restaurant_name` text (denormalized for display)
     - `food_item` text
     - `category` text
     - `quantity` int
     - `meals` int (estimated people fed)
     - `city` text
     - `lat` numeric, `lng` numeric (pickup location)
     - `prep_time` timestamptz
     - `expiry_hours` int (AI freshness input)
     - `freshness_score` int (0-100, AI-predicted)
     - `status` text (available | claimed | picked | delivered)
     - `image_url` text
     - `created_at` timestamptz
   - `claims` — NGO claims on donations (1:1 with donation)
     - `id` uuid PK
     - `donation_id` uuid FK -> donations.id
     - `ngo_id` uuid FK -> profiles.id (owner)
     - `ngo_name` text
     - `status` text (claimed | picked | delivered | cancelled)
     - `created_at` timestamptz
   - `deliveries` — volunteer delivery records
     - `id` uuid PK
     - `donation_id` uuid FK -> donations.id
     - `volunteer_id` uuid FK -> profiles.id (owner)
     - `volunteer_name` text
     - `distance_km` numeric
     - `status` text (assigned | in_transit | completed)
     - `reward_points` int
     - `created_at` timestamptz

3. Security
   - RLS enabled on all tables.
   - profiles: owner-scoped CRUD (authenticated, auth.uid() = id).
   - donations: owner can CRUD own rows; all authenticated can SELECT.
   - claims: owner (ngo) can CRUD own; all authenticated can SELECT.
   - deliveries: owner (volunteer) can CRUD own; all authenticated can SELECT.

4. Notes
   - `user_id`/owner columns default to auth.uid() so inserts omitting them succeed.
   - Seed data is NOT inserted here (no auth users exist yet); the frontend
     uses a hybrid approach: real Supabase data when available, falls back to
     bundled dummy data so the demo always works.
*/

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'restaurant' CHECK (role IN ('restaurant','ngo','volunteer','admin')),
  organization text DEFAULT '',
  phone text DEFAULT '',
  city text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- donations
CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_name text NOT NULL DEFAULT '',
  food_item text NOT NULL,
  category text NOT NULL,
  quantity int NOT NULL DEFAULT 0,
  meals int NOT NULL DEFAULT 0,
  city text NOT NULL DEFAULT '',
  lat numeric DEFAULT NULL,
  lng numeric DEFAULT NULL,
  prep_time timestamptz DEFAULT now(),
  expiry_hours int NOT NULL DEFAULT 6,
  freshness_score int NOT NULL DEFAULT 90,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','claimed','picked','delivered')),
  image_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_all_donations" ON donations;
CREATE POLICY "select_all_donations" ON donations FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_donation" ON donations;
CREATE POLICY "insert_own_donation" ON donations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = restaurant_id);

DROP POLICY IF EXISTS "update_own_donation" ON donations;
CREATE POLICY "update_own_donation" ON donations FOR UPDATE
  TO authenticated USING (auth.uid() = restaurant_id) WITH CHECK (auth.uid() = restaurant_id);

DROP POLICY IF EXISTS "delete_own_donation" ON donations;
CREATE POLICY "delete_own_donation" ON donations FOR DELETE
  TO authenticated USING (auth.uid() = restaurant_id);

-- claims
CREATE TABLE IF NOT EXISTS claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id uuid NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  ngo_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  ngo_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed','picked','delivered','cancelled')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_all_claims" ON claims;
CREATE POLICY "select_all_claims" ON claims FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_claim" ON claims;
CREATE POLICY "insert_own_claim" ON claims FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = ngo_id);

DROP POLICY IF EXISTS "update_own_claim" ON claims;
CREATE POLICY "update_own_claim" ON claims FOR UPDATE
  TO authenticated USING (auth.uid() = ngo_id) WITH CHECK (auth.uid() = ngo_id);

DROP POLICY IF EXISTS "delete_own_claim" ON claims;
CREATE POLICY "delete_own_claim" ON claims FOR DELETE
  TO authenticated USING (auth.uid() = ngo_id);

-- deliveries
CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id uuid NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  volunteer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  volunteer_name text NOT NULL DEFAULT '',
  distance_km numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','in_transit','completed')),
  reward_points int NOT NULL DEFAULT 10,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_all_deliveries" ON deliveries;
CREATE POLICY "select_all_deliveries" ON deliveries FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_delivery" ON deliveries;
CREATE POLICY "insert_own_delivery" ON deliveries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = volunteer_id);

DROP POLICY IF EXISTS "update_own_delivery" ON deliveries;
CREATE POLICY "update_own_delivery" ON deliveries FOR UPDATE
  TO authenticated USING (auth.uid() = volunteer_id) WITH CHECK (auth.uid() = volunteer_id);

DROP POLICY IF EXISTS "delete_own_delivery" ON deliveries;
CREATE POLICY "delete_own_delivery" ON deliveries FOR DELETE
  TO authenticated USING (auth.uid() = volunteer_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_city ON donations(city);
CREATE INDEX IF NOT EXISTS idx_donations_restaurant ON donations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_claims_ngo ON claims(ngo_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_volunteer ON deliveries(volunteer_id);
