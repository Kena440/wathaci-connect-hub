BEGIN;

-- Ensure the profiles table always exposes the account_type column
-- expected by the application and authentication flows.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type text;

-- Align constraint and defaults for consistency.
ALTER TABLE public.profiles
  ALTER COLUMN account_type SET DEFAULT 'sme',
  ALTER COLUMN account_type SET NOT NULL;

-- Restrict to the known set of account types.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_account_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_type_check CHECK (
    account_type IN (
      'sme',
      'professional',
      'investor',
      'donor',
      'government_institution'
    )
  );

-- Index for faster lookups and join filters.
CREATE INDEX IF NOT EXISTS profiles_account_type_idx
  ON public.profiles (account_type);

-- Refresh the PostgREST schema cache so Supabase API immediately
-- recognizes the column.
NOTIFY pgrst, 'reload schema';

COMMIT;
