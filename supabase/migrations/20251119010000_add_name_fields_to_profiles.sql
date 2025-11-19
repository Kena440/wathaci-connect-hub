-- Add first_name and last_name fields to profiles table
-- This migration adds individual name fields while keeping full_name for backward compatibility
-- The frontend and types expect first_name and last_name fields

BEGIN;

-- Step 1: Add first_name and last_name columns if they don't exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

-- Step 2: Migrate existing full_name data to first_name/last_name if possible
-- This handles cases where full_name contains "FirstName LastName"
UPDATE public.profiles
SET 
  first_name = CASE 
    WHEN full_name IS NOT NULL AND full_name != '' 
      AND position(' ' IN full_name) > 0
    THEN split_part(full_name, ' ', 1)
    WHEN full_name IS NOT NULL AND full_name != ''
    THEN full_name
    ELSE NULL
  END,
  last_name = CASE 
    WHEN full_name IS NOT NULL AND full_name != '' 
      AND position(' ' IN full_name) > 0
    THEN substring(full_name FROM position(' ' IN full_name) + 1)
    ELSE NULL
  END
WHERE first_name IS NULL AND last_name IS NULL AND full_name IS NOT NULL;

-- Step 3: Create trigger to sync full_name when first_name or last_name changes
CREATE OR REPLACE FUNCTION public.sync_full_name()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Automatically update full_name from first_name and last_name
  IF NEW.first_name IS NOT NULL OR NEW.last_name IS NOT NULL THEN
    NEW.full_name := TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''));
    -- Handle case where result is just whitespace
    IF NEW.full_name = '' OR NEW.full_name IS NULL THEN
      NEW.full_name := COALESCE(NEW.first_name, NEW.last_name);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Step 4: Create trigger to run before insert or update
DROP TRIGGER IF EXISTS sync_full_name_trigger ON public.profiles;
CREATE TRIGGER sync_full_name_trigger
BEFORE INSERT OR UPDATE OF first_name, last_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_full_name();

-- Step 5: Add indexes for name searches
CREATE INDEX IF NOT EXISTS profiles_first_name_idx ON public.profiles(first_name);
CREATE INDEX IF NOT EXISTS profiles_last_name_idx ON public.profiles(last_name);

-- Step 6: Add comments for documentation
COMMENT ON COLUMN public.profiles.first_name IS 'User first name (given name)';
COMMENT ON COLUMN public.profiles.last_name IS 'User last name (surname/family name)';
COMMENT ON COLUMN public.profiles.full_name IS 'Full name - automatically synced from first_name and last_name';

COMMIT;
