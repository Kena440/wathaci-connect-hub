-- 20251208230921_add-business-name-to-profiles.sql
-- Deprecated / placeholder migration.
-- NOTE:
--   Business name support for profiles is already fully handled by:
--     20251119010100_add_business_name_field.sql
--   This migration is intentionally a no-op to keep the historical
--   migration timeline consistent and safe for `db reset`.

BEGIN;
  -- no-op: business_name column already added and wired via earlier migration.
COMMIT;
