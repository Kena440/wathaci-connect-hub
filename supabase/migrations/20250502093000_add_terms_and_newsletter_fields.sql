BEGIN;

-- Add accepted_terms and newsletter_opt_in fields to profiles table
-- These fields support the ZAQA-style signup flow with terms acceptance and newsletter opt-in

-- Step 1: Add accepted_terms as nullable with DEFAULT NULL
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS accepted_terms boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS newsletter_opt_in boolean NOT NULL DEFAULT false;

-- Step 2: Backfill legacy records (set accepted_terms to true for existing users)
UPDATE public.profiles SET accepted_terms = true WHERE accepted_terms IS NULL;

-- Step 3: Set accepted_terms to NOT NULL and DEFAULT false for future signups
ALTER TABLE public.profiles
  ALTER COLUMN accepted_terms SET NOT NULL,
  ALTER COLUMN accepted_terms SET DEFAULT false;
COMMIT;
