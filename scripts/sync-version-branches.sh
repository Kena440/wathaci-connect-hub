#!/bin/bash

# Script to synchronize version branches (V1, V2, V3) with main branch
# This resolves all conflicts by merging main into each version branch

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Branch Synchronization Script ===${NC}"
echo ""
echo "This script will synchronize V1, V2, and V3 branches with main"
echo "All conflicts will be resolved by accepting main's version"
echo ""

# Confirm before proceeding
read -p "Do you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Aborted."
    exit 1
fi

# Store current branch
CURRENT_BRANCH=$(git branch --show-current)

# Function to sync a branch
sync_branch() {
    local branch=$1
    echo ""
    echo -e "${YELLOW}Synchronizing ${branch}...${NC}"
    
    # Checkout the branch
    git checkout "$branch"
    
    # Fetch latest changes
    git fetch origin "$branch"
    
    # Try to merge main (we're on branch, merging main, so -X theirs accepts main's version)
    if git merge --allow-unrelated-histories -X theirs main -m "Sync ${branch} with main: resolve conflicts by accepting main version"; then
        echo -e "${GREEN}✓ ${branch} synchronized successfully${NC}"
        
        # Push changes
        echo "Pushing ${branch} to remote..."
        if git push origin "$branch"; then
            echo -e "${GREEN}✓ ${branch} pushed successfully${NC}"
        else
            echo -e "${RED}✗ Failed to push ${branch}. You may need to use --force-with-lease${NC}"
            echo "Run: git push origin ${branch} --force-with-lease"
        fi
    else
        echo -e "${RED}✗ Failed to merge main into ${branch}${NC}"
        git merge --abort 2>/dev/null || true
        return 1
    fi
}

# Sync V1
if sync_branch "V1"; then
    echo -e "${GREEN}V1 synced${NC}"
else
    echo -e "${RED}V1 sync failed${NC}"
fi

# Sync V2
if sync_branch "V2"; then
    echo -e "${GREEN}V2 synced${NC}"
else
    echo -e "${RED}V2 sync failed${NC}"
fi

# Check V3 - might already be synced
echo ""
echo -e "${YELLOW}Checking V3...${NC}"
git checkout V3
# Check if main has commits that V3 doesn't have
if [ $(git rev-list --count V3..main) -eq 0 ]; then
    echo -e "${GREEN}✓ V3 is already synchronized with main${NC}"
else
    if sync_branch "V3"; then
        echo -e "${GREEN}V3 synced${NC}"
    else
        echo -e "${RED}V3 sync failed${NC}"
    fi
fi

# Return to original branch
echo ""
echo "Returning to original branch: $CURRENT_BRANCH"
git checkout "$CURRENT_BRANCH"

echo ""
echo -e "${GREEN}=== Synchronization Complete ===${NC}"
echo ""
echo "All version branches have been synchronized with main."
echo "Run the verification script to confirm no conflicts remain:"
echo "  ./scripts/verify-no-conflicts.sh"
