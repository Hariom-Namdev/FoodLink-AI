/*
# Auto-create profile on signup

1. Purpose
   When a new user signs up via Supabase Auth, a matching `profiles` row
   must exist so the app can read their role + org info. This trigger
   creates that row automatically using the raw_user_meta_data supplied
   at signup time (full_name, role, organization, phone, city).

2. Changes
   - `handle_new_user()` function: inserts a profiles row for NEW auth users.
   - Trigger `on_auth_user_created` fires AFTER INSERT on auth.users.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, organization, phone, city)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'restaurant'),
    COALESCE(NEW.raw_user_meta_data->>'organization', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
