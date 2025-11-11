#!/bin/bash
# Production Secrets Verification Script
# Purpose: Verify all production secrets are properly configured and secure
# Usage: ./scripts/verify-production-secrets.sh

set -e

echo "🔐 Verifying Production Secrets..."

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check if .env.production exists
if [ ! -f .env.production ]; then
  echo -e "${RED}❌ .env.production not found${NC}"
  echo -e "${YELLOW}💡 Create .env.production with required secrets${NC}"
  exit 1
fi

echo -e "${BLUE}Found .env.production file${NC}"
echo ""

# Function to check if variable is set and non-empty
check_var() {
  local var_name=$1
  local var_value=$(grep "^${var_name}=" .env.production 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
  
  if [ -z "$var_value" ]; then
    echo -e "${RED}❌ ${var_name} is not set or empty${NC}"
    ((ERRORS++))
    return 1
  fi
  
  # Check for placeholder values
  if [[ "$var_value" == *"test_"* ]] || [[ "$var_value" == *"dummy"* ]] || [[ "$var_value" == *"placeholder"* ]] || [[ "$var_value" == *"your-"* ]]; then
    echo -e "${RED}❌ ${var_name} contains test/placeholder value${NC}"
    ((ERRORS++))
    return 1
  fi
  
  # Check minimum length for secrets
  if [ ${#var_value} -lt 20 ]; then
    echo -e "${YELLOW}⚠️  ${var_name} seems short (${#var_value} chars) - verify it's correct${NC}"
    ((WARNINGS++))
  fi
  
  echo -e "${GREEN}✅ ${var_name} is set (${#var_value} chars)${NC}"
  return 0
}

# Check for test keys
check_no_test_keys() {
  local var_name=$1
  local var_value=$(grep "^${var_name}=" .env.production 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
  
  if [[ "$var_value" == *"sk_test_"* ]] || [[ "$var_value" == *"pk_test_"* ]] || [[ "$var_value" == *"test_"* ]]; then
    echo -e "${RED}❌ ${var_name} contains TEST key (should be LIVE)${NC}"
    echo -e "${RED}   Value starts with: ${var_value:0:20}...${NC}"
    ((ERRORS++))
    return 1
  fi
  
  # For Lenco keys, verify live key format
  if [[ "$var_name" == "VITE_LENCO_PUBLIC_KEY" ]]; then
    if [[ "$var_value" == pub-* ]]; then
      echo -e "${GREEN}✅ ${var_name} is a LIVE key (pub- prefix)${NC}"
    elif [[ "$var_value" == pk_live_* ]]; then
      echo -e "${GREEN}✅ ${var_name} is a LIVE key (pk_live_ prefix)${NC}"
    else
      echo -e "${YELLOW}⚠️  ${var_name} format unclear - verify it's a LIVE key${NC}"
      ((WARNINGS++))
    fi
  elif [[ "$var_name" == "LENCO_SECRET_KEY" ]]; then
    if [[ "$var_value" == sk_live_* ]]; then
      echo -e "${GREEN}✅ ${var_name} is a LIVE key (sk_live_ prefix)${NC}"
    elif [[ "$var_value" == sec-* ]]; then
      echo -e "${GREEN}✅ ${var_name} is a LIVE key (sec- prefix)${NC}"
    elif [ ${#var_value} -eq 64 ]; then
      echo -e "${GREEN}✅ ${var_name} appears to be a LIVE key (64-char hex)${NC}"
    else
      echo -e "${YELLOW}⚠️  ${var_name} format unclear - verify it's a LIVE key${NC}"
      ((WARNINGS++))
    fi
  fi
  
  return 0
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Checking Required Secrets..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🗄️  Supabase Configuration"
check_var "VITE_SUPABASE_URL"
check_var "VITE_SUPABASE_KEY"
check_var "SUPABASE_SERVICE_ROLE_KEY"
check_var "SUPABASE_JWT_SECRET"
echo ""

echo "💳 Lenco Payment Gateway"
check_var "VITE_LENCO_PUBLIC_KEY"
check_no_test_keys "VITE_LENCO_PUBLIC_KEY"

check_var "LENCO_SECRET_KEY"
check_no_test_keys "LENCO_SECRET_KEY"

check_var "LENCO_WEBHOOK_SECRET"
check_var "VITE_LENCO_API_URL"
echo ""

echo "⚙️  Application Configuration"
check_var "VITE_APP_ENV"
check_var "VITE_APP_NAME"
check_var "VITE_PAYMENT_CURRENCY"
check_var "VITE_PAYMENT_COUNTRY"
echo ""

# Check VITE_APP_ENV is set to "production"
APP_ENV=$(grep "^VITE_APP_ENV=" .env.production 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
if [ "$APP_ENV" != "production" ]; then
  echo -e "${RED}❌ VITE_APP_ENV must be 'production', got '${APP_ENV}'${NC}"
  ((ERRORS++))
else
  echo -e "${GREEN}✅ VITE_APP_ENV is set to 'production'${NC}"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Security Checks..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if .env files are in .gitignore
if [ -f .gitignore ]; then
  if grep -q "^\.env" .gitignore; then
    echo -e "${GREEN}✅ .env files are in .gitignore${NC}"
  else
    echo -e "${RED}❌ .env files NOT in .gitignore - SECURITY RISK!${NC}"
    echo -e "${YELLOW}💡 Add '.env*' to .gitignore immediately${NC}"
    ((ERRORS++))
  fi
else
  echo -e "${YELLOW}⚠️  .gitignore not found${NC}"
  ((WARNINGS++))
fi

# Check if .env.production is tracked by git
if git ls-files --error-unmatch .env.production >/dev/null 2>&1; then
  echo -e "${RED}❌ .env.production is tracked by Git - SECURITY RISK!${NC}"
  echo -e "${YELLOW}💡 Run: git rm --cached .env.production${NC}"
  ((ERRORS++))
else
  echo -e "${GREEN}✅ .env.production is not tracked by Git${NC}"
fi

# Check for common secret patterns in Git history (basic check)
echo ""
echo -e "${BLUE}Scanning Git history for potential secrets...${NC}"
SECRET_PATTERNS=("password" "secret" "api_key" "apikey" "token" "credentials")
FOUND_SECRETS=0

for pattern in "${SECRET_PATTERNS[@]}"; do
  if git log --all --oneline --grep="$pattern" 2>/dev/null | head -1 | grep -qi "$pattern"; then
    ((FOUND_SECRETS++))
  fi
done

if [ $FOUND_SECRETS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Found $FOUND_SECRETS potential secret reference(s) in Git history${NC}"
  echo -e "${YELLOW}💡 Review Git history manually: git log --all --grep='secret'${NC}"
  ((WARNINGS++))
else
  echo -e "${GREEN}✅ No obvious secrets in Git history${NC}"
fi

# Check file permissions
echo ""
echo -e "${BLUE}Checking file permissions...${NC}"
if [ -f .env.production ]; then
  PERMS=$(stat -c "%a" .env.production 2>/dev/null || stat -f "%A" .env.production 2>/dev/null)
  if [ "$PERMS" = "600" ] || [ "$PERMS" = "400" ]; then
    echo -e "${GREEN}✅ .env.production has secure permissions ($PERMS)${NC}"
  else
    echo -e "${YELLOW}⚠️  .env.production permissions are $PERMS (recommended: 600)${NC}"
    echo -e "${YELLOW}💡 Run: chmod 600 .env.production${NC}"
    ((WARNINGS++))
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Verification Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ All secrets verified successfully!${NC}"
  echo -e "${GREEN}🚀 Production secrets are ready for deployment${NC}"
  echo ""
  echo -e "${BLUE}Next steps:${NC}"
  echo "  1. Deploy to production"
  echo "  2. Verify secrets in deployment platform"
  echo "  3. Test authentication and payments"
  echo ""
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠️  Found ${WARNINGS} warning(s)${NC}"
  echo -e "${BLUE}Review warnings above, but secrets are functional${NC}"
  echo ""
  echo -e "${BLUE}Next steps:${NC}"
  echo "  1. Address warnings (recommended)"
  echo "  2. Deploy to production"
  echo "  3. Verify secrets in deployment platform"
  echo ""
  exit 0
else
  echo -e "${RED}❌ Found ${ERRORS} error(s) and ${WARNINGS} warning(s)${NC}"
  echo -e "${RED}⚠️  Fix these issues before deploying to production${NC}"
  echo ""
  echo -e "${YELLOW}Common fixes:${NC}"
  echo "  • Replace test keys with live production keys"
  echo "  • Remove placeholder values"
  echo "  • Add .env* to .gitignore"
  echo "  • Remove .env.production from Git tracking"
  echo "  • Set VITE_APP_ENV to 'production'"
  echo ""
  exit 1
fi
