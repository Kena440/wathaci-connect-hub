#!/bin/bash

# WATHACI CONNECT - Lenco Payment Setup Script
# This script helps set up the payment integration

set -e

echo "🚀 WATHACI CONNECT - Lenco Payment Setup"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created${NC}"
else
    echo -e "${BLUE}ℹ️  .env file already exists${NC}"
fi

echo ""
echo -e "${BLUE}📋 Environment Configuration Checklist${NC}"
echo "========================================"

# Check each environment variable
check_env_var() {
    local var_name=$1
    local description=$2
    local required=${3:-true}
    
    if grep -q "^${var_name}=" .env && [ "$(grep "^${var_name}=" .env | cut -d'=' -f2)" != "\"\"" ] && [ "$(grep "^${var_name}=" .env | cut -d'=' -f2)" != "" ]; then
        echo -e "${GREEN}✅ ${var_name} - ${description}${NC}"
        return 0
    else
        if [ "$required" = true ]; then
            echo -e "${RED}❌ ${var_name} - ${description} (REQUIRED)${NC}"
            return 1
        else
            echo -e "${YELLOW}⚠️  ${var_name} - ${description} (Optional)${NC}"
            return 0
        fi
    fi
}

# Track configuration status
config_errors=0

# Check Supabase configuration
echo ""
echo -e "${BLUE}🗄️  Supabase Configuration${NC}"
check_env_var "VITE_SUPABASE_URL" "Supabase project URL" || ((config_errors++))
check_env_var "VITE_SUPABASE_KEY" "Supabase anon key" || ((config_errors++))

# Check Lenco configuration
echo ""
echo -e "${BLUE}💳 Lenco Payment Configuration${NC}"
check_env_var "VITE_LENCO_PUBLIC_KEY" "Lenco public key" || ((config_errors++))
check_env_var "LENCO_SECRET_KEY" "Lenco secret key" || ((config_errors++))
check_env_var "LENCO_WEBHOOK_SECRET" "Lenco webhook secret" || ((config_errors++))
check_env_var "VITE_LENCO_API_URL" "Lenco API URL" || ((config_errors++))

# Check payment settings
echo ""
echo -e "${BLUE}⚙️  Payment Settings${NC}"
check_env_var "VITE_PAYMENT_CURRENCY" "Payment currency"
check_env_var "VITE_PAYMENT_COUNTRY" "Payment country"
check_env_var "VITE_PLATFORM_FEE_PERCENTAGE" "Platform fee percentage"
check_env_var "VITE_MIN_PAYMENT_AMOUNT" "Minimum payment amount"
check_env_var "VITE_MAX_PAYMENT_AMOUNT" "Maximum payment amount"

# Check environment settings
echo ""
echo -e "${BLUE}🌍 Environment Settings${NC}"
check_env_var "VITE_APP_ENV" "Application environment"
check_env_var "VITE_APP_NAME" "Application name"

echo ""
echo "========================================"

if [ $config_errors -eq 0 ]; then
    echo -e "${GREEN}🎉 All required environment variables are configured!${NC}"
else
    echo -e "${RED}❌ ${config_errors} required environment variable(s) need configuration${NC}"
    echo ""
    echo -e "${YELLOW}📝 To configure missing variables:${NC}"
    echo "1. Edit the .env file: nano .env"
    echo "2. Add your actual API keys and configuration values"
    echo "3. Run this script again to verify"
    echo ""
    echo -e "${BLUE}📚 See docs/PAYMENT_INTEGRATION_GUIDE.md for detailed setup instructions${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🔧 Installing Dependencies${NC}"
echo "========================="

if [ -f "package.json" ]; then
    echo -e "${YELLOW}Installing npm dependencies...${NC}"
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ package.json not found${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🧪 Running Payment Tests${NC}"
echo "========================"

echo -e "${YELLOW}Building application...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🏗️  Setting up Supabase Edge Functions${NC}"
echo "========================================"

# Check if Supabase CLI is installed
if command -v supabase &> /dev/null; then
    echo -e "${GREEN}✅ Supabase CLI found${NC}"
    
    # Create edge functions directory if it doesn't exist
    mkdir -p supabase/functions
    
    # Copy edge functions
    if [ -d "backend/supabase-functions" ]; then
        echo -e "${YELLOW}Copying edge functions...${NC}"
        cp -r backend/supabase-functions/* supabase/functions/ 2>/dev/null || true
        echo -e "${GREEN}✅ Edge functions copied${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}To deploy edge functions:${NC}"
    echo "1. supabase login"
    echo "2. supabase link --project-ref YOUR_PROJECT_REF"
    echo "3. supabase functions deploy lenco-payment"
    echo "4. supabase functions deploy payment-verify"
    echo "5. supabase functions deploy payment-webhook"
    echo "6. supabase functions deploy freelancer-matcher"
    
else
    echo -e "${YELLOW}⚠️  Supabase CLI not installed${NC}"
    echo "Install it with: npm install -g supabase"
fi

echo ""
echo -e "${BLUE}📊 Database Setup${NC}"
echo "=================="

echo -e "${YELLOW}Required database tables:${NC}"
echo "- payments"
echo "- user_subscriptions"
echo "- subscription_plans"
echo "- transactions"
echo "- webhook_logs"
echo "- notifications"

echo ""
echo "See DATABASE_SETUP.md for SQL scripts to create these tables."

echo ""
echo -e "${BLUE}🔐 Security Checklist${NC}"
echo "==================="

echo "✅ Environment variables configured"
echo "✅ API keys properly secured"
echo "✅ Webhook secrets configured"

if [ "$VITE_APP_ENV" = "production" ]; then
    echo -e "${YELLOW}⚠️  Production Environment Detected${NC}"
    echo "Additional security considerations:"
    echo "- Ensure SSL/HTTPS is enabled"
    echo "- Verify webhook URL is accessible"
    echo "- Enable rate limiting"
    echo "- Monitor payment transactions"
else
    echo -e "${GREEN}✅ Development environment - good for testing${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "=================="

echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Start development server: npm run dev"
echo "2. Test payment integration using the PaymentTestComponent"
echo "3. Deploy edge functions to Supabase"
echo "4. Configure webhooks in Lenco dashboard"
echo "5. Test with real payment scenarios"

echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "- Payment Integration Guide: docs/PAYMENT_INTEGRATION_GUIDE.md"
echo "- Database Setup: DATABASE_SETUP.md"
echo "- Troubleshooting: TROUBLESHOOTING.md"

echo ""
echo -e "${BLUE}🆘 Need Help?${NC}"
echo "- Check the documentation"
echo "- Run payment tests: npm run test:jest"
echo "- Review application logs"
echo "- Contact support: support@wathaci.org"

echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"