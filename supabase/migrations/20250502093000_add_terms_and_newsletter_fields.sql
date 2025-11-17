BEGIN;

-- Add accepted_terms and newsletter_opt_in fields to profiles table
-- These fields support the ZAQA-style signup flow with terms acceptance and newsletter opt-in

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS accepted_terms boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS newsletter_opt_in boolean NOT NULL DEFAULT false;

COMMIT;
