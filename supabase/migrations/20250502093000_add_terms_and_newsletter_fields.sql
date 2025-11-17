BEGIN;

-- Add accepted_terms and newsletter_opt_in fields to profiles table
-- These fields support the ZAQA-style signup flow with terms acceptance and newsletter opt-in

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS accepted_terms boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS newsletter_opt_in boolean NOT NULL DEFAULT false;

-- Update the auto-create trigger to include the new fields with defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  v_email := NEW.email;
  INSERT INTO public.profiles (id, email, account_type, accepted_terms, newsletter_opt_in)
  VALUES (NEW.id, v_email, 'SME', false, false)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

COMMIT;
