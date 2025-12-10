-- Maintain compatibility by keeping the legacy kind/payload columns
-- populated alongside the new structure.

-- Drop old versions to avoid return-type & argument-default conflicts
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
AS $$
DECLARE
  v_event_type text := COALESCE(NULLIF(p_event_type, ''), 'unknown');
  v_email text := COALESCE(
                    NULLIF(p_email, ''),
                    'missing-email-' || p_user_id::text || '@example.invalid'
                  );
  v_metadata jsonb := COALESCE(p_metadata, '{}'::jsonb);
BEGIN
  -- Insert with legacy compatibility: still writes kind + payload
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
    v_event_type,   -- legacy synonym for event_type
    v_metadata      -- legacy synonym for metadata
  );

EXCEPTION WHEN OTHERS THEN
  -- Never block the main transaction due to logging issues
  NULL;
END;
$$;
