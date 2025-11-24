-- Capture trigger function definitions into backups.trigger_function_defs and export a local snapshot.
\set ON_ERROR_STOP on

BEGIN;
SET TRANSACTION READ WRITE;

CREATE SCHEMA IF NOT EXISTS backups;

CREATE TABLE IF NOT EXISTS backups.trigger_function_defs (
  name text PRIMARY KEY,
  definition text,
  created_at timestamptz DEFAULT now()
);

DO $$
DECLARE
  rec RECORD;
  funcname text;
  fdef text;
begin
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

-- Export a CSV snapshot locally (when run via psql). Adjust the path if needed.
\copy (
  SELECT name, definition, created_at
  FROM backups.trigger_function_defs
  ORDER BY name
) TO './supabase/backups/trigger_function_defs_snapshot.csv' CSV HEADER;
