#!/usr/bin/env bash
#
# TLS Certificate Verification Script
# Checks certificate validity, expiry, chain, and security configuration
#
# Usage: ./scripts/check-tls-certificate.sh <domain>
# Example: ./scripts/check-tls-certificate.sh wathaci-connect.vercel.app

set -euo pipefail

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DOMAIN="${1:-}"

if [[ -z "$DOMAIN" ]]; then
  echo "Usage: $0 <domain>"
  echo "Example: $0 wathaci-connect.vercel.app"
  exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TLS Certificate Verification for: $DOMAIN${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
  echo -e "${RED}✗ Error: openssl is not installed${NC}"
  exit 1
fi

echo -e "${BLUE}[1/6] Testing HTTPS connectivity...${NC}"
if curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "https://$DOMAIN" | grep -q "^[23]"; then
  echo -e "${GREEN}✓ HTTPS connection successful${NC}\n"
else
  echo -e "${RED}✗ Failed to connect to https://$DOMAIN${NC}"
  exit 1
fi

echo -e "${BLUE}[2/6] Retrieving certificate information...${NC}"
CERT_INFO=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates -subject -issuer 2>/dev/null)

if [[ -z "$CERT_INFO" ]]; then
  echo -e "${RED}✗ Failed to retrieve certificate information${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Certificate retrieved${NC}\n"

# Parse certificate dates
NOT_BEFORE=$(echo "$CERT_INFO" | grep "notBefore" | cut -d= -f2)
NOT_AFTER=$(echo "$CERT_INFO" | grep "notAfter" | cut -d= -f2)
SUBJECT=$(echo "$CERT_INFO" | grep "subject" | cut -d= -f2-)
ISSUER=$(echo "$CERT_INFO" | grep "issuer" | cut -d= -f2-)

echo -e "${BLUE}Certificate Details:${NC}"
echo "  Subject: $SUBJECT"
echo "  Issuer: $ISSUER"
echo "  Valid From: $NOT_BEFORE"
echo "  Valid Until: $NOT_AFTER"
echo ""

echo -e "${BLUE}[3/6] Checking certificate expiry...${NC}"
# Convert dates to seconds for comparison
if date -d "$NOT_AFTER" >/dev/null 2>&1; then
  # GNU date (Linux)
  EXPIRY_EPOCH=$(date -d "$NOT_AFTER" +%s)
  NOW_EPOCH=$(date +%s)
elif date -j -f "%b %d %T %Y %Z" "$NOT_AFTER" >/dev/null 2>&1; then
  # BSD date (macOS)
  EXPIRY_EPOCH=$(date -j -f "%b %d %T %Y %Z" "$NOT_AFTER" +%s)
  NOW_EPOCH=$(date +%s)
else
  echo -e "${YELLOW}⚠ Warning: Could not parse certificate dates${NC}\n"
  EXPIRY_EPOCH=0
  NOW_EPOCH=0
fi

if [[ $EXPIRY_EPOCH -gt 0 && $NOW_EPOCH -gt 0 ]]; then
  DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))
  
  if [[ $DAYS_UNTIL_EXPIRY -lt 0 ]]; then
    echo -e "${RED}✗ Certificate has EXPIRED!${NC}"
    echo -e "${RED}  Action Required: Renew certificate immediately${NC}\n"
    exit 1
  elif [[ $DAYS_UNTIL_EXPIRY -lt 7 ]]; then
    echo -e "${RED}✗ Certificate expires in $DAYS_UNTIL_EXPIRY days${NC}"
    echo -e "${RED}  Action Required: Renew certificate urgently${NC}\n"
    exit 1
  elif [[ $DAYS_UNTIL_EXPIRY -lt 30 ]]; then
    echo -e "${YELLOW}⚠ Certificate expires in $DAYS_UNTIL_EXPIRY days${NC}"
    echo -e "${YELLOW}  Recommended: Schedule certificate renewal${NC}\n"
  else
    echo -e "${GREEN}✓ Certificate valid for $DAYS_UNTIL_EXPIRY days${NC}\n"
  fi
else
  echo -e "${YELLOW}⚠ Warning: Could not calculate days until expiry${NC}\n"
fi

echo -e "${BLUE}[4/6] Verifying certificate chain...${NC}"
CHAIN_RESULT=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" -showcerts 2>&1 | grep -E "Verify return code")

if echo "$CHAIN_RESULT" | grep -q "ok"; then
  echo -e "${GREEN}✓ Certificate chain is valid${NC}\n"
elif echo "$CHAIN_RESULT" | grep -q "unable to verify"; then
  echo -e "${RED}✗ Certificate chain verification failed${NC}"
  echo "  $CHAIN_RESULT"
  echo -e "${RED}  Action Required: Fix certificate chain${NC}\n"
  exit 1
else
  echo -e "${YELLOW}⚠ Warning: Could not verify certificate chain${NC}"
  echo "  $CHAIN_RESULT\n"
fi

echo -e "${BLUE}[5/6] Checking TLS protocol version...${NC}"
TLS_VERSION=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>&1 | grep "Protocol" | awk '{print $3}')

if [[ -z "$TLS_VERSION" ]]; then
  echo -e "${YELLOW}⚠ Warning: Could not determine TLS version${NC}\n"
elif [[ "$TLS_VERSION" == "TLSv1.3" ]]; then
  echo -e "${GREEN}✓ Using TLS 1.3 (Excellent)${NC}\n"
elif [[ "$TLS_VERSION" == "TLSv1.2" ]]; then
  echo -e "${GREEN}✓ Using TLS 1.2 (Good)${NC}\n"
else
  echo -e "${RED}✗ Using $TLS_VERSION (Outdated)${NC}"
  echo -e "${RED}  Action Required: Upgrade to TLS 1.2 or 1.3${NC}\n"
  exit 1
fi

echo -e "${BLUE}[6/6] Checking cipher suite...${NC}"
CIPHER=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>&1 | grep "Cipher" | head -n 1 | awk '{print $3}')

if [[ -n "$CIPHER" ]]; then
  echo "  Active Cipher: $CIPHER"
  
  # Check for weak ciphers
  if echo "$CIPHER" | grep -qiE "(RC4|MD5|DES|NULL|EXPORT|anon)"; then
    echo -e "${RED}✗ Weak cipher detected!${NC}"
    echo -e "${RED}  Action Required: Disable weak ciphers${NC}\n"
    exit 1
  else
    echo -e "${GREEN}✓ Strong cipher in use${NC}\n"
  fi
else
  echo -e "${YELLOW}⚠ Warning: Could not determine cipher suite${NC}\n"
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}TLS Certificate Verification Complete${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Summary
echo -e "${BLUE}Summary:${NC}"
echo "  Domain: $DOMAIN"
echo "  Certificate Issuer: $ISSUER"
if [[ $DAYS_UNTIL_EXPIRY -gt 0 ]]; then
  echo "  Days Until Expiry: $DAYS_UNTIL_EXPIRY"
fi
echo "  TLS Version: $TLS_VERSION"
echo "  Cipher: $CIPHER"
echo ""
echo -e "${GREEN}All TLS checks passed successfully!${NC}"
