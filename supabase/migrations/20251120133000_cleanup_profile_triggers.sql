-- Consolidate profile creation triggers so only the enhanced handle_new_user() path runs.
-- This prevents duplicate trigger invocations observed in production and ensures
-- the canonical trigger is re-created if missing.

BEGIN;

-- Remove legacy triggers that duplicate profile creation.
DROP TRIGGER IF EXISTS auth_create_profile ON auth.users;
DROP TRIGGER IF EXISTS auth_user_created_trigger ON auth.users;

-- Drop legacy helper functions that are no longer needed.
DROP FUNCTION IF EXISTS public.autocreate_profile_on_user();
DROP FUNCTION IF EXISTS public.handle_auth_user_created();

-- Re-create the canonical trigger using the enhanced handle_new_user() function.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

COMMIT;
