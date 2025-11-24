BEGIN;

-- Ensure user_events exists for signup logging.
CREATE TABLE IF NOT EXISTS public.user_events (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  kind text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Ensure payment_events exists for correlation checks.
CREATE TABLE IF NOT EXISTS public.payment_events (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  payment_id text,
  status text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Enable RLS and scoped policies for user_events.
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

-- Service role and trigger functions should bypass RLS; add an explicit policy for clarity.
CREATE POLICY user_events_all_service_role ON public.user_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Enable RLS and scoped policies for payment_events.
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

-- Helper to safely log user events from triggers or backend.
CREATE OR REPLACE FUNCTION public.log_user_event(
  p_user_id uuid,
  p_kind text,
  p_payload jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_events (user_id, kind, payload)
  VALUES (p_user_id, p_kind, p_payload);
EXCEPTION WHEN OTHERS THEN
  -- Swallow errors so logging never blocks the main flow.
  NULL;
END;
$$;

-- Helper to safely log payment events from backend/edge functions.
CREATE OR REPLACE FUNCTION public.log_payment_event(
  p_user_id uuid,
  p_payment_id text,
  p_status text,
  p_payload jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.payment_events (user_id, payment_id, status, payload)
  VALUES (p_user_id, p_payment_id, p_status, p_payload);
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- Harden ensure_profile_exists so it always produces a usable profile row.
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
  v_email text := COALESCE(NULLIF(p_email, ''), 'missing-email-' || p_user_id::text || '@example.invalid');
  v_full_name text := NULLIF(p_full_name, '');
  v_msisdn text := NULLIF(p_msisdn, '');
  v_profile_type text := COALESCE(NULLIF(p_profile_type, ''), 'customer');
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    msisdn,
    profile_type,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    v_email,
    v_full_name,
    v_msisdn,
    v_profile_type,
    timezone('utc', now()),
    timezone('utc', now())
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(NULLIF(public.profiles.email, ''), EXCLUDED.email),
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
    msisdn = COALESCE(NULLIF(public.profiles.msisdn, ''), EXCLUDED.msisdn),
    profile_type = COALESCE(public.profiles.profile_type, EXCLUDED.profile_type, 'customer'),
    updated_at = timezone('utc', now());
END;
$$;

-- Refresh the auth.users trigger to rely on ensure_profile_exists and log diagnostics.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := COALESCE(NEW.email, 'missing-email-' || NEW.id::text || '@example.invalid');
  v_full_name text := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_msisdn text := COALESCE(NEW.raw_user_meta_data->>'msisdn', NEW.phone); -- phone optional
  v_account_type text := COALESCE(NEW.raw_user_meta_data->>'account_type', 'customer');
BEGIN
  PERFORM public.log_user_event(NEW.id, 'auth_user_created', jsonb_build_object('email', v_email));

  BEGIN
    PERFORM public.ensure_profile_exists(NEW.id, v_email, v_full_name, v_msisdn, v_account_type);
    PERFORM public.log_user_event(NEW.id, 'profile_bootstrap_ok', jsonb_build_object('source', 'trigger'));
  EXCEPTION WHEN OTHERS THEN
    PERFORM public.log_user_event(
      NEW.id,
      'profile_bootstrap_error',
      jsonb_build_object('error', SQLERRM, 'code', SQLSTATE)
    );
    RETURN NEW;
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
