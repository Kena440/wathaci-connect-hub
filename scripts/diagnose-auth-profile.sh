#!/usr/bin/env bash
# Script to diagnose auth signup and profile consistency issues
# This script runs all diagnostic queries and generates a comprehensive report

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if connection string is provided
if [[ -z "${SUPABASE_DB_URL:-}" && -z "${DATABASE_URL:-}" ]]; then
  echo -e "${RED}Error: Please set SUPABASE_DB_URL or DATABASE_URL${NC}"
  echo "Example: export SUPABASE_DB_URL='postgres://postgres:[password]@[host]:5432/postgres'"
  exit 1
fi

CONNECTION_STRING="${SUPABASE_DB_URL:-${DATABASE_URL}}"

# Check if psql is available
if ! command -v psql >/dev/null 2>&1; then
  echo -e "${RED}Error: psql command not found${NC}"
  echo "Please install PostgreSQL client tools"
  exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Auth Signup → Profile Consistency Diagnostic Report         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to run query and display results
run_query() {
  local title="$1"
  local query="$2"
  
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}$title${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  
  psql "$CONNECTION_STRING" -c "$query" 2>&1
  
  echo ""
}

# 1. Overall diagnostic summary
run_query "1️⃣ Overall Diagnostic Summary" \
  "SELECT * FROM public.diagnose_auth_profile_consistency();"

# 2. Verify profile completeness
run_query "2️⃣ Profile Completeness Verification" \
  "SELECT * FROM public.verify_profile_completeness();"

# 3. Recent signup health (last hour)
run_query "3️⃣ Recent Signup Health (Last Hour)" \
  "SELECT * FROM public.monitor_signup_health();"

# 4. Recent signup issues (last 10 minutes)
run_query "4️⃣ Recent Signup Issues (Last 10 Minutes)" \
  "SELECT * FROM public.check_recent_signup_issues();"

# 5. Detailed mismatch information (top 10)
run_query "5️⃣ Detailed Mismatch Information (Top 10)" \
  "SELECT user_id, audit_email, auth_email, status, audit_created_at 
   FROM public.get_auth_profile_mismatches(10);"

# 6. Check trigger function exists
run_query "6️⃣ Trigger Function Status" \
  "SELECT 
     EXISTS(
       SELECT 1 FROM pg_proc p
       JOIN pg_namespace n ON p.pronamespace = n.oid
       WHERE p.proname = 'handle_new_user' AND n.nspname = 'public'
     ) AS handle_new_user_exists,
     EXISTS(
       SELECT 1 FROM pg_proc p
       JOIN pg_namespace n ON p.pronamespace = n.oid
       WHERE p.proname = 'ensure_profile_exists' AND n.nspname = 'public'
     ) AS ensure_profile_exists_exists;"

# 7. Check trigger is attached
run_query "7️⃣ Trigger Attachment Status" \
  "SELECT 
     event_object_table,
     trigger_name,
     action_timing,
     event_manipulation
   FROM information_schema.triggers
   WHERE trigger_name = 'on_auth_user_created';"

# 8. Check RLS policies on profiles
run_query "8️⃣ Row Level Security Policies on Profiles" \
  "SELECT 
     policyname,
     permissive,
     cmd,
     LEFT(qual::text, 50) as condition
   FROM pg_policies
   WHERE tablename = 'profiles'
   ORDER BY policyname;"

# 9. Recent user events (errors and successes)
run_query "9️⃣ Recent Profile Creation Events" \
  "SELECT 
     kind,
     COUNT(*) as count,
     MAX(created_at) as latest_occurrence
   FROM public.user_events
   WHERE kind IN (
     'auth_user_created',
     'profile_bootstrap_ok',
     'profile_bootstrap_error',
     'profile_backfilled'
   )
   AND created_at > NOW() - INTERVAL '24 hours'
   GROUP BY kind
   ORDER BY latest_occurrence DESC;"

# 10. Sample of recent errors (if any)
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔟 Recent Profile Bootstrap Errors (Last 10)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

ERROR_COUNT=$(psql "$CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM public.user_events WHERE kind = 'profile_bootstrap_error' AND created_at > NOW() - INTERVAL '24 hours';" | xargs)

if [[ "$ERROR_COUNT" -gt 0 ]]; then
  echo -e "${RED}⚠️  Found $ERROR_COUNT profile bootstrap errors in the last 24 hours${NC}"
  echo ""
  psql "$CONNECTION_STRING" -c \
    "SELECT 
       user_id,
       payload->>'error' as error_message,
       payload->>'code' as error_code,
       created_at
     FROM public.user_events
     WHERE kind = 'profile_bootstrap_error'
     AND created_at > NOW() - INTERVAL '24 hours'
     ORDER BY created_at DESC
     LIMIT 10;" 2>&1
else
  echo -e "${GREEN}✅ No profile bootstrap errors found in the last 24 hours${NC}"
fi

echo ""

# Summary and recommendations
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Summary & Recommendations                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get key metrics
MISSING_PROFILES=$(psql "$CONNECTION_STRING" -t -c \
  "SELECT COUNT(*) FROM auth.users u LEFT JOIN public.profiles p ON u.id = p.id WHERE p.id IS NULL;" | xargs)

RECENT_ISSUES=$(psql "$CONNECTION_STRING" -t -c \
  "SELECT COUNT(*) FROM public.check_recent_signup_issues();" | xargs)

echo -e "📊 Key Metrics:"
echo -e "   • Missing Profiles: ${MISSING_PROFILES}"
echo -e "   • Recent Issues (last 10 min): ${RECENT_ISSUES}"
echo ""

if [[ "$MISSING_PROFILES" -gt 0 ]]; then
  echo -e "${YELLOW}⚠️  Action Required:${NC}"
  echo -e "   There are $MISSING_PROFILES users without profiles."
  echo ""
  echo -e "   Recommended actions:"
  echo -e "   1. Run backfill (dry run first):"
  echo -e "      ${BLUE}SELECT public.backfill_all_missing_profiles(100, true);${NC}"
  echo ""
  echo -e "   2. If dry run looks good, execute backfill:"
  echo -e "      ${BLUE}SELECT public.backfill_all_missing_profiles(100, false);${NC}"
  echo ""
  echo -e "   3. Verify completeness:"
  echo -e "      ${BLUE}SELECT * FROM public.verify_profile_completeness();${NC}"
else
  echo -e "${GREEN}✅ Status: Healthy${NC}"
  echo -e "   All auth.users have corresponding profiles."
fi

echo ""

if [[ "$RECENT_ISSUES" -gt 0 ]]; then
  echo -e "${RED}⚠️  Recent Issues Detected:${NC}"
  echo -e "   There are $RECENT_ISSUES signup issues in the last 10 minutes."
  echo ""
  echo -e "   This suggests the trigger may not be working properly."
  echo -e "   Check trigger function and RLS policies."
else
  echo -e "${GREEN}✅ Recent Health: Good${NC}"
  echo -e "   No signup issues detected in the last 10 minutes."
fi

echo ""
echo -e "${BLUE}For detailed guidance, see: docs/AUTH_PROFILE_CONSISTENCY_GUIDE.md${NC}"
echo ""
