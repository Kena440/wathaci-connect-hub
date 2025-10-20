#!/usr/bin/env bash
#
# Comprehensive Security Verification Runner
# Runs all security checks and generates a report
#
# Usage: ./scripts/run-security-verification.sh
# Configuration: Set environment variables or edit the config section below

set -euo pipefail

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration - Edit these or set as environment variables
DOMAIN="${DOMAIN:-your-domain.vercel.app}"
BACKEND_URL="${BACKEND_URL:-https://your-backend.com}"
WEBHOOK_URL="${WEBHOOK_URL:-https://xxx.supabase.co/functions/v1/lenco-webhook}"
WEBHOOK_SECRET="${WEBHOOK_SECRET:-}"

# Report directory
REPORT_DIR="security-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$REPORT_DIR/security-report-$TIMESTAMP.txt"

# Test results
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Function to print header
print_header() {
  local title="$1"
  echo -e "\n${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${BLUE}$title${NC}"
  echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Function to run a test
run_test() {
  local test_name="$1"
  local test_script="$2"
  shift 2
  local test_args=("$@")
  
  echo -e "${BLUE}Running: $test_name${NC}"
  echo "Script: $test_script ${test_args[*]}"
  echo ""
  
  ((TESTS_RUN++))
  
  if [[ ! -x "$test_script" ]]; then
    echo -e "${RED}✗ Test script not executable: $test_script${NC}\n"
    ((TESTS_FAILED++))
    return 1
  fi
  
  if "$test_script" "${test_args[@]}" 2>&1 | tee -a "$REPORT_FILE"; then
    echo -e "${GREEN}✓ $test_name PASSED${NC}\n"
    ((TESTS_PASSED++))
    return 0
  else
    echo -e "${RED}✗ $test_name FAILED${NC}\n"
    ((TESTS_FAILED++))
    return 1
  fi
}

# Function to skip a test
skip_test() {
  local test_name="$1"
  local reason="$2"
  
  echo -e "${YELLOW}⊘ Skipping: $test_name${NC}"
  echo "  Reason: $reason"
  echo ""
  ((TESTS_RUN++))
  ((TESTS_SKIPPED++))
}

# Main script
main() {
  print_header "WATHACI CONNECT - Security Verification Suite"
  
  echo "Timestamp: $(date)"
  echo "Report will be saved to: $REPORT_FILE"
  echo ""
  
  # Create report directory
  mkdir -p "$REPORT_DIR"
  
  # Initialize report
  {
    echo "======================================================================"
    echo "WATHACI CONNECT - Security Verification Report"
    echo "======================================================================"
    echo ""
    echo "Date: $(date)"
    echo "Configuration:"
    echo "  Domain: $DOMAIN"
    echo "  Backend URL: $BACKEND_URL"
    echo "  Webhook URL: $WEBHOOK_URL"
    echo "  Webhook Secret: ${WEBHOOK_SECRET:+***configured***}"
    echo ""
    echo "======================================================================"
    echo ""
  } > "$REPORT_FILE"
  
  # Check configuration
  print_header "Configuration Check"
  
  if [[ "$DOMAIN" == "your-domain.vercel.app" ]]; then
    echo -e "${YELLOW}⚠ Warning: Using default domain. Set DOMAIN environment variable.${NC}"
  fi
  
  if [[ "$BACKEND_URL" == "https://your-backend.com" ]]; then
    echo -e "${YELLOW}⚠ Warning: Using default backend URL. Set BACKEND_URL environment variable.${NC}"
  fi
  
  if [[ "$WEBHOOK_URL" == "https://xxx.supabase.co/functions/v1/lenco-webhook" ]]; then
    echo -e "${YELLOW}⚠ Warning: Using default webhook URL. Set WEBHOOK_URL environment variable.${NC}"
  fi
  
  if [[ -z "$WEBHOOK_SECRET" ]]; then
    echo -e "${YELLOW}⚠ Warning: Webhook secret not set. Some tests will be skipped.${NC}"
  fi
  
  echo ""
  read -p "Continue with security verification? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Security verification cancelled."
    exit 0
  fi
  echo ""
  
  # Test 1: TLS Certificate Verification
  print_header "Test 1/4: TLS Certificate Verification"
  run_test "TLS Certificate" "./scripts/check-tls-certificate.sh" "$DOMAIN"
  
  # Test 2: Security Headers and Configuration
  print_header "Test 2/4: Security Headers and Configuration"
  run_test "Security Configuration" "./scripts/verify-security-config.sh" "https://$DOMAIN"
  
  # Test 3: Rate Limiting
  print_header "Test 3/4: Rate Limiting Verification"
  if [[ "$BACKEND_URL" != "https://your-backend.com" ]]; then
    echo -e "${YELLOW}Note: This test sends 110 requests and takes ~60 seconds${NC}\n"
    read -p "Run rate limiting test? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      run_test "Rate Limiting" "./scripts/verify-rate-limiting.sh" "$BACKEND_URL/api/health" 110 60
    else
      skip_test "Rate Limiting" "Skipped by user"
    fi
  else
    skip_test "Rate Limiting" "Backend URL not configured"
  fi
  
  # Test 4: Webhook Security
  print_header "Test 4/4: Webhook Security Verification"
  if [[ -n "$WEBHOOK_SECRET" ]] && [[ "$WEBHOOK_URL" != "https://xxx.supabase.co/functions/v1/lenco-webhook" ]]; then
    run_test "Webhook Security" "./scripts/verify-webhook-security.sh" "$WEBHOOK_URL" "$WEBHOOK_SECRET"
  else
    skip_test "Webhook Security" "Webhook URL or secret not configured"
  fi
  
  # Generate summary
  print_header "Security Verification Summary"
  
  {
    echo ""
    echo "======================================================================"
    echo "Security Verification Summary"
    echo "======================================================================"
    echo ""
    echo "Tests Run:     $TESTS_RUN"
    echo "Tests Passed:  $TESTS_PASSED"
    echo "Tests Failed:  $TESTS_FAILED"
    echo "Tests Skipped: $TESTS_SKIPPED"
    echo ""
  } | tee -a "$REPORT_FILE"
  
  if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "${GREEN}${BOLD}✓ ALL SECURITY TESTS PASSED${NC}" | tee -a "$REPORT_FILE"
    echo "" | tee -a "$REPORT_FILE"
    echo "Your deployment is ready for production from a security perspective." | tee -a "$REPORT_FILE"
    echo "" | tee -a "$REPORT_FILE"
    OVERALL_RESULT=0
  else
    echo -e "${RED}${BOLD}✗ SOME SECURITY TESTS FAILED${NC}" | tee -a "$REPORT_FILE"
    echo "" | tee -a "$REPORT_FILE"
    echo "Please address the failures above before deploying to production." | tee -a "$REPORT_FILE"
    echo "" | tee -a "$REPORT_FILE"
    OVERALL_RESULT=1
  fi
  
  if [[ $TESTS_SKIPPED -gt 0 ]]; then
    echo -e "${YELLOW}Note: $TESTS_SKIPPED test(s) were skipped. Configure all environments for complete verification.${NC}" | tee -a "$REPORT_FILE"
    echo "" | tee -a "$REPORT_FILE"
  fi
  
  echo "Full report saved to: $REPORT_FILE"
  echo ""
  
  # Next steps
  print_header "Next Steps"
  
  if [[ $OVERALL_RESULT -eq 0 ]]; then
    echo "Security verification complete! Next steps:"
    echo ""
    echo "1. Review the detailed report: $REPORT_FILE"
    echo "2. Complete manual verification items in DEPLOYMENT_SECURITY_CHECKLIST.md"
    echo "3. Configure monitoring and alerting (see MONITORING_AND_ALERTING.md)"
    echo "4. Document your Go/No-Go decision"
    echo "5. Proceed with production deployment"
    echo ""
    echo "After deployment:"
    echo "6. Re-run this script against production"
    echo "7. Verify all monitoring dashboards"
    echo "8. Test alert delivery"
    echo ""
  else
    echo "Security issues detected. Before proceeding:"
    echo ""
    echo "1. Review failed tests in detail: $REPORT_FILE"
    echo "2. Address each failure according to error messages"
    echo "3. Re-run this verification script"
    echo "4. Do NOT deploy to production until all tests pass"
    echo ""
    echo "For help:"
    echo "- Check DEPLOYMENT_SECURITY_CHECKLIST.md for guidance"
    echo "- Review individual test script documentation"
    echo "- Contact security team if needed"
    echo ""
  fi
  
  exit $OVERALL_RESULT
}

# Run main script
main "$@"
