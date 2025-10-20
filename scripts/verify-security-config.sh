#!/usr/bin/env bash
#
# Security Headers and Configuration Verification Script
# Verifies security headers, HTTPS enforcement, and security best practices
#
# Usage: ./scripts/verify-security-config.sh <url>
# Example: ./scripts/verify-security-config.sh https://wathaci-connect.vercel.app

set -euo pipefail

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

URL="${1:-}"

if [[ -z "$URL" ]]; then
  echo "Usage: $0 <url>"
  echo "Example: $0 https://wathaci-connect.vercel.app"
  exit 1
fi

# Ensure URL has protocol
if [[ ! "$URL" =~ ^https?:// ]]; then
  URL="https://$URL"
fi

PASSED=0
FAILED=0
WARNINGS=0

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Security Configuration Verification for: $URL${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Check if curl is available
if ! command -v curl &> /dev/null; then
  echo -e "${RED}✗ Error: curl is not installed${NC}"
  exit 1
fi

echo -e "${BLUE}[1/9] Testing HTTPS enforcement...${NC}"
# Test if HTTP redirects to HTTPS
HTTP_URL="${URL/https/http}"
HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" -L --max-time 10 "$HTTP_URL" 2>/dev/null || echo "000")

if [[ "$HTTP_CODE" == "000" ]]; then
  echo -e "${YELLOW}⚠ Warning: Could not test HTTP to HTTPS redirect${NC}\n"
  ((WARNINGS++))
elif [[ "${URL:0:5}" == "https" ]]; then
  REDIRECT_URL=$(curl -sS -I -L --max-time 10 "$HTTP_URL" 2>/dev/null | grep -i "Location:" | tail -n1 | awk '{print $2}' | tr -d '\r')
  if [[ "$REDIRECT_URL" =~ ^https:// ]]; then
    echo -e "${GREEN}✓ HTTP correctly redirects to HTTPS${NC}\n"
    ((PASSED++))
  else
    echo -e "${YELLOW}⚠ Warning: HTTP redirect behavior unclear${NC}\n"
    ((WARNINGS++))
  fi
else
  echo -e "${RED}✗ Site is not using HTTPS${NC}\n"
  ((FAILED++))
fi

# Fetch headers for security checks
echo -e "${BLUE}[2/9] Fetching security headers...${NC}"
HEADERS=$(curl -sS -I -L --max-time 10 "$URL" 2>/dev/null)

if [[ -z "$HEADERS" ]]; then
  echo -e "${RED}✗ Failed to retrieve headers from $URL${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Headers retrieved${NC}\n"

# Check Strict-Transport-Security
echo -e "${BLUE}[3/9] Checking Strict-Transport-Security (HSTS)...${NC}"
HSTS=$(echo "$HEADERS" | grep -i "Strict-Transport-Security:" || echo "")
if [[ -n "$HSTS" ]]; then
  echo "  Header: $(echo "$HSTS" | tr -d '\r\n')"
  
  # Check max-age
  if echo "$HSTS" | grep -iq "max-age="; then
    MAX_AGE=$(echo "$HSTS" | grep -oP 'max-age=\K[0-9]+' || echo "0")
    if [[ $MAX_AGE -ge 31536000 ]]; then
      echo -e "${GREEN}✓ HSTS enabled with sufficient max-age (${MAX_AGE}s = 1 year)${NC}\n"
      ((PASSED++))
    else
      echo -e "${YELLOW}⚠ HSTS max-age is too short (${MAX_AGE}s)${NC}"
      echo -e "${YELLOW}  Recommended: max-age=31536000 (1 year)${NC}\n"
      ((WARNINGS++))
    fi
  fi
  
  # Check includeSubDomains
  if echo "$HSTS" | grep -iq "includeSubDomains"; then
    echo -e "${GREEN}✓ HSTS includeSubDomains is set${NC}"
  else
    echo -e "${YELLOW}⚠ Consider adding includeSubDomains to HSTS${NC}"
  fi
  echo ""
else
  echo -e "${RED}✗ Strict-Transport-Security header is missing${NC}"
  echo -e "${RED}  Action Required: Enable HSTS${NC}\n"
  ((FAILED++))
fi

# Check X-Content-Type-Options
echo -e "${BLUE}[4/9] Checking X-Content-Type-Options...${NC}"
X_CONTENT_TYPE=$(echo "$HEADERS" | grep -i "X-Content-Type-Options:" || echo "")
if echo "$X_CONTENT_TYPE" | grep -iq "nosniff"; then
  echo "  Header: $(echo "$X_CONTENT_TYPE" | tr -d '\r\n')"
  echo -e "${GREEN}✓ X-Content-Type-Options: nosniff is set${NC}\n"
  ((PASSED++))
else
  echo -e "${RED}✗ X-Content-Type-Options header is missing or incorrect${NC}"
  echo -e "${RED}  Action Required: Set to 'nosniff'${NC}\n"
  ((FAILED++))
fi

# Check X-Frame-Options
echo -e "${BLUE}[5/9] Checking X-Frame-Options...${NC}"
X_FRAME=$(echo "$HEADERS" | grep -i "X-Frame-Options:" || echo "")
if [[ -n "$X_FRAME" ]]; then
  echo "  Header: $(echo "$X_FRAME" | tr -d '\r\n')"
  if echo "$X_FRAME" | grep -iqE "(DENY|SAMEORIGIN)"; then
    echo -e "${GREEN}✓ X-Frame-Options is properly set${NC}\n"
    ((PASSED++))
  else
    echo -e "${YELLOW}⚠ X-Frame-Options value may be insecure${NC}\n"
    ((WARNINGS++))
  fi
else
  echo -e "${YELLOW}⚠ X-Frame-Options header is missing${NC}"
  echo -e "${YELLOW}  Recommended: Set to DENY or SAMEORIGIN${NC}\n"
  ((WARNINGS++))
fi

# Check X-XSS-Protection
echo -e "${BLUE}[6/9] Checking X-XSS-Protection...${NC}"
X_XSS=$(echo "$HEADERS" | grep -i "X-XSS-Protection:" || echo "")
if [[ -n "$X_XSS" ]]; then
  echo "  Header: $(echo "$X_XSS" | tr -d '\r\n')"
  if echo "$X_XSS" | grep -iq "1; mode=block"; then
    echo -e "${GREEN}✓ X-XSS-Protection is properly set${NC}\n"
    ((PASSED++))
  else
    echo -e "${YELLOW}⚠ X-XSS-Protection value may be suboptimal${NC}\n"
    ((WARNINGS++))
  fi
else
  echo -e "${YELLOW}⚠ X-XSS-Protection header is missing${NC}"
  echo -e "${YELLOW}  Recommended: Set to '1; mode=block'${NC}\n"
  ((WARNINGS++))
fi

# Check Content-Security-Policy
echo -e "${BLUE}[7/9] Checking Content-Security-Policy...${NC}"
CSP=$(echo "$HEADERS" | grep -i "Content-Security-Policy:" || echo "")
if [[ -n "$CSP" ]]; then
  echo "  Header: $(echo "$CSP" | cut -c1-80 | tr -d '\r\n')..."
  echo -e "${GREEN}✓ Content-Security-Policy is set${NC}\n"
  ((PASSED++))
else
  echo -e "${YELLOW}⚠ Content-Security-Policy header is missing${NC}"
  echo -e "${YELLOW}  Recommended: Implement CSP for enhanced security${NC}\n"
  ((WARNINGS++))
fi

# Check Referrer-Policy
echo -e "${BLUE}[8/9] Checking Referrer-Policy...${NC}"
REFERRER=$(echo "$HEADERS" | grep -i "Referrer-Policy:" || echo "")
if [[ -n "$REFERRER" ]]; then
  echo "  Header: $(echo "$REFERRER" | tr -d '\r\n')"
  echo -e "${GREEN}✓ Referrer-Policy is set${NC}\n"
  ((PASSED++))
else
  echo -e "${YELLOW}⚠ Referrer-Policy header is missing${NC}"
  echo -e "${YELLOW}  Recommended: Set to 'strict-origin-when-cross-origin'${NC}\n"
  ((WARNINGS++))
fi

# Check Permissions-Policy
echo -e "${BLUE}[9/9] Checking Permissions-Policy...${NC}"
PERMISSIONS=$(echo "$HEADERS" | grep -i "Permissions-Policy:" || echo "")
if [[ -n "$PERMISSIONS" ]]; then
  echo "  Header: $(echo "$PERMISSIONS" | cut -c1-80 | tr -d '\r\n')..."
  echo -e "${GREEN}✓ Permissions-Policy is set${NC}\n"
  ((PASSED++))
else
  echo -e "${YELLOW}⚠ Permissions-Policy header is missing${NC}"
  echo -e "${YELLOW}  Recommended: Set Permissions-Policy to restrict features${NC}\n"
  ((WARNINGS++))
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Security Configuration Verification Complete${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Summary
echo -e "${BLUE}Summary:${NC}"
echo -e "  ${GREEN}Passed: $PASSED${NC}"
echo -e "  ${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "  ${RED}Failed: $FAILED${NC}"
echo ""

if [[ $FAILED -gt 0 ]]; then
  echo -e "${RED}⚠ Security issues detected! Please address the failures above.${NC}"
  exit 1
elif [[ $WARNINGS -gt 0 ]]; then
  echo -e "${YELLOW}⚠ Some security improvements recommended.${NC}"
  exit 0
else
  echo -e "${GREEN}✓ All security checks passed!${NC}"
  exit 0
fi
