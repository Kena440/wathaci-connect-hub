#!/usr/bin/env bash
# Quick script to execute profile backfill
# This is a convenience wrapper for the backfill process

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

# Default to dry run
DRY_RUN="${1:-true}"
BATCH_SIZE="${2:-100}"

# Validate inputs
if [[ "$DRY_RUN" != "true" && "$DRY_RUN" != "false" ]]; then
  echo -e "${RED}Error: First parameter must be 'true' or 'false'${NC}"
  echo "Usage: $0 [true|false] [batch_size]"
  exit 1
fi

if ! [[ "$BATCH_SIZE" =~ ^[0-9]+$ ]] || [[ "$BATCH_SIZE" -lt 1 ]] || [[ "$BATCH_SIZE" -gt 1000 ]]; then
  echo -e "${RED}Error: Batch size must be a number between 1 and 1000${NC}"
  echo "Usage: $0 [true|false] [batch_size]"
  exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Profile Backfill Utility                               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
  echo -e "${YELLOW}Running in DRY RUN mode (no changes will be made)${NC}"
  echo -e "${YELLOW}To execute actual backfill, run: $0 false${NC}"
else
  echo -e "${RED}⚠️  EXECUTING ACTUAL BACKFILL ⚠️${NC}"
  echo -e "${RED}This will modify the database.${NC}"
  
  read -p "Are you sure you want to continue? (yes/no): " confirm
  if [[ "$confirm" != "yes" ]]; then
    echo "Backfill cancelled."
    exit 0
  fi
fi

echo ""
echo -e "${BLUE}Running backfill with batch_size=$BATCH_SIZE...${NC}"
echo ""

# Execute backfill
RESULT=$(psql "$CONNECTION_STRING" -t -c \
  "SELECT public.backfill_all_missing_profiles($BATCH_SIZE, $DRY_RUN);" 2>&1)

echo "$RESULT" | jq '.' 2>/dev/null || echo "$RESULT"

echo ""

if [[ "$DRY_RUN" == "true" ]]; then
  echo -e "${YELLOW}This was a dry run. No changes were made.${NC}"
  echo ""
  echo -e "To execute the backfill for real, run:"
  echo -e "${BLUE}$0 false${NC}"
else
  echo -e "${GREEN}Backfill complete!${NC}"
  echo ""
  echo -e "Verifying completeness..."
  
  psql "$CONNECTION_STRING" -c \
    "SELECT * FROM public.verify_profile_completeness();" 2>&1
  
  echo ""
  echo -e "${GREEN}✅ Done!${NC}"
fi

echo ""
