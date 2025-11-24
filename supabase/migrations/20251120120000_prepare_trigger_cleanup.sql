-- Prepare consolidation DDL: backup existing trigger functions and triggers, then provide DROP statements (NOT executed)

BEGIN;
SET TRANSACTION READ WRITE;

-- Ensure backup schema exists so table creation succeeds
CREATE SCHEMA IF NOT EXISTS backups;

-- Create table to store function definitions for review
CREATE TABLE IF NOT EXISTS backups.trigger_function_defs (
  name text PRIMARY KEY,
  definition text,
  created_at timestamptz DEFAULT now()
);

-- Capture current definitions of target functions
DO $$
DECLARE
  rec RECORD;
  funcname text;
  fdef text;
BEGIN
  FOR rec IN
    SELECT p.oid, n.nspname AS schema, p.proname AS name
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname IN ('autocreate_profile_on_user','handle_auth_user_created','handle_new_user')
  LOOP
    BEGIN
      fdef := pg_get_functiondef(rec.oid);
      funcname := rec.name || ' -- ' || rec.schema;
      INSERT INTO backups.trigger_function_defs (name, definition)
      VALUES (funcname, fdef)
      ON CONFLICT (name) DO UPDATE SET definition = EXCLUDED.definition, created_at = now();
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not capture function %', rec.name;
    END;
  END LOOP;
END$$;

COMMIT;

-- Generate reviewed DROP/ALTER statements as a SELECT for manual execution when ready.
-- These statements are suggestions only and are NOT executed here.
SELECT
  '-- CHECK: Ensure handle_new_user exists and covers all behavior before dropping others' AS note
UNION ALL
SELECT '-- To disable triggers temporarily:'
UNION ALL
SELECT '/* Example: ALTER TABLE auth.users DISABLE TRIGGER trigger_name; */'
UNION ALL
SELECT '-- To drop redundant trigger functions and triggers (run after verification):'
UNION ALL
SELECT 'DROP TRIGGER IF EXISTS autocreate_profile_trigger ON auth.users;'
UNION ALL
SELECT 'DROP FUNCTION IF EXISTS autocreate_profile_on_user();'
UNION ALL
SELECT 'DROP TRIGGER IF EXISTS handle_auth_user_created_trigger ON auth.users;'
UNION ALL
SELECT 'DROP FUNCTION IF EXISTS handle_auth_user_created();'
UNION ALL
SELECT '-- Keep handle_new_user() in place. If you want to rename, create a wrapper.'
UNION ALL
SELECT '-- Recommended test (run in a transaction and rollback) to verify behavior after changes:'
UNION ALL
SELECT 'BEGIN; INSERT INTO auth.users (id, email, raw_user_meta_data, aud) VALUES (''00000000-0000-0000-0000-000000000099'',''test+verify@example.com'',''{}'',''authenticated''); SELECT * FROM public.profiles WHERE id = ''00000000-0000-0000-0000-000000000099''; ROLLBACK;'
;
