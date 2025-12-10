-- ============================================================================
-- 20251119010300_enhance_handle_new_user_trigger.sql
-- Enhance handle_new_user trigger and maintain legacy log_user_event compatibility
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Enhanced handle_new_user trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_full_name text;
  v_first_name text;
  v_last_name text;
  v_account_type text;
  v_phone text;
  v_mobile_number text;
  v_accepted_terms boolean;
  v_newsletter_opt_in boolean;
  v_profile_completed boolean;
BEGIN
  -- Extract basic fields
  v_email := NEW.email;

  -- Extract metadata fields if they exist
  v_full_name := NEW.raw_user_meta_data->>'full_name';
  v_first_name := NEW.raw_user_meta_data->>'first_name';
  v_last_name := NEW.raw_user_meta_data->>'last_name';
  v_account_type := NEW.raw_user_meta_data->>'account_type';
  v_phone := NEW.raw_user_meta_data->>'phone';
  v_mobile_number := NEW.raw_user_meta_data->>'mobile_number';
  v_accepted_terms := COALESCE((NEW.raw_user_meta_data->>'accepted_terms')::boolean, false);
  v_newsletter_opt_in := COALESCE((NEW.raw_user_meta_data->>'newsletter_opt_in')::boolean, false);
  v_profile_completed := COALESCE((NEW.raw_user_meta_data->>'profile_completed')::boolean, false);

  -- If first_name and last_name not provided but full_name is, try to split it
  IF v_full_name IS NOT NULL AND v_first_name IS NULL AND v_last_name IS NULL THEN
    IF position(' ' IN v_full_name) > 0 THEN
      v_first_name := split_part(v_full_name, ' ', 1);
      v_last_name := substring(v_full_name FROM position(' ' IN v_full_name) + 1);
    ELSE
      v_first_name := v_full_name;
    END IF;
  END IF;

  -- Use mobile_number as phone if phone not provided
  IF v_phone IS NULL AND v_mobile_number IS NOT NULL THEN
    v_phone := v_mobile_number;
  END IF;

  -- Insert profile with all available data
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    first_name,
    last_name,
    account_type,
    phone,
    msisdn,
    payment_phone,
    payment_method,
    accepted_terms,
    newsletter_opt_in,
    profile_completed
  )
  VALUES (
    NEW.id,
    v_email,
    COALESCE(v_full_name, TRIM(COALESCE(v_first_name, '') || ' ' || COALESCE(v_last_name, ''))),
    v_first_name,
    v_last_name,
    COALESCE(v_account_type::public.account_type_enum, 'sme'::public.account_type_enum),
    v_phone,
    v_phone, -- msisdn same as phone
    v_phone, -- payment_phone same as phone initially
    CASE WHEN v_phone IS NOT NULL THEN 'phone' ELSE NULL END,
    v_accepted_terms,
    v_newsletter_opt_in,
    v_profile_completed
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Trigger function that automatically creates a profile when a new user signs up and extracts auth.users.raw_user_meta_data to populate profile fields.';

-- ============================================================================
-- STEP 2: Legacy-compatible log_user_event
-- Keeps kind/payload populated for older queries while writing to user_events
-- ============================================================================

-- Drop old versions to avoid parameter default / return type conflicts
DROP FUNCTION IF EXISTS public.log_user_event(uuid, text, text, jsonb);

CREATE FUNCTION public.log_user_event(
  p_user_id uuid,
  p_event_type text,
  p_email text,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_event_type text := COALESCE(NULLIF(p_event_type, ''), 'unknown');
  v_email text := COALESCE(
                    NULLIF(p_email, ''),
                    'missing-email-' || p_user_id::text || '@example.invalid'
                  );
  v_metadata jsonb := COALESCE(p_metadata, '{}'::jsonb);
BEGIN
  -- Insert into user_events, keeping legacy kind/payload in sync
  INSERT INTO public.user_events (
    user_id,
    event_type,
    email,
    metadata,
    kind,
    payload
  )
  VALUES (
    p_user_id,
    v_event_type,
    v_email,
    v_metadata,
    v_event_type,  -- legacy alias
    v_metadata     -- legacy alias
  );

EXCEPTION WHEN OTHERS THEN
  -- Never block the main transaction because of telemetry issues.
  NULL;
END;
$func$;

COMMENT ON FUNCTION public.log_user_event(uuid, text, text, jsonb) IS
  'Legacy-compatible logging helper that writes user_events and keeps kind/payload populated for older consumers.';

COMMIT;
