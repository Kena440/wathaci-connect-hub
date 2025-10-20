#!/bin/bash
##
# HTTPS Health Check Smoke Test
# 
# This script performs HTTPS availability checks as described in
# POST_LAUNCH_SMOKE_TEST_SCHEDULE.md
#
# Usage:
#   bash scripts/smoke-test-https.sh <domain>
#
# Example:
#   bash scripts/smoke-test-https.sh app.wathaci.com
#
# Exit codes:
#   0 - All checks passed
#   1 - Health check failed
#   2 - Certificate invalid or expired
#   3 - Response time too slow (>500ms)
##

set -e

# Configuration
DOMAIN="${1:-app.wathaci.com}"
MAX_RESPONSE_TIME_MS=500
HEALTH_ENDPOINT="https://${DOMAIN}/health"

echo "=================================================="
echo "HTTPS Health Check Smoke Test"
echo "=================================================="
echo "Domain: ${DOMAIN}"
echo "Health Endpoint: ${HEALTH_ENDPOINT}"
echo "Max Response Time: ${MAX_RESPONSE_TIME_MS}ms"
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "=================================================="

# Test 1: Certificate Validity
echo ""
echo "🔒 Test 1: Checking SSL/TLS Certificate..."
if openssl s_client -connect "${DOMAIN}:443" -servername "${DOMAIN}" </dev/null 2>/dev/null | openssl x509 -noout -checkend 0 >/dev/null 2>&1; then
    echo "✅ PASS: Certificate is valid"
    CERT_EXPIRY=$(openssl s_client -connect "${DOMAIN}:443" -servername "${DOMAIN}" </dev/null 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    echo "   Certificate expires: ${CERT_EXPIRY}"
else
    echo "❌ FAIL: Certificate is invalid or expired"
    exit 2
fi

# Test 2: HTTPS Availability & Response Code
echo ""
echo "🌐 Test 2: Checking HTTPS Availability..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L -m 10 "${HEALTH_ENDPOINT}" || echo "000")

if [[ "${HTTP_STATUS}" == "200" || "${HTTP_STATUS}" == "301" || "${HTTP_STATUS}" == "302" ]]; then
    echo "✅ PASS: Health endpoint returned ${HTTP_STATUS}"
else
    echo "❌ FAIL: Health endpoint returned ${HTTP_STATUS} (expected 200/301/302)"
    exit 1
fi

# Test 3: Response Time Check
echo ""
echo "⏱️  Test 3: Checking Response Time..."
RESPONSE_TIME_SECONDS=$(curl -s -o /dev/null -w "%{time_total}" -L -m 10 "${HEALTH_ENDPOINT}" || echo "999")
RESPONSE_TIME_MS=$(echo "${RESPONSE_TIME_SECONDS} * 1000" | bc | cut -d. -f1)

echo "   Response time: ${RESPONSE_TIME_MS}ms"

if [[ ${RESPONSE_TIME_MS} -lt ${MAX_RESPONSE_TIME_MS} ]]; then
    echo "✅ PASS: Response time below threshold (${RESPONSE_TIME_MS}ms < ${MAX_RESPONSE_TIME_MS}ms)"
else
    echo "❌ FAIL: Response time too slow (${RESPONSE_TIME_MS}ms >= ${MAX_RESPONSE_TIME_MS}ms)"
    exit 3
fi

# Test 4: Health Response Validation
echo ""
echo "📋 Test 4: Validating Health Response..."
HEALTH_RESPONSE=$(curl -s -L -m 10 "${HEALTH_ENDPOINT}" || echo "{}")

if echo "${HEALTH_RESPONSE}" | grep -q '"status"'; then
    echo "✅ PASS: Health response contains status field"
    echo "   Response: ${HEALTH_RESPONSE}"
else
    echo "⚠️  WARNING: Health response format unexpected"
    echo "   Response: ${HEALTH_RESPONSE}"
    # Not failing on this, as different endpoints may have different formats
fi

# Summary
echo ""
echo "=================================================="
echo "✅ ALL SMOKE TESTS PASSED"
echo "=================================================="
echo "Domain ${DOMAIN} is healthy and accessible"
echo "Certificate valid, response time: ${RESPONSE_TIME_MS}ms"
echo ""

exit 0
