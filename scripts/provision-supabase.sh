#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_DIR="${SCRIPT_DIR}/../backend/supabase"
VERIFY_SCRIPT="${SCRIPT_DIR}/verify-supabase-schema.sh"

if [[ ! -d "${SQL_DIR}" ]]; then
  echo "Error: Unable to locate Supabase SQL directory at ${SQL_DIR}" >&2
  exit 1
fi

if [[ -z "${SUPABASE_DB_URL:-}" && -z "${DATABASE_URL:-}" ]]; then
  cat <<'MSG' >&2
Error: Please export a Supabase connection string before running this script.
Set either SUPABASE_DB_URL or DATABASE_URL, for example:

  export SUPABASE_DB_URL="postgres://postgres:[password]@[host]:5432/postgres"

You can copy the connection string from the Supabase project settings (Project Settings → Database → Connection string → URI).
MSG
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  cat <<'MSG' >&2
Error: psql command not found.
Install PostgreSQL client tools or run this script from an environment where the `psql` CLI is available.
MSG
  exit 1
fi

CONNECTION_STRING="${SUPABASE_DB_URL:-${DATABASE_URL}}"

SQL_FILES=(
  "core_schema.sql"
  "profiles_schema.sql"
  "registrations.sql"
  "frontend_logs.sql"
  "webhook_logs.sql"
  "profiles_policies.sql"
)

for file in "${SQL_FILES[@]}"; do
  SQL_PATH="${SQL_DIR}/${file}"
  if [[ ! -f "${SQL_PATH}" ]]; then
    echo "Warning: Skipping missing SQL file ${SQL_PATH}" >&2
    continue
  fi

  echo "\n➡️  Executing ${file}"
  PGPASSWORD="${SUPABASE_DB_PASSWORD:-}" \
    psql "${CONNECTION_STRING}" \
      --set ON_ERROR_STOP=1 \
      --file "${SQL_PATH}"
  echo "✅  Completed ${file}"

done

echo "\n🎉 Supabase schema provisioning complete."

if [[ -x "${VERIFY_SCRIPT}" ]]; then
  echo "\n🔎 Running post-provision verification checks..."
  "${VERIFY_SCRIPT}"
else
  echo "\n⚠️  Skipping post-provision verification: ${VERIFY_SCRIPT} not found or not executable."
fi
