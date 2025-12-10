-- ============================================================================
-- 20251124110000_signup_profile_reliability.sql (Fixed)
-- Ensures user/profile reliability WITHOUT redefining log_user_event
-- ============================================================================

BEGIN;

-- Ensure user_events exists
CREATE TABLE IF NOT EXISTS public.user_events (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  event_type text,
  email text,
  metadata jsonb DEFAULT '{}'::jsonb,
  kind text,          -- legacy alias
  payload jsonb,      -- legacy alias
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Ensure payment_events exists
CREATE TABLE IF NOT EXISTS public.payment_events (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  payment_id text,
  status text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- ============================================================================
-- RLS for user_events
-- ============================================================================
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_events_select_owner ON public.user_events;
DROP POLICY IF EXISTS user_events_insert_owner ON public.user_events;
DROP POLICY IF EXISTS user_events_all_service_role ON public.user_events;

CREATE POLICY user_events_select_owner ON public.user_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY user_events_insert_owner ON public.user_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_events_all_service_role ON public.user_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- RLS for payment_events
-- ============================================================================
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_events_select_owner ON public.payment_events;
DROP POLICY IF EXISTS payment_events_insert_owner ON public.payment_events;
DROP POLICY IF EXISTS payment_events_all_service_role ON public.payment_events;

CREATE POLICY payment_events_select_owner ON public.payment_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY payment_events_insert_owner ON public.payment_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY payment_events_all_service_role ON public.payment_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- IMPORTANT:
-- Remove ANY attempt to CREATE OR REPLACE log_user_event here.
-- The authoritative definition lives in 20251119010300_enhance_handle_new_user_trigger.sql
-- ============================================================================

-- To prevent this migration from conflicting with the upgraded function:
DROP FUNCTION IF EXISTS public.log_user_event(uuid, text, jsonb);

-- DO NOT recreate it here.
-- The correct unified version is installed by the new migration.

-- ============================================================================
-- ensure_profile_exists – safe profile creation/update
-- ============================================================================
CREATE OR REPLACE FUNCTION public.ensure_profile_exists(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_msisdn text,
  p_profile_type text DEFAULT 'customer'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text := COALESCE(NULLIF(p_email, ''), 'missing-email-' || p_user_id || '@example.invalid');
  v_full_name text := NULLIF(p_full_name, '');
  v_msisdn text := NULLIF(p_msisdn, '');
  v_profile_type text := COALESCE(NULLIF(p_profile_type, ''), 'customer');
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, msisdn, profile_type, created_at, updated_at
  )
  VALUES (
    p_user_id, v_email, v_full_name, v_msisdn, v_profile_type,
    timezone('utc', now()), timezone('utc', now())
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(public.profiles.email, EXCLUDED.email),
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    msisdn = COALESCE(public.profiles.msisdn, EXCLUDED.msisdn),
    profile_type = COALESCE(public.profiles.profile_type, EXCLUDED.profile_type, 'customer'),
    updated_at = timezone('utc', now());
END;
$$;

-- ============================================================================
-- Updated handle_new_user trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := COALESCE(NEW.email, 'missing-email-' || NEW.id || '@example.invalid');
  v_full_name text := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_msisdn text := COALESCE(NEW.raw_user_meta_data->>'msisdn', NEW.phone);
  v_account_type text := COALESCE(NEW.raw_user_meta_data->>'account_type', 'customer');
BEGIN
  -- log using the new unified event format
  PERFORM public.log_user_event(
    NEW.id,
    'auth_user_created',
    v_email,
    jsonb_build_object('email', v_email)
  );

  BEGIN
    PERFORM public.ensure_profile_exists(NEW.id, v_email, v_full_name, v_msisdn, v_account_type);

    PERFORM public.log_user_event(
      NEW.id,
      'profile_bootstrap_ok',
      v_email,
      jsonb_build_object('source', 'trigger')
    );

  EXCEPTION WHEN OTHERS THEN
    PERFORM public.log_user_event(
      NEW.id,
      'profile_bootstrap_error',
      v_email,
      jsonb_build_object('error', SQLERRM, 'code', SQLSTATE)
    );
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
