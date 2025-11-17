-- Update account_type enum to match frontend/backend account types
-- This migration aligns the database enum with the account types used throughout the application

BEGIN;

-- Drop the old enum and related constraints (if they exist)
-- We need to do this carefully to avoid breaking existing data

-- Step 1: Add a temporary column to store the account type as text
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type_temp text;

-- Step 2: Copy data from account_type to account_type_temp with mapping
UPDATE public.profiles
SET account_type_temp = CASE 
  WHEN account_type = 'SME' THEN 'sme'
  WHEN account_type = 'INVESTOR' THEN 'investor'
  WHEN account_type = 'SERVICE_PROVIDER' THEN 'professional'
  WHEN account_type = 'PARTNER' THEN 'government'
  WHEN account_type = 'ADMIN' THEN 'government'
  ELSE 'sme'
END;

-- Step 3: Drop the old account_type column (this also drops the enum if not used elsewhere)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS account_type CASCADE;

-- Step 4: Create new enum with lowercase values matching frontend
DO $$
BEGIN
  -- Drop the old enum type if it exists
  DROP TYPE IF EXISTS public.account_type_enum CASCADE;
  
  -- Create the new enum with frontend-compatible values
  CREATE TYPE public.account_type_enum AS ENUM (
    'sole_proprietor',
    'professional',
    'sme',
    'investor',
    'donor',
    'government'
  );
END
$$;

-- Step 5: Recreate account_type column with new enum type
ALTER TABLE public.profiles
  ADD COLUMN account_type public.account_type_enum;

-- Step 6: Copy data back from temp column with proper casting
UPDATE public.profiles
SET account_type = account_type_temp::public.account_type_enum;

-- Step 7: Make account_type NOT NULL with default
ALTER TABLE public.profiles
  ALTER COLUMN account_type SET NOT NULL,
  ALTER COLUMN account_type SET DEFAULT 'sme'::public.account_type_enum;

-- Step 8: Drop temporary column
ALTER TABLE public.profiles DROP COLUMN account_type_temp;

-- Step 9: Recreate the account_types lookup table with new values
DROP TABLE IF EXISTS public.account_types CASCADE;

CREATE TABLE public.account_types (
  account_type public.account_type_enum PRIMARY KEY,
  label text NOT NULL UNIQUE,
  description text
);

INSERT INTO public.account_types (account_type, label, description)
VALUES
  ('sole_proprietor', 'Sole Proprietor', 'Individual entrepreneurs and micro businesses'),
  ('professional', 'Professional', 'Specialists offering professional services'),
  ('sme', 'SME', 'Small and Medium Enterprises'),
  ('investor', 'Investor', 'Funds and angels sourcing deals'),
  ('donor', 'Donor', 'Grant makers and development partners'),
  ('government', 'Government', 'Public sector agencies and institutions')
ON CONFLICT (account_type) DO UPDATE 
  SET label = EXCLUDED.label,
      description = EXCLUDED.description;

-- Step 10: Recreate index
CREATE INDEX IF NOT EXISTS profiles_account_type_idx ON public.profiles(account_type);

-- Step 11: Update the handle_new_user function to use the new default
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
  VALUES (NEW.id, v_email, 'sme'::public.account_type_enum)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Add comment
COMMENT ON TYPE public.account_type_enum IS 
  'Account types matching frontend values: sole_proprietor, professional, sme, investor, donor, government';

COMMIT;
