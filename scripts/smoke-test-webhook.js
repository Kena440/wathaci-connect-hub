#!/usr/bin/env node
/**
 * Webhook Smoke Test
 * 
 * This script performs signed webhook invocation tests as described in
 * POST_LAUNCH_SMOKE_TEST_SCHEDULE.md
 * 
 * Tests:
 * 1. Sends a properly signed test webhook payload
 * 2. Verifies HTTP 200/202 response
 * 3. Validates webhook processing
 * 
 * Usage:
 *   node scripts/smoke-test-webhook.js <webhook-url> <webhook-secret>
 * 
 *   Or using environment variables:
 *   WEBHOOK_URL=<url> WEBHOOK_SECRET=<secret> node scripts/smoke-test-webhook.js
 * 
 * Example:
 *   node scripts/smoke-test-webhook.js \
 *     https://nrjcbdrzaxqvomeogptf.supabase.co/functions/v1/payment-webhook \
 *     your-webhook-secret
 *
 *   WEBHOOK_URL=https://... WEBHOOK_SECRET=... node scripts/smoke-test-webhook.js
 * 
 * Exit codes:
 *   0 - Test passed
 *   1 - Test failed
 */

import { createHmac } from 'crypto';

// Parse command line arguments or use environment variables
const webhookUrl = process.argv[2] || process.env.WEBHOOK_URL;
const webhookSecret = process.argv[3] || process.env.WEBHOOK_SECRET;

if (!webhookUrl || !webhookSecret) {
  console.error('❌ Error: Missing required arguments');
  console.error('Usage: node scripts/smoke-test-webhook.js <webhook-url> <webhook-secret>');
  console.error('');
  console.error('Environment variables can also be used:');
  console.error('  WEBHOOK_URL - The webhook endpoint URL');
  console.error('  WEBHOOK_SECRET - The webhook signing secret');
  process.exit(1);
}

// Helper function to create HMAC-SHA256 signature
function createSignature(payload, secret) {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex');
}

// Test payload - payment.success event for smoke testing
const testPayload = {
  event: 'payment.success',
  data: {
    id: 'smoke_test_' + Date.now(),
    reference: 'WC_SMOKE_' + Date.now(),
    amount: 10000,
    currency: 'ZMW',
    status: 'success',
    gateway_response: 'Smoke test payment',
    paid_at: new Date().toISOString(),
    customer: {
      email: 'smoke-test@wathaci.com',
      phone: '0978000000'
    },
    metadata: {
      test_type: 'smoke_test',
      test_timestamp: new Date().toISOString(),
      user_id: 'smoke-test-user'
    }
  },
  created_at: new Date().toISOString()
};

// Main smoke test function
async function runWebhookSmokeTest() {
  console.log('==================================================');
  console.log('Webhook Smoke Test');
  console.log('==================================================');
  console.log('Webhook URL:', webhookUrl);
  console.log('Secret:', webhookSecret.substring(0, 10) + '...');
  console.log('Timestamp:', new Date().toISOString());
  console.log('==================================================');
  console.log('');
  
  console.log('🧪 Preparing signed webhook payload...');
  const payload = JSON.stringify(testPayload);
  const signature = createSignature(payload, webhookSecret);
  
  console.log('   Event Type:', testPayload.event);
  console.log('   Reference:', testPayload.data.reference);
  console.log('   Signature:', signature);
  console.log('');
  
  console.log('📤 Sending webhook request...');
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lenco-signature': signature,
        'User-Agent': 'WATHACI-SmokeTest/1.0'
      },
      body: payload
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    const responseText = await response.text();
    
    console.log('');
    console.log('📥 Response received:');
    console.log('   Status:', response.status, response.statusText);
    console.log('   Response Time:', responseTime + 'ms');
    console.log('   Body:', responseText || '(empty)');
    console.log('');
    
    // Check if response is acceptable (200 or 202)
    if (response.status === 200 || response.status === 202) {
      console.log('==================================================');
      console.log('✅ WEBHOOK SMOKE TEST PASSED');
      console.log('==================================================');
      console.log('Webhook endpoint returned HTTP', response.status);
      console.log('Response time:', responseTime + 'ms');
      console.log('');
      console.log('Next Steps:');
      console.log('1. Verify webhook was logged in webhook_logs table');
      console.log('2. Check downstream fulfillment service logs');
      console.log('3. Confirm event processing completed successfully');
      console.log('');
      
      return 0;
    } else {
      console.log('==================================================');
      console.log('❌ WEBHOOK SMOKE TEST FAILED');
      console.log('==================================================');
      console.log('Expected HTTP 200 or 202, received:', response.status);
      console.log('Response:', responseText);
      console.log('');
      console.log('Troubleshooting:');
      console.log('1. Verify webhook endpoint is deployed and accessible');
      console.log('2. Check webhook secret matches configured value');
      console.log('3. Review edge function logs for errors');
      console.log('4. Ensure LENCO_WEBHOOK_SECRET is set in Supabase');
      console.log('');
      
      return 1;
    }
  } catch (error) {
    console.log('');
    console.log('==================================================');
    console.log('❌ WEBHOOK SMOKE TEST ERROR');
    console.log('==================================================');
    console.error('Error:', error.message);
    console.error('');
    console.log('Troubleshooting:');
    console.log('1. Verify webhook URL is correct and accessible');
    console.log('2. Check network connectivity');
    console.log('3. Ensure endpoint is deployed (not in local dev)');
    console.log('4. Review firewall/security group settings');
    console.log('');
    
    return 1;
  }
}

// Run the smoke test
runWebhookSmokeTest()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
