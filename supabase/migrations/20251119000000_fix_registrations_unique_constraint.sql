-- Fix registrations table email unique constraint to be case-insensitive
-- This migration addresses the database error when saving new users
-- The issue: email UNIQUE constraint is case-sensitive, but emails should be unique regardless of case

BEGIN;

-- Step 1: Drop the existing case-sensitive UNIQUE constraint
-- The constraint name is auto-generated, so we need to find and drop it
DO $$
DECLARE
  constraint_name_var text;
BEGIN
  -- Find the unique constraint on the email column
  SELECT conname INTO constraint_name_var
  FROM pg_constraint
  WHERE conrelid = 'public.registrations'::regclass
    AND contype = 'u'
    AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.registrations'::regclass AND attname = 'email')];
  
  -- Drop the constraint if it exists
  IF constraint_name_var IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.registrations DROP CONSTRAINT %I', constraint_name_var);
    RAISE NOTICE 'Dropped constraint: %', constraint_name_var;
  END IF;
END $$;

-- Step 2: Drop the redundant non-unique index if it exists
DROP INDEX IF EXISTS public.registrations_email_idx;

-- Step 3: Create a case-insensitive unique index on lower(email)
-- This ensures emails are unique regardless of case (Test@Example.com == test@example.com)
CREATE UNIQUE INDEX IF NOT EXISTS registrations_email_lower_unique_idx 
  ON public.registrations (lower(email));

-- Step 4: Add comment for documentation
COMMENT ON INDEX public.registrations_email_lower_unique_idx IS 
  'Ensures email uniqueness in a case-insensitive manner. ' ||
  'Prevents duplicate registrations like Test@Example.com and test@example.com.';

COMMIT;
