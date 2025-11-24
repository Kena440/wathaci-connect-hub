BEGIN;

-- Ensure user_events captures explicit identifiers and structured metadata.
ALTER TABLE public.user_events
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Backfill event_type and metadata from legacy columns where possible.
UPDATE public.user_events
SET event_type = COALESCE(event_type, kind, 'unknown');

UPDATE public.user_events
SET metadata = COALESCE(metadata, payload, '{}'::jsonb)
WHERE metadata IS NULL;

-- Backfill email from existing payloads or apply a deterministic placeholder.
UPDATE public.user_events
SET email = COALESCE(email, metadata->>'email', metadata->>'user_email', payload->>'email', payload->>'user_email')
WHERE email IS NULL;

UPDATE public.user_events
SET email = 'missing-email-' || user_id::text || '@example.invalid'
WHERE email IS NULL;

-- Harden defaults and constraints so future inserts must include identifiers and metadata.
ALTER TABLE public.user_events
  ALTER COLUMN event_type SET DEFAULT 'unknown',
  ALTER COLUMN event_type SET NOT NULL,
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb,
  ALTER COLUMN metadata SET NOT NULL,
  ALTER COLUMN email SET NOT NULL;

-- Maintain compatibility by keeping the legacy kind/payload columns populated alongside the new structure.
CREATE OR REPLACE FUNCTION public.log_user_event(
  p_user_id uuid,
  p_event_type text,
  p_email text,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type text := COALESCE(NULLIF(p_event_type, ''), 'unknown');
  v_email text := COALESCE(NULLIF(p_email, ''), 'missing-email-' || p_user_id::text || '@example.invalid');
  v_metadata jsonb := COALESCE(p_metadata, '{}'::jsonb);
BEGIN
  INSERT INTO public.user_events (user_id, event_type, email, metadata, kind, payload)
  VALUES (p_user_id, v_event_type, v_email, v_metadata, v_event_type, v_metadata);
EXCEPTION WHEN OTHERS THEN
  -- Never block the main transaction because of telemetry issues.
  NULL;
END;
$$;

-- Refresh the auth.users trigger to emit explicit identifiers and signup completion logging.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', NEW.raw_user_meta_data->>'user_email');
  v_full_name text := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_msisdn text := COALESCE(NEW.raw_user_meta_data->>'msisdn', NEW.phone);
  v_profile_type text := COALESCE(NEW.raw_user_meta_data->>'profile_type', 'customer');
BEGIN
  PERFORM public.log_user_event(
    NEW.id,
    'auth_user_created',
    v_email,
    jsonb_build_object('source', 'auth_trigger')
  );

  BEGIN
    PERFORM public.ensure_profile_exists(NEW.id, v_email, v_full_name, v_msisdn, v_profile_type);

    PERFORM public.log_user_event(
      NEW.id,
      'profile_created',
      v_email,
      jsonb_build_object('source', 'trigger')
    );

    PERFORM public.log_user_event(
      NEW.id,
      'signup_completed',
      v_email,
      jsonb_build_object('profile_source', 'trigger')
    );
  EXCEPTION WHEN OTHERS THEN
    PERFORM public.log_user_event(
      NEW.id,
      'profile_creation_failed',
      v_email,
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

-- Rework the monitoring view to lean on application-owned logging instead of audit traits.
DROP VIEW IF EXISTS public.signup_profile_mismatches;
CREATE OR REPLACE VIEW public.signup_profile_mismatches AS
WITH recent_events AS (
  SELECT
    user_id,
    email,
    event_type,
    created_at,
    row_number() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM public.user_events
  WHERE event_type IN ('signup_completed', 'profile_created', 'auth_user_created')
)
SELECT
  u.id AS auth_user_id,
  u.email AS auth_email,
  u.created_at AS auth_created_at,
  p.id AS profile_id,
  p.created_at AS profile_created_at,
  e.event_type,
  e.email AS event_email,
  e.created_at AS event_created_at,
  CASE
    WHEN p.id IS NOT NULL AND e.user_id IS NOT NULL THEN 'healthy'
    WHEN p.id IS NULL AND e.user_id IS NOT NULL THEN 'auth_without_profile'
    WHEN p.id IS NOT NULL AND e.user_id IS NULL THEN 'profile_without_event'
    ELSE 'no_event_and_profile_missing'
  END AS status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN recent_events e ON e.user_id = u.id AND e.rn = 1;

GRANT SELECT ON public.signup_profile_mismatches TO authenticated;

-- Lightweight index to keep monitoring queries fast.
CREATE INDEX IF NOT EXISTS user_events_event_type_created_at_idx ON public.user_events (event_type, created_at DESC);

COMMIT;
