BEGIN;

-- Normalize account type handling and make signup trigger fully defensive
-- so auth.signUp never fails due to enum casting or profile merge issues.
CREATE OR REPLACE FUNCTION public.ensure_profile_exists(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_msisdn text,
  p_profile_type text DEFAULT 'customer',
  p_account_type text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_company_name text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text := COALESCE(NULLIF(p_email, ''), 'missing-email-' || p_user_id::text || '@example.invalid');
  v_full_name text := NULLIF(p_full_name, '');
  v_msisdn text := NULLIF(p_msisdn, '');
  v_profile_type text := COALESCE(NULLIF(p_profile_type, ''), 'customer');
  v_account_type public.account_type_enum := 'sme'::public.account_type_enum;
  v_phone text := NULLIF(p_phone, '');
  v_company_name text := NULLIF(p_company_name, '');
BEGIN
  BEGIN
    IF COALESCE(p_account_type, '') <> '' THEN
      v_account_type := lower(p_account_type)::public.account_type_enum;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Default to SME when metadata includes an unknown or legacy value
      v_account_type := 'sme'::public.account_type_enum;
  END;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    msisdn,
    profile_type,
    account_type,
    phone,
    company_name,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    v_email,
    v_full_name,
    v_msisdn,
    v_profile_type,
    v_account_type,
    v_phone,
    v_company_name,
    timezone('utc', now()),
    timezone('utc', now())
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(NULLIF(public.profiles.email, ''), EXCLUDED.email),
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
    msisdn = COALESCE(NULLIF(public.profiles.msisdn, ''), EXCLUDED.msisdn),
    profile_type = COALESCE(public.profiles.profile_type, EXCLUDED.profile_type, 'customer'),
    account_type = COALESCE(public.profiles.account_type, EXCLUDED.account_type, 'sme'::public.account_type_enum),
    phone = COALESCE(NULLIF(public.profiles.phone, ''), EXCLUDED.phone),
    company_name = COALESCE(NULLIF(public.profiles.company_name, ''), EXCLUDED.company_name),
    updated_at = timezone('utc', now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_profile_exists(uuid, text, text, text, text, text, text, text) TO authenticated;

-- Make sure signup trigger never propagates errors to GoTrue
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_full_name text;
  v_msisdn text;
  v_profile_type text;
  v_account_type text;
  v_company_name text;
BEGIN
  v_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', NEW.raw_user_meta_data->>'user_email');
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_msisdn := COALESCE(NEW.raw_user_meta_data->>'msisdn', NEW.phone);
  v_profile_type := COALESCE(NEW.raw_user_meta_data->>'profile_type', 'customer');
  v_account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'sme');
  v_company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', NEW.raw_user_meta_data->>'business_name');

  PERFORM public.log_user_event(
    NEW.id,
    'auth_user_created',
    COALESCE(v_email, 'missing-email-' || NEW.id::text || '@example.invalid'),
    jsonb_build_object('source', 'auth_trigger')
  );

  BEGIN
    PERFORM public.ensure_profile_exists(
      NEW.id,
      v_email,
      v_full_name,
      v_msisdn,
      v_profile_type,
      v_account_type,
      v_msisdn,
      v_company_name
    );

    PERFORM public.log_user_event(
      NEW.id,
      'signup_completed',
      COALESCE(v_email, 'missing-email-' || NEW.id::text || '@example.invalid'),
      jsonb_build_object('profile_source', 'trigger')
    );
  EXCEPTION WHEN OTHERS THEN
    -- Record the failure but never abort the auth.users insert
    PERFORM public.log_user_event(
      NEW.id,
      'profile_creation_failed',
      COALESCE(v_email, 'missing-email-' || NEW.id::text || '@example.invalid'),
      jsonb_build_object('error', SQLERRM, 'code', SQLSTATE)
    );

    BEGIN
      INSERT INTO public.profile_errors (user_id, error_message, error_detail, error_context)
      VALUES (NEW.id, SQLERRM, SQLSTATE, 'handle_new_user')
      ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

COMMIT;
