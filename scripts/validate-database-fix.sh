#!/bin/bash
# Database Error Fix - Validation Test Suite
# This script validates that the database error fix implementation is working correctly

set -e  # Exit on error

echo "=========================================="
echo "Database Error Fix - Validation Test Suite"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print test results
print_test() {
    local test_name=$1
    local result=$2
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} $test_name"
    elif [ "$result" = "FAIL" ]; then
        echo -e "${RED}✗${NC} $test_name"
    else
        echo -e "${YELLOW}⊙${NC} $test_name"
    fi
}

# Check if we have Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}Warning: Supabase CLI not found. Some tests will be skipped.${NC}"
    HAS_SUPABASE_CLI=false
else
    HAS_SUPABASE_CLI=true
fi

echo "1. File Structure Validation"
echo "------------------------------"

# Check migration files exist
if [ -f "supabase/migrations/20251119164500_add_profile_errors_table.sql" ]; then
    print_test "profile_errors table migration exists" "PASS"
else
    print_test "profile_errors table migration exists" "FAIL"
fi

if [ -f "supabase/migrations/20251119164600_enhance_handle_new_user_trigger.sql" ]; then
    print_test "Enhanced trigger migration exists" "PASS"
else
    print_test "Enhanced trigger migration exists" "FAIL"
fi

# Check frontend files
if [ -f "src/lib/authErrorHandler.ts" ]; then
    print_test "authErrorHandler.ts exists" "PASS"
else
    print_test "authErrorHandler.ts exists" "FAIL"
fi

if [ -f "src/components/auth/SignupForm.tsx" ]; then
    print_test "SignupForm.tsx exists" "PASS"
else
    print_test "SignupForm.tsx exists" "FAIL"
fi

# Check documentation files
if [ -f "DATABASE_ERROR_COMPLETE_GUIDE.md" ]; then
    print_test "Complete guide documentation exists" "PASS"
else
    print_test "Complete guide documentation exists" "FAIL"
fi

if [ -f "DATABASE_DIAGNOSTIC_GUIDE.md" ]; then
    print_test "Diagnostic guide documentation exists" "PASS"
else
    print_test "Diagnostic guide documentation exists" "FAIL"
fi

if [ -f "ENVIRONMENT_VARIABLES_CHECKLIST.md" ]; then
    print_test "Environment checklist exists" "PASS"
else
    print_test "Environment checklist exists" "FAIL"
fi

if [ -f "DATABASE_FIX_IMPLEMENTATION_SUMMARY.md" ]; then
    print_test "Implementation summary exists" "PASS"
else
    print_test "Implementation summary exists" "FAIL"
fi

echo ""
echo "2. Code Quality Validation"
echo "------------------------------"

# Run TypeScript type checking
echo "Running TypeScript type check..."
if npm run typecheck > /dev/null 2>&1; then
    print_test "TypeScript type checking" "PASS"
else
    print_test "TypeScript type checking" "FAIL"
fi

# Check for syntax errors in migrations
echo "Checking SQL migration syntax..."
if grep -q "BEGIN;" "supabase/migrations/20251119164500_add_profile_errors_table.sql" && \
   grep -q "COMMIT;" "supabase/migrations/20251119164500_add_profile_errors_table.sql"; then
    print_test "profile_errors migration has transaction block" "PASS"
else
    print_test "profile_errors migration has transaction block" "FAIL"
fi

if grep -q "BEGIN;" "supabase/migrations/20251119164600_enhance_handle_new_user_trigger.sql" && \
   grep -q "COMMIT;" "supabase/migrations/20251119164600_enhance_handle_new_user_trigger.sql"; then
    print_test "Enhanced trigger migration has transaction block" "PASS"
else
    print_test "Enhanced trigger migration has transaction block" "FAIL"
fi

echo ""
echo "3. Migration Content Validation"
echo "------------------------------"

# Check profile_errors table has required fields
if grep -q "user_id uuid" "supabase/migrations/20251119164500_add_profile_errors_table.sql" && \
   grep -q "error_message text NOT NULL" "supabase/migrations/20251119164500_add_profile_errors_table.sql" && \
   grep -q "error_time timestamptz NOT NULL" "supabase/migrations/20251119164500_add_profile_errors_table.sql"; then
    print_test "profile_errors table has required fields" "PASS"
else
    print_test "profile_errors table has required fields" "FAIL"
fi

# Check enhanced trigger has error handling
if grep -q "EXCEPTION" "supabase/migrations/20251119164600_enhance_handle_new_user_trigger.sql" && \
   grep -q "unique_violation" "supabase/migrations/20251119164600_enhance_handle_new_user_trigger.sql" && \
   grep -q "not_null_violation" "supabase/migrations/20251119164600_enhance_handle_new_user_trigger.sql"; then
    print_test "Enhanced trigger has error handling" "PASS"
else
    print_test "Enhanced trigger has error handling" "FAIL"
fi

# Check trigger logs to profile_errors
if grep -q "INSERT INTO public.profile_errors" "supabase/migrations/20251119164600_enhance_handle_new_user_trigger.sql"; then
    print_test "Enhanced trigger logs to profile_errors" "PASS"
else
    print_test "Enhanced trigger logs to profile_errors" "FAIL"
fi

echo ""
echo "4. Frontend Code Validation"
echo "------------------------------"

# Check authErrorHandler exports
if grep -q "export function parseAuthError" "src/lib/authErrorHandler.ts" && \
   grep -q "export function getUserFriendlyMessage" "src/lib/authErrorHandler.ts" && \
   grep -q "export function logAuthError" "src/lib/authErrorHandler.ts"; then
    print_test "authErrorHandler exports correct functions" "PASS"
else
    print_test "authErrorHandler exports correct functions" "FAIL"
fi

# Check SignupForm imports authErrorHandler
if grep -q "import.*authErrorHandler" "src/components/auth/SignupForm.tsx"; then
    print_test "SignupForm imports authErrorHandler" "PASS"
else
    print_test "SignupForm imports authErrorHandler" "FAIL"
fi

# Check SignupForm uses enhanced error handling
if grep -q "logAuthError" "src/components/auth/SignupForm.tsx" && \
   grep -q "getUserFriendlyMessage" "src/components/auth/SignupForm.tsx"; then
    print_test "SignupForm uses enhanced error handling" "PASS"
else
    print_test "SignupForm uses enhanced error handling" "FAIL"
fi

echo ""
echo "5. Documentation Validation"
echo "------------------------------"

# Check COMPLETE_GUIDE has all sections
if grep -q "Quick Start - Most Common Issues" "DATABASE_ERROR_COMPLETE_GUIDE.md" && \
   grep -q "Root Cause Analysis" "DATABASE_ERROR_COMPLETE_GUIDE.md" && \
   grep -q "Fixes and Solutions" "DATABASE_ERROR_COMPLETE_GUIDE.md" && \
   grep -q "Testing Your Fixes" "DATABASE_ERROR_COMPLETE_GUIDE.md"; then
    print_test "Complete guide has all major sections" "PASS"
else
    print_test "Complete guide has all major sections" "FAIL"
fi

# Check DIAGNOSTIC_GUIDE has SQL queries
if grep -q "SELECT" "DATABASE_DIAGNOSTIC_GUIDE.md" && \
   grep -q "FROM public.profiles" "DATABASE_DIAGNOSTIC_GUIDE.md" && \
   grep -q "FROM pg_policies" "DATABASE_DIAGNOSTIC_GUIDE.md"; then
    print_test "Diagnostic guide has SQL queries" "PASS"
else
    print_test "Diagnostic guide has SQL queries" "FAIL"
fi

# Check ENV_CHECKLIST has validation steps
if grep -q "VITE_SUPABASE_URL" "ENVIRONMENT_VARIABLES_CHECKLIST.md" && \
   grep -q "VITE_SUPABASE_ANON_KEY" "ENVIRONMENT_VARIABLES_CHECKLIST.md" && \
   grep -q "SUPABASE_SERVICE_ROLE_KEY" "ENVIRONMENT_VARIABLES_CHECKLIST.md"; then
    print_test "Environment checklist covers all variables" "PASS"
else
    print_test "Environment checklist covers all variables" "FAIL"
fi

echo ""
echo "6. Security Validation"
echo "------------------------------"

# Check RLS is mentioned in migrations
if grep -q "ROW LEVEL SECURITY" "supabase/migrations/20251119164500_add_profile_errors_table.sql"; then
    print_test "profile_errors table has RLS" "PASS"
else
    print_test "profile_errors table has RLS" "FAIL"
fi

# Check no hardcoded credentials
if ! grep -rq "eyJhbGciOi[A-Za-z0-9_-]\{50,\}" src/ --include="*.ts" --include="*.tsx" 2>/dev/null; then
    print_test "No hardcoded Supabase keys in source" "PASS"
else
    print_test "No hardcoded Supabase keys in source" "FAIL"
fi

# Check service role key only in backend
if grep -q "SUPABASE_SERVICE_ROLE_KEY" "src/" -r 2>/dev/null; then
    print_test "Service role key not in frontend" "FAIL"
else
    print_test "Service role key not in frontend" "PASS"
fi

echo ""
echo "7. Best Practices Validation"
echo "------------------------------"

# Check migrations are idempotent
if grep -q "IF NOT EXISTS" "supabase/migrations/20251119164500_add_profile_errors_table.sql" || \
   grep -q "IF EXISTS" "supabase/migrations/20251119164500_add_profile_errors_table.sql"; then
    print_test "Migrations use IF EXISTS/IF NOT EXISTS" "PASS"
else
    print_test "Migrations use IF EXISTS/IF NOT EXISTS" "WARN"
fi

# Check trigger function has SECURITY DEFINER
if grep -q "SECURITY DEFINER" "supabase/migrations/20251119164600_enhance_handle_new_user_trigger.sql"; then
    print_test "Trigger function has SECURITY DEFINER" "PASS"
else
    print_test "Trigger function has SECURITY DEFINER" "FAIL"
fi

# Check error handler has development-only logging
if grep -q "import.meta.env.DEV\|import.meta.env?.DEV" "src/lib/authErrorHandler.ts" || \
   grep -q "process.env.NODE_ENV\|process.env?.NODE_ENV" "src/lib/authErrorHandler.ts" || \
   grep -q "isDev" "src/lib/authErrorHandler.ts"; then
    print_test "Error handler has development-only logging" "PASS"
else
    print_test "Error handler has development-only logging" "FAIL"
fi

echo ""
echo "=========================================="
echo "Validation Complete"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Review any failed tests above"
echo "2. Apply migrations: supabase db push"
echo "3. Test signup flow manually"
echo "4. Check profile_errors table for any issues"
echo "5. Review comprehensive guides for detailed information"
echo ""
echo "Documentation:"
echo "- DATABASE_ERROR_COMPLETE_GUIDE.md - Complete investigation guide"
echo "- DATABASE_DIAGNOSTIC_GUIDE.md - SQL diagnostic queries"
echo "- ENVIRONMENT_VARIABLES_CHECKLIST.md - Configuration validation"
echo "- DATABASE_FIX_IMPLEMENTATION_SUMMARY.md - Implementation details"
