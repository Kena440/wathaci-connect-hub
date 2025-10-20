#!/bin/bash
# Script to help rotate Lenco API keys from test to production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Lenco API Keys Rotation Helper${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Get the project root directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Check if running in the right directory
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

echo -e "${YELLOW}This script will help you rotate Lenco API keys from test to production.${NC}"
echo ""
echo -e "${YELLOW}Before proceeding, ensure you have:${NC}"
echo -e "  1. Access to your Lenco dashboard (https://dashboard.lenco.co)"
echo -e "  2. Your production API keys ready"
echo -e "  3. Supabase CLI installed and authenticated (supabase login)"
echo -e "  4. Supabase project linked (supabase link)"
echo ""

read -p "Do you have all the prerequisites ready? (yes/no): " READY
if [ "$READY" != "yes" ] && [ "$READY" != "y" ]; then
    echo -e "${YELLOW}Please complete the prerequisites and run this script again.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Step 1: Gathering Lenco API Keys${NC}"
echo -e "${YELLOW}Please retrieve your LIVE keys from the Lenco dashboard:${NC}"
echo -e "  - Navigate to Settings → API Keys"
echo -e "  - Copy your LIVE (production) keys, NOT test keys"
echo ""

# Prompt for Lenco public key
echo -e "${GREEN}Enter your Lenco PUBLIC/PUBLISHABLE key:${NC}"
echo -e "${YELLOW}(Format: pub-[64-char-hex] or pk_live_[string])${NC}"
read -p "> " LENCO_PUBLIC_KEY

if [ -z "$LENCO_PUBLIC_KEY" ]; then
    echo -e "${RED}Error: Public key cannot be empty.${NC}"
    exit 1
fi

# Validate public key format
if [[ ! "$LENCO_PUBLIC_KEY" =~ ^(pub-|pk_live_) ]]; then
    echo -e "${YELLOW}Warning: Public key doesn't match expected format (pub- or pk_live_)${NC}"
    read -p "Continue anyway? (yes/no): " CONTINUE
    if [ "$CONTINUE" != "yes" ] && [ "$CONTINUE" != "y" ]; then
        exit 0
    fi
fi

# Prompt for Lenco secret key
echo ""
echo -e "${GREEN}Enter your Lenco SECRET key:${NC}"
echo -e "${YELLOW}(Format: sec-[64-char-hex], sk_live_[string], or [64-char-hex])${NC}"
read -sp "> " LENCO_SECRET_KEY
echo ""

if [ -z "$LENCO_SECRET_KEY" ]; then
    echo -e "${RED}Error: Secret key cannot be empty.${NC}"
    exit 1
fi

# Prompt for webhook secret
echo ""
echo -e "${GREEN}Enter your Lenco WEBHOOK SECRET:${NC}"
echo -e "${YELLOW}(Found in Lenco Dashboard → Settings → Webhooks)${NC}"
read -sp "> " LENCO_WEBHOOK_SECRET
echo ""

if [ -z "$LENCO_WEBHOOK_SECRET" ]; then
    echo -e "${RED}Error: Webhook secret cannot be empty.${NC}"
    exit 1
fi

# Create or update .env file
echo ""
echo -e "${BLUE}Step 2: Updating Environment Files${NC}"

ENV_FILE="$PROJECT_ROOT/.env"
BACKEND_ENV_FILE="$PROJECT_ROOT/backend/.env"

# Create .env from example if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$PROJECT_ROOT/.env.example" ]; then
        cp "$PROJECT_ROOT/.env.example" "$ENV_FILE"
        echo -e "${GREEN}✓ Created .env from .env.example${NC}"
    else
        echo -e "${RED}Error: .env.example not found${NC}"
        exit 1
    fi
fi

# Create backend/.env from example if it doesn't exist
if [ ! -f "$BACKEND_ENV_FILE" ]; then
    if [ -f "$PROJECT_ROOT/backend/.env.example" ]; then
        cp "$PROJECT_ROOT/backend/.env.example" "$BACKEND_ENV_FILE"
        echo -e "${GREEN}✓ Created backend/.env from backend/.env.example${NC}"
    else
        echo -e "${RED}Error: backend/.env.example not found${NC}"
        exit 1
    fi
fi

# Update frontend .env
echo -e "${YELLOW}Updating $ENV_FILE...${NC}"
# Use sed to update or add the LENCO keys
if grep -q "^VITE_LENCO_PUBLIC_KEY=" "$ENV_FILE"; then
    sed -i.bak "s|^VITE_LENCO_PUBLIC_KEY=.*|VITE_LENCO_PUBLIC_KEY=\"$LENCO_PUBLIC_KEY\"|" "$ENV_FILE"
else
    echo "VITE_LENCO_PUBLIC_KEY=\"$LENCO_PUBLIC_KEY\"" >> "$ENV_FILE"
fi

if grep -q "^LENCO_SECRET_KEY=" "$ENV_FILE"; then
    sed -i.bak "s|^LENCO_SECRET_KEY=.*|LENCO_SECRET_KEY=\"$LENCO_SECRET_KEY\"|" "$ENV_FILE"
else
    echo "LENCO_SECRET_KEY=\"$LENCO_SECRET_KEY\"" >> "$ENV_FILE"
fi

if grep -q "^LENCO_WEBHOOK_SECRET=" "$ENV_FILE"; then
    sed -i.bak "s|^LENCO_WEBHOOK_SECRET=.*|LENCO_WEBHOOK_SECRET=\"$LENCO_WEBHOOK_SECRET\"|" "$ENV_FILE"
else
    echo "LENCO_WEBHOOK_SECRET=\"$LENCO_WEBHOOK_SECRET\"" >> "$ENV_FILE"
fi

# Update backend .env
echo -e "${YELLOW}Updating $BACKEND_ENV_FILE...${NC}"
if grep -q "^LENCO_SECRET_KEY=" "$BACKEND_ENV_FILE"; then
    sed -i.bak "s|^LENCO_SECRET_KEY=.*|LENCO_SECRET_KEY=\"$LENCO_SECRET_KEY\"|" "$BACKEND_ENV_FILE"
else
    echo "LENCO_SECRET_KEY=\"$LENCO_SECRET_KEY\"" >> "$BACKEND_ENV_FILE"
fi

if grep -q "^LENCO_WEBHOOK_SECRET=" "$BACKEND_ENV_FILE"; then
    sed -i.bak "s|^LENCO_WEBHOOK_SECRET=.*|LENCO_WEBHOOK_SECRET=\"$LENCO_WEBHOOK_SECRET\"|" "$BACKEND_ENV_FILE"
else
    echo "LENCO_WEBHOOK_SECRET=\"$LENCO_WEBHOOK_SECRET\"" >> "$BACKEND_ENV_FILE"
fi

# Clean up backup files
rm -f "$ENV_FILE.bak" "$BACKEND_ENV_FILE.bak"

echo -e "${GREEN}✓ Environment files updated${NC}"

# Update Supabase secrets
echo ""
echo -e "${BLUE}Step 3: Pushing Secrets to Supabase Edge Functions${NC}"
echo ""

read -p "Do you want to push these secrets to Supabase now? (yes/no): " PUSH_SECRETS
if [ "$PUSH_SECRETS" = "yes" ] || [ "$PUSH_SECRETS" = "y" ]; then
    echo -e "${YELLOW}Pushing secrets to Supabase...${NC}"
    
    # Check if supabase CLI is available
    if ! command -v supabase &> /dev/null; then
        echo -e "${RED}Error: Supabase CLI not found. Please install it first.${NC}"
        echo -e "${YELLOW}Visit: https://supabase.com/docs/guides/cli${NC}"
        exit 1
    fi
    
    # Check if project is linked
    if [ ! -f "$PROJECT_ROOT/supabase/.temp/project-ref" ] && [ ! -f "$PROJECT_ROOT/.git/modules/supabase/config" ]; then
        echo -e "${YELLOW}Warning: Supabase project may not be linked.${NC}"
        echo -e "${YELLOW}Run 'supabase link --project-ref YOUR_PROJECT_REF' first.${NC}"
        read -p "Continue anyway? (yes/no): " CONTINUE_ANYWAY
        if [ "$CONTINUE_ANYWAY" != "yes" ] && [ "$CONTINUE_ANYWAY" != "y" ]; then
            exit 0
        fi
    fi
    
    # Set the secrets
    echo "LENCO_SECRET_KEY=$LENCO_SECRET_KEY" | supabase secrets set --env-file /dev/stdin
    echo "LENCO_WEBHOOK_SECRET=$LENCO_WEBHOOK_SECRET" | supabase secrets set --env-file /dev/stdin
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Secrets pushed to Supabase successfully${NC}"
        
        # Verify secrets
        echo ""
        echo -e "${YELLOW}Verifying secrets...${NC}"
        supabase secrets list
    else
        echo -e "${RED}Error: Failed to push secrets to Supabase${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Skipped pushing secrets to Supabase.${NC}"
    echo -e "${YELLOW}You can push them later with:${NC}"
    echo -e "  supabase secrets set LENCO_SECRET_KEY=\"<your-secret-key>\""
    echo -e "  supabase secrets set LENCO_WEBHOOK_SECRET=\"<your-webhook-secret>\""
fi

# Test configuration
echo ""
echo -e "${BLUE}Step 4: Verification${NC}"
echo ""
echo -e "${YELLOW}Running environment check...${NC}"

cd "$PROJECT_ROOT"
npm run env:check

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Key Rotation Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Configure webhook URL in Lenco dashboard:"
echo -e "     https://YOUR_PROJECT_REF.supabase.co/functions/v1/lenco-webhook"
echo -e "  2. Test webhook integration:"
echo -e "     node scripts/test-webhook-integration.js <webhook-url> <webhook-secret>"
echo -e "  3. Or replay a test event from Lenco dashboard"
echo -e "  4. Verify webhook_logs table in Supabase for successful entries"
echo ""
echo -e "${YELLOW}Documentation:${NC}"
echo -e "  - docs/WEBHOOK_SETUP_GUIDE.md"
echo -e "  - docs/PRODUCTION_READINESS_CHECKLIST.md"
echo ""
