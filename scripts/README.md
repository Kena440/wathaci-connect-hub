# Scripts Directory

This directory contains helper scripts for managing the WATHACI CONNECT application, including environment management, database provisioning, and security verification.

## Available Scripts

### Security Verification Scripts

#### `run-security-verification.sh`
**Purpose**: Comprehensive security test runner - Executes all security checks and generates a report  
**Usage**:
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

#### `check-tls-certificate.sh`
**Purpose**: TLS/HTTPS certificate validation  
**Usage**: `./scripts/check-tls-certificate.sh your-domain.com`

**Checks:**
- Certificate authority validation (trusted CA)
- Certificate expiry (must be valid for >30 days)
- Complete certificate chain
- TLS protocol version (1.2 or 1.3)
- Cipher strength (no weak ciphers)

**Example:**
```bash
./scripts/check-tls-certificate.sh production.example.com
```

**Exit Codes:**
- `0` - All checks passed
- `1` - One or more checks failed

#### `verify-security-config.sh`
**Purpose**: Security headers verification  
**Usage**: `./scripts/verify-security-config.sh https://your-domain.com`

**Checks:**
- Strict-Transport-Security (HSTS)
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Content-Security-Policy

**Example:**
```bash
./scripts/verify-security-config.sh https://production.example.com
```

#### `verify-rate-limiting.sh`
**Purpose**: Rate limiting enforcement verification  
**Usage**: `./scripts/verify-rate-limiting.sh <url> [requests] [window_seconds]`

**Parameters:**
- `url` - Endpoint to test (required)
- `requests` - Number of requests to send (default: 110)
- `window_seconds` - Time window in seconds (default: 60)

**Checks:**
- Rate limit headers present (X-RateLimit-*)
- Rate limiting enforced (429 responses)
- Rate limit configuration matches expected values

**Example:**
```bash
# Test with defaults (110 requests in 60 seconds)
./scripts/verify-rate-limiting.sh https://api.example.com/health

# Test with custom values
./scripts/verify-rate-limiting.sh https://api.example.com/health 150 120
```

#### `verify-webhook-security.sh`
**Purpose**: Webhook signature validation verification  
**Usage**: `./scripts/verify-webhook-security.sh <webhook_url> <webhook_secret>`

**Checks:**
- Valid signature acceptance (HTTP 200)
- Invalid signature rejection (HTTP 401)
- Missing signature rejection (HTTP 401)
- Timestamp validation (stale webhooks rejected)

**Example:**
```bash
./scripts/verify-webhook-security.sh \
  https://xxx.supabase.co/functions/v1/lenco-webhook \
  "your-webhook-secret"
```

**Requirements:**
- `openssl` for signature generation
- `curl` for HTTP requests
- Access to webhook endpoint

### Environment Management

#### `env-check.mjs`
**Purpose**: Validates environment variables across `.env` files  
**Usage**: `npm run env:check`  
**Description**: Checks for missing, placeholder, or incorrectly formatted environment variables. Ensures production keys are properly configured.

#### `setup-env.sh`
**Purpose**: Automated environment file setup  
**Usage**: 
```bash
npm run env:setup
# or directly
./scripts/setup-env.sh
```
**Description**: Interactive script that creates all required environment files from templates:
- `.env` - Development environment
- `.env.production` - Production environment
- `backend/.env` - Backend development
- `backend/.env.production` - Backend production

#### `rotate-lenco-keys.sh`
**Purpose**: Automated helper for rotating Lenco API keys from test to production  
**Usage**: 
```bash
npm run keys:rotate
# or directly
./scripts/rotate-lenco-keys.sh
```
**Description**: Interactive script that:
- Prompts for live Lenco API keys
- Updates `.env` and `backend/.env` files
- Pushes secrets to Supabase Edge Functions
- Validates the configuration
- Provides next steps

**Documentation**: See [LENCO_KEYS_ROTATION_GUIDE.md](../docs/LENCO_KEYS_ROTATION_GUIDE.md)

### Database Management

#### `provision-supabase.sh`
**Purpose**: Provisions the Supabase database schema  
**Usage**: `npm run supabase:provision`  
**Description**: Executes all SQL files in `backend/supabase/` to create tables, functions, and RLS policies in the production database.

**Requirements**:
- Set `SUPABASE_DB_URL` environment variable
- Format: `postgres://postgres:[password]@db.[project-ref].supabase.co:5432/postgres`

#### `validate-database.ts`
**Purpose**: Validates database schema and configuration  
**Usage**: Run with Deno or Node.js  
**Description**: Checks database tables, columns, indexes, and RLS policies are correctly configured.

### Supabase Authentication

#### `supabase-login.sh`
**Purpose**: Interactive Supabase CLI authentication helper  
**Usage**: `npm run supabase:login`  
**Description**: Guides you through the Supabase CLI authentication process with helpful prompts and validation.

## Security Best Practices

### Pre-Deployment Checklist

Before deploying to production, run the complete security verification:

```bash
# 1. Validate environment configuration
npm run env:check

# 2. Run security verification suite
export DOMAIN="your-domain.vercel.app"
export BACKEND_URL="https://your-backend.com"
export WEBHOOK_URL="https://xxx.supabase.co/functions/v1/lenco-webhook"
export WEBHOOK_SECRET="your-webhook-secret"
./scripts/run-security-verification.sh

# 3. Review security report
cat security-reports/security-report-*.txt
```

### Post-Deployment Validation

After deploying to production, verify all security measures are active:

```bash
# Run security verification against production
./scripts/run-security-verification.sh

# Monitor for issues in first hour
# - Check certificate expiry
# - Verify rate limiting
# - Monitor webhook logs
# - Review payment security
```

### Regular Maintenance

Schedule regular security checks:

**Weekly:**
- Run `env:check` to verify configuration integrity
- Review webhook logs for signature failures
- Check rate limit abuse patterns

**Monthly:**
- Run full security verification suite
- Review and update alert thresholds
- Test disaster recovery procedures

**Quarterly:**
- Rotate webhook secrets using documented procedure
- Review and update security policies
- Conduct comprehensive security assessment

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Security Verification

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  security-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Environment Check
        run: npm run env:check
      
      - name: Security Verification
        env:
          DOMAIN: ${{ secrets.PRODUCTION_DOMAIN }}
          BACKEND_URL: ${{ secrets.BACKEND_URL }}
          WEBHOOK_URL: ${{ secrets.WEBHOOK_URL }}
          WEBHOOK_SECRET: ${{ secrets.WEBHOOK_SECRET }}
        run: ./scripts/run-security-verification.sh
      
      - name: Upload Security Report
        uses: actions/upload-artifact@v3
        with:
          name: security-report
          path: security-reports/
```

## Troubleshooting

### TLS Certificate Failures

**Issue**: Certificate validation fails
**Solutions**:
- Verify domain is correctly configured
- Check DNS propagation
- Ensure certificate is not expired
- Verify certificate chain is complete

### Rate Limiting Issues

**Issue**: Rate limiting not enforcing limits
**Solutions**:
- Verify express-rate-limit middleware is enabled
- Check rate limit configuration in backend
- Ensure headers are being sent correctly
- Test from different IP addresses

### Webhook Signature Validation Failures

**Issue**: Webhook signature validation fails
**Solutions**:
- Verify webhook secret matches in all environments
- Check signature generation algorithm
- Ensure timestamp is within tolerance window
- Review webhook payload format

## Support

For issues with scripts:
- Check script exit codes and error messages
- Review relevant documentation in `/docs`
- Verify environment configuration
- Check system dependencies (curl, openssl, etc.)

For security concerns:
- Review [DEPLOYMENT_SECURITY_CHECKLIST.md](../docs/DEPLOYMENT_SECURITY_CHECKLIST.md)
- Check [MONITORING_AND_ALERTING.md](../docs/MONITORING_AND_ALERTING.md)
- Contact security team for critical issues

## Script Dependencies

All security verification scripts require:
- `bash` (4.0+)
- `curl` (for HTTP requests)
- `openssl` (for certificate/signature operations)
- `jq` (for JSON parsing)

Install on Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install -y curl openssl jq
```

Install on macOS:
```bash
brew install curl openssl jq
```

## Contributing

When adding new scripts:
1. Follow the existing naming convention
2. Add appropriate error handling and exit codes
3. Update this README with usage documentation
4. Include examples and troubleshooting tips
5. Test scripts in multiple environments

## References

- [Deployment Security Checklist](../docs/DEPLOYMENT_SECURITY_CHECKLIST.md)
- [Monitoring and Alerting Guide](../docs/MONITORING_AND_ALERTING.md)
- [Production Readiness Checklist](../docs/PRODUCTION_READINESS_CHECKLIST.md)
- [Lenco Keys Rotation Guide](../docs/LENCO_KEYS_ROTATION_GUIDE.md)
