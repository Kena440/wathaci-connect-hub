BEGIN;

-- Remove the recursive admin policy that selected from public.profiles inside its own RLS predicate.
DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;

-- Helper to evaluate admin access without invoking RLS on public.profiles (avoids recursion).
CREATE OR REPLACE FUNCTION public.is_profile_admin(p_uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = COALESCE(p_uid, auth.uid())
      AND p.account_type = 'ADMIN'
  );
END;
$$;

-- Ensure callers have explicit execute privileges.
REVOKE ALL ON FUNCTION public.is_profile_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_profile_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_profile_admin(uuid) TO service_role;

-- Recreate the admin-all policy using the helper function (non-recursive).
CREATE POLICY profiles_admin_all ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_profile_admin(auth.uid()))
  WITH CHECK (public.is_profile_admin(auth.uid()));

-- Document the prior recursion issue to prevent regressions.
COMMENT ON TABLE public.profiles IS
  'Profiles table. Previous admin policy queried the same table inside its predicate, which caused Postgres error 42P17 (infinite recursion) via PostgREST. Keep predicates non-recursive (use public.is_profile_admin).';

COMMIT;
