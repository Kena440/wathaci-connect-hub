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
  SELECT conname INTO constraint_name_var
  FROM pg_constraint
  WHERE conrelid = 'public.registrations'::regclass
    AND contype = 'u'
    AND conkey = ARRAY[
      (SELECT attnum FROM pg_attribute 
       WHERE attrelid = 'public.registrations'::regclass 
         AND attname = 'email')
    ];

  IF constraint_name_var IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.registrations DROP CONSTRAINT %I', constraint_name_var);
    RAISE NOTICE 'Dropped constraint: %', constraint_name_var;
  END IF;
END $$;

-- Step 2: Drop the redundant non-unique index if it exists
DROP INDEX IF EXISTS public.registrations_email_idx;

-- Step 3: Create a case-insensitive unique index on lower(email)
CREATE UNIQUE INDEX IF NOT EXISTS registrations_email_lower_unique_idx 
  ON public.registrations (lower(email));

-- Step 4: Add proper comment (no concatenation)
COMMENT ON INDEX public.registrations_email_lower_unique_idx IS
  'Ensures email uniqueness in a case-insensitive manner. Prevents duplicates like Test@Example.com vs test@example.com.';

COMMIT;
