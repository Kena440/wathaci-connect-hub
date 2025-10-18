#!/usr/bin/env node
/**
 * Webhook Integration Test Script
 * 
 * This script tests the webhook endpoint with valid and invalid signatures.
 * Run this after deploying the edge function to verify webhook integration.
 * 
 * Usage:
 *   node scripts/test-webhook-integration.js <webhook-url> <webhook-secret>
 * 
 * Example:
 *   node scripts/test-webhook-integration.js \
 *     https://your-project.supabase.co/functions/v1/lenco-webhook \
 *     your-webhook-secret
 */

import { createHmac } from 'crypto';

// Parse command line arguments
const [webhookUrl, webhookSecret] = process.argv.slice(2);

if (!webhookUrl || !webhookSecret) {
  console.error('❌ Error: Missing required arguments');
  console.error('Usage: node scripts/test-webhook-integration.js <webhook-url> <webhook-secret>');
  process.exit(1);
}

// Helper function to create HMAC-SHA256 signature
function createSignature(payload, secret) {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex');
}

// Test payload
const testPayload = {
  event: 'payment.success',
  data: {
    id: 'test_txn_' + Date.now(),
    reference: 'WC_TEST_' + Date.now(),
    amount: 10000,
    currency: 'ZMK',
    status: 'success',
    gateway_response: 'Payment completed successfully',
    paid_at: new Date().toISOString(),
    customer: {
      email: 'test@example.com',
      phone: '0978123456'
    },
    metadata: {
      user_id: 'test-user-id',
      payment_method: 'mobile_money',
      provider: 'mtn'
    }
  },
  created_at: new Date().toISOString()
};

// Test 1: Valid signature
async function testValidSignature() {
  console.log('\n🧪 Test 1: Valid Signature');
  console.log('─'.repeat(50));
  
  const payload = JSON.stringify(testPayload);
  const signature = createSignature(payload, webhookSecret);
  
  console.log('Payload:', payload.substring(0, 100) + '...');
  console.log('Signature:', signature);
  console.log('Sending POST request...');
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lenco-signature': signature
      },
      body: payload
    });
    
    const responseData = await response.text();
    
    console.log('Status:', response.status, response.statusText);
    console.log('Response:', responseData);
    
    if (response.status === 200) {
      console.log('✅ PASS: Valid signature accepted');
      return true;
    } else {
      console.log('❌ FAIL: Valid signature rejected');
      return false;
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    return false;
  }
}

// Test 2: Invalid signature
async function testInvalidSignature() {
  console.log('\n🧪 Test 2: Invalid Signature');
  console.log('─'.repeat(50));
  
  const payload = JSON.stringify(testPayload);
  const invalidSignature = 'invalid_signature_12345';
  
  console.log('Payload:', payload.substring(0, 100) + '...');
  console.log('Invalid Signature:', invalidSignature);
  console.log('Sending POST request...');
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lenco-signature': invalidSignature
      },
      body: payload
    });
    
    const responseData = await response.text();
    
    console.log('Status:', response.status, response.statusText);
    console.log('Response:', responseData);
    
    if (response.status === 401) {
      console.log('✅ PASS: Invalid signature rejected correctly');
      return true;
    } else {
      console.log('❌ FAIL: Invalid signature should return 401');
      return false;
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    return false;
  }
}

// Test 3: Missing signature
async function testMissingSignature() {
  console.log('\n🧪 Test 3: Missing Signature');
  console.log('─'.repeat(50));
  
  const payload = JSON.stringify(testPayload);
  
  console.log('Payload:', payload.substring(0, 100) + '...');
  console.log('Sending POST request without signature header...');
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: payload
    });
    
    const responseData = await response.text();
    
    console.log('Status:', response.status, response.statusText);
    console.log('Response:', responseData);
    
    if (response.status === 401) {
      console.log('✅ PASS: Missing signature rejected correctly');
      return true;
    } else {
      console.log('❌ FAIL: Missing signature should return 401');
      return false;
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    return false;
  }
}

// Test 4: Different event types
async function testDifferentEvents() {
  console.log('\n🧪 Test 4: Different Event Types');
  console.log('─'.repeat(50));
  
  const events = ['payment.success', 'payment.failed', 'payment.pending', 'payment.cancelled'];
  const results = [];
  
  for (const eventType of events) {
    const eventPayload = {
      ...testPayload,
      event: eventType,
      data: {
        ...testPayload.data,
        status: eventType.replace('payment.', ''),
        reference: `WC_TEST_${eventType}_${Date.now()}`
      }
    };
    
    const payload = JSON.stringify(eventPayload);
    const signature = createSignature(payload, webhookSecret);
    
    console.log(`\nTesting ${eventType}...`);
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-lenco-signature': signature
        },
        body: payload
      });
      
      console.log('Status:', response.status);
      
      if (response.status === 200) {
        console.log(`✅ ${eventType} processed`);
        results.push(true);
      } else {
        console.log(`❌ ${eventType} failed`);
        results.push(false);
      }
    } catch (error) {
      console.error(`❌ ${eventType} error:`, error.message);
      results.push(false);
    }
  }
  
  return results.every(r => r);
}

// Run all tests
async function runTests() {
  console.log('\n🚀 Lenco Webhook Integration Tests');
  console.log('═'.repeat(50));
  console.log('Webhook URL:', webhookUrl);
  console.log('Secret:', webhookSecret.substring(0, 10) + '...');
  console.log('═'.repeat(50));
  
  const results = [];
  
  results.push(await testValidSignature());
  results.push(await testInvalidSignature());
  results.push(await testMissingSignature());
  results.push(await testDifferentEvents());
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('═'.repeat(50));
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('✅ All tests passed!');
    console.log('\nNext steps:');
    console.log('1. Check webhook_logs table in Supabase');
    console.log('2. Verify payment records were updated');
    console.log('3. Test with real payment from Lenco dashboard');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    console.log('\nTroubleshooting:');
    console.log('1. Verify webhook secret matches Lenco dashboard');
    console.log('2. Check edge function logs in Supabase');
    console.log('3. Ensure LENCO_WEBHOOK_SECRET is set in Supabase secrets');
    console.log('4. Review docs/WEBHOOK_SETUP_GUIDE.md');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
