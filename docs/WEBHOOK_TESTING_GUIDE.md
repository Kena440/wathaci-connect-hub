# Webhook Testing Quick Reference

This guide provides quick commands and procedures for testing the Lenco webhook integration after key rotation.

## Prerequisites

- ✅ Live Lenco keys rotated (via `npm run keys:rotate`)
- ✅ Secrets pushed to Supabase Edge Functions
- ✅ `lenco-webhook` function deployed
- ✅ Webhook URL configured in Lenco dashboard

## Quick Test Commands

### 1. Verify Supabase Secrets

```bash
supabase secrets list
```

Expected output should include:
- `LENCO_SECRET_KEY`
- `LENCO_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 2. Check Edge Function Status

```bash
supabase functions list
```

Expected output should show `lenco-webhook` with status `ACTIVE`.

### 3. Test Webhook with Script

```bash
# Replace with your actual values:
# - PROJECT_REF: Found in your Supabase dashboard URL (e.g., YOUR_PROJECT_REF)
# - WEBHOOK_SECRET: The secret you set during key rotation
node scripts/test-webhook-integration.js \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/lenco-webhook \
  YOUR_WEBHOOK_SECRET
```

**Where to find these values**:
- **PROJECT_REF**: Your Supabase project reference ID from the dashboard URL
- **WEBHOOK_SECRET**: The webhook secret you entered during `npm run keys:rotate`
- Or retrieve from Supabase: `supabase secrets list` (will show as `LENCO_WEBHOOK_SECRET`)

Expected result: All tests pass with ✓ marks.

### 4. Check Webhook Logs Table

```sql
-- In Supabase SQL Editor
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

Expected result: Recent entries with `status = 'processed'` and no error messages.

## Testing from Lenco Dashboard

### Step 1: Access Webhook Settings

1. Log in to Lenco Dashboard: https://dashboard.lenco.co
2. Navigate to **Settings** → **Webhooks**
3. Locate your webhook endpoint

### Step 2: Send Test Event

1. Click on your webhook endpoint
2. Click **Send Test Event** or **Test Webhook** button
3. Select event type: **payment.success**
4. Click **Send**

### Step 3: Verify Response

Check the response in Lenco dashboard:
- **Status Code**: Should be `200 OK`
- **Response Body**: `{"success": true}`
- **Response Time**: Should be < 2 seconds

### Step 4: Check Logs in Supabase

1. Go to Supabase Dashboard
2. Navigate to **Edge Functions** → **lenco-webhook**
3. Click **Logs** tab
4. Verify you see log entries for the test event

### Step 5: Replay Production Webhook

For comprehensive testing with real payment data:

1. In Lenco Dashboard, navigate to **Transactions** or **Payments**
2. Find a recent completed payment
3. Click on the transaction
4. Look for **Replay Webhook** or **Resend Event** button
5. Click to replay the webhook
6. Verify:
   - Returns 200 OK
   - Appears in `webhook_logs` table
   - No errors in Edge Function logs

## Manual cURL Testing

### Test with Valid Signature

```bash
#!/bin/bash

WEBHOOK_URL="https://YOUR_PROJECT_REF.supabase.co/functions/v1/lenco-webhook"
WEBHOOK_SECRET="YOUR_WEBHOOK_SECRET"
TIMESTAMP=$(date -u +%s)

# Create test payload
PAYLOAD='{
  "event": "payment.success",
  "data": {
    "id": "test_txn_'$(date +%s)'",
    "reference": "TEST_REF_'$(date +%s)'",
    "amount": 10000,
    "currency": "ZMW",
    "status": "success",
    "gateway_response": "Payment completed successfully",
    "paid_at": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
    "customer": {
      "email": "test@example.com",
      "phone": "0978123456"
    },
    "metadata": {
      "user_id": "test-user-123",
      "payment_method": "mobile_money"
    }
  },
  "created_at": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
}'

# Generate HMAC-SHA256 signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -binary | base64)

# Send request
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-lenco-signature: $SIGNATURE" \
  -H "x-lenco-timestamp: $TIMESTAMP" \
  -d "$PAYLOAD" \
  "$WEBHOOK_URL"
```

Expected output:
```json
{"success": true}
```

### Test with Invalid Signature (Should Fail)

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-lenco-signature: invalid_signature_12345" \
  -H "x-lenco-timestamp: $(date -u +%s)" \
  -d '{"event":"payment.success","data":{"reference":"TEST_001"}}' \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/lenco-webhook
```

Expected output:
```json
{"success": false, "error": "Invalid webhook signature"}
```

Status code: `401 Unauthorized`

### Test Without Signature (Should Fail)

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"event":"payment.success","data":{"reference":"TEST_001"}}' \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/lenco-webhook
```

Expected output:
```json
{"success": false, "error": "Missing webhook authentication"}
```

Status code: `401 Unauthorized`

## Verification Checklist

After testing, verify the following:

### Webhook Function
- [ ] Returns 200 OK for valid requests
- [ ] Returns 401 for invalid signatures
- [ ] Returns 401 for missing signatures
- [ ] Returns 400 for malformed payloads
- [ ] Response time < 2 seconds

### Database Logs
- [ ] Entries appear in `webhook_logs` table
- [ ] Status is `processed` for successful events
- [ ] Error messages captured for failed events
- [ ] Payload stored correctly
- [ ] Timestamp is accurate

### Payment Updates
- [ ] Payment status updated correctly
- [ ] Transaction ID populated
- [ ] Gateway response stored
- [ ] Timestamps updated

### Edge Function Logs
- [ ] No error logs for valid requests
- [ ] Warning logs for invalid signatures
- [ ] Info logs for successful processing
- [ ] Request ID tracked throughout

## Common Test Scenarios

### Test All Event Types

```bash
# Payment Success
node scripts/test-webhook-integration.js <url> <secret>

# Payment Failed
# (Modify test script or send manual cURL with event: "payment.failed")

# Payment Pending
# (Modify test script or send manual cURL with event: "payment.pending")

# Payment Cancelled
# (Modify test script or send manual cURL with event: "payment.cancelled")
```

> **Heads up:** Operational events such as `transfer.successful`, `collection.failed`, or `transaction.credit` can also be relayed to this webhook. They are primarily logged for auditing. Refer to the [Lenco Webhook Events Reference](./LENCO_WEBHOOK_EVENTS_REFERENCE.md) for the payload fields when crafting manual requests.

### Test Duplicate Events

Send the same webhook payload twice:

1. First request: Should process successfully
2. Second request: Should return success but mark as duplicate
3. Check logs: Second entry should have `status = 'duplicate'`

### Test Stale Timestamps

Send webhook with old timestamp (> 5 minutes old):

```bash
# Note: This example uses GNU date. On macOS, install coreutils:
# brew install coreutils
# Then use: gdate instead of date

# Create payload with old timestamp (GNU/Linux)
OLD_TIMESTAMP=$(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S.000Z 2>/dev/null || \
                gdate -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S.000Z 2>/dev/null || \
                echo "2020-01-01T00:00:00.000Z")
# ... generate payload with old created_at
```

Expected: Returns 400 with "Stale webhook event" error.

**Note**: The `date -d` command is GNU-specific. On macOS, either:
- Install GNU coreutils: `brew install coreutils` and use `gdate`
- Or manually specify an old timestamp like `2020-01-01T00:00:00.000Z`

### Test Large Payloads

Send webhook with payload > 32KB:

Expected: Returns 413 with "Payload too large" error.

## Troubleshooting

### Webhook Returns 401

**Possible Causes**:
- Webhook secret mismatch
- Signature generation incorrect
- Missing signature header

**Solution**:
1. Verify secret in Supabase: `supabase secrets list`
2. Check secret matches Lenco dashboard
3. Re-set secret if needed

### Webhook Returns 500

**Possible Causes**:
- Database connection issues
- Missing Supabase secrets
- RLS policy blocking update

**Solution**:
1. Check Edge Function logs: `supabase functions logs lenco-webhook`
2. Verify all secrets set: `supabase secrets list`
3. Test database connection manually

### Webhook Times Out

**Possible Causes**:
- Edge Function not deployed
- Network issues
- Function execution error

**Solution**:
1. Verify function deployed: `supabase functions list`
2. Check function logs for errors
3. Redeploy if needed: `supabase functions deploy lenco-webhook`

### No Entry in webhook_logs

**Possible Causes**:
- Database table doesn't exist
- RLS policy blocking insert
- Function error before log insert

**Solution**:
1. Verify table exists in Supabase
2. Check RLS policies allow service role
3. Run provisioning script if needed

## Monitoring Commands

### Watch Webhook Logs (Real-time)

```bash
# Terminal 1: Watch function logs
supabase functions logs lenco-webhook --follow

# Terminal 2: Send test webhook
node scripts/test-webhook-integration.js <url> <secret>
```

### Query Recent Webhook Activity

```sql
-- Last 24 hours activity
SELECT 
  event_type,
  status,
  COUNT(*) as count
FROM webhook_logs
WHERE processed_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type, status
ORDER BY event_type, status;
```

### Check Failed Webhooks

```sql
SELECT 
  id,
  event_type,
  reference,
  error_message,
  processed_at,
  payload
FROM webhook_logs
WHERE status = 'failed'
ORDER BY processed_at DESC
LIMIT 20;
```

## Performance Testing

### Load Test (Use with Caution)

```bash
# Send 10 concurrent webhook requests
for i in {1..10}; do
  node scripts/test-webhook-integration.js <url> <secret> &
done
wait
echo "Load test complete"
```

**Note**: Only test on development/staging, not production.

### Measure Response Time

```bash
time curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-lenco-signature: $SIGNATURE" \
  -d "$PAYLOAD" \
  "$WEBHOOK_URL"
```

Expected: < 2 seconds for typical payloads.

## Next Steps After Testing

Once all tests pass:

1. ✅ Mark webhook testing complete in Production Readiness Checklist
2. ✅ Document test results and dates
3. ✅ Set up monitoring alerts for webhook failures
4. ✅ Schedule regular webhook health checks
5. ✅ Proceed with production launch

---

**Last Updated**: 2025-10-20  
**Related Docs**:
- [LENCO_KEYS_ROTATION_GUIDE.md](./LENCO_KEYS_ROTATION_GUIDE.md)
- [WEBHOOK_SETUP_GUIDE.md](./WEBHOOK_SETUP_GUIDE.md)
- [PRODUCTION_READINESS_CHECKLIST.md](./PRODUCTION_READINESS_CHECKLIST.md)
