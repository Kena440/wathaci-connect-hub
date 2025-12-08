BEGIN;

-- Ensure core profile columns exist and are nullable where onboarding requires selection later
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS id uuid,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS account_type public.account_type_enum,
  ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now());

-- Keep profile_completed consistent and nullable columns relaxed for onboarding
ALTER TABLE public.profiles ALTER COLUMN profile_completed SET DEFAULT false;
UPDATE public.profiles SET profile_completed = COALESCE(profile_completed, false);
ALTER TABLE public.profiles ALTER COLUMN profile_completed SET NOT NULL;

ALTER TABLE public.profiles ALTER COLUMN account_type DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN account_type DROP DEFAULT;

-- Ensure primary key and foreign key constraints are present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_pkey'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
  END IF;
END
$$;

ALTER TABLE public.profiles ALTER COLUMN id SET NOT NULL;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;

-- Trigger to create a profile as soon as a new auth user is inserted
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = NEW.id
  ) THEN
    INSERT INTO public.profiles (id, email, account_type, profile_completed)
    VALUES (
      NEW.id,
      NEW.email,
      NULL,
      false
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_new_user_profile();

-- RLS policies that allow users to manage only their own profile (plus admin helper)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

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
      AND p.account_type::text = 'admin'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_profile_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_profile_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_profile_admin(uuid) TO service_role;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_owner ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_insert_owner ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_admin_all ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_profile_admin(auth.uid()))
  WITH CHECK (public.is_profile_admin(auth.uid()));

-- Backfill existing auth users without profiles to avoid onboarding dead ends
INSERT INTO public.profiles (id, email, account_type, profile_completed)
SELECT
  u.id,
  u.email,
  NULL,
  false
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

COMMIT;
