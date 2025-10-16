# Production Payment Configuration Guide

## Overview

This guide provides step-by-step instructions for transitioning from development/test payment configuration to production-ready payment processing with Lenco Payment Gateway.

## Prerequisites

Before starting production setup:

- [ ] Lenco account verified and approved for production
- [ ] Business KYC documentation submitted and approved
- [ ] SSL certificate installed on production domain
- [ ] Supabase project configured with production credentials
- [ ] Backend edge functions deployed to Supabase

## Step 1: Obtain Production Lenco API Keys

### 1.1 Access Lenco Dashboard

1. Log in to your Lenco account at [https://dashboard.lenco.co](https://dashboard.lenco.co)
2. Navigate to **Settings → API Keys**
3. Switch to **Production** mode (toggle in top right)

### 1.2 Generate Production Keys

1. Click **"Generate New Key"**
2. Select **"Production Environment"**
3. Set permissions:
   - ✓ Payment initialization
   - ✓ Payment verification
   - ✓ Webhook notifications
4. Click **"Generate"**

You will receive two keys:
- **Public Key** (starts with `pk_live_`) - Used in frontend
- **Secret Key** (starts with `sk_live_`) - Used in backend (NEVER expose to frontend)

### 1.3 Store Keys Securely

**⚠️ CRITICAL SECURITY REQUIREMENTS:**

1. **NEVER commit production keys to version control**
2. **NEVER expose secret keys in frontend code**
3. **NEVER share keys via email or messaging**
4. Store keys in:
   - Production environment variables
   - Secure secret management systems (e.g., AWS Secrets Manager, HashiCorp Vault)
   - Supabase Edge Function secrets

## Step 2: Update Environment Configuration

### 2.1 Update Local Environment (for testing production mode)

Create a `.env.production` file (DO NOT commit this):

```bash
# Supabase Production Configuration
VITE_SUPABASE_URL="https://your-production-project.supabase.co"
VITE_SUPABASE_KEY="your-production-anon-key"

# Lenco Payment Gateway - PRODUCTION KEYS
VITE_LENCO_PUBLIC_KEY="pk_live_YOUR_PRODUCTION_PUBLIC_KEY"
LENCO_SECRET_KEY="sk_live_YOUR_PRODUCTION_SECRET_KEY"
LENCO_WEBHOOK_SECRET="your-production-webhook-secret"
VITE_LENCO_API_URL="https://api.lenco.co/access/v2"

# Payment Configuration - Production Limits
VITE_PAYMENT_CURRENCY="ZMW"
VITE_PAYMENT_COUNTRY="ZM"
VITE_PLATFORM_FEE_PERCENTAGE="5"
VITE_MIN_PAYMENT_AMOUNT="10"
VITE_MAX_PAYMENT_AMOUNT="5000000"

# Environment
VITE_APP_ENV="production"
VITE_APP_NAME="WATHACI CONNECT"
```

### 2.2 Update Deployment Platform Environment Variables

For **Vercel** (recommended):

```bash
# Install Vercel CLI
npm i -g vercel

# Set production environment variables
vercel env add VITE_LENCO_PUBLIC_KEY production
# Enter: pk_live_YOUR_PRODUCTION_PUBLIC_KEY

vercel env add LENCO_SECRET_KEY production
# Enter: sk_live_YOUR_PRODUCTION_SECRET_KEY

vercel env add LENCO_WEBHOOK_SECRET production
# Enter: your-production-webhook-secret

vercel env add VITE_APP_ENV production
# Enter: production

# Repeat for other required variables...
```

For **other platforms**, consult their documentation for setting environment variables.

## Step 3: Configure Supabase Edge Functions

### 3.1 Set Supabase Function Secrets

Production secrets must be set in Supabase for edge functions to work:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your production project
supabase link --project-ref your-production-project-ref

# Set production secrets
supabase secrets set \
  LENCO_SECRET_KEY="sk_live_YOUR_PRODUCTION_SECRET_KEY" \
  LENCO_WEBHOOK_SECRET="your-production-webhook-secret" \
  SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# Verify secrets are set (values will be masked)
supabase secrets list
```

### 3.2 Deploy Edge Functions

Deploy the payment-related edge functions:

```bash
# Navigate to your project directory
cd /path/to/WATHACI-CONNECT.-V1

# Deploy lenco-payment function
supabase functions deploy lenco-payment

# Deploy payment-webhook function
supabase functions deploy payment-webhook

# Verify deployment
supabase functions list
```

**Expected Output:**
```
┌──────────────────┬─────────────────────────────────────────────────────┐
│ Function Name    │ URL                                                 │
├──────────────────┼─────────────────────────────────────────────────────┤
│ lenco-payment    │ https://xxx.functions.supabase.co/lenco-payment    │
│ payment-webhook  │ https://xxx.functions.supabase.co/payment-webhook  │
└──────────────────┴─────────────────────────────────────────────────────┘
```

## Step 4: Configure Webhook Integration

### 4.1 Set Up Webhook Endpoint in Lenco Dashboard

1. Go to [Lenco Dashboard](https://dashboard.lenco.co)
2. Navigate to **Settings → Webhooks**
3. Click **"Add Webhook"**
4. Enter webhook URL:
   ```
   https://your-project-ref.functions.supabase.co/payment-webhook
   ```
5. Select events to receive:
   - ✓ payment.success
   - ✓ payment.failed
   - ✓ payment.pending
   - ✓ payment.cancelled
6. Enter webhook secret (same as `LENCO_WEBHOOK_SECRET`)
7. Click **"Save"**

### 4.2 Test Webhook Delivery

1. In Lenco Dashboard, click **"Test Webhook"**
2. Check Supabase function logs:
   ```bash
   supabase functions logs payment-webhook --tail
   ```
3. Verify webhook is received and processed successfully

## Step 5: Verify Lenco Integration

### 5.1 Test Payment Flow

Create a test script to verify production payment flow:

```typescript
// test-production-payment.ts
import { lencoPaymentService } from '@/lib/services/lenco-payment-service';

async function testProductionPayment() {
  console.log('Testing production payment configuration...');

  // Check service configuration
  const isConfigured = lencoPaymentService.isConfigured();
  console.log('✓ Payment service configured:', isConfigured);

  if (!isConfigured) {
    throw new Error('Payment service not properly configured');
  }

  // Get configuration
  const config = lencoPaymentService.getConfig();
  console.log('✓ Environment:', config.environment);
  console.log('✓ Currency:', config.currency);
  console.log('✓ Public Key:', config.publicKey.substring(0, 15) + '...');

  // Verify production keys
  if (!config.publicKey.startsWith('pk_live_')) {
    throw new Error('Production public key not configured (should start with pk_live_)');
  }

  console.log('✓ Production keys verified');
  console.log('\n✅ Production payment configuration is valid');
}

testProductionPayment().catch(console.error);
```

### 5.2 Perform Test Transaction

1. Use a small amount (e.g., ZMW 10) for initial testing
2. Test both mobile money and card payments
3. Verify webhook notifications are received
4. Check payment status in Supabase `payments` table
5. Confirm subscription activation (if applicable)

### 5.3 Verification Checklist

- [ ] Production API keys configured and verified
- [ ] Edge functions deployed and accessible
- [ ] Webhook endpoint receiving notifications
- [ ] Test mobile money payment completes successfully
- [ ] Test card payment completes successfully
- [ ] Payment records created in database
- [ ] Subscription activated after successful payment
- [ ] Error handling works correctly
- [ ] Payment retry mechanism functions properly
- [ ] Transaction logs are being recorded

## Step 6: Security Hardening

### 6.1 Enable Rate Limiting

Update backend to enforce rate limits on payment endpoints:

```javascript
// backend/index.js
const rateLimit = require('express-rate-limit');

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 payment requests per windowMs
  message: 'Too many payment requests, please try again later'
});

app.use('/api/payments', paymentLimiter);
```

### 6.2 Implement Payment Amount Validation

Add server-side validation for payment amounts:

```typescript
// Validate payment amount
const MIN_AMOUNT = 10; // ZMW
const MAX_AMOUNT = 5000000; // ZMW

if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
  throw new Error(`Payment amount must be between ZMW ${MIN_AMOUNT} and ZMW ${MAX_AMOUNT}`);
}
```

### 6.3 Enable Monitoring and Alerts

Set up monitoring for:
- Failed payment attempts (alert if > 5% failure rate)
- Webhook delivery failures
- Unusual payment patterns
- API key usage

## Step 7: Database Configuration

### 7.1 Verify Supabase Service Role Key

Production backend requires `SUPABASE_SERVICE_ROLE_KEY` for database operations:

```bash
# In backend .env or deployment platform
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
```

**To obtain Service Role Key:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your production project
3. Navigate to **Settings → API**
4. Copy the **service_role** key (secret)

### 7.2 Update Backend Supabase Client Configuration

Ensure backend uses service role key:

```javascript
// backend/lib/supabaseClient.js
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_SERVICE_KEY || 
  process.env.SUPABASE_KEY || '';

// Warn if service key is missing in production
if (!SUPABASE_SERVICE_ROLE_KEY && process.env.NODE_ENV === 'production') {
  console.error('⚠️  CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not configured!');
  console.error('    Backend will use in-memory storage which will lose data.');
  console.error('    Please configure SUPABASE_SERVICE_ROLE_KEY for production.');
}
```

### 7.3 Test Database Connectivity

```bash
# Run backend with production credentials
cd backend
NODE_ENV=production npm start

# Test registration endpoint
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "accountType": "professional"
  }'
```

Verify the registration is stored in Supabase, not in-memory.

## Step 8: Final Production Checklist

Before going live, verify:

### Environment Configuration
- [ ] Production Lenco public key starts with `pk_live_`
- [ ] Lenco secret key starts with `sk_live_`
- [ ] `VITE_APP_ENV` is set to `production`
- [ ] All environment variables are properly configured
- [ ] `.env` files are in `.gitignore`

### Security
- [ ] Secret keys are never exposed in frontend
- [ ] HTTPS/SSL is enabled on all domains
- [ ] Rate limiting is configured
- [ ] Input validation is implemented
- [ ] Webhook signature verification is active
- [ ] Database RLS policies are enabled

### Functionality
- [ ] Payment initialization works
- [ ] Mobile money payments complete successfully
- [ ] Card payments complete successfully
- [ ] Webhooks are received and processed
- [ ] Payment status updates correctly in database
- [ ] Email notifications are sent (if configured)
- [ ] Failed payments are handled gracefully
- [ ] Retry logic works for transient failures

### Monitoring
- [ ] Error logging is configured
- [ ] Payment analytics are being tracked
- [ ] Webhook logs are being recorded
- [ ] Alert system is set up for critical failures

### Documentation
- [ ] Internal team trained on production payment flow
- [ ] Customer support trained on payment issues
- [ ] Runbook created for common payment problems
- [ ] Emergency contact information documented

## Step 9: Go Live

Once all checklist items are complete:

1. **Schedule maintenance window** (if needed for database migrations)
2. **Deploy production build** with updated environment variables
3. **Verify deployment** using smoke tests
4. **Monitor closely** for first 24-48 hours
5. **Be prepared to rollback** if critical issues arise

## Step 10: Post-Launch Monitoring

### Day 1-7: Intensive Monitoring
- Check payment success rate every hour
- Monitor webhook delivery every hour
- Review error logs multiple times per day
- Respond to customer support tickets immediately

### Week 2-4: Regular Monitoring
- Check payment metrics daily
- Review weekly payment reports
- Optimize based on usage patterns
- Address any recurring issues

### Month 2+: Maintenance Mode
- Weekly payment metric reviews
- Monthly optimization reviews
- Quarterly security audits
- Annual API key rotation

## Troubleshooting

### Issue: "API_KEY_INVALID" Error

**Cause:** Wrong API key or test key used in production

**Solution:**
1. Verify you're using `pk_live_` and `sk_live_` keys
2. Check environment variables are set correctly
3. Redeploy application with correct keys

### Issue: Webhook Not Received

**Cause:** Incorrect webhook URL or signature verification failing

**Solution:**
1. Verify webhook URL in Lenco dashboard
2. Test webhook using Lenco dashboard "Test" button
3. Check Supabase function logs for errors
4. Verify `LENCO_WEBHOOK_SECRET` matches in both systems

### Issue: Payment Stuck in Pending

**Cause:** Webhook delivery failed or payment gateway issue

**Solution:**
1. Manually verify payment using reference number
2. Check webhook logs for delivery attempts
3. Retry webhook delivery from Lenco dashboard
4. Contact Lenco support if issue persists

### Issue: Database Not Persisting Registrations

**Cause:** Missing `SUPABASE_SERVICE_ROLE_KEY`

**Solution:**
1. Set `SUPABASE_SERVICE_ROLE_KEY` in backend environment
2. Restart backend service
3. Verify registrations are now stored in Supabase

## Support and Resources

- **Lenco Support:** support@lenco.co
- **Lenco Documentation:** https://docs.lenco.co
- **WATHACI Support:** support@wathaci.org
- **Supabase Support:** https://supabase.com/support

## Appendix: Environment Variable Reference

| Variable | Environment | Example | Required | Secret |
|----------|-------------|---------|----------|--------|
| `VITE_LENCO_PUBLIC_KEY` | Frontend | `pk_live_abc123...` | Yes | No |
| `LENCO_SECRET_KEY` | Backend | `sk_live_xyz789...` | Yes | Yes |
| `LENCO_WEBHOOK_SECRET` | Backend | `wh_secret_def456...` | Yes | Yes |
| `VITE_APP_ENV` | Frontend | `production` | Yes | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | `eyJ...` | Yes | Yes |
| `VITE_SUPABASE_URL` | Frontend | `https://xxx.supabase.co` | Yes | No |
| `VITE_SUPABASE_KEY` | Frontend | `eyJ...` (anon key) | Yes | No |

---

**Document Version:** 1.0.0  
**Last Updated:** October 2024  
**Maintained By:** WATHACI Development Team
