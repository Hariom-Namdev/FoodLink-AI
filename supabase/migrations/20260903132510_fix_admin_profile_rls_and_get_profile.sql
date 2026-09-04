-- 1. Create a SECURITY DEFINER function to check if current user is admin
--    This avoids the recursive RLS issue where admin_select_all_profiles
--    queried profiles inside a policy ON profiles.
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

-- 2. Replace the recursive admin_select_all_profiles policy with one that uses
--    the non-recursive is_current_user_admin() function.
DROP POLICY IF EXISTS "admin_select_all_profiles" ON profiles;

CREATE POLICY "admin_select_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (public.is_current_user_admin());

-- 3. Create a SECURITY DEFINER function to get the current user's own profile.
--    This bypasses RLS entirely, so profile loading works even if RLS policies
--    have issues. Used by the client auth layer.
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- 4. Create a function to upsert a profile for the current user (fallback if
--    the trigger fails). Only allows setting own profile.
CREATE OR REPLACE FUNCTION public.upsert_my_profile(
  p_full_name text DEFAULT '',
  p_role text DEFAULT 'restaurant',
  p_organization text DEFAULT '',
  p_phone text DEFAULT '',
  p_city text DEFAULT ''
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.profiles;
BEGIN
  INSERT INTO public.profiles (id, full_name, role, organization, phone, city)
  VALUES (auth.uid(), p_full_name, p_role, p_organization, p_phone, p_city)
  ON CONFLICT (id) DO UPDATE
  SET full_name = COALESCE(NULLIF(p_full_name, ''), profiles.full_name),
      organization = COALESCE(NULLIF(p_organization, ''), profiles.organization),
      phone = COALESCE(NULLIF(p_phone, ''), profiles.phone),
      city = COALESCE(NULLIF(p_city, ''), profiles.city)
  RETURNING * INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_my_profile(text, text, text, text, text) TO authenticated;

-- 5. Ensure the admin profile exists and is correct.
--    The admin user id is ad26a157-b312-42af-9d76-f6dc2b09995a (from prior migrations).
INSERT INTO profiles (id, full_name, role, organization, phone, city)
VALUES ('ad26a157-b312-42af-9d76-f6dc2b09995a', 'Hari', 'admin', 'FoodLink AI', '', '')
ON CONFLICT (id) DO UPDATE
SET role = 'admin', full_name = 'Hari', organization = 'FoodLink AI';