DO $$
DECLARE
  v_user_id uuid := 'ad26a157-b312-42af-9d76-f6dc2b09995a';
BEGIN
  UPDATE auth.users
  SET email = 'admin@foodlinkai.com',
      encrypted_password = crypt('Hariadmin@2005', gen_salt('bf', 10)),
      email_confirmed_at = now(),
      raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{email}',
        '"admin@foodlinkai.com"'
      )
  WHERE id = v_user_id;
END $$;