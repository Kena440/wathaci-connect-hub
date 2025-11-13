BEGIN;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_owner ON public.profiles;
CREATE POLICY profiles_select_owner ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_update_owner ON public.profiles;
CREATE POLICY profiles_update_owner ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_insert_none ON public.profiles;
CREATE POLICY profiles_insert_none ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
CREATE POLICY profiles_admin_all ON public.profiles
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'user_role') = 'admin' OR (auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'user_role') = 'admin' OR (auth.jwt() ->> 'role') = 'admin');

COMMIT;
