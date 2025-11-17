-- Add profile_completed field to profiles table
-- This field tracks whether a user has completed their profile setup

BEGIN;

-- Add profile_completed field
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_completed boolean NOT NULL DEFAULT false;

-- Add index for efficient queries on incomplete profiles
CREATE INDEX IF NOT EXISTS profiles_profile_completed_idx ON public.profiles(profile_completed);

-- Add comment
COMMENT ON COLUMN public.profiles.profile_completed IS 
  'Indicates whether the user has completed their full profile setup after initial signup';

COMMIT;
