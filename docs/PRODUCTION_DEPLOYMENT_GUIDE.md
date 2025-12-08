# Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying WATHACI CONNECT to production. Follow these steps carefully and ensure all checklist items are completed before going live.

**IMPORTANT**: This deployment must be preceded by completing all items in the [Production Launch Checklist](./release/LAUNCH_CHECKLIST.md).

---

## Pre-Deployment Requirements

### 1. Review Launch Checklist

Before proceeding, ensure the following are complete:

- [ ] All management approvals obtained (Product Owner, Executive Sponsor)
- [ ] Production configuration validated and approved
- [ ] All pre-launch tests passed (auth, payments, cross-browser)
- [ ] Security scan completed with no critical issues
- [ ] Monitoring infrastructure in place

**Document**: [docs/release/LAUNCH_CHECKLIST.md](./release/LAUNCH_CHECKLIST.md)

### 2. Verify Environment Configuration

Run the environment validation:

```bash
npm run env:check
```

Expected output:
- ✅ No blocking errors
- ⚠️  Warnings are acceptable (review each one)

If blocking errors are present, resolve them before continuing.

---

## Configuration Updates

### Step 1: Update Production API URL

**CRITICAL**: The production build MUST point to the live backend API, not localhost.

1. Open `.env.production`
2. Update `VITE_API_BASE_URL`:

```env
# Before (DO NOT DEPLOY WITH THIS):
VITE_API_BASE_URL="http://localhost:3000"

# After (use your actual production API URL):
VITE_API_BASE_URL="https://api.wathaci.com"
```

3. Record this change in the Launch Checklist configuration log
4. Get approval from technical lead before proceeding

### Step 2: Verify All Environment Variables

Ensure all production environment variables are set correctly:

#### Supabase Configuration
```env
VITE_SUPABASE_URL="https://nrjcbdrzaxqvomeogptf.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJ..." # Your actual anon key
```

#### Lenco Payment Gateway (PRODUCTION KEYS REQUIRED)
```env
VITE_LENCO_API_URL="https://api.lenco.co/access/v2"
VITE_LENCO_PUBLIC_KEY="pub-..." # MUST be live key, not test
LENCO_SECRET_KEY="..." # Stored securely, not in repository
VITE_LENCO_WEBHOOK_URL="https://[project].supabase.co/functions/v1/lenco-payments-validator"
```

#### Application Environment
```env
VITE_APP_ENV="production"
VITE_APP_NAME="WATHACI CONNECT"
```

#### Payment Configuration
```env
VITE_PAYMENT_CURRENCY="ZMW"
VITE_PAYMENT_COUNTRY="ZM"
VITE_MIN_PAYMENT_AMOUNT="0"
VITE_MAX_PAYMENT_AMOUNT="50000"
VITE_PLATFORM_FEE_PERCENTAGE="10"
```

### Step 3: Validate Configuration

Run validation to ensure no issues:

```typescript
// The app will automatically validate on startup
// Or run manually:
import { validateAppConfig, getConfigSummary } from './src/config/getAppConfig';

console.log(getConfigSummary());
validateAppConfig(); // Throws if blocking errors exist
```

---

## Database Preparation

### Step 1: Verify Database Schema

Ensure all migrations are applied:

```bash
npm run supabase:provision
```

### Step 2: Verify Profile Creation Trigger

Test that profiles are created automatically:

```sql
-- Check trigger exists
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Expected: 1 row returned
```

If trigger is missing, see [Profile Creation Troubleshooting Guide](./PROFILE_CREATION_TROUBLESHOOTING.md).

### Step 3: Verify RLS Policies

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- Expected: rowsecurity = true
```

---

## Build and Deploy

### Step 1: Create Production Build

```bash
# Clean previous build
rm -rf dist

# Create production build
npm run build

# Verify build succeeded
ls -lh dist/
```

Expected output:
- Build completes without errors
- `dist/` directory contains built assets
- Total size < 5 MB (compressed)

### Step 2: Test Production Build Locally

```bash
npm run preview
```

Navigate to http://localhost:4173 and verify:
- [ ] Application loads without errors
- [ ] No console errors
- [ ] Sign-up flow works
- [ ] Sign-in flow works
- [ ] API requests go to production URL (check Network tab)
- [ ] Payment initialization works

**CRITICAL**: If API requests are still going to localhost, the build is incorrect. Do not deploy.

### Step 3: Deploy to Hosting Platform

#### For Vercel:

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy to production
vercel --prod
```

#### For Netlify:

```bash
# Install Netlify CLI if not already installed
npm i -g netlify-cli

# Deploy to production
netlify deploy --prod --dir=dist
```

#### For Custom Server:

```bash
# Upload dist/ directory to your web server
# Configure web server to serve dist/index.html for all routes
# Example nginx config:

location / {
  root /var/www/wathaci-connect/dist;
  try_files $uri $uri/ /index.html;
}
```

### Step 4: Update DNS (if needed)

If deploying to a new domain:
1. Update DNS records to point to hosting platform
2. Wait for DNS propagation (can take up to 48 hours)
3. Verify DNS with: `nslookup wathaci.com`

### Step 5: Configure SSL/HTTPS

Ensure HTTPS is enabled:
- Vercel: Automatic
- Netlify: Automatic
- Custom: Configure Let's Encrypt or commercial SSL certificate

---

## Post-Deployment Verification

### Step 1: Smoke Test Production

Test all critical flows in production:

**Authentication**:
- [ ] Sign up with new user
- [ ] Verify email confirmation works
- [ ] Sign in with email/password
- [ ] OTP verification works
- [ ] Profile is created automatically
- [ ] Session persists across page reloads

**Payments**:
- [ ] Card payment flow initiates
- [ ] Mobile money payment works
- [ ] Webhooks are received
- [ ] Transactions are logged

**General**:
- [ ] All pages load without errors
- [ ] Images and assets load correctly
- [ ] No console errors
- [ ] API calls go to production backend

### Step 2: Monitor Initial Traffic

First 1 hour after deployment:
- Monitor error logs
- Check sign-up success rate
- Verify payments are processing
- Watch webhook logs

First 24 hours (Day-0):
- Review error rates
- Check for any user-reported issues
- Monitor payment success rates
- Verify database performance

### Step 3: Enable Monitoring

Ensure monitoring is active:
- [ ] Error tracking (Sentry, LogRocket, or similar)
- [ ] Performance monitoring (Lighthouse CI, Web Vitals)
- [ ] Uptime monitoring (Pingdom, UptimeRobot)
- [ ] Database monitoring (Supabase Dashboard)

---

## Rollback Procedure

If critical issues are discovered post-deployment:

### Immediate Rollback

1. **Revert to previous deployment**:
   - Vercel: Use deployment history to rollback
   - Netlify: Use deployment history to rollback
   - Custom: Redeploy previous version from git tag

2. **Notify stakeholders**:
   - Email: stakeholders@wathaci.com
   - Slack: #wathaci-deployments
   - Status page: Update if public-facing

3. **Document issues**:
   - Create incident report
   - Note what went wrong
   - Document steps taken

### Gradual Rollback (if issue is partial)

1. **Route traffic away from problematic features**:
   - Use feature flags to disable broken features
   - Route users to maintenance page for affected flows

2. **Fix and redeploy**:
   - Fix issue in development
   - Test thoroughly
   - Redeploy following this guide

---

## Post-Launch Tasks

### Day 1 (First 24 Hours)

- [ ] Monitor error logs continuously
- [ ] Check user sign-up success rate
- [ ] Verify payment processing
- [ ] Review webhook logs
- [ ] Address any critical issues immediately

### Day 7 (First Week Review)

- [ ] Analyze first week metrics
- [ ] Review user feedback
- [ ] Identify any bugs or issues
- [ ] Plan fixes for non-critical issues
- [ ] Update Launch Checklist with results

### Day 30 (First Month Review)

- [ ] Comprehensive performance review
- [ ] User growth and retention analysis
- [ ] Payment volume and success rates
- [ ] Infrastructure scaling needs
- [ ] Feature usage analytics
- [ ] Update Launch Checklist with final results

---

## Configuration Reference

### Environment Variable Priority

The application checks environment variables in this order:

1. `import.meta.env.VITE_*` (Vite build-time variables)
2. `process.env.*` (Node.js runtime, for tests)
3. `globalThis.__APP_CONFIG__` (Runtime injection)

### API Configuration

The `src/config/api.ts` module provides centralized API configuration:

```typescript
import { API_BASE_URL, getApiEndpoint } from '@/config/api';

// Use for API calls
const endpoint = getApiEndpoint('/users');
// Production: https://api.wathaci.com/users
// Development: http://localhost:3000/users
```

### Environment Validation

The `src/config/getAppConfig.ts` module validates all configuration:

```typescript
import { 
  getAppEnvStatus, 
  validateAppConfig, 
  getConfigSummary 
} from '@/config/getAppConfig';

// Check status
const status = getAppEnvStatus();
console.log('Blocking errors:', status.blockingErrors);
console.log('Warnings:', status.warnings);

// Validate and throw if errors
validateAppConfig(); // Throws if blocking errors

// Get summary
console.log(getConfigSummary());
```

---

## Troubleshooting

### Issue: Build fails with "VITE_API_BASE_URL is required"

**Solution**: Set `VITE_API_BASE_URL` in `.env.production` to your production API URL.

### Issue: API calls go to localhost in production

**Cause**: `.env.production` not used during build, or still contains localhost.

**Solution**:
1. Verify `.env.production` contains production API URL
2. Clean build: `rm -rf dist && npm run build`
3. Check built files: `grep -r "localhost:3000" dist/`

### Issue: Users can't sign up

**Cause**: Profile creation failing.

**Solution**: See [Profile Creation Troubleshooting Guide](./PROFILE_CREATION_TROUBLESHOOTING.md)

### Issue: Payments not working

**Cause**: Using test keys in production, or webhook URL incorrect.

**Solution**:
1. Verify `VITE_LENCO_PUBLIC_KEY` is a live key (starts with `pub-` or `pk_live_`)
2. Verify webhook URL points to production Supabase function
3. Check Lenco dashboard for webhook registration

---

## Emergency Contacts

**Technical Lead**: [Name] - [Email] - [Phone]  
**DevOps Lead**: [Name] - [Email] - [Phone]  
**Product Owner**: [Name] - [Email] - [Phone]  
**Executive Sponsor**: [Name] - [Email] - [Phone]

**On-Call Rotation**: [Link to schedule]  
**Incident Management**: [Link to runbook]

---

## Additional Resources

- [Production Launch Checklist](./release/LAUNCH_CHECKLIST.md)
- [Pre-Launch Manual Smoke Tests](../PRE_LAUNCH_MANUAL_SMOKE_TESTS.md)
- [Profile Creation Troubleshooting](./PROFILE_CREATION_TROUBLESHOOTING.md)
- [Environment Setup Guide](../ENVIRONMENT_SETUP_GUIDE.md)
- [Payment Integration Guide](./PAYMENT_INTEGRATION_GUIDE.md)
- [Webhook Setup Guide](./WEBHOOK_SETUP_GUIDE.md)

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-11  
**Owner**: WATHACI CONNECT Launch Team  
**Review Cycle**: Update after each deployment
