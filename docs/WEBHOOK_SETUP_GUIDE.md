# Lenco Webhook Setup Guide

This guide walks you through setting up and testing Lenco payment webhooks with the WATHACI CONNECT platform.

## Overview

Webhooks enable real-time payment status updates from Lenco to your application. When a payment is completed, failed, or cancelled, Lenco sends a POST request to your webhook endpoint with the payment details.

## Prerequisites

1. Active Lenco account with live API keys
2. Deployed Supabase edge function (`lenco-webhook`)
3. Database with `webhook_logs` and `payments` tables
4. SSL/HTTPS enabled endpoint (required for production webhooks)

## Step 1: Update Environment Configuration

### 1.1 Update Live Lenco Keys

In your `.env` file and Supabase environment variables, update the following:

```bash
# Live Lenco Keys (from Lenco Dashboard -> Settings -> API Keys)
VITE_LENCO_PUBLIC_KEY="pub-[your-live-public-key]"
LENCO_SECRET_KEY="[your-live-secret-key]"
LENCO_WEBHOOK_SECRET="[your-webhook-secret]"
```

**Important Notes:**
- Live public keys start with `pub-` or `pk_live_`
- Secret keys are 64-character hexadecimal strings or start with `sk_live_`
- Webhook secret is used to verify webhook signatures
- **Never commit these keys to version control**

### 1.2 Update Supabase Edge Function Secrets

Deploy your environment variables to Supabase:

```bash
# Set Lenco secrets
supabase secrets set LENCO_WEBHOOK_SECRET="[your-webhook-secret]"
supabase secrets set LENCO_SECRET_KEY="[your-live-secret-key]"

# Verify Supabase secrets (these should already be set)
supabase secrets set SUPABASE_URL="[your-supabase-url]"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="[your-service-role-key]"
```

## Step 2: Deploy Supabase Edge Function

### 2.1 Ensure Database Schema is Up-to-Date

Run the database provisioning script to create required tables:

```bash
# Export your Supabase database URL
export SUPABASE_DB_URL="postgres://postgres:[password]@[host]:6543/postgres"

# Run provisioning script
npm run supabase:provision
```

This creates:
- `webhook_logs` table for tracking webhook events
- Updated `payments` table with all required fields
- Proper indexes and RLS policies

### 2.2 Deploy the Edge Function

```bash
# Deploy the lenco-webhook function
supabase functions deploy lenco-webhook

# Verify deployment
supabase functions list
```

After deployment, note your webhook URL:
```
https://[your-project-ref].supabase.co/functions/v1/lenco-webhook
```

## Step 3: Configure Webhook URL in Lenco Dashboard

### 3.1 Access Lenco Dashboard

1. Log in to your Lenco account at https://dashboard.lenco.co
2. Navigate to **Settings** → **Webhooks** or **API Settings**

### 3.2 Add Webhook Endpoint

1. Click **Add Webhook Endpoint** or **Configure Webhook**
2. Enter your webhook URL:
   ```
   https://[your-project-ref].supabase.co/functions/v1/lenco-webhook
   ```
3. Select events to listen for:
   - ✅ `payment.success`
   - ✅ `payment.failed`
   - ✅ `payment.pending`
   - ✅ `payment.cancelled`
4. Save the configuration

### 3.3 Verify Webhook Secret

Ensure the webhook secret in your Lenco dashboard matches the one in your environment variables:
- The secret is used to sign webhook payloads
- Your application verifies this signature before processing

## Step 4: Test Webhook Integration

### 4.1 Trigger Test Webhook from Lenco Dashboard

Most Lenco dashboards provide a "Test Webhook" feature:

1. Navigate to your webhook configuration
2. Click **Send Test Event** or **Test Webhook**
3. Select event type (e.g., `payment.success`)
4. Send the test event

### 4.2 Verify Webhook Reception

Check if the webhook was received and logged:

```sql
-- Query webhook logs in Supabase SQL Editor
SELECT 
  id,
  event_type,
  reference,
  status,
  error_message,
  processed_at
FROM webhook_logs
ORDER BY processed_at DESC
LIMIT 10;
```

Expected results:
- At least one row with `status = 'processed'`
- `event_type` matching your test (e.g., `payment.success`)
- `error_message` should be NULL for successful processing
- `payload` contains the full webhook data

### 4.3 Verify Signature Validation

Test that signature verification is working:

1. **Valid signature test**: Use the test webhook feature (should succeed)
2. **Invalid signature test**: Send a POST request with wrong signature

```bash
# Test with invalid signature (should fail with 401)
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-lenco-signature: invalid_signature" \
  -d '{"event":"payment.success","data":{"reference":"test-ref","status":"success"}}' \
  https://[your-project-ref].supabase.co/functions/v1/lenco-webhook
```

Expected response: `401 Unauthorized` with error message about invalid signature

### 4.4 Verify Payment Updates

After a successful webhook, verify the payment record was updated:

```sql
-- Query payments table
SELECT 
  reference,
  status,
  lenco_transaction_id,
  gateway_response,
  paid_at,
  updated_at
FROM payments
WHERE reference = '[test-reference-from-webhook]';
```

Expected:
- `status` updated to match webhook event (e.g., `completed` for `payment.success`)
- `lenco_transaction_id` populated
- `gateway_response` contains provider response
- `paid_at` timestamp set (for successful payments)

## Step 5: Monitor Webhook Activity

### 5.1 Check Webhook Logs Regularly

```sql
-- Check for failed webhooks
SELECT 
  event_type,
  reference,
  error_message,
  processed_at
FROM webhook_logs
WHERE status = 'failed'
ORDER BY processed_at DESC;
```

### 5.2 Monitor Edge Function Logs

View real-time logs in Supabase Dashboard:
1. Go to **Edge Functions** → **lenco-webhook**
2. Click **Logs** tab
3. Monitor for errors or warnings

### 5.3 Set Up Alerts (Optional)

Create alerts for failed webhooks:
1. In Supabase, navigate to **Database** → **Functions**
2. Create a function to send notifications on failed webhooks
3. Use Database Webhooks to trigger on `webhook_logs` inserts with `status = 'failed'`

## Troubleshooting

### Webhook Not Received

1. **Verify URL**: Ensure the webhook URL is correctly configured in Lenco
2. **Check HTTPS**: Webhooks require HTTPS in production
3. **Firewall**: Ensure your server allows incoming requests from Lenco IPs
4. **Edge Function Status**: Verify the function is deployed and running

```bash
supabase functions list
```

### Signature Verification Fails

1. **Check Secret Match**: Ensure `LENCO_WEBHOOK_SECRET` matches Lenco dashboard
2. **Secret Format**: Verify the secret is exactly as provided by Lenco
3. **Check Logs**: Review edge function logs for detailed error messages

```bash
supabase functions logs lenco-webhook
```

### Payment Not Updated

1. **Check Reference**: Ensure the webhook `reference` matches a payment in your DB
2. **Check RLS Policies**: Verify service role can update payments table
3. **Review Logs**: Check `webhook_logs` for the event status

```sql
SELECT * FROM webhook_logs 
WHERE reference = '[your-payment-reference]'
ORDER BY processed_at DESC;
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Missing webhook signature or secret` | Signature header missing or env var not set | Set `LENCO_WEBHOOK_SECRET` in Supabase |
| `Invalid webhook signature` | Signature doesn't match | Verify webhook secret matches Lenco |
| `Failed to update payment` | Database error or payment not found | Check payment exists and RLS policies |
| `Server configuration incomplete` | Missing Supabase env vars | Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` |

## Security Best Practices

### 1. Always Verify Signatures
- Never process webhooks without signature verification
- The webhook handler includes timing-safe comparison to prevent timing attacks

### 2. Use Service Role Key Securely
- Only set in Supabase secrets, never in client-side code
- Regularly rotate service role keys

### 3. Implement Rate Limiting
- Monitor webhook frequency in logs
- Alert on unusual spikes that might indicate attacks

### 4. Log All Webhook Activity
- All webhooks are automatically logged to `webhook_logs`
- Retain logs for auditing and debugging

### 5. Use HTTPS Only
- Production webhooks must use HTTPS
- Lenco will reject HTTP webhook URLs

## Testing Checklist

Before going live, verify:

- [ ] Database tables created (`webhook_logs`, updated `payments`)
- [ ] Edge function deployed successfully
- [ ] Environment variables set in Supabase
- [ ] Live Lenco keys configured
- [ ] Webhook URL configured in Lenco dashboard
- [ ] Test webhook received and logged
- [ ] Signature verification working (test with invalid signature)
- [ ] Payment records updated correctly
- [ ] Error handling tested (simulate failures)
- [ ] Monitoring and alerting configured

## Reference

### Webhook Payload Structure

```json
{
  "event": "payment.success",
  "data": {
    "id": "lenco_txn_123456",
    "reference": "WC_1234567890_ABC123",
    "amount": 10000,
    "currency": "ZMK",
    "status": "success",
    "gateway_response": "Payment completed successfully",
    "paid_at": "2025-10-18T10:00:00.000Z",
    "customer": {
      "email": "user@example.com",
      "phone": "0978123456"
    },
    "metadata": {
      "user_id": "user-uuid",
      "payment_method": "mobile_money",
      "provider": "mtn"
    }
  },
  "created_at": "2025-10-18T10:00:00.000Z"
}
```

### Supported Events

- `payment.success`: Payment completed successfully
- `payment.failed`: Payment failed
- `payment.pending`: Payment is being processed
- `payment.cancelled`: Payment was cancelled

### Status Mapping

| Lenco Status | Internal Status |
|--------------|-----------------|
| `success` | `completed` |
| `failed` | `failed` |
| `pending` | `pending` |
| `cancelled` | `cancelled` |
| `abandoned` | `cancelled` |

## Support

For issues related to:
- **Webhook configuration**: Contact Lenco support
- **Edge function errors**: Check Supabase logs and documentation
- **Database issues**: Review Supabase database logs
- **Integration questions**: Refer to PAYMENT_INTEGRATION_GUIDE.md
