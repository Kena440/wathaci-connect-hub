# Security Verification Scripts

This directory contains automated security verification scripts for WATHACI CONNECT deployment.

## Overview

These scripts verify critical security configurations before and after production deployment:
- TLS/HTTPS certificate validation
- Security headers verification
- Rate limiting enforcement
- Webhook signature validation

## Scripts

### 1. run-security-verification.sh

**Comprehensive security test runner** - Executes all security checks and generates a report.

```bash
# Set configuration via environment variables
export DOMAIN="your-domain.vercel.app"
export BACKEND_URL="https://your-backend.com"
export WEBHOOK_URL="https://xxx.supabase.co/functions/v1/lenco-webhook"
export WEBHOOK_SECRET="your-webhook-secret"

# Run all tests
./scripts/run-security-verification.sh
```

**Output:**
- Interactive test execution
- Detailed test results
- Summary report
- Saved to `security-reports/security-report-YYYYMMDD_HHMMSS.txt`

**Use Cases:**
- Pre-deployment verification
- Post-deployment validation
- Regular security audits
- CI/CD integration

---

### 2. check-tls-certificate.sh

**TLS certificate verification** - Validates SSL/TLS configuration.

```bash
./scripts/check-tls-certificate.sh your-domain.vercel.app
```

**Checks:**
- HTTPS connectivity
- Certificate validity and expiry
- Certificate chain verification
- TLS protocol version (1.2+)
- Cipher strength
- Certificate authority trust

**Exit Codes:**
- `0` - All checks passed
- `1` - One or more checks failed

**Use Cases:**
- Verify certificate before go-live
- Monitor certificate expiry
- Validate certificate after renewal
- Check TLS configuration changes

---

### 3. verify-security-config.sh

**Security headers verification** - Validates HTTP security headers and HTTPS enforcement.

```bash
./scripts/verify-security-config.sh https://your-domain.vercel.app
```

**Checks:**
- HTTPS enforcement (HTTP→HTTPS redirect)
- Strict-Transport-Security (HSTS)
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Content-Security-Policy
- Referrer-Policy
- Permissions-Policy

**Exit Codes:**
- `0` - All required headers present
- `1` - Critical headers missing

**Use Cases:**
- Verify security headers before deployment
- Validate Helmet.js configuration
- Check edge/CDN security settings
- Compliance verification

---

### 4. verify-rate-limiting.sh

**Rate limiting verification** - Tests rate limiting enforcement and configuration.

```bash
# Test with 110 requests over 60 seconds
./scripts/verify-rate-limiting.sh https://your-backend.com/api/health 110 60
```

**Parameters:**
- `url` - Endpoint to test (required)
- `num_requests` - Number of requests to send (default: 110)
- `window_seconds` - Time window in seconds (default: 60)

**Checks:**
- Rate limit headers (X-RateLimit-*)
- Rate limit enforcement (429 responses)
- Rate limit threshold accuracy
- Rate limit reset behavior

**Exit Codes:**
- `0` - Rate limiting active and working
- `1` - Rate limiting not active or misconfigured

**Use Cases:**
- Verify express-rate-limit middleware
- Test rate limit thresholds
- Validate per-IP tracking
- Load testing abuse prevention

**Note:** This test sends many requests and may trigger actual rate limits. Use with caution on production.

---

### 5. verify-webhook-security.sh

**Webhook security verification** - Validates webhook signature validation and security.

```bash
./scripts/verify-webhook-security.sh \
  https://xxx.supabase.co/functions/v1/lenco-webhook \
  "your-webhook-secret"
```

**Parameters:**
- `webhook_url` - Webhook endpoint URL (required)
- `webhook_secret` - HMAC secret for signature generation (required)

**Checks:**
- Webhook endpoint availability
- Valid signature acceptance (200 OK)
- Invalid signature rejection (401)
- Missing signature rejection (401)
- Timestamp validation (replay protection)

**Exit Codes:**
- `0` - Webhook security properly configured
- `1` - Critical security issues detected

**Use Cases:**
- Verify webhook before production
- Test after secret rotation
- Validate signature algorithm
- Security audit of webhook endpoint

**Security Note:** Never commit webhook secrets to version control. Use environment variables or secure parameter passing.

---

## Usage Examples

### Pre-Deployment Verification

```bash
# Full automated verification
export DOMAIN="staging.wathaci-connect.com"
export BACKEND_URL="https://api.staging.wathaci-connect.com"
export WEBHOOK_URL="https://abc123.supabase.co/functions/v1/lenco-webhook"
export WEBHOOK_SECRET="$(cat .secrets/webhook-secret)"

./scripts/run-security-verification.sh
```

### Individual Test Cases

```bash
# Quick TLS check
./scripts/check-tls-certificate.sh production.wathaci-connect.com

# Verify security headers only
./scripts/verify-security-config.sh https://production.wathaci-connect.com

# Test rate limiting with fewer requests (faster)
./scripts/verify-rate-limiting.sh https://api.wathaci-connect.com/health 50 30

# Verify webhook in staging
./scripts/verify-webhook-security.sh \
  "$(cat .env.staging | grep WEBHOOK_URL | cut -d= -f2)" \
  "$(cat .env.staging | grep WEBHOOK_SECRET | cut -d= -f2)"
```

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
name: Security Verification
on: [push]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Security Checks
        env:
          DOMAIN: ${{ secrets.STAGING_DOMAIN }}
          BACKEND_URL: ${{ secrets.STAGING_BACKEND_URL }}
          WEBHOOK_URL: ${{ secrets.STAGING_WEBHOOK_URL }}
          WEBHOOK_SECRET: ${{ secrets.STAGING_WEBHOOK_SECRET }}
        run: |
          chmod +x scripts/*.sh
          ./scripts/run-security-verification.sh
```

### Scheduled Monitoring

```bash
# Cron job for daily security checks (add to crontab)
0 9 * * * cd /path/to/WATHACI-CONNECT.-V1 && ./scripts/check-tls-certificate.sh production.domain.com >> /var/log/security-checks.log 2>&1
```

## Requirements

All scripts require:
- `bash` (4.0+)
- `curl`
- `openssl`

Optional (for some features):
- `bc` (for calculations in rate limiting script)
- `grep` with PCRE support

### Installing Dependencies

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y bash curl openssl bc
```

**macOS:**
```bash
# Bash and curl are pre-installed
brew install openssl bc
```

**Alpine Linux (Docker):**
```bash
apk add --no-cache bash curl openssl bc
```

## Best Practices

### Before Production Deployment

1. Run full verification suite with production values
2. Review generated report thoroughly
3. Address all failures before deploying
4. Document test results in deployment checklist
5. Re-run tests after deployment to production

### Regular Monitoring

1. **Daily**: Run TLS certificate check
2. **Weekly**: Run full security verification
3. **After changes**: Re-run relevant tests
4. **After incidents**: Run full suite to verify remediation

### Security Considerations

- **Never commit secrets**: Use environment variables or secret management
- **Protect test reports**: May contain sensitive information
- **Rotate secrets regularly**: Test webhook script after rotation
- **Monitor test results**: Set up alerts for test failures
- **Document baselines**: Know your normal security posture

## Troubleshooting

### Script Permission Denied

```bash
chmod +x scripts/*.sh
```

### Network Connectivity Issues

Scripts require outbound HTTPS access. Check:
- Firewall rules
- Proxy configuration
- DNS resolution

### OpenSSL Not Found

Install OpenSSL or use Docker container with OpenSSL.

### Invalid Certificate Errors

May occur with:
- Self-signed certificates (development)
- Expired certificates
- Certificate chain issues

Use `-k` flag with curl for testing only (never in production).

### Rate Limiting Script Takes Too Long

Reduce number of requests or time window:
```bash
./scripts/verify-rate-limiting.sh URL 50 30  # 50 requests in 30 seconds
```

### Webhook Script Shows UNKNOWN Results

Usually indicates:
- Incorrect webhook URL
- Incorrect secret format
- Network/firewall issues
- Webhook not deployed

## Output Formats

### Success Output (Green ✓)
- All checks passed
- Configuration is secure
- Ready for production

### Warning Output (Yellow ⚠)
- Non-critical issues
- Recommendations provided
- May proceed with caution

### Failure Output (Red ✗)
- Critical security issues
- Must be fixed before production
- Action required immediately

## Support

For issues with security scripts:
1. Check script requirements are installed
2. Verify environment variables are set correctly
3. Review script output for specific error messages
4. Consult [DEPLOYMENT_SECURITY_CHECKLIST.md](../docs/DEPLOYMENT_SECURITY_CHECKLIST.md)
5. Contact security team if needed

## Related Documentation

- [Deployment Security Checklist](../docs/DEPLOYMENT_SECURITY_CHECKLIST.md)
- [Monitoring and Alerting](../docs/MONITORING_AND_ALERTING.md)
- [Security Quick Reference](../docs/SECURITY_QUICK_REFERENCE.md)
- [Webhook Setup Guide](../docs/WEBHOOK_SETUP_GUIDE.md)
- [Production Readiness Checklist](../docs/PRODUCTION_READINESS_CHECKLIST.md)

## Contributing

When adding new security scripts:
1. Follow existing script structure and patterns
2. Include comprehensive error handling
3. Provide clear, actionable error messages
4. Add color-coded output for readability
5. Document all parameters and exit codes
6. Add usage examples
7. Update this README
8. Test on multiple platforms (Linux, macOS)

---

**Last Updated:** January 2025
