#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SUPABASE_DB_URL:-}" && -z "${DATABASE_URL:-}" ]]; then
  cat <<'MSG' >&2
Error: Please export a Supabase connection string before running this verification script.
Set either SUPABASE_DB_URL or DATABASE_URL, for example:

  export SUPABASE_DB_URL="postgres://postgres:[password]@[host]:5432/postgres"

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
export PGPASSWORD="${SUPABASE_DB_PASSWORD:-}" 

run_query() {
  local sql="$1"
  psql "${CONNECTION_STRING}" \
    --no-align \
    --tuples-only \
    --quiet \
    --set ON_ERROR_STOP=1 \
    --command "${sql}"
}

failures=()

check_exists() {
  local description="$1"
  local sql="$2"
  local result
  result="$(run_query "${sql}")"
  if [[ "${result}" == "t" || "${result}" == "1" ]]; then
    printf "✅ %s\n" "${description}"
  else
    printf "❌ %s\n" "${description}"
    failures+=("${description}")
  fi
}

check_table() {
  local table="$1"
  local description="Table '${table}' exists"
  local schema="public"
  if [[ "${table}" == *.* ]]; then
    schema="${table%%.*}"
    table="${table##*.}"
  fi
  check_exists "${description}" "select case when exists (\n    select 1\n    from pg_catalog.pg_class c\n    join pg_catalog.pg_namespace n on n.oid = c.relnamespace\n    where n.nspname = '${schema}'\n      and c.relname = '${table}'\n      and c.relkind = 'r'\n  ) then 't' else 'f' end;"
}

check_trigger() {
  local table="$1"
  local trigger_name="$2"
  local schema="public"
  if [[ "${table}" == *.* ]]; then
    schema="${table%%.*}"
    table="${table##*.}"
  fi
  local description="Trigger '${trigger_name}' exists on ${schema}.${table}"
  check_exists "${description}" "select case when exists (\n    select 1\n    from pg_trigger t\n    join pg_class c on c.oid = t.tgrelid\n    join pg_namespace n on n.oid = c.relnamespace\n    where n.nspname = '${schema}'\n      and c.relname = '${table}'\n      and t.tgname = '${trigger_name}'\n  ) then 't' else 'f' end;"
}

check_policy() {
  local table="$1"
  local policy_name="$2"
  local schema="public"
  if [[ "${table}" == *.* ]]; then
    schema="${table%%.*}"
    table="${table##*.}"
  fi
  local description="Policy '${policy_name}' exists on ${schema}.${table}"
  check_exists "${description}" "select case when exists (\n    select 1\n    from pg_policies\n    where schemaname = '${schema}'\n      and tablename = '${table}'\n      and polname = '${policy_name}'\n  ) then 't' else 'f' end;"
}

check_column() {
  local table="$1"
  local column="$2"
  local schema="public"
  if [[ "${table}" == *.* ]]; then
    schema="${table%%.*}"
    table="${table##*.}"
  fi
  local description="Column '${column}' exists on ${schema}.${table}"
  check_exists "${description}" "select case when exists (\n    select 1\n    from information_schema.columns\n    where table_schema = '${schema}'\n      and table_name = '${table}'\n      and column_name = '${column}'\n  ) then 't' else 'f' end;"
}

printf "\n🔎 Running Supabase schema verification checks...\n\n"

check_table "public.profiles"
check_table "public.payments"
check_table "public.webhook_logs"
check_table "public.business_stats"

check_trigger "public.payments" "set_timestamp"
check_trigger "public.profiles" "set_timestamp"
check_trigger "public.business_stats" "business_stats_set_updated_at"

check_policy "public.payments" "Payments are viewable by owners"
check_policy "public.payments" "Payments are manageable by owners"
check_policy "public.payments" "Payments managed by service role"
check_policy "public.webhook_logs" "Webhook logs managed by service role"
check_policy "public.business_stats" "Allow anon read active business stats"

check_column "public.payments" "lenco_transaction_id"
check_column "public.payments" "lenco_access_code"
check_column "public.payments" "lenco_authorization_url"
check_column "public.payments" "gateway_response"
check_column "public.payments" "metadata"
check_column "public.payments" "paid_at"
check_column "public.business_stats" "stat_type"
check_column "public.business_stats" "stat_value"
check_column "public.business_stats" "is_active"
check_column "public.business_stats" "order_index"

if (( ${#failures[@]} > 0 )); then
  printf "\n❗ Schema verification completed with %s failure(s).\n" "${#failures[@]}" >&2
  exit 1
fi

printf "\n🎉 All Supabase schema verification checks passed.\n"
