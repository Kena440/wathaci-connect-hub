#!/usr/bin/env node
/**
 * Production Email/OTP Verification Test Script
 * 
 * This script performs quick verification tests for:
 * 1. Email delivery (signup confirmation, OTP)
 * 2. OTP generation and validation
 * 3. Email authentication (SPF, DKIM, DMARC)
 * 
 * Usage:
 *   node scripts/production-email-otp-test.mjs [--env production|staging] [--email test@example.com]
 * 
 * Environment Variables Required:
 *   VITE_SUPABASE_URL - Supabase project URL
 *   VITE_SUPABASE_ANON_KEY - Supabase anon key
 *   TEST_EMAIL (optional) - Override test email address
 */

import "dotenv/config";
import { createClient } from '@supabase/supabase-js';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Parse command line arguments
const args = process.argv.slice(2);
const envArg = args.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'production';
const emailArg = args.find(arg => arg.startsWith('--email='))?.split('=')[1];

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const testEmail = emailArg || process.env.TEST_EMAIL || `test-${Date.now()}@wathaci-test.com`;

// Validation
if (!supabaseUrl || !supabaseKey) {
  console.log(
    `${colors.yellow}${colors.bold}⚠️  Skipping production email/otp test: Missing environment variables.${colors.reset}`
  );
  console.log('Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  process.exit(0);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: [],
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    success: `${colors.green}✅`,
    error: `${colors.red}❌`,
    warning: `${colors.yellow}⚠️`,
    info: `${colors.blue}ℹ️`,
    test: `${colors.cyan}🧪`,
  }[type] || '';

  console.log(`${prefix} ${message}${colors.reset}`);
}

function logHeader(title) {
  console.log(`\n${colors.bold}${colors.cyan}${'═'.repeat(70)}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}${'═'.repeat(70)}${colors.reset}\n`);
}

function logSubheader(title) {
  console.log(`\n${colors.bold}${title}${colors.reset}`);
  console.log(`${'-'.repeat(70)}\n`);
}

function recordTest(name, passed, message = '', duration = 0) {
  const result = {
    name,
    passed,
    message,
    duration,
    timestamp: new Date().toISOString(),
  };

  testResults.tests.push(result);
  if (passed) {
    testResults.passed++;
    log(`${name}: ${message || 'PASSED'} (${duration}ms)`, 'success');
  } else {
    testResults.failed++;
    log(`${name}: ${message || 'FAILED'} (${duration}ms)`, 'error');
  }
}

// Test 1: Check Supabase connection
async function testSupabaseConnection() {
  logSubheader('Test 1: Supabase Connection');
  const startTime = Date.now();

  try {
    const { data, error } = await supabase.auth.getSession();
    const duration = Date.now() - startTime;

    if (error && error.message !== 'no active session') {
      recordTest('Supabase Connection', false, `Connection error: ${error.message}`, duration);
      return false;
    }

    recordTest('Supabase Connection', true, 'Connected successfully', duration);
    log(`Supabase URL: ${supabaseUrl}`, 'info');
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    recordTest('Supabase Connection', false, `Exception: ${error.message}`, duration);
    return false;
  }
}

// Test 2: Email-based signup (triggers confirmation email)
async function testEmailSignup() {
  logSubheader('Test 2: Email Signup & Confirmation Email');
  const startTime = Date.now();

  const password = `TestPass${Date.now()}!`;
  log(`Test email: ${testEmail}`, 'info');
  log(`Attempting signup...`, 'info');

  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: password,
      options: {
        data: {
          full_name: 'Test User',
          account_type: 'professional',
        },
      },
    });

    const duration = Date.now() - startTime;

    if (error) {
      // Check if it's a "user already exists" error (acceptable for repeated tests)
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        recordTest('Email Signup', true, 'Email already registered (expected for repeated tests)', duration);
        log('Note: Use a fresh email address for full email delivery test', 'warning');
        testResults.warnings++;
        return true;
      }
      recordTest('Email Signup', false, `Signup error: ${error.message}`, duration);
      return false;
    }

    if (!data.user) {
      recordTest('Email Signup', false, 'No user data returned', duration);
      return false;
    }

    recordTest('Email Signup', true, `User created: ${data.user.id}`, duration);
    
    // Instructions for manual verification
    console.log(`\n${colors.yellow}📧 Manual Verification Required:${colors.reset}`);
    console.log(`   1. Check inbox for: ${testEmail}`);
    console.log(`   2. Verify email from: Wathaci <support@wathaci.com>`);
    console.log(`   3. Subject should be: "Confirm your Wathaci account"`);
    console.log(`   4. Verify email contains confirmation link`);
    console.log(`   5. Expected delivery time: < 30 seconds`);
    console.log(`   6. Check email headers for SPF/DKIM/DMARC: PASS\n`);

    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    recordTest('Email Signup', false, `Exception: ${error.message}`, duration);
    return false;
  }
}

// Test 3: OTP Sign-in request (triggers OTP email)
async function testOTPRequest() {
  logSubheader('Test 3: OTP Sign-in Request');
  const startTime = Date.now();

  log(`Requesting OTP for: ${testEmail}`, 'info');

  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: testEmail,
      options: {
        shouldCreateUser: false, // Don't create new user if doesn't exist
      },
    });

    const duration = Date.now() - startTime;

    if (error) {
      recordTest('OTP Request', false, `OTP request error: ${error.message}`, duration);
      return false;
    }

    recordTest('OTP Request', true, 'OTP sent successfully', duration);

    // Instructions for manual verification
    console.log(`\n${colors.yellow}📧 Manual Verification Required:${colors.reset}`);
    console.log(`   1. Check inbox for: ${testEmail}`);
    console.log(`   2. Verify email from: Wathaci <support@wathaci.com>`);
    console.log(`   3. Subject should contain: "Your Wathaci login code" or similar`);
    console.log(`   4. Verify 6-digit OTP code is present`);
    console.log(`   5. Expected delivery time: < 10 seconds`);
    console.log(`   6. OTP should be valid for 5 minutes\n`);

    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    recordTest('OTP Request', false, `Exception: ${error.message}`, duration);
    return false;
  }
}

// Test 4: Password reset request (triggers reset email)
async function testPasswordReset() {
  logSubheader('Test 4: Password Reset Request');
  const startTime = Date.now();

  log(`Requesting password reset for: ${testEmail}`, 'info');

  try {
    // Construct redirect URL - use app base URL if available, otherwise infer from environment
    let redirectUrl;
    if (process.env.VITE_APP_BASE_URL) {
      redirectUrl = `${process.env.VITE_APP_BASE_URL}/reset-password`;
    } else if (supabaseUrl.includes('localhost')) {
      redirectUrl = 'http://localhost:3000/reset-password';
    } else {
      // For production, use wathaci.com domain
      redirectUrl = 'https://wathaci.com/reset-password';
    }

    const { data, error } = await supabase.auth.resetPasswordForEmail(testEmail, {
      redirectTo: redirectUrl,
    });

    const duration = Date.now() - startTime;

    if (error) {
      recordTest('Password Reset', false, `Reset request error: ${error.message}`, duration);
      return false;
    }

    recordTest('Password Reset', true, 'Password reset email sent', duration);

    // Instructions for manual verification
    console.log(`\n${colors.yellow}📧 Manual Verification Required:${colors.reset}`);
    console.log(`   1. Check inbox for: ${testEmail}`);
    console.log(`   2. Verify email from: Wathaci <support@wathaci.com>`);
    console.log(`   3. Subject should be: "Reset your Wathaci password"`);
    console.log(`   4. Verify reset link is present`);
    console.log(`   5. Expected delivery time: < 30 seconds`);
    console.log(`   6. Link should redirect to password reset page\n`);

    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    recordTest('Password Reset', false, `Exception: ${error.message}`, duration);
    return false;
  }
}

// Test 5: Email configuration check
async function testEmailConfiguration() {
  logSubheader('Test 5: Email Configuration Check');
  const startTime = Date.now();

  try {
    // Check if email settings are accessible (this is a basic check)
    const checks = {
      supabaseUrl: !!supabaseUrl,
      validUrl: supabaseUrl.includes('supabase.co') || supabaseUrl.includes('localhost'),
      hasKey: !!supabaseKey,
    };

    const duration = Date.now() - startTime;
    const allPassed = Object.values(checks).every(v => v);

    if (allPassed) {
      recordTest('Email Configuration', true, 'Configuration appears valid', duration);
      log('Supabase URL format: Valid', 'info');
      log('Authentication key: Present', 'info');
    } else {
      recordTest('Email Configuration', false, 'Configuration issues detected', duration);
    }

    return allPassed;
  } catch (error) {
    const duration = Date.now() - startTime;
    recordTest('Email Configuration', false, `Exception: ${error.message}`, duration);
    return false;
  }
}

// Test 6: Email deliverability recommendations
function testEmailDeliverabilityChecks() {
  logSubheader('Test 6: Email Deliverability Checklist');
  
  console.log(`${colors.yellow}📋 Manual Checks Required:${colors.reset}\n`);
  console.log('1. SPF Record Check:');
  console.log('   dig TXT wathaci.com | grep spf');
  console.log('   Expected: include:_spf.privateemail.com\n');
  
  console.log('2. DKIM Record Check:');
  console.log('   dig TXT default._domainkey.wathaci.com');
  console.log('   Expected: v=DKIM1; k=rsa; p=[public-key]\n');
  
  console.log('3. DMARC Record Check:');
  console.log('   dig TXT _dmarc.wathaci.com');
  console.log('   Expected: v=DMARC1; p=quarantine or reject\n');
  
  console.log('4. Email Headers Analysis:');
  console.log('   - Open received email');
  console.log('   - View email source/headers');
  console.log('   - Verify: spf=pass, dkim=pass, dmarc=pass\n');
  
  console.log('5. Spam Filter Check:');
  console.log('   - Send test email to: Mail-Tester (https://www.mail-tester.com/)');
  console.log('   - Target score: 8/10 or higher\n');
  
  console.log('6. Deliverability Tools:');
  console.log('   - DKIM Validator: https://dkimvalidator.com/');
  console.log('   - MXToolbox: https://mxtoolbox.com/blacklists.aspx');
  console.log('   - MailGenius: https://www.mailgenius.com/\n');

  testResults.warnings++;
  log('Deliverability checks documented - manual verification required', 'warning');
}

// Main test execution
async function runTests() {
  logHeader('🚀 Production Email/OTP Verification Tests');
  
  console.log(`${colors.bold}Test Configuration:${colors.reset}`);
  console.log(`  Environment: ${envArg}`);
  console.log(`  Supabase URL: ${supabaseUrl}`);
  console.log(`  Test Email: ${testEmail}`);
  console.log(`  Timestamp: ${new Date().toISOString()}\n`);

  log('Starting test suite...', 'test');

  // Run all tests
  await testSupabaseConnection();
  await testEmailSignup();
  await testOTPRequest();
  await testPasswordReset();
  await testEmailConfiguration();
  testEmailDeliverabilityChecks();

  // Print summary
  logHeader('📊 Test Summary');
  
  console.log(`${colors.bold}Results:${colors.reset}`);
  console.log(`  Total Tests: ${testResults.tests.length}`);
  console.log(`  ${colors.green}Passed: ${testResults.passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${testResults.failed}${colors.reset}`);
  console.log(`  ${colors.yellow}Warnings: ${testResults.warnings}${colors.reset}`);
  
  const passRate = testResults.tests.length > 0 
    ? ((testResults.passed / testResults.tests.length) * 100).toFixed(1)
    : 0;
  console.log(`  Pass Rate: ${passRate}%\n`);

  if (testResults.failed === 0) {
    console.log(`${colors.green}${colors.bold}✅ All automated tests passed!${colors.reset}\n`);
  } else {
    console.log(`${colors.red}${colors.bold}❌ Some tests failed${colors.reset}\n`);
  }

  console.log(`${colors.bold}Next Steps:${colors.reset}`);
  console.log('1. Check your email inbox for test emails');
  console.log('2. Verify email delivery times (should be < 30 seconds)');
  console.log('3. Check email headers for SPF/DKIM/DMARC authentication');
  console.log('4. Verify email rendering in different clients (Gmail, Outlook)');
  console.log('5. Run deliverability tests using recommended tools');
  console.log('6. Check Supabase logs for any email sending errors\n');

  console.log(`${colors.bold}Documentation:${colors.reset}`);
  console.log('- EMAIL_TESTING_GUIDE.md - Comprehensive email testing procedures');
  console.log('- PRODUCTION_LAUNCH_READINESS_SUMMARY.md - Launch checklist');
  console.log('- COMPREHENSIVE_AUTH_TESTING_GUIDE.md - Auth testing guide\n');

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch((error) => {
  console.error(`${colors.red}${colors.bold}❌ Fatal Error:${colors.reset}`, error);
  process.exit(1);
});
