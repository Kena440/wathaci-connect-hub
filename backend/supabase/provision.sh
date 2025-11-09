#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILES=(
  "core_schema.sql"
  "profiles_schema.sql"
  "registrations.sql"
  "frontend_logs.sql"
  "webhook_logs.sql"
  "profiles_policies.sql"
)

use_psql=false
connection_url="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"

if [[ -n "$connection_url" ]]; then
  if ! command -v psql >/dev/null 2>&1; then
    echo "psql is required to use SUPABASE_DB_URL/DATABASE_URL but was not found." >&2
    exit 1
  fi
  use_psql=true
elif command -v supabase >/dev/null 2>&1; then
  use_psql=false
else
  cat >&2 <<'ERR'
Unable to find a way to execute the SQL migrations.
Provide a Postgres connection string via SUPABASE_DB_URL (or DATABASE_URL) and ensure
`psql` is installed, or install the Supabase CLI and link it to your project so
`supabase db query` can be used.
ERR
  exit 1
fi

for file in "${SQL_FILES[@]}"; do
  sql_path="${SCRIPT_DIR}/${file}"
  if [[ ! -f "$sql_path" ]]; then
    echo "Missing SQL file: $sql_path" >&2
    exit 1
  fi

  echo "\n▶ Applying ${file}..."
  if [[ "$use_psql" == true ]]; then
    PGPASSWORD="${SUPABASE_DB_PASSWORD:-}" \
      psql "$connection_url" \
      --set ON_ERROR_STOP=1 \
      --file "$sql_path"
  else
    supabase db query <"$sql_path"
  fi
  echo "✓ ${file} applied successfully."
done

echo "\nAll Supabase schema and policy scripts executed successfully."
