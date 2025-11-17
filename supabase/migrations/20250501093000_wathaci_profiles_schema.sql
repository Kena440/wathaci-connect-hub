BEGIN;

-- Create the enum for account types. Using an enum gives tight validation
-- and efficient indexing; if you prefer a lookup table only, drop this and
-- rely on the account_types table below.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type_enum') THEN
    CREATE TYPE public.account_type_enum AS ENUM (
      'SME',
      'INVESTOR',
      'SERVICE_PROVIDER',
      'PARTNER',
      'ADMIN'
    );
  END IF;
END
$$;

-- Optional but recommended lookup for clearer labels and future metadata.
CREATE TABLE IF NOT EXISTS public.account_types (
  account_type public.account_type_enum PRIMARY KEY,
  label text NOT NULL UNIQUE
);

INSERT INTO public.account_types (account_type, label)
VALUES
  ('SME', 'SME'),
  ('INVESTOR', 'Investor'),
  ('SERVICE_PROVIDER', 'Service Provider'),
  ('PARTNER', 'Partner'),
  ('ADMIN', 'Admin')
ON CONFLICT (account_type) DO UPDATE SET label = EXCLUDED.label;

-- Core profiles table. Kept id in sync with auth.users.id for 1:1 mapping.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  account_type public.account_type_enum NOT NULL DEFAULT 'SME',
  company_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Backfill/ensure columns exist when migrating an already-existing table.
ALTER TABLE public.profiles
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN account_type SET NOT NULL,
  ALTER COLUMN account_type SET DEFAULT 'SME';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS account_type public.account_type_enum NOT NULL DEFAULT 'SME';

-- Ensure email uniqueness and make account_type filter-friendly.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_key ON public.profiles (email);
CREATE INDEX IF NOT EXISTS profiles_account_type_idx ON public.profiles (account_type);

-- updated_at trigger for automatic bookkeeping.
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- RLS configuration
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies to avoid duplicates/conflicts.
DROP POLICY IF EXISTS profiles_select_owner ON public.profiles;
DROP POLICY IF EXISTS profiles_update_owner ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_owner ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;

-- A user can view only their profile row.
CREATE POLICY profiles_select_owner ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- A user can insert only their own profile row.
CREATE POLICY profiles_insert_owner ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- A user can update only their own profile row.
CREATE POLICY profiles_update_owner ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins (account_type = 'ADMIN') can access all rows.
CREATE POLICY profiles_admin_all ON public.profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.account_type = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.account_type = 'ADMIN'
    )
  );

-- Optional: auto-create a profile for new auth.users rows so client-side
-- signup flows don't require elevated keys. Use service role for insertion
-- from server-side code, or rely on this trigger for automatic creation.
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
  INSERT INTO public.profiles (id, email, account_type)
  VALUES (NEW.id, v_email, 'SME')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

COMMIT;
