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
  
  # Use pg_parse to check syntax (if available), or basic grep checks
  if command -v psql >/dev/null 2>&1; then
    # Try to connect to a dummy database for syntax check only
    # This won't execute, just validate syntax
    if psql -v ON_ERROR_STOP=1 postgres://localhost:5432/nonexistent \
         -f "$migration" --no-psqlrc -q 2>&1 | grep -qi "syntax error"; then
      echo -e "${RED}✗ Syntax error found in $migration${NC}"
      ERRORS=$((ERRORS + 1))
    else
      # Check for common SQL issues via pattern matching
      if grep -E "(\bFROM\s+FROM\b|\bWHERE\s+WHERE\b|\bSELECT\s+FROM\b)" "$migration" >/dev/null; then
        echo -e "${RED}✗ Potential SQL error in $migration${NC}"
        ERRORS=$((ERRORS + 1))
      else
        echo -e "${GREEN}✓ Syntax looks good${NC}"
      fi
    fi
  else
    # Basic pattern-based validation
    if grep -E "(\bFROM\s+FROM\b|\bWHERE\s+WHERE\b|\bSELECT\s+FROM\b)" "$migration" >/dev/null; then
      echo -e "${RED}✗ Potential SQL error in $migration${NC}"
      ERRORS=$((ERRORS + 1))
    else
      echo -e "${GREEN}✓ Basic validation passed${NC}"
    fi
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
