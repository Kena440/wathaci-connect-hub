-- 20251209104908_add_sme_profiles_table.sql
-- Deprecated / placeholder migration.
-- NOTE:
--   SME profile data model and RLS are handled in the main onboarding
--   migration:
--     20251212120000_create_professional_profiles.sql
--   which creates `public.sme_profiles` (alongside professional and
--   investor profile structures).
--
--   This migration is intentionally a no-op to keep the migration chain
--   consistent without duplicating or conflicting schema changes.

BEGIN;
  -- no-op: sme_profiles table and its policies are defined elsewhere.
COMMIT;
