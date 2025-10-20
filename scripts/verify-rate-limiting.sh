#!/usr/bin/env bash
#
# Rate Limiting Verification Script
# Tests and verifies rate limiting configuration is working properly
#
# Usage: ./scripts/verify-rate-limiting.sh <url> [requests] [window_seconds]
# Example: ./scripts/verify-rate-limiting.sh https://wathaci-connect.vercel.app/api/health 110 60

set -euo pipefail

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

URL="${1:-}"
NUM_REQUESTS="${2:-110}"  # Default to 110 requests (limit is 100)
WINDOW_SECONDS="${3:-60}"  # Default to 60 seconds

if [[ -z "$URL" ]]; then
  echo "Usage: $0 <url> [num_requests] [window_seconds]"
  echo "Example: $0 https://wathaci-connect.vercel.app/api/health 110 60"
  exit 1
fi

# Ensure URL has protocol
if [[ ! "$URL" =~ ^https?:// ]]; then
  URL="https://$URL"
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Rate Limiting Verification for: $URL${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Check if curl is available
if ! command -v curl &> /dev/null; then
  echo -e "${RED}✗ Error: curl is not installed${NC}"
  exit 1
fi

echo -e "${BLUE}Test Configuration:${NC}"
echo "  Target URL: $URL"
echo "  Number of requests: $NUM_REQUESTS"
echo "  Time window: ${WINDOW_SECONDS}s"
echo ""

echo -e "${BLUE}[1/4] Testing initial request for rate limit headers...${NC}"

# Make initial request to check headers
INITIAL_RESPONSE=$(curl -sS -I --max-time 10 "$URL" 2>/dev/null)
HTTP_CODE=$(echo "$INITIAL_RESPONSE" | head -n1 | awk '{print $2}')

if [[ -z "$HTTP_CODE" ]] || [[ "$HTTP_CODE" == "000" ]]; then
  echo -e "${RED}✗ Failed to connect to $URL${NC}"
  exit 1
fi

echo "  HTTP Status: $HTTP_CODE"

# Check for rate limit headers
RATE_LIMIT_LIMIT=$(echo "$INITIAL_RESPONSE" | grep -i "X-RateLimit-Limit:" | awk '{print $2}' | tr -d '\r' || echo "")
RATE_LIMIT_REMAINING=$(echo "$INITIAL_RESPONSE" | grep -i "X-RateLimit-Remaining:" | awk '{print $2}' | tr -d '\r' || echo "")
RATE_LIMIT_RESET=$(echo "$INITIAL_RESPONSE" | grep -i "X-RateLimit-Reset:" | awk '{print $2}' | tr -d '\r' || echo "")

if [[ -n "$RATE_LIMIT_LIMIT" ]]; then
  echo "  X-RateLimit-Limit: $RATE_LIMIT_LIMIT"
  echo "  X-RateLimit-Remaining: $RATE_LIMIT_REMAINING"
  if [[ -n "$RATE_LIMIT_RESET" ]]; then
    echo "  X-RateLimit-Reset: $RATE_LIMIT_RESET"
  fi
  echo -e "${GREEN}✓ Rate limit headers present${NC}\n"
else
  echo -e "${YELLOW}⚠ Warning: Rate limit headers not found${NC}"
  echo -e "${YELLOW}  Note: Rate limiting may still be active without headers${NC}\n"
fi

echo -e "${BLUE}[2/4] Sending burst of requests to test rate limiting...${NC}"
echo "  This will take approximately ${WINDOW_SECONDS} seconds..."
echo ""

# Create temporary file for results
TEMP_FILE=$(mktemp)
trap "rm -f $TEMP_FILE" EXIT

# Send requests and track responses
SUCCESS_COUNT=0
RATE_LIMITED_COUNT=0
ERROR_COUNT=0
FIRST_RATE_LIMIT=""

echo -e "${BLUE}Progress:${NC}"
for i in $(seq 1 "$NUM_REQUESTS"); do
  # Send request
  RESPONSE_CODE=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 5 "$URL" 2>/dev/null || echo "000")
  
  echo "$RESPONSE_CODE" >> "$TEMP_FILE"
  
  # Track first rate-limited response
  if [[ "$RESPONSE_CODE" == "429" ]] && [[ -z "$FIRST_RATE_LIMIT" ]]; then
    FIRST_RATE_LIMIT="$i"
  fi
  
  # Count response types
  if [[ "$RESPONSE_CODE" =~ ^2[0-9]{2}$ ]]; then
    ((SUCCESS_COUNT++))
  elif [[ "$RESPONSE_CODE" == "429" ]]; then
    ((RATE_LIMITED_COUNT++))
  else
    ((ERROR_COUNT++))
  fi
  
  # Progress indicator
  if [[ $((i % 10)) -eq 0 ]]; then
    echo -n "."
  fi
  
  # Small delay to spread requests over window
  if [[ $NUM_REQUESTS -gt 10 ]]; then
    sleep $(echo "scale=3; $WINDOW_SECONDS / $NUM_REQUESTS" | bc)
  fi
done

echo ""
echo ""

echo -e "${BLUE}[3/4] Analyzing results...${NC}"

# Analyze response codes
RESPONSE_SUMMARY=$(sort "$TEMP_FILE" | uniq -c | sort -rn)

echo -e "${BLUE}Response Code Distribution:${NC}"
echo "$RESPONSE_SUMMARY" | while read -r count code; do
  case "$code" in
    2*)
      echo -e "  ${GREEN}$code: $count requests${NC}"
      ;;
    429)
      echo -e "  ${YELLOW}$code (Rate Limited): $count requests${NC}"
      ;;
    *)
      echo -e "  ${RED}$code: $count requests${NC}"
      ;;
  esac
done
echo ""

echo -e "${BLUE}Summary:${NC}"
echo "  Total requests sent: $NUM_REQUESTS"
echo "  Successful (2xx): $SUCCESS_COUNT"
echo "  Rate limited (429): $RATE_LIMITED_COUNT"
echo "  Other errors: $ERROR_COUNT"

if [[ -n "$FIRST_RATE_LIMIT" ]]; then
  echo "  First rate limit at request: $FIRST_RATE_LIMIT"
fi
echo ""

echo -e "${BLUE}[4/4] Evaluating rate limiting effectiveness...${NC}"

# Determine if rate limiting is working
RATE_LIMITING_ACTIVE=false

if [[ $RATE_LIMITED_COUNT -gt 0 ]]; then
  RATE_LIMITING_ACTIVE=true
  echo -e "${GREEN}✓ Rate limiting is ACTIVE${NC}"
  echo "  Received $RATE_LIMITED_COUNT rate-limited responses (429)"
  
  # Check if it triggered at reasonable threshold
  if [[ -n "$RATE_LIMIT_LIMIT" ]] && [[ -n "$FIRST_RATE_LIMIT" ]]; then
    EXPECTED_LIMIT=$((RATE_LIMIT_LIMIT))
    ACTUAL_LIMIT=$((FIRST_RATE_LIMIT))
    
    # Allow 10% variance
    LOWER_BOUND=$((EXPECTED_LIMIT - EXPECTED_LIMIT / 10))
    UPPER_BOUND=$((EXPECTED_LIMIT + EXPECTED_LIMIT / 10))
    
    if [[ $ACTUAL_LIMIT -ge $LOWER_BOUND ]] && [[ $ACTUAL_LIMIT -le $UPPER_BOUND ]]; then
      echo -e "${GREEN}✓ Rate limit triggered at expected threshold (~$RATE_LIMIT_LIMIT requests)${NC}"
    else
      echo -e "${YELLOW}⚠ Rate limit triggered at $ACTUAL_LIMIT requests (expected ~$RATE_LIMIT_LIMIT)${NC}"
    fi
  fi
else
  echo -e "${RED}✗ Rate limiting does NOT appear to be active${NC}"
  echo "  No rate-limited responses (429) received after $NUM_REQUESTS requests"
fi
echo ""

# Test if rate limit resets
if [[ $RATE_LIMITING_ACTIVE == true ]]; then
  echo -e "${BLUE}[Bonus] Testing rate limit reset...${NC}"
  echo "  Waiting for rate limit to reset..."
  
  # Extract reset time if available
  if [[ -n "$RATE_LIMIT_RESET" ]]; then
    RESET_SECONDS=$((RATE_LIMIT_RESET - $(date +%s)))
    if [[ $RESET_SECONDS -gt 0 ]] && [[ $RESET_SECONDS -lt 1000 ]]; then
      echo "  Rate limit resets in ${RESET_SECONDS}s"
      echo "  Waiting..."
      sleep "$RESET_SECONDS"
    else
      # Default wait
      echo "  Waiting 60 seconds for rate limit window to reset..."
      sleep 60
    fi
  else
    # Default wait
    echo "  Waiting 60 seconds for rate limit window to reset..."
    sleep 60
  fi
  
  # Test if we can make requests again
  RESET_TEST=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "$URL" 2>/dev/null || echo "000")
  
  if [[ "$RESET_TEST" =~ ^2[0-9]{2}$ ]]; then
    echo -e "${GREEN}✓ Rate limit properly reset - requests allowed again${NC}\n"
  elif [[ "$RESET_TEST" == "429" ]]; then
    echo -e "${YELLOW}⚠ Still rate limited after reset period${NC}\n"
  else
    echo -e "${YELLOW}⚠ Unexpected response after reset: $RESET_TEST${NC}\n"
  fi
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Rate Limiting Verification Complete${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Final assessment
if [[ $RATE_LIMITING_ACTIVE == true ]]; then
  echo -e "${GREEN}✓ PASS: Rate limiting is properly configured and active${NC}"
  
  if [[ -n "$RATE_LIMIT_LIMIT" ]]; then
    echo -e "${GREEN}  Rate limit: $RATE_LIMIT_LIMIT requests per window${NC}"
  fi
  
  echo ""
  echo "Recommendations:"
  echo "  • Monitor rate limit violations in production logs"
  echo "  • Set up alerts for unusual rate limit patterns"
  echo "  • Review rate limit thresholds based on actual traffic"
  echo "  • Consider IP-based tracking for better abuse prevention"
  
  exit 0
else
  echo -e "${RED}✗ FAIL: Rate limiting is NOT active or not working${NC}"
  echo ""
  echo "Action Required:"
  echo "  • Verify rate limiting middleware is enabled in backend/index.js"
  echo "  • Check that express-rate-limit is properly configured"
  echo "  • Ensure rate limiting is not bypassed in production"
  echo "  • Review deployment configuration and environment variables"
  
  exit 1
fi
