#!/usr/bin/env bash
#
# Webhook Security Verification Script
# Verifies webhook signature validation and security configuration
#
# Usage: ./scripts/verify-webhook-security.sh <webhook_url> <webhook_secret>
# Example: ./scripts/verify-webhook-security.sh https://xxx.supabase.co/functions/v1/lenco-webhook "your-secret"

set -euo pipefail

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

WEBHOOK_URL="${1:-}"
WEBHOOK_SECRET="${2:-}"

if [[ -z "$WEBHOOK_URL" ]] || [[ -z "$WEBHOOK_SECRET" ]]; then
  echo "Usage: $0 <webhook_url> <webhook_secret>"
  echo "Example: $0 https://xxx.supabase.co/functions/v1/lenco-webhook \"your-secret\""
  exit 1
fi

# Check if required tools are available
if ! command -v curl &> /dev/null; then
  echo -e "${RED}✗ Error: curl is not installed${NC}"
  exit 1
fi

if ! command -v openssl &> /dev/null; then
  echo -e "${RED}✗ Error: openssl is not installed${NC}"
  exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Webhook Security Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${BLUE}Configuration:${NC}"
echo "  Webhook URL: $WEBHOOK_URL"
echo "  Secret: ${WEBHOOK_SECRET:0:10}...${WEBHOOK_SECRET: -10}"
echo ""

# Create test payload
TEST_REFERENCE="TEST_$(date +%s)_SECURITY_CHECK"
TEST_PAYLOAD=$(cat <<EOF
{
  "event": "payment.success",
  "data": {
    "id": "test_txn_$(date +%s)",
    "reference": "$TEST_REFERENCE",
    "amount": 100,
    "currency": "ZMW",
    "status": "success",
    "gateway_response": "Test payment for security verification",
    "paid_at": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
    "customer": {
      "email": "security-test@example.com",
      "phone": "0978000000"
    },
    "metadata": {
      "test": true,
      "purpose": "security_verification"
    }
  },
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"
}
EOF
)

# Function to generate HMAC signature
generate_signature() {
  local payload="$1"
  local secret="$2"
  echo -n "$payload" | openssl dgst -sha256 -hmac "$secret" | awk '{print $2}'
}

VALID_SIGNATURE=$(generate_signature "$TEST_PAYLOAD" "$WEBHOOK_SECRET")

echo -e "${BLUE}[1/5] Testing webhook endpoint availability...${NC}"
HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "$WEBHOOK_URL" 2>/dev/null || echo "000")

if [[ "$HTTP_CODE" == "000" ]]; then
  echo -e "${RED}✗ Failed to connect to webhook endpoint${NC}"
  echo -e "${RED}  Action Required: Verify webhook URL and network connectivity${NC}\n"
  exit 1
elif [[ "$HTTP_CODE" == "405" ]] || [[ "$HTTP_CODE" == "404" ]]; then
  echo -e "${GREEN}✓ Webhook endpoint is reachable${NC}"
  echo "  (Returned $HTTP_CODE which is expected for GET request)\n"
else
  echo -e "${GREEN}✓ Webhook endpoint is reachable${NC}"
  echo "  HTTP Status: $HTTP_CODE\n"
fi

echo -e "${BLUE}[2/5] Testing webhook with VALID signature...${NC}"
echo "  Signature: ${VALID_SIGNATURE:0:20}...${VALID_SIGNATURE: -20}"

VALID_RESPONSE=$(curl -sS -w "\n%{http_code}" --max-time 10 \
  -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "x-lenco-signature: $VALID_SIGNATURE" \
  -d "$TEST_PAYLOAD" 2>/dev/null)

VALID_HTTP_CODE=$(echo "$VALID_RESPONSE" | tail -n1)
VALID_BODY=$(echo "$VALID_RESPONSE" | head -n-1)

echo "  HTTP Status: $VALID_HTTP_CODE"

if [[ "$VALID_HTTP_CODE" == "200" ]]; then
  echo -e "${GREEN}✓ Valid signature ACCEPTED (200 OK)${NC}"
  if echo "$VALID_BODY" | grep -q "success.*true"; then
    echo -e "${GREEN}✓ Response indicates successful processing${NC}"
  fi
  echo ""
  VALID_SIG_TEST="PASS"
elif [[ "$VALID_HTTP_CODE" == "401" ]] || [[ "$VALID_HTTP_CODE" == "403" ]]; then
  echo -e "${RED}✗ Valid signature REJECTED${NC}"
  echo "  Response: $VALID_BODY"
  echo -e "${RED}  Action Required: Verify webhook secret matches server configuration${NC}\n"
  VALID_SIG_TEST="FAIL"
else
  echo -e "${YELLOW}⚠ Unexpected response: $VALID_HTTP_CODE${NC}"
  echo "  Response: $VALID_BODY"
  echo -e "${YELLOW}  Warning: Cannot confirm signature validation${NC}\n"
  VALID_SIG_TEST="UNKNOWN"
fi

echo -e "${BLUE}[3/5] Testing webhook with INVALID signature...${NC}"
INVALID_SIGNATURE="invalid_signature_$(date +%s)"
echo "  Signature: $INVALID_SIGNATURE"

INVALID_RESPONSE=$(curl -sS -w "\n%{http_code}" --max-time 10 \
  -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "x-lenco-signature: $INVALID_SIGNATURE" \
  -d "$TEST_PAYLOAD" 2>/dev/null)

INVALID_HTTP_CODE=$(echo "$INVALID_RESPONSE" | tail -n1)
INVALID_BODY=$(echo "$INVALID_RESPONSE" | head -n-1)

echo "  HTTP Status: $INVALID_HTTP_CODE"

if [[ "$INVALID_HTTP_CODE" == "401" ]] || [[ "$INVALID_HTTP_CODE" == "403" ]]; then
  echo -e "${GREEN}✓ Invalid signature REJECTED (${INVALID_HTTP_CODE})${NC}"
  if echo "$INVALID_BODY" | grep -iq "signature"; then
    echo -e "${GREEN}✓ Error message mentions signature validation${NC}"
  fi
  echo ""
  INVALID_SIG_TEST="PASS"
elif [[ "$INVALID_HTTP_CODE" == "200" ]]; then
  echo -e "${RED}✗ Invalid signature ACCEPTED${NC}"
  echo "  Response: $INVALID_BODY"
  echo -e "${RED}  CRITICAL: Webhook is NOT validating signatures!${NC}\n"
  INVALID_SIG_TEST="FAIL"
else
  echo -e "${YELLOW}⚠ Unexpected response: $INVALID_HTTP_CODE${NC}"
  echo "  Response: $INVALID_BODY"
  echo -e "${YELLOW}  Warning: Cannot confirm signature validation${NC}\n"
  INVALID_SIG_TEST="UNKNOWN"
fi

echo -e "${BLUE}[4/5] Testing webhook with MISSING signature...${NC}"

MISSING_RESPONSE=$(curl -sS -w "\n%{http_code}" --max-time 10 \
  -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "$TEST_PAYLOAD" 2>/dev/null)

MISSING_HTTP_CODE=$(echo "$MISSING_RESPONSE" | tail -n1)
MISSING_BODY=$(echo "$MISSING_RESPONSE" | head -n-1)

echo "  HTTP Status: $MISSING_HTTP_CODE"

if [[ "$MISSING_HTTP_CODE" == "401" ]] || [[ "$MISSING_HTTP_CODE" == "403" ]]; then
  echo -e "${GREEN}✓ Request without signature REJECTED (${MISSING_HTTP_CODE})${NC}"
  echo ""
  MISSING_SIG_TEST="PASS"
elif [[ "$MISSING_HTTP_CODE" == "200" ]]; then
  echo -e "${RED}✗ Request without signature ACCEPTED${NC}"
  echo "  Response: $MISSING_BODY"
  echo -e "${RED}  CRITICAL: Webhook accepts requests without signatures!${NC}\n"
  MISSING_SIG_TEST="FAIL"
else
  echo -e "${YELLOW}⚠ Unexpected response: $MISSING_HTTP_CODE${NC}"
  echo "  Response: $MISSING_BODY"
  echo -e "${YELLOW}  Warning: Cannot confirm signature requirement${NC}\n"
  MISSING_SIG_TEST="UNKNOWN"
fi

echo -e "${BLUE}[5/5] Testing webhook with expired timestamp...${NC}"
# Create payload with old timestamp (6 minutes ago)
OLD_TIMESTAMP=$(date -u -d '6 minutes ago' +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -v-6M +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || echo "")

if [[ -n "$OLD_TIMESTAMP" ]]; then
  OLD_PAYLOAD=$(echo "$TEST_PAYLOAD" | sed "s/\"created_at\": \"[^\"]*\"/\"created_at\": \"$OLD_TIMESTAMP\"/")
  OLD_SIGNATURE=$(generate_signature "$OLD_PAYLOAD" "$WEBHOOK_SECRET")
  
  echo "  Timestamp: $OLD_TIMESTAMP (6 minutes old)"
  
  OLD_RESPONSE=$(curl -sS -w "\n%{http_code}" --max-time 10 \
    -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -H "x-lenco-signature: $OLD_SIGNATURE" \
    -d "$OLD_PAYLOAD" 2>/dev/null)
  
  OLD_HTTP_CODE=$(echo "$OLD_RESPONSE" | tail -n1)
  OLD_BODY=$(echo "$OLD_RESPONSE" | head -n-1)
  
  echo "  HTTP Status: $OLD_HTTP_CODE"
  
  if [[ "$OLD_HTTP_CODE" == "400" ]] || [[ "$OLD_HTTP_CODE" == "401" ]]; then
    echo -e "${GREEN}✓ Expired timestamp REJECTED (${OLD_HTTP_CODE})${NC}"
    echo -e "${GREEN}  Webhook properly validates timestamp freshness${NC}"
    echo ""
    TIMESTAMP_TEST="PASS"
  elif [[ "$OLD_HTTP_CODE" == "200" ]]; then
    echo -e "${YELLOW}⚠ Expired timestamp ACCEPTED${NC}"
    echo "  Note: Webhook may not enforce timestamp validation"
    echo -e "${YELLOW}  Recommended: Add timestamp validation to prevent replay attacks${NC}\n"
    TIMESTAMP_TEST="WARN"
  else
    echo -e "${YELLOW}⚠ Unexpected response: $OLD_HTTP_CODE${NC}"
    echo ""
    TIMESTAMP_TEST="UNKNOWN"
  fi
else
  echo -e "${YELLOW}⚠ Could not generate old timestamp (date command incompatible)${NC}"
  echo "  Skipping timestamp validation test\n"
  TIMESTAMP_TEST="SKIP"
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Webhook Security Verification Complete${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Summary
echo -e "${BLUE}Summary:${NC}"
echo ""

print_test_result() {
  local test_name="$1"
  local result="$2"
  
  case "$result" in
    PASS)
      echo -e "  ${GREEN}✓ $test_name${NC}"
      ;;
    FAIL)
      echo -e "  ${RED}✗ $test_name${NC}"
      ;;
    WARN)
      echo -e "  ${YELLOW}⚠ $test_name${NC}"
      ;;
    UNKNOWN|SKIP)
      echo -e "  ${YELLOW}? $test_name${NC}"
      ;;
  esac
}

print_test_result "Valid signature acceptance" "$VALID_SIG_TEST"
print_test_result "Invalid signature rejection" "$INVALID_SIG_TEST"
print_test_result "Missing signature rejection" "$MISSING_SIG_TEST"
print_test_result "Timestamp validation" "$TIMESTAMP_TEST"

echo ""

# Determine overall result
if [[ "$VALID_SIG_TEST" == "FAIL" ]] || [[ "$INVALID_SIG_TEST" == "FAIL" ]] || [[ "$MISSING_SIG_TEST" == "FAIL" ]]; then
  echo -e "${RED}✗ CRITICAL: Webhook security FAILED${NC}"
  echo ""
  echo "Critical Issues Detected:"
  [[ "$VALID_SIG_TEST" == "FAIL" ]] && echo "  • Valid signatures are being rejected"
  [[ "$INVALID_SIG_TEST" == "FAIL" ]] && echo "  • Invalid signatures are being accepted"
  [[ "$MISSING_SIG_TEST" == "FAIL" ]] && echo "  • Requests without signatures are accepted"
  echo ""
  echo "Action Required:"
  echo "  • Verify LENCO_WEBHOOK_SECRET is correctly set in Supabase secrets"
  echo "  • Ensure webhook handler validates signatures properly"
  echo "  • Review webhook implementation in supabase/functions/lenco-webhook/"
  echo "  • DO NOT deploy to production until this is fixed"
  exit 1
  
elif [[ "$VALID_SIG_TEST" == "PASS" ]] && [[ "$INVALID_SIG_TEST" == "PASS" ]] && [[ "$MISSING_SIG_TEST" == "PASS" ]]; then
  echo -e "${GREEN}✓ PASS: Webhook security properly configured${NC}"
  echo ""
  echo "Verified:"
  echo "  • Valid signatures are accepted"
  echo "  • Invalid signatures are rejected"
  echo "  • Requests without signatures are rejected"
  
  if [[ "$TIMESTAMP_TEST" == "PASS" ]]; then
    echo "  • Timestamp validation is enforced"
  fi
  
  echo ""
  echo "Recommendations:"
  echo "  • Regularly rotate webhook secrets (quarterly)"
  echo "  • Monitor webhook_logs table for validation failures"
  echo "  • Set up alerts for repeated signature failures"
  echo "  • Document webhook secret rotation procedures"
  exit 0
  
else
  echo -e "${YELLOW}⚠ WARNING: Could not fully verify webhook security${NC}"
  echo ""
  echo "Some tests could not be confirmed. Manual verification recommended."
  echo ""
  echo "Next Steps:"
  echo "  • Review webhook handler logs for detailed error messages"
  echo "  • Test with actual Lenco webhook events"
  echo "  • Verify signature generation algorithm matches Lenco's implementation"
  exit 0
fi
