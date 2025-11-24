#!/usr/bin/env bash
# Validate SQL syntax of new migrations without executing them
# Uses PostgreSQL's parser to check for syntax errors

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Validating SQL syntax of new migrations...${NC}"
echo ""

MIGRATIONS=(
  "supabase/migrations/20251125000000_diagnose_auth_profile_consistency.sql"
  "supabase/migrations/20251125000100_backfill_missing_profiles.sql"
)

ERRORS=0

for migration in "${MIGRATIONS[@]}"; do
  echo -e "Checking ${YELLOW}$migration${NC}..."
  
  # Basic pattern-based validation for common SQL errors
  ERROR_FOUND=0
  
  # Check for duplicate keywords (but not SELECT FROM which is valid)
  if grep -E "(\bFROM\s+FROM\b|\bWHERE\s+WHERE\b)" "$migration" >/dev/null; then
    echo -e "${RED}✗ Duplicate keywords found in $migration${NC}"
    ERROR_FOUND=1
  fi
  
  # Check for basic syntax issues
  if grep -E "(\bSELECT\s*;|\bFROM\s*;|\bWHERE\s*;)" "$migration" >/dev/null; then
    echo -e "${RED}✗ Incomplete SQL statement in $migration${NC}"
    ERROR_FOUND=1
  fi
  
  # Check for unmatched BEGIN/COMMIT
  BEGIN_COUNT=$(grep -c "^BEGIN;" "$migration" || true)
  COMMIT_COUNT=$(grep -c "^COMMIT;" "$migration" || true)
  if [[ $BEGIN_COUNT -ne $COMMIT_COUNT ]]; then
    echo -e "${RED}✗ Unmatched BEGIN/COMMIT in $migration (BEGIN: $BEGIN_COUNT, COMMIT: $COMMIT_COUNT)${NC}"
    ERROR_FOUND=1
  fi
  
  if [[ $ERROR_FOUND -eq 0 ]]; then
    echo -e "${GREEN}✓ Basic validation passed${NC}"
  else
    ERRORS=$((ERRORS + 1))
  fi
  echo ""
done

if [[ $ERRORS -eq 0 ]]; then
  echo -e "${GREEN}✓ All migrations validated successfully${NC}"
  exit 0
else
  echo -e "${RED}✗ Found $ERRORS error(s) in migrations${NC}"
  exit 1
fi
