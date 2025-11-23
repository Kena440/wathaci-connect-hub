# Production Launch Testing & Monitoring Guide

## Overview

This guide provides instructions for executing quick production verification tests and ongoing monitoring during the launch window. These tests ensure that critical authentication flows (email/OTP verification, password reset) are working correctly in production.

## Quick Start

For immediate production verification, run these three scripts in order:

```bash
# 1. Test email/OTP verification (2-3 minutes)
npm run test:email-otp

# 2. Test password reset flow (2-3 minutes)
npm run test:password-reset --email test@example.com

# 3. Start ongoing monitoring (runs continuously)
npm run launch:monitor
```

---

## Available Scripts

### 1. Production Email/OTP Verification Test

**Purpose**: Quickly verify that email delivery and OTP authentication are working in production.

**Script**: `scripts/production-email-otp-test.mjs`

**Usage**:
```bash
# Basic usage (uses environment variables)
node scripts/production-email-otp-test.mjs

# With custom test email
node scripts/production-email-otp-test.mjs --email test@example.com

# For staging environment
node scripts/production-email-otp-test.mjs --env staging
```

**What it tests**:
- ✅ Supabase connection health
- ✅ Email signup (triggers confirmation email)
- ✅ OTP sign-in request (triggers OTP email)
- ✅ Password reset request (triggers reset email)
- ✅ Email configuration validation
- ⚠️  Deliverability checks (manual verification required)

**Expected Duration**: 2-3 minutes

**Prerequisites**:
- Production environment deployed
- Environment variables set (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- Valid test email address with access to inbox

**Success Criteria**:
- All automated tests pass (5/5)
- Emails received within 30 seconds
- Email headers show SPF/DKIM/DMARC: PASS
- No JavaScript errors in console

---

### 2. Password Reset Test

**Purpose**: Comprehensively test the password reset flow including email delivery, link validation, and security.

**Script**: `scripts/password-reset-test.mjs`

**Usage**:
```bash
# Test password reset for specific email
node scripts/password-reset-test.mjs --email test@example.com

# For staging environment
node scripts/password-reset-test.mjs --email test@example.com --env staging
```

**What it tests**:
- ✅ User existence verification
- ✅ Password reset email request
- ⚠️  Email authentication (SPF/DKIM/DMARC)
- ⚠️  Reset link validation
- ⚠️  Security checks (link expiration, one-time use)
- ⚠️  Error scenarios (weak password, rate limiting)

**Expected Duration**: 2-3 minutes (automated) + 5 minutes (manual verification)

**Prerequisites**:
- User account exists with the specified email
- Access to email inbox for verification
- Production environment deployed

**Success Criteria**:
- User exists check passes
- Password reset email sent successfully
- Email received within 30 seconds
- Reset link works correctly
- Old password no longer works after reset

---

### 3. Launch Window Monitoring

**Purpose**: Continuously monitor system health during the production launch window.

**Script**: `scripts/launch-monitoring.mjs`

**Usage**:
```bash
# Monitor for 1 hour (default)
node scripts/launch-monitoring.mjs

# Monitor for 2 hours
node scripts/launch-monitoring.mjs --duration=7200

# Custom check interval (every 30 seconds)
node scripts/launch-monitoring.mjs --interval=30

# Continuous monitoring until stopped
node scripts/launch-monitoring.mjs --continuous
```

**What it monitors**:
- 📊 Auth system health
- 📊 Database connectivity
- 📊 Response time metrics
- 📊 Error rate tracking
- 📊 Webhook processing status
- 🚨 Automatic alerts for issues

**Expected Duration**: 1 hour default, configurable

**Success Criteria**:
- 100% uptime during monitoring window
- Average response time < 500ms
- Error rate < 5 per check interval
- No critical alerts triggered

**How to Stop**:
Press `Ctrl+C` to gracefully stop monitoring and view final report.

---

## NPM Scripts

Add these to your `package.json` for convenience:

```json
{
  "scripts": {
    "test:email-otp": "node scripts/production-email-otp-test.mjs",
    "test:password-reset": "node scripts/password-reset-test.mjs",
    "launch:monitor": "node scripts/launch-monitoring.mjs",
    "launch:monitor:continuous": "node scripts/launch-monitoring.mjs --continuous"
  }
}
```

Then run with:
```bash
npm run test:email-otp
npm run test:password-reset -- --email test@example.com
npm run launch:monitor
```

---

## Environment Variables

All scripts require these environment variables:

```bash
# Supabase Configuration (Required)
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"

# Optional: Override test email
TEST_EMAIL="your-test@example.com"
```

**Where to find these values**:
1. Log in to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy "Project URL" and "anon/public key"

---

## Quick Production Verification Checklist

Use this checklist during production launch:

### Pre-Launch (5 minutes before)
- [ ] Run `npm run test:email-otp` - All tests pass
- [ ] Check test email inbox - All emails received
- [ ] Verify email headers - SPF/DKIM/DMARC pass
- [ ] Run `npm run test:password-reset` - All tests pass
- [ ] Test password reset link - Works correctly

### Launch Window (First hour)
- [ ] Start monitoring: `npm run launch:monitor`
- [ ] Monitor console for alerts
- [ ] Check success rate: Should be 100%
- [ ] Verify response times: Should be < 500ms
- [ ] Monitor error logs: Should be minimal

### Post-Launch (First 24 hours)
- [ ] Continue monitoring at regular intervals
- [ ] Check Supabase logs for errors
- [ ] Review webhook_logs table for payment issues
- [ ] Monitor user feedback and support tickets
- [ ] Run verification tests every 4 hours

---

## Manual Verification Steps

### Email Delivery Verification

After running email tests, check these manually:

1. **Check Email Inbox**:
   - Email from: Wathaci <support@wathaci.com>
   - Subject line professional and clear
   - Wathaci branding present (logo, colors)
   - Delivery time < 30 seconds

2. **Email Headers**:
   - Open email → Show Original/View Source
   - Look for "Authentication-Results" header
   - Verify: `spf=pass`
   - Verify: `dkim=pass`
   - Verify: `dmarc=pass`

3. **Email Content**:
   - Logo displays correctly
   - Call-to-action button visible and styled
   - All links work correctly
   - Footer includes support@wathaci.com
   - Mobile responsive (check on phone)

4. **Spam Filter Check**:
   - Email in Inbox (not Spam/Promotions)
   - No security warnings
   - No "unverified sender" badges

### Password Reset Verification

1. **Reset Email**:
   - Received within 30 seconds
   - Contains secure reset link
   - Clear instructions provided
   - Security warning about unauthorized requests

2. **Reset Link**:
   - Click link redirects to reset page
   - Page loads without errors
   - Form accepts new password
   - Success message shown after reset

3. **Password Verification**:
   - Sign in with NEW password: ✅ Works
   - Sign in with OLD password: ❌ Fails
   - Reset link can't be reused: ❌ Shows error

### OTP Verification

1. **OTP Email**:
   - Received within 10 seconds
   - Contains 6-digit code
   - Expiration time shown (5 minutes)
   - Code is clearly visible

2. **OTP Functionality**:
   - Enter OTP in sign-in form
   - Successful authentication
   - Session established correctly
   - Redirect to dashboard/home

---

## Deliverability Testing Tools

Use these external tools to verify email deliverability:

### 1. Mail-Tester
**URL**: https://www.mail-tester.com/

**How to use**:
1. Go to Mail-Tester website
2. Note the test email address shown
3. Trigger signup with that email in your app
4. Click "Then check your score" on Mail-Tester
5. **Target Score**: 8/10 or higher

**What it checks**:
- SPF, DKIM, DMARC authentication
- Blacklist status
- HTML/CSS quality
- Content spam score
- Email formatting

### 2. DKIM Validator
**URL**: https://dkimvalidator.com/

**How to use**:
1. Go to DKIM Validator
2. Note the test email address
3. Send test email to that address
4. Check results automatically displayed

**Expected results**:
- ✅ DKIM Signature Verified Successfully
- Domain: wathaci.com
- Selector: default
- Algorithm: rsa-sha256

### 3. MXToolbox Blacklist Check
**URL**: https://mxtoolbox.com/blacklists.aspx

**How to use**:
1. Send test email to yourself
2. View email headers to find sending IP
3. Enter IP in MXToolbox Blacklist Check
4. Click "Check Blacklist"

**Expected results**:
- ✅ No issues found
- All blacklist checks: Green
- Clean reputation

---

## Monitoring Alerts

The monitoring script will automatically alert you to these conditions:

| Alert Type | Severity | Condition | Action Required |
|------------|----------|-----------|-----------------|
| Connection Failed | CRITICAL | Supabase unavailable | Check Supabase status, contact support |
| High Response Time | MEDIUM | Response > 1000ms | Check server load, scale if needed |
| High Error Rate | MEDIUM | > 5 errors per interval | Review error logs, investigate causes |
| Webhook Failures | MEDIUM | > 20% webhooks fail | Check webhook configuration, verify secrets |
| Database Error | HIGH | Database query fails | Check RLS policies, connection status |

---

## Troubleshooting

### Email Not Received

**Possible causes**:
1. Wrong email address
2. Email in spam folder
3. DNS records not propagated
4. SMTP configuration issue
5. Rate limiting

**Solutions**:
1. Verify email address is correct
2. Check spam/junk folder
3. Wait 24-48 hours for DNS propagation
4. Check Supabase SMTP settings
5. Wait 15 minutes between tests

### OTP Not Working

**Possible causes**:
1. OTP expired (5 minute limit)
2. Wrong OTP code entered
3. Email delivery delayed
4. Rate limiting active

**Solutions**:
1. Request new OTP
2. Copy/paste OTP carefully
3. Check email timestamps
4. Wait before requesting new OTP

### Password Reset Link Fails

**Possible causes**:
1. Link expired (1 hour limit)
2. Link already used
3. Session issue
4. Redirect URL misconfigured

**Solutions**:
1. Request new password reset
2. Use link within 1 hour
3. Clear browser cache/cookies
4. Check VITE_APP_BASE_URL setting

### Monitoring Shows High Error Rate

**Possible causes**:
1. Code bug in recent deployment
2. Database issue
3. External API failure
4. High traffic load

**Solutions**:
1. Check recent code changes
2. Review Supabase logs
3. Test external integrations
4. Scale infrastructure if needed

---

## Expected Performance Metrics

### Email Delivery
- **Target**: < 30 seconds
- **Good**: < 10 seconds
- **Acceptable**: < 60 seconds
- **Issue**: > 60 seconds

### OTP Delivery
- **Target**: < 10 seconds
- **Good**: < 5 seconds
- **Acceptable**: < 30 seconds
- **Issue**: > 30 seconds

### Response Time
- **Excellent**: < 200ms
- **Good**: < 500ms
- **Acceptable**: < 1000ms
- **Issue**: > 1000ms

### Success Rate
- **Excellent**: 100%
- **Good**: > 99%
- **Acceptable**: > 95%
- **Issue**: < 95%

### Error Rate
- **Excellent**: 0 errors
- **Good**: < 1 per hour
- **Acceptable**: < 5 per hour
- **Issue**: > 5 per hour

---

## Launch Day Schedule

### T-1 Hour: Pre-Launch Testing
```bash
# Run all verification tests
npm run test:email-otp
npm run test:password-reset -- --email test@example.com

# Verify all tests pass
# Check email delivery manually
# Review Supabase dashboard
```

### T-0: Launch
```bash
# Start continuous monitoring
npm run launch:monitor:continuous

# Keep terminal open and visible
# Monitor for any alerts
```

### T+1 Hour: First Check
```bash
# Review monitoring statistics
# Check error logs in Supabase
# Verify no critical alerts
# Run quick verification test
npm run test:email-otp
```

### T+4 Hours: Second Check
```bash
# Run full test suite again
npm run test:email-otp
npm run test:password-reset -- --email test@example.com

# Review user feedback
# Check support tickets
```

### T+24 Hours: Daily Check
```bash
# Run tests daily for first week
# Monitor key metrics
# Address any issues promptly
```

---

## Support and Resources

### Documentation
- `EMAIL_TESTING_GUIDE.md` - Comprehensive email testing procedures
- `PRODUCTION_LAUNCH_READINESS_SUMMARY.md` - Launch readiness checklist
- `COMPREHENSIVE_AUTH_TESTING_GUIDE.md` - Auth flow testing guide
- `PRE_LAUNCH_MANUAL_SMOKE_TESTS.md` - Manual testing procedures

### Tools
- Supabase Dashboard: https://app.supabase.com
- Mail-Tester: https://www.mail-tester.com/
- DKIM Validator: https://dkimvalidator.com/
- MXToolbox: https://mxtoolbox.com/

### Contact
- **Email**: support@wathaci.com
- **Supabase Support**: https://supabase.com/support
- **Documentation**: Project README.md

---

## Success Criteria Summary

Your production launch is ready when:

- ✅ All automated tests pass (100%)
- ✅ Email delivery < 30 seconds
- ✅ SPF/DKIM/DMARC all pass
- ✅ Mail-Tester score ≥ 8/10
- ✅ Response time < 500ms
- ✅ No critical alerts during monitoring
- ✅ Success rate > 99%
- ✅ Password reset flow works end-to-end
- ✅ OTP verification works correctly
- ✅ No emails in spam folder

---

## Version History

- **v1.0** (2025-11-23): Initial release
  - Production email/OTP test script
  - Password reset test script
  - Launch monitoring script
  - Comprehensive documentation

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-23  
**Maintained By**: Wathaci Development Team  
**Contact**: support@wathaci.com
