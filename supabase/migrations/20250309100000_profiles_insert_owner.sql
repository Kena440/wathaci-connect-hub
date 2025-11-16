BEGIN;

DROP POLICY IF EXISTS profiles_insert_none ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_owner ON public.profiles;

CREATE POLICY profiles_insert_owner ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

GRANT EXECUTE ON FUNCTION public.ensure_profile_exists(uuid, text, text, text, text) TO authenticated;

COMMIT;
