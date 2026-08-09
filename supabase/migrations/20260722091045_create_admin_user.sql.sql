DO $$
DECLARE
  user_id uuid;
BEGIN
  -- Check if user exists
  SELECT id INTO user_id FROM auth.users WHERE email = 'hari@foodlinkai.com';

  IF user_id IS NULL THEN
    -- Insert into auth.users with bcrypt-encrypted password
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      last_sign_in_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'hari@foodlinkai.com',
      crypt('Hari@2000', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Hari", "role": "admin", "organization": "FoodLink AI", "phone": "", "city": ""}',
      now()
    )
    RETURNING id INTO user_id;
  ELSE
    -- Update existing user's password
    UPDATE auth.users
    SET encrypted_password = crypt('Hari@2000', gen_salt('bf')),
        email_confirmed_at = now(),
        raw_user_meta_data = '{"full_name": "Hari", "role": "admin", "organization": "FoodLink AI", "phone": "", "city": ""}'
    WHERE id = user_id;
  END IF;

  -- Insert or update profile with admin role
  INSERT INTO profiles (id, full_name, role, organization, phone, city)
  VALUES (user_id, 'Hari', 'admin', 'FoodLink AI', '', '')
  ON CONFLICT (id) DO UPDATE
  SET role = 'admin', full_name = 'Hari', organization = 'FoodLink AI';
END $$;
