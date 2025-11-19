-- Add business_name field to profiles table
-- This migration adds business_name as the primary field name for businesses
-- while keeping company_name for backward compatibility

BEGIN;

-- Step 1: Add business_name column if it doesn't exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_name text;

-- Step 2: Migrate existing company_name data to business_name if needed
UPDATE public.profiles
SET business_name = company_name
WHERE business_name IS NULL AND company_name IS NOT NULL;

-- Step 3: Create trigger to sync company_name when business_name changes
CREATE OR REPLACE FUNCTION public.sync_company_name()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Keep company_name in sync with business_name for backward compatibility
  IF NEW.business_name IS NOT NULL THEN
    NEW.company_name := NEW.business_name;
  ELSIF NEW.company_name IS NOT NULL AND NEW.business_name IS NULL THEN
    NEW.business_name := NEW.company_name;
  END IF;
  RETURN NEW;
END;
$$;

-- Step 4: Create trigger to run before insert or update
DROP TRIGGER IF EXISTS sync_company_name_trigger ON public.profiles;
CREATE TRIGGER sync_company_name_trigger
BEFORE INSERT OR UPDATE OF business_name, company_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_company_name();

-- Step 5: Add index for business name searches
CREATE INDEX IF NOT EXISTS profiles_business_name_idx ON public.profiles(business_name);

-- Step 6: Add comments for documentation
COMMENT ON COLUMN public.profiles.business_name IS 'Business or company name - primary field for business entities';
COMMENT ON COLUMN public.profiles.company_name IS 'Legacy company name field - kept in sync with business_name for backward compatibility';

COMMIT;
