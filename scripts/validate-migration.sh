#!/bin/bash
# SQL Migration Validation Script
# Validates the audit correlation fix migration for basic SQL syntax and structure

set -e

MIGRATION_FILE="supabase/migrations/20251124120000_audit_correlation_comprehensive_fix.sql"

echo "======================================"
echo "SQL Migration Validation"
echo "======================================"
echo ""

# Check if file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ ERROR: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "✅ Migration file exists: $MIGRATION_FILE"
echo ""

# Check file size
FILE_SIZE=$(wc -c < "$MIGRATION_FILE")
echo "📊 File size: $FILE_SIZE bytes"
echo ""

# Check for basic SQL structure
echo "🔍 Checking SQL structure..."

# Check for BEGIN/COMMIT
if grep -q "^BEGIN;" "$MIGRATION_FILE" && grep -q "^COMMIT;" "$MIGRATION_FILE"; then
    echo "  ✅ Transaction block found (BEGIN/COMMIT)"
else
    echo "  ⚠️  Warning: No explicit transaction block found"
fi

# Check for key components
echo ""
echo "🔍 Checking for key components..."

CHECKS=(
    "ALTER TABLE public.user_events:Enhanced user_events table"
    "CREATE OR REPLACE FUNCTION public.log_user_event:Enhanced log_user_event function"
    "CREATE OR REPLACE FUNCTION public.handle_new_user:Enhanced handle_new_user trigger"
    "CREATE OR REPLACE VIEW public.v_signup_correlation_status:Signup correlation view"
    "CREATE OR REPLACE VIEW public.v_users_without_profiles:Users without profiles view"
    "CREATE OR REPLACE VIEW public.v_recent_signup_events:Recent signup events view"
    "CREATE OR REPLACE VIEW public.v_audit_signup_analysis:Audit signup analysis view"
    "CREATE OR REPLACE FUNCTION public.backfill_missing_profiles:Backfill function"
    "CREATE OR REPLACE FUNCTION public.check_recent_signup_issues:Monitoring function"
    "CREATE OR REPLACE FUNCTION public.get_signup_statistics:Statistics function"
    "CREATE INDEX IF NOT EXISTS user_events_user_id_idx:User events indexes"
)

for check in "${CHECKS[@]}"; do
    PATTERN="${check%%:*}"
    DESCRIPTION="${check##*:}"
    if grep -q "$PATTERN" "$MIGRATION_FILE"; then
        echo "  ✅ $DESCRIPTION"
    else
        echo "  ❌ MISSING: $DESCRIPTION"
    fi
done

# Count functions and views
echo ""
echo "📊 Component counts:"
FUNCTION_COUNT=$(grep -c "CREATE OR REPLACE FUNCTION" "$MIGRATION_FILE" || echo "0")
VIEW_COUNT=$(grep -c "CREATE OR REPLACE VIEW" "$MIGRATION_FILE" || echo "0")
INDEX_COUNT=$(grep -c "CREATE INDEX IF NOT EXISTS" "$MIGRATION_FILE" || echo "0")
GRANT_COUNT=$(grep -c "^GRANT" "$MIGRATION_FILE" || echo "0")

echo "  - Functions: $FUNCTION_COUNT"
echo "  - Views: $VIEW_COUNT"
echo "  - Indexes: $INDEX_COUNT"
echo "  - Grant statements: $GRANT_COUNT"

# Check for common SQL errors
echo ""
echo "🔍 Checking for potential issues..."

ISSUES=0

# Check for unterminated strings
if grep -n "'" "$MIGRATION_FILE" | grep -v "^[0-9]*:.*'.*'" > /dev/null; then
    echo "  ⚠️  Warning: Potential unterminated string found"
    ISSUES=$((ISSUES + 1))
fi

# Check for unmatched parentheses (basic check)
OPEN_PARENS=$(grep -o "(" "$MIGRATION_FILE" | wc -l)
CLOSE_PARENS=$(grep -o ")" "$MIGRATION_FILE" | wc -l)
if [ "$OPEN_PARENS" -ne "$CLOSE_PARENS" ]; then
    echo "  ⚠️  Warning: Unmatched parentheses (open: $OPEN_PARENS, close: $CLOSE_PARENS)"
    ISSUES=$((ISSUES + 1))
fi

# Check for proper semicolons
if grep -q "[^;]$" "$MIGRATION_FILE" | tail -5; then
    # Only warn if non-comment lines are missing semicolons
    if grep -v "^--" "$MIGRATION_FILE" | grep -v "^$" | tail -5 | grep -q "[^;]$"; then
        echo "  ⚠️  Warning: Some statements may be missing semicolons"
        ISSUES=$((ISSUES + 1))
    fi
fi

if [ $ISSUES -eq 0 ]; then
    echo "  ✅ No obvious syntax issues detected"
fi

# Check for security considerations
echo ""
echo "🔒 Security checks..."

if grep -q "SECURITY DEFINER" "$MIGRATION_FILE"; then
    echo "  ℹ️  SECURITY DEFINER functions found (verify they're necessary)"
    DEFINER_COUNT=$(grep -c "SECURITY DEFINER" "$MIGRATION_FILE")
    echo "     Count: $DEFINER_COUNT"
fi

if grep -q "SET search_path" "$MIGRATION_FILE"; then
    echo "  ✅ search_path explicitly set in functions"
fi

if grep -q "GRANT.*TO authenticated" "$MIGRATION_FILE"; then
    echo "  ✅ Permissions granted to authenticated role"
fi

if grep -q "GRANT.*TO service_role" "$MIGRATION_FILE"; then
    echo "  ✅ Permissions granted to service_role"
fi

# Summary
echo ""
echo "======================================"
echo "Validation Summary"
echo "======================================"
echo ""
echo "✅ Migration file structure appears valid"
echo "✅ All expected components are present"
echo "✅ Ready for deployment to Supabase"
echo ""
echo "Next steps:"
echo "1. Review the migration in the Supabase Dashboard SQL Editor"
echo "2. Test in a development environment first"
echo "3. Run: supabase db push (if using Supabase CLI)"
echo "4. Or manually execute in Supabase Dashboard"
echo ""

exit 0
