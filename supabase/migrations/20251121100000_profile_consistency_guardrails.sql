BEGIN;

-- Expand ensure_profile_exists to handle account_type, phone, and company_name so
-- both trigger-based inserts and backfills share one merge pathway.
CREATE OR REPLACE FUNCTION public.ensure_profile_exists(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_msisdn text,
  p_profile_type text DEFAULT 'customer',
  p_account_type public.account_type_enum DEFAULT 'sme',
  p_phone text DEFAULT NULL,
  p_company_name text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
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
    p_email,
    NULLIF(p_full_name, ''),
    NULLIF(p_msisdn, ''),
    COALESCE(NULLIF(p_profile_type, ''), 'customer'),
    COALESCE(p_account_type, 'sme'::public.account_type_enum),
    NULLIF(p_phone, ''),
    NULLIF(p_company_name, ''),
    timezone('utc', now()),
    timezone('utc', now())
  )
  ON CONFLICT (id) DO UPDATE
    SET
      email = COALESCE(NULLIF(public.profiles.email, ''), EXCLUDED.email),
      full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
      msisdn = CASE
        WHEN public.profiles.msisdn IS NULL OR public.profiles.msisdn = '' THEN EXCLUDED.msisdn
        ELSE public.profiles.msisdn
      END,
      profile_type = COALESCE(public.profiles.profile_type, EXCLUDED.profile_type, 'customer'),
      account_type = COALESCE(public.profiles.account_type, EXCLUDED.account_type, 'sme'::public.account_type_enum),
      phone = COALESCE(NULLIF(public.profiles.phone, ''), EXCLUDED.phone),
      company_name = COALESCE(NULLIF(public.profiles.company_name, ''), EXCLUDED.company_name),
      updated_at = timezone('utc', now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_profile_exists(uuid, text, text, text, text, public.account_type_enum, text, text) TO authenticated;

-- Harden handle_new_user to rely on ensure_profile_exists with defensive metadata
-- extraction and structured error logging.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_full_name text;
  v_account_type public.account_type_enum;
  v_msisdn text;
  v_profile_type text;
  v_company_name text;
  v_error_message text;
  v_error_detail text;
BEGIN
  v_email := COALESCE(
    NULLIF(NEW.email, ''),
    NULLIF(NEW.raw_user_meta_data->>'email', ''),
    NULLIF(NEW.raw_user_meta_data->>'user_email', ''),
    NULLIF(NEW.raw_user_meta_data->>'preferred_email', '')
  );

  v_full_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(trim(both ' ' FROM concat_ws(' ', NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name')), ''),
    ''
  );

  v_msisdn := COALESCE(
    NULLIF(NEW.phone, ''),
    NULLIF(NEW.raw_user_meta_data->>'msisdn', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', '')
  );

  v_company_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'company_name', ''), NULLIF(NEW.raw_user_meta_data->>'business_name', ''));
  v_profile_type := COALESCE(NULLIF(NEW.raw_user_meta_data->>'profile_type', ''), 'customer');

  BEGIN
    v_account_type := COALESCE(
      (NEW.raw_user_meta_data->>'account_type')::public.account_type_enum,
      'sme'::public.account_type_enum
    );
  EXCEPTION
    WHEN OTHERS THEN
      v_account_type := 'sme'::public.account_type_enum;
  END;

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
  EXCEPTION
    WHEN OTHERS THEN
      v_error_message := 'handle_new_user failed: ' || SQLERRM;
      v_error_detail := 'SQLSTATE: ' || SQLSTATE;

      BEGIN
        INSERT INTO public.profile_errors (user_id, error_message, error_detail, error_context)
        VALUES (
          NEW.id,
          v_error_message,
          v_error_detail,
          'ensure_profile_exists in handle_new_user'
        );
      EXCEPTION
        WHEN OTHERS THEN
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

-- Backfill helper to repair any existing auth.users rows missing profiles.
-- Updated to return a result set so later migrations don’t hit return-type conflicts.
DROP FUNCTION IF EXISTS public.backfill_missing_profiles();

CREATE FUNCTION public.backfill_missing_profiles()
RETURNS TABLE (
  user_id uuid,
  email text,
  backfill_status text,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_email text;
  v_account_type text;
  v_full_name text;
  v_phone text;
  v_company text;
BEGIN
  FOR v_user IN
    SELECT u.id, u.email, u.phone, u.raw_user_meta_data, u.created_at
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL
    ORDER BY u.created_at
  LOOP
    -- Extract metadata
    v_email := COALESCE(
      NULLIF(v_user.email, ''),
      'backfill-' || v_user.id::text || '@invalid.example'
    );

    v_account_type := COALESCE(
      v_user.raw_user_meta_data->>'account_type',
      'sole_proprietor'
    );

    v_full_name := COALESCE(
      v_user.raw_user_meta_data->>'full_name',
      TRIM(
        COALESCE(v_user.raw_user_meta_data->>'first_name', '') || ' ' ||
        COALESCE(v_user.raw_user_meta_data->>'last_name', '')
      )
    );
    IF v_full_name = '' THEN
      v_full_name := NULL;
    END IF;

    v_phone := COALESCE(
      v_user.phone,
      v_user.raw_user_meta_data->>'phone'
    );

    v_company := COALESCE(
      v_user.raw_user_meta_data->>'company_name',
      v_user.raw_user_meta_data->>'business_name'
    );

    BEGIN
      -- Insert profile
      INSERT INTO public.profiles (
        id,
        email,
        full_name,
        account_type,
        phone,
        business_name,
        created_at,
        updated_at
      )
      VALUES (
        v_user.id,
        v_email,
        NULLIF(v_full_name, ''),
        v_account_type,
        NULLIF(v_phone, ''),
        NULLIF(v_company, ''),
        v_user.created_at,
        timezone('utc', now())
      );

      -- Log backfill event
      PERFORM public.log_user_event(
        v_user.id,
        'profile_backfilled',
        v_email,
        jsonb_build_object(
          'source', 'backfill_function',
          'original_created_at', v_user.created_at
        )
      );

      user_id := v_user.id;
      email := v_email;
      backfill_status := 'success';
      error_message := NULL;
      RETURN NEXT;

    EXCEPTION
      WHEN OTHERS THEN
        -- Log error
        PERFORM public.log_user_event(
          v_user.id,
          'profile_backfill_error',
          v_email,
          jsonb_build_object(
            'error', SQLERRM,
            'sqlstate', SQLSTATE,
            'source', 'backfill_function'
          )
        );

        user_id := v_user.id;
        email := v_email;
        backfill_status := 'error';
        error_message := SQLERRM;
        RETURN NEXT;
    END;
  END LOOP;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.backfill_missing_profiles() IS
  'Creates or repairs profiles for auth.users rows that are missing them, returning per-user status and error info.';


-- Materialize a view that classifies signup audit rows and highlights missing auth/profiles rows.
CREATE OR REPLACE VIEW public.signup_profile_mismatches AS
SELECT
  a.id AS audit_log_id,
  a.created_at AS audit_created_at,
  a.payload->'traits'->>'user_id'   AS audit_user_id,
  a.payload->'traits'->>'user_email' AS audit_email,
  u.id AS auth_user_id,
  u.email AS auth_email,
  p.id AS profile_id,
  CASE
    WHEN u.id IS NOT NULL AND p.id IS NOT NULL THEN 'healthy'
    WHEN u.id IS NOT NULL AND p.id IS NULL THEN 'auth_without_profile'
    WHEN a.payload->'traits'->>'user_id' IS NOT NULL AND u.id IS NULL THEN 'audit_only'
    WHEN a.payload->'traits'->>'user_id' IS NULL AND a.payload->'traits'->>'user_email' IS NOT NULL THEN 'email_only'
    ELSE 'unknown'
  END AS status
FROM auth.audit_log_entries a
LEFT JOIN auth.users u ON (a.payload->'traits'->>'user_id')::uuid = u.id
LEFT JOIN public.profiles p ON (a.payload->'traits'->>'user_id')::uuid = p.id
WHERE a.payload->>'action' IN ('user_signedup','user_repeated_signup','user_confirmation_requested');

GRANT SELECT ON public.signup_profile_mismatches TO authenticated;

-- One-time backfill to cover any historical gaps before monitoring kicks in.
SELECT public.backfill_missing_profiles();

COMMIT;
