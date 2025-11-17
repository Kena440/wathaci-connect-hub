# Wathaci Auth & Onboarding Blueprint

This guide captures the end-to-end pieces requested for a ZAQA-style flow: database schema, RLS, Supabase client, React components, and a lightweight auth context/route guard.

## DB Schema (SQL)

### profiles table & supporting structures

All SQL is captured in `supabase/migrations/20250501093000_wathaci_profiles_schema.sql` and can be pushed with `supabase db push`.

Key decisions:
- **Enum**: `account_type_enum` enforces the allowed values (`SME`, `INVESTOR`, `SERVICE_PROVIDER`, `PARTNER`, `ADMIN`). An enum keeps the constraint tight and indexes compact; a lookup table is provided for readability/metadata.
- **1:1 with auth.users**: `profiles.id` references `auth.users.id` with `ON DELETE CASCADE`.
- **bookkeeping**: `created_at`/`updated_at` default to UTC with an auto-update trigger.

```sql
-- Enum and lookup table
CREATE TYPE public.account_type_enum AS ENUM ('SME','INVESTOR','SERVICE_PROVIDER','PARTNER','ADMIN');
CREATE TABLE public.account_types (
  account_type public.account_type_enum PRIMARY KEY,
  label text NOT NULL UNIQUE
);

-- Profiles core
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  account_type public.account_type_enum NOT NULL DEFAULT 'SME',
  company_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Useful indexes
CREATE UNIQUE INDEX profiles_email_key ON public.profiles (email);
CREATE INDEX profiles_account_type_idx ON public.profiles (account_type);
```

### updated_at trigger

```sql
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();
```

## RLS Policies (SQL)

Defined in the same migration:

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Owner policies
CREATE POLICY profiles_select_owner ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY profiles_insert_owner ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update_owner ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Admin access (ADMIN users can select/update any row)
CREATE POLICY profiles_admin_all ON public.profiles
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.account_type = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.account_type = 'ADMIN'));
```

### Optional profile auto-create trigger

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text; BEGIN
  v_email := NEW.email;
  INSERT INTO public.profiles (id, email, account_type)
  VALUES (NEW.id, v_email, 'SME')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

Use the Supabase **service role** when invoking `auth.admin.createUser` or running backfills; client-side signup will work with the insert policy if `id = auth.uid()` matches.

## Supabase Client Setup (TypeScript)

`src/lib/wathaciSupabaseClient.ts` is a minimal, copy/paste-friendly client using Vite env vars. It exports `supabaseClient`, the `AccountType` union, and `accountTypePaths` (redirect map).

```ts
import { createClient } from "@supabase/supabase-js";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
```

## React Signup Flow Components

Files live in `src/components/auth` and `src/pages/WathaciSignup.tsx`.

### AccountTypeSelector

- Cards for SME, Investor, Service Provider, Partner.
- Prop: `onSelect(accountType)`.

### SignupForm

- Props: `accountType`, optional `onSuccess`.
- Handles email/password, full name, company name.
- Calls `supabase.auth.signUp` then inserts into `profiles` (requires RLS insert policy to pass `id = auth.uid()`).
- Shows friendly errors; does not throw in UI code.

### SignupFlow

- Orchestrator: Step 1 (select) → Step 2 (form) → Step 3 (success/next steps).
- Place on a route, e.g., `/signup` using `src/pages/WathaciSignup.tsx`.

### Optional LoginForm

- Email + password.
- Fetches `profiles.account_type` after sign-in and redirects via `accountTypePaths`.

## Auth Context + Protected Route (light version)

`src/contexts/AuthContextLight.tsx` provides:
- `AuthProvider` listening to `supabase.auth.onAuthStateChange`.
- `useAuth()` hook returning `{ session, user, loading, error }`.
- `ProtectedRoute` wrapper that redirects unauthenticated users to `/login` (using `react-router-dom`'s `Navigate`).

## Notes/Assumptions & How to Adapt

- RLS policies expect `auth.uid()` to match `profiles.id`; admin-wide access hinges on the admin's own profile having `account_type = 'ADMIN'`.
- If you enforce email confirmation, the signup UI surfaces a "check your email" prompt when `data.session` is null. Without confirmation, it redirects immediately using the account type mapping.
- Company/phone are optional; extend the schema with additional onboarding fields as needed.
- The lookup table lets you attach descriptions/ordering later without changing the enum values.
