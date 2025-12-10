BEGIN;

-- ============================
-- 1. Ensure ENUM exists
-- ============================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'account_type_enum'
  ) THEN
    CREATE TYPE public.account_type_enum AS ENUM (
      'SME',
      'INVESTOR',
      'SERVICE_PROVIDER',
      'PARTNER',
      'ADMIN'
    );
  END IF;
END $$;

-- ============================
-- 2. Ensure lookup table exists
-- ============================
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

-- ============================
-- 3. Ensure profiles table exists
-- ============================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    CREATE TABLE public.profiles (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email text NOT NULL,
      full_name text,
      account_type public.account_type_enum NOT NULL DEFAULT 'SME',
      company_name text,
      phone text,
      created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
      updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
    );
  END IF;
END $$;

-- ============================
-- 4. Safely add/alter columns
-- ============================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS company_name text,
      ADD COLUMN IF NOT EXISTS phone text,
      ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
      ADD COLUMN IF NOT EXISTS account_type public.account_type_enum NOT NULL DEFAULT 'SME';

    ALTER TABLE public.profiles
      ALTER COLUMN email SET NOT NULL,
      ALTER COLUMN account_type SET NOT NULL,
      ALTER COLUMN account_type SET DEFAULT 'SME';

    -- Backfill null account types
    UPDATE public.profiles
    SET account_type = 'SME'
    WHERE account_type IS NULL;
  END IF;
END $$;

-- ============================
-- 5. Indexes (safe)
-- ============================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_key ON public.profiles (email);
    CREATE INDEX IF NOT EXISTS profiles_account_type_idx ON public.profiles (account_type);
  END IF;
END $$;

-- ============================
-- 6. Trigger function for updated_at
-- ============================
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- Create trigger safely
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
    CREATE TRIGGER set_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.set_current_timestamp_updated_at();
  END IF;
END $$;

-- ============================
-- 7. RLS configuration (safe)
-- ============================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS profiles_select_owner ON public.profiles;
    DROP POLICY IF EXISTS profiles_update_owner ON public.profiles;
    DROP POLICY IF EXISTS profiles_insert_owner ON public.profiles;
    DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;

    CREATE POLICY profiles_select_owner ON public.profiles
      FOR SELECT TO authenticated
      USING (id = auth.uid());

    CREATE POLICY profiles_insert_owner ON public.profiles
      FOR INSERT TO authenticated
      WITH CHECK (id = auth.uid());

    CREATE POLICY profiles_update_owner ON public.profiles
      FOR UPDATE TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());

    CREATE POLICY profiles_admin_all ON public.profiles
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p_admin
          WHERE p_admin.id = auth.uid()
            AND p_admin.account_type = 'ADMIN'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p_admin
          WHERE p_admin.id = auth.uid()
            AND p_admin.account_type = 'ADMIN'
        )
      );
  END IF;
END $$;

-- ============================
-- 8. Trigger for new users
-- ============================
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
