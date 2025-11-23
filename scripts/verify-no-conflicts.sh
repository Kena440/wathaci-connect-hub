#!/bin/bash

# Script to verify that no conflicts exist between branches

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Branch Conflict Verification ===${NC}"
echo ""

# Store current branch
CURRENT_BRANCH=$(git branch --show-current)

# Function to test merge
test_merge() {
    local source=$1
    local target=$2
    
    echo -n "Testing ${source} → ${target}... "
    
    git checkout -q "$target"
    
    if git merge --no-commit --no-ff "$source" 2>&1 | grep -q "CONFLICT"; then
        echo -e "${RED}✗ CONFLICT FOUND${NC}"
        git merge --abort 2>/dev/null || true
        return 1
    else
        echo -e "${GREEN}✓ Clean merge${NC}"
        git merge --abort 2>/dev/null || git reset --hard HEAD 2>/dev/null || true
        return 0
    fi
}

# Track failures
FAILURES=0

# Test all important merge combinations
echo "Testing merge combinations:"
echo ""

test_merge "V1" "main" || ((FAILURES++))
test_merge "V2" "main" || ((FAILURES++))
test_merge "V3" "main" || ((FAILURES++))
test_merge "V1" "V2" || ((FAILURES++))
test_merge "V2" "V3" || ((FAILURES++))
test_merge "V1" "V3" || ((FAILURES++))
test_merge "main" "V1" || ((FAILURES++))
test_merge "main" "V2" || ((FAILURES++))
test_merge "main" "V3" || ((FAILURES++))

# Return to original branch
git checkout -q "$CURRENT_BRANCH"

echo ""
if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}=== SUCCESS ===${NC}"
    echo -e "${GREEN}All branches can merge without conflicts!${NC}"
    exit 0
else
    echo -e "${RED}=== FAILURE ===${NC}"
    echo -e "${RED}Found conflicts in $FAILURES merge combination(s)${NC}"
    exit 1
fi
