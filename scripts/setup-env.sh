#!/bin/bash

# Environment Setup Script
# This script creates .env files from .env.example templates
# Usage: ./scripts/setup-env.sh

set -e

echo "🔧 WATHACI CONNECT Environment Setup"
echo "======================================"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Function to create env file if it doesn't exist
create_env_file() {
    local source=$1
    local target=$2
    
    if [ -f "$target" ]; then
        echo -e "${YELLOW}⚠${NC}  $target already exists, skipping..."
    else
        cp "$source" "$target"
        echo -e "${GREEN}✓${NC}  Created $target"
    fi
}

# Create root environment files
echo -e "${BLUE}Creating root environment files...${NC}"
create_env_file "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
create_env_file "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env.production"

# Create backend environment files
echo ""
echo -e "${BLUE}Creating backend environment files...${NC}"
create_env_file "$PROJECT_ROOT/backend/.env.example" "$PROJECT_ROOT/backend/.env"
create_env_file "$PROJECT_ROOT/backend/.env.example" "$PROJECT_ROOT/backend/.env.production"

# Update VITE_APP_ENV in .env.production
if [ -f "$PROJECT_ROOT/.env.production" ]; then
    if grep -q 'VITE_APP_ENV="development"' "$PROJECT_ROOT/.env.production"; then
        sed -i 's/VITE_APP_ENV="development"/VITE_APP_ENV="production"/' "$PROJECT_ROOT/.env.production"
        echo -e "${GREEN}✓${NC}  Updated VITE_APP_ENV to 'production' in .env.production"
    fi
fi

echo ""
echo -e "${GREEN}✅ Environment files created successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Update .env with your development credentials"
echo "2. Update .env.production with your production credentials"
echo "3. Update backend/.env and backend/.env.production accordingly"
echo "4. Run 'npm run env:check' to validate your configuration"
echo ""
echo "See docs/ENVIRONMENT_SETUP.md for detailed instructions."
