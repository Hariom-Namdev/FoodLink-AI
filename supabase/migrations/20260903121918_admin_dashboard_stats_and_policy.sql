-- Allow admins to read all profiles (needed for admin dashboard stats and detail modals)
CREATE POLICY "admin_select_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Function to get admin dashboard stats in a single call
CREATE OR REPLACE FUNCTION admin_get_dashboard_stats()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'restaurants', (SELECT COUNT(*) FROM profiles WHERE role = 'restaurant'),
    'ngos', (SELECT COUNT(*) FROM profiles WHERE role = 'ngo'),
    'volunteers', (SELECT COUNT(*) FROM profiles WHERE role = 'volunteer'),
    'total_donations', (SELECT COUNT(*) FROM donations),
    'available', (SELECT COUNT(*) FROM donations WHERE status = 'available'),
    'claimed', (SELECT COUNT(*) FROM donations WHERE status = 'claimed'),
    'picked', (SELECT COUNT(*) FROM donations WHERE status = 'picked'),
    'delivered', (SELECT COUNT(*) FROM donations WHERE status = 'delivered'),
    'removed', (SELECT COUNT(*) FROM donations WHERE status = 'removed'),
    'total_meals', (SELECT COALESCE(SUM(meals), 0) FROM donations WHERE status != 'removed'),
    'total_claims', (SELECT COUNT(*) FROM claims),
    'active_claims', (SELECT COUNT(*) FROM claims WHERE status IN ('claimed', 'picked')),
    'completed_claims', (SELECT COUNT(*) FROM claims WHERE status = 'delivered')
  );
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION admin_get_dashboard_stats() TO authenticated;
