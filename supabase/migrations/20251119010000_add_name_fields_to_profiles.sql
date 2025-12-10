-- ============================================================================
-- Safe Migration: Add first_name and last_name fields to profiles table
-- ============================================================================
-- This version is idempotent, safe to re-run, and avoids failures even if the
-- schema evolved or the migration runs out of order.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1 — Ensure the profiles table exists
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='profiles'
  ) THEN
    RAISE NOTICE 'profiles table does not exist — skipping migration safely.';
    RETURN;
  END IF;
END $$;

-- ============================================================================
-- STEP 2 — Add first_name and last_name columns safely
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

-- ============================================================================
-- STEP 3 — Migrate full_name → first_name/last_name if applicable
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='profiles' AND column_name='full_name'
  ) THEN
    UPDATE public.profiles
    SET 
      first_name = CASE 
        WHEN full_name IS NOT NULL AND full_name != '' 
          AND position(' ' IN full_name) > 0
        THEN split_part(full_name, ' ', 1)
        WHEN full_name IS NOT NULL AND full_name != ''
        THEN full_name
        ELSE first_name
      END,
      last_name = CASE 
        WHEN full_name IS NOT NULL AND full_name != '' 
          AND position(' ' IN full_name) > 0
        THEN substring(full_name FROM position(' ' IN full_name) + 1)
        ELSE last_name
      END
    WHERE (first_name IS NULL OR last_name IS NULL);

  ELSE
    RAISE NOTICE 'full_name column missing — skipping name migration.';
  END IF;
END $$;

-- ============================================================================
-- STEP 4 — Create or replace sync_full_name() trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_full_name()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.first_name IS NOT NULL OR NEW.last_name IS NOT NULL THEN
    NEW.full_name :=
      TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''));

    IF NEW.full_name = '' THEN
      NEW.full_name := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- STEP 5 — Create trigger, but only if profiles.full_name exists
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='profiles' AND column_name='full_name'
  ) THEN
    DROP TRIGGER IF EXISTS sync_full_name_trigger ON public.profiles;

    CREATE TRIGGER sync_full_name_trigger
    BEFORE INSERT OR UPDATE OF first_name, last_name ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.sync_full_name();

  ELSE
    RAISE NOTICE 'full_name column missing — trigger creation skipped.';
  END IF;
END $$;

-- ============================================================================
-- STEP 6 — Create indexes safely
-- ============================================================================

CREATE INDEX IF NOT EXISTS profiles_first_name_idx ON public.profiles(first_name);
CREATE INDEX IF NOT EXISTS profiles_last_name_idx  ON public.profiles(last_name);

-- ============================================================================
-- STEP 7 — Add comments (safe always)
-- ============================================================================

COMMENT ON COLUMN public.profiles.first_name IS 'User first name (given name)';
COMMENT ON COLUMN public.profiles.last_name  IS 'User last name (surname/family name)';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='profiles' AND column_name='full_name'
  ) THEN
    COMMENT ON COLUMN public.profiles.full_name IS
      'Full name automatically synced from first_name + last_name';
  END IF;
END $$;

COMMIT;
