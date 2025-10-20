# Lenco API Keys Rotation Guide

## Quick Start

This guide provides step-by-step instructions for rotating Lenco API keys from test/development keys to live production keys.

⚠️ **IMPORTANT**: This process must be completed before going to production. Test keys will not work with real customer payments.

## Prerequisites

Before starting the rotation:

1. **Lenco Dashboard Access**
   - Log in to https://dashboard.lenco.co
   - Navigate to Settings → API Keys
   - Ensure you have access to LIVE (production) keys

2. **Supabase CLI Setup**
   ```bash
   # Install Supabase CLI if not already installed
   npm install -g supabase
   
   # Authenticate
   supabase login
   
   # Link to your project
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. **Project Setup**
   - Repository cloned locally
   - Node.js and npm installed
   - Dependencies installed (`npm install`)

## Option 1: Automated Rotation (Recommended)

Use the automated script to guide you through the process:

```bash
./scripts/rotate-lenco-keys.sh
```

The script will:
- ✅ Prompt you for live API keys from Lenco dashboard
- ✅ Validate key formats
- ✅ Update `.env` and `backend/.env` files
- ✅ Push secrets to Supabase Edge Functions
- ✅ Run validation checks
- ✅ Provide next steps

## Option 2: Manual Rotation

### Step 1: Retrieve Live Keys from Lenco Dashboard

1. Log in to Lenco Dashboard: https://dashboard.lenco.co
2. Navigate to **Settings** → **API Keys**
3. Copy the following LIVE keys (NOT test keys):

   - **Public/Publishable Key**: Format `pub-[64-char-hex]` or `pk_live_[string]`
   - **Secret Key**: Format `sec-[64-char-hex]`, `sk_live_[string]`, or `[64-char-hex]`
   - **Webhook Secret**: From **Settings** → **Webhooks**

⚠️ **Security Note**: 
- Never commit these keys to version control
- Never share secret keys publicly
- Store them securely (password manager, secure notes)

### Step 2: Update Frontend Environment File

Edit `.env` in the project root:

```bash
# Create from example if it doesn't exist
cp .env.example .env

# Edit .env and update these lines:
VITE_LENCO_PUBLIC_KEY="pub-YOUR-LIVE-PUBLIC-KEY"
LENCO_SECRET_KEY="YOUR-LIVE-SECRET-KEY"
LENCO_WEBHOOK_SECRET="YOUR-WEBHOOK-SECRET"

# Ensure environment is set to production
VITE_APP_ENV="production"
```

### Step 3: Update Backend Environment File

Edit `backend/.env`:

```bash
# Create from example if it doesn't exist
cp backend/.env.example backend/.env

# Edit backend/.env and update these lines:
LENCO_SECRET_KEY="YOUR-LIVE-SECRET-KEY"
LENCO_WEBHOOK_SECRET="YOUR-WEBHOOK-SECRET"
```

### Step 4: Push Secrets to Supabase Edge Functions

Edge Functions need access to these secrets:

```bash
# Set Lenco secrets
supabase secrets set LENCO_SECRET_KEY="YOUR-LIVE-SECRET-KEY"
supabase secrets set LENCO_WEBHOOK_SECRET="YOUR-WEBHOOK-SECRET"

# Verify secrets are set
supabase secrets list
```

Expected output:
```
SECRET_NAME                    VALUE_PREVIEW
LENCO_SECRET_KEY              sec-******
LENCO_WEBHOOK_SECRET          whsec_******
SUPABASE_URL                  https://******
SUPABASE_SERVICE_ROLE_KEY     eyJ******
```

### Step 5: Verify Configuration

Run the environment checker:

```bash
npm run env:check
```

Expected output:
```
🎉  All required environment variables are populated with non-placeholder values.
```

## Step 6: Configure Webhook URL in Lenco Dashboard

1. **Get your Supabase webhook URL**:
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/lenco-webhook
   ```
   Replace `YOUR_PROJECT_REF` with your actual Supabase project reference.

2. **Add webhook in Lenco Dashboard**:
   - Navigate to **Settings** → **Webhooks**
   - Click **Add Webhook Endpoint**
   - Enter your webhook URL
   - Select events to listen for:
     - ✅ `payment.success`
     - ✅ `payment.failed`
     - ✅ `payment.pending`
     - ✅ `payment.cancelled`
   - Save the configuration

3. **Verify webhook secret matches**:
   - The secret shown in Lenco dashboard should match what you set in Step 4

## Step 7: Test Webhook Integration

### Option A: Using Lenco Dashboard (Recommended)

1. In Lenco Dashboard, navigate to your webhook configuration
2. Click **Send Test Event** or **Test Webhook**
3. Select event type: `payment.success`
4. Send the test event
5. Check response status: Should return **200 OK**

### Option B: Using Test Script

```bash
node scripts/test-webhook-integration.js \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/lenco-webhook \
  YOUR_WEBHOOK_SECRET
```

### Option C: Manual cURL Test

```bash
# Get the current timestamp
TIMESTAMP=$(date -u +%s)

# Create test payload
PAYLOAD='{
  "event": "payment.success",
  "data": {
    "id": "test_txn_123",
    "reference": "TEST_REF_001",
    "amount": 1000,
    "currency": "ZMW",
    "status": "success"
  },
  "created_at": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
}'

# Generate signature (requires openssl)
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "YOUR_WEBHOOK_SECRET" -binary | base64)

# Send request
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-lenco-signature: $SIGNATURE" \
  -H "x-lenco-timestamp: $TIMESTAMP" \
  -d "$PAYLOAD" \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/lenco-webhook
```

## Step 8: Verify Webhook Logs

After testing, verify the webhook was processed:

```sql
-- Query webhook_logs in Supabase SQL Editor
SELECT 
  id,
  event_type,
  reference,
  status,
  error_message,
  processed_at,
  payload
FROM webhook_logs
ORDER BY processed_at DESC
LIMIT 10;
```

Expected results:
- ✅ Status: `processed` (not `failed`)
- ✅ Error message: `NULL`
- ✅ Event type matches your test (e.g., `payment.success`)
- ✅ Payload contains webhook data

## Step 9: Deploy to Production Environment

If using Vercel, Netlify, or other hosting:

1. **Add environment variables in hosting dashboard**:
   - `VITE_LENCO_PUBLIC_KEY`
   - `LENCO_SECRET_KEY`
   - `LENCO_WEBHOOK_SECRET`
   - `VITE_APP_ENV="production"`

2. **Redeploy the application**

3. **Test again** with production URL

## Troubleshooting

### Keys Not Validated

**Symptom**: `npm run env:check` shows placeholder or test keys

**Solution**:
1. Ensure you copied LIVE keys (not test keys)
2. Check format: Live public keys start with `pub-` or `pk_live_`
3. Check format: Live secret keys start with `sec-`, `sk_live_`, or are 64-char hex
4. Remove any extra whitespace or quotes from keys

### Webhook Signature Verification Fails

**Symptom**: Webhook returns 401 Unauthorized with "Invalid webhook signature"

**Solution**:
1. Verify webhook secret in Supabase matches Lenco dashboard exactly
2. Check for extra whitespace or quotes in the secret
3. Re-set the secret: `supabase secrets set LENCO_WEBHOOK_SECRET="<secret>"`
4. Test again after a few moments for secret to propagate

### Webhook Not Received

**Symptom**: Test webhook from Lenco dashboard times out or fails

**Solution**:
1. Verify webhook URL is correct: `https://PROJECT_REF.supabase.co/functions/v1/lenco-webhook`
2. Check Edge Function is deployed: `supabase functions list`
3. Check Edge Function logs: `supabase functions logs lenco-webhook`
4. Ensure function has required secrets: `supabase secrets list`

### Supabase Secrets Not Set

**Symptom**: Edge Function logs show "Missing webhook secret" or "Server configuration incomplete"

**Solution**:
```bash
# Set all required secrets
supabase secrets set LENCO_SECRET_KEY="<secret>"
supabase secrets set LENCO_WEBHOOK_SECRET="<webhook-secret>"
supabase secrets set SUPABASE_URL="<url>"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<key>"

# Verify
supabase secrets list
```

### Payment Not Updated

**Symptom**: Webhook received but payment record not updated in database

**Solution**:
1. Check payment reference in webhook matches a payment in `payments` table
2. Verify RLS policies allow service role to update payments
3. Check Edge Function logs for detailed error messages
4. Query `webhook_logs` to see error message

## Security Checklist

After rotation, verify:

- [ ] Live keys are in `.env` files (NOT in git)
- [ ] `.env` files are in `.gitignore`
- [ ] Test keys are removed from all environments
- [ ] Secrets are set in Supabase Edge Functions
- [ ] Secrets are set in hosting provider (Vercel, etc.)
- [ ] Webhook URL uses HTTPS (required for production)
- [ ] Webhook signature validation is working
- [ ] No keys are exposed in client-side code
- [ ] Keys are stored securely (password manager)
- [ ] Team members with access are documented

## Verification Checklist

Before going live:

- [ ] Keys retrieved from Lenco dashboard
- [ ] `.env` files updated with live keys
- [ ] `backend/.env` updated with live keys
- [ ] Secrets pushed to Supabase Edge Functions
- [ ] `npm run env:check` passes
- [ ] Webhook URL configured in Lenco dashboard
- [ ] Test webhook returns 200 OK
- [ ] Webhook logged in `webhook_logs` table
- [ ] Payment record updated correctly
- [ ] Signature verification tested (invalid signature rejected)
- [ ] Production environment variables set (if deploying)

## Next Steps

After completing key rotation:

1. **Update Production Readiness Checklist**
   - Mark Lenco key rotation as complete
   - Update `docs/PRODUCTION_READINESS_CHECKLIST.md`

2. **Update Live Keys Status Document**
   - Mark status as "COMPLETE" in `docs/LIVE_KEYS_UPDATE_REQUIRED.md`

3. **Test Full Payment Flow**
   - Process a small test payment end-to-end
   - Verify webhook triggers correctly
   - Verify payment status updates in UI

4. **Monitor Webhooks**
   - Set up monitoring for failed webhooks
   - Check `webhook_logs` regularly for errors
   - Configure alerts for webhook failures

5. **Document Key Rotation Date**
   - Record when keys were rotated
   - Set reminder for next rotation (quarterly recommended)

## Support

For help:
- **Lenco API Issues**: Contact Lenco support at support@lenco.co
- **Webhook Configuration**: See `docs/WEBHOOK_SETUP_GUIDE.md`
- **Environment Setup**: See `docs/ENVIRONMENT_SETUP.md`
- **Supabase Issues**: See `docs/SUPABASE_CLI_SETUP.md`

## Key Rotation Schedule

Recommended key rotation frequency:
- **Production keys**: Every 90 days (quarterly)
- **After security incident**: Immediately
- **When team members leave**: Within 24 hours
- **Webhook secrets**: Every 180 days (semi-annually)

---

**Last Updated**: 2025-10-20  
**Document Version**: 1.0
