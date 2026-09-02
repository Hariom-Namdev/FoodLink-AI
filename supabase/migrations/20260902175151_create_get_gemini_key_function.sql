/*
# Create function to retrieve GEMINI_API_KEY from vault

1. Purpose
   - Edge functions cannot read vault secrets directly via PostgREST (vault is a
     non-public schema). This SECURITY DEFINER function bridges that gap by
     reading the decrypted secret from vault.decrypted_secrets and returning
     it to the caller.
2. Security
   - SECURITY DEFINER so it runs with the function owner's privileges (able to
     read the vault schema).
   - Restricted to the `authenticated` and `service_role` callers via the
     service role key used by edge functions.
   - Returns NULL if the secret does not exist (no error leaked).
*/

CREATE OR REPLACE FUNCTION public.get_secret(p_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = p_name
  LIMIT 1;

  RETURN v_secret;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_secret(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_secret(text) TO authenticated, service_role;
