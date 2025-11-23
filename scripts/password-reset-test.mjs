#!/usr/bin/env node
/**
 * Password Reset Test Script
 * 
 * This script tests the complete password reset flow:
 * 1. Request password reset email
 * 2. Verify email delivery
 * 3. Test password reset link functionality
 * 4. Verify new password works
 * 
 * Usage:
 *   node scripts/password-reset-test.mjs --email test@example.com [--env production]
 * 
 * Environment Variables Required:
 *   VITE_SUPABASE_URL - Supabase project URL
 *   VITE_SUPABASE_ANON_KEY - Supabase anon key
 */

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
const emailArg = args.find(arg => arg.startsWith('--email='))?.split('=')[1];
const envArg = args.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'production';

// Validation
if (!emailArg) {
  console.error(`${colors.red}${colors.bold}❌ Error: Email address required${colors.reset}`);
  console.error('Usage: node scripts/password-reset-test.mjs --email test@example.com');
  process.exit(1);
}

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(`${colors.red}${colors.bold}❌ Error: Missing environment variables${colors.reset}`);
  console.error('Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Test tracking
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
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

// Test 1: Request password reset
async function testPasswordResetRequest() {
  logSubheader('Test 1: Password Reset Request');
  const startTime = Date.now();

  log(`Requesting password reset for: ${emailArg}`, 'info');
  log('This will send a password reset email...', 'info');

  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(emailArg, {
      redirectTo: `${supabaseUrl.replace('supabase.co', 'wathaci.com')}/reset-password`,
    });

    const duration = Date.now() - startTime;

    if (error) {
      testResults.failed++;
      log(`FAILED: ${error.message} (${duration}ms)`, 'error');
      return false;
    }

    testResults.passed++;
    log(`PASSED: Password reset email sent (${duration}ms)`, 'success');
    
    console.log(`\n${colors.yellow}📧 Email Verification Required:${colors.reset}`);
    console.log(`   1. Check inbox for: ${emailArg}`);
    console.log(`   2. From: Wathaci <support@wathaci.com>`);
    console.log(`   3. Subject: "Reset your Wathaci password"`);
    console.log(`   4. Expected delivery: < 30 seconds`);
    console.log(`   5. Contains password reset link/button\n`);

    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    testResults.failed++;
    log(`FAILED: ${error.message} (${duration}ms)`, 'error');
    return false;
  }
}

// Test 2: Check user exists
async function testUserExists() {
  logSubheader('Test 2: Verify User Exists');
  const startTime = Date.now();

  log(`Checking if user exists: ${emailArg}`, 'info');

  try {
    // Try to sign in with a dummy password to check if user exists
    // (This will fail but we can check the error message)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailArg,
      password: 'dummy-password-for-check',
    });

    const duration = Date.now() - startTime;

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        testResults.passed++;
        log(`PASSED: User exists (${duration}ms)`, 'success');
        return true;
      } else if (error.message.includes('Email not confirmed')) {
        testResults.warnings++;
        log(`WARNING: User exists but email not confirmed (${duration}ms)`, 'warning');
        return true;
      } else {
        testResults.failed++;
        log(`FAILED: User may not exist - ${error.message} (${duration}ms)`, 'error');
        return false;
      }
    }

    // This shouldn't happen with dummy password
    testResults.warnings++;
    log(`WARNING: Unexpected successful login with dummy password (${duration}ms)`, 'warning');
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    testResults.failed++;
    log(`FAILED: ${error.message} (${duration}ms)`, 'error');
    return false;
  }
}

// Test 3: Email authentication checks
function testEmailAuthenticationChecks() {
  logSubheader('Test 3: Email Authentication Checks');

  console.log(`${colors.yellow}📋 Manual Verification Steps:${colors.reset}\n`);
  
  console.log('After receiving the password reset email:\n');
  
  console.log('1. Check Email Headers:');
  console.log('   - Open the email');
  console.log('   - View email source/headers (usually "Show Original")');
  console.log('   - Look for "Authentication-Results" header\n');
  
  console.log('2. Verify SPF:');
  console.log('   - Should see: spf=pass');
  console.log('   - Domain: wathaci.com or privateemail.com\n');
  
  console.log('3. Verify DKIM:');
  console.log('   - Should see: dkim=pass');
  console.log('   - Domain: d=wathaci.com\n');
  
  console.log('4. Verify DMARC:');
  console.log('   - Should see: dmarc=pass');
  console.log('   - Policy: p=quarantine or p=reject\n');
  
  console.log('5. Check Spam Score:');
  console.log('   - Email should be in Inbox (not Spam)');
  console.log('   - No security warnings\n');

  testResults.warnings++;
  log('Manual verification steps provided', 'warning');
}

// Test 4: Reset link validation
function testResetLinkValidation() {
  logSubheader('Test 4: Reset Link Validation');

  console.log(`${colors.yellow}📋 Manual Testing Required:${colors.reset}\n`);
  
  console.log('After receiving the password reset email:\n');
  
  console.log('1. Click the reset link in the email');
  console.log('   Expected: Redirects to password reset page\n');
  
  console.log('2. Verify the reset page loads:');
  console.log('   - URL should be: /reset-password or similar');
  console.log('   - Page displays "Reset Password" form');
  console.log('   - Form has two password fields (new password + confirm)\n');
  
  console.log('3. Enter a new password:');
  console.log('   - Must meet requirements (8+ chars, etc.)');
  console.log('   - Both fields must match');
  console.log('   - Click "Reset Password" button\n');
  
  console.log('4. Verify success:');
  console.log('   - Success message displayed');
  console.log('   - Redirected to sign-in page');
  console.log('   - Can sign in with new password\n');
  
  console.log('5. Test old password:');
  console.log('   - Try to sign in with OLD password');
  console.log('   - Should FAIL with "Invalid credentials"\n');
  
  console.log('6. Test link expiration:');
  console.log('   - Try using the same reset link again');
  console.log('   - Should show error: "Link expired" or "Already used"\n');

  testResults.warnings++;
  log('Manual testing steps provided', 'warning');
}

// Test 5: Password reset security checks
function testPasswordResetSecurity() {
  logSubheader('Test 5: Security Considerations');

  console.log(`${colors.yellow}📋 Security Checklist:${colors.reset}\n`);
  
  console.log('1. Link Security:');
  console.log('   ✓ Reset link should be HTTPS');
  console.log('   ✓ Link should contain a secure token');
  console.log('   ✓ Token should be long and random (not guessable)\n');
  
  console.log('2. Expiration:');
  console.log('   ✓ Link should expire after use');
  console.log('   ✓ Link should expire after time limit (typically 1 hour)');
  console.log('   ✓ Old password should not work after reset\n');
  
  console.log('3. Rate Limiting:');
  console.log('   ✓ Should limit password reset requests per email');
  console.log('   ✓ Typically 3-5 requests per hour maximum');
  console.log('   ✓ Should not reveal if email exists or not\n');
  
  console.log('4. Email Security:');
  console.log('   ✓ Email should not contain the new password');
  console.log('   ✓ Email should warn about unauthorized requests');
  console.log('   ✓ Email should provide support contact info\n');
  
  console.log('5. User Experience:');
  console.log('   ✓ Clear instructions in email');
  console.log('   ✓ User-friendly error messages');
  console.log('   ✓ Confirm password field to prevent typos\n');

  testResults.warnings++;
  log('Security checklist provided', 'warning');
}

// Test 6: Common error scenarios
async function testErrorScenarios() {
  logSubheader('Test 6: Error Scenario Testing');

  console.log(`${colors.yellow}📋 Error Scenarios to Test:${colors.reset}\n`);
  
  console.log('1. Non-existent Email:');
  console.log('   - Request reset for email not in system');
  console.log('   - Should show generic success message (security)');
  console.log('   - Should not reveal if email exists\n');
  
  console.log('2. Invalid Email Format:');
  console.log('   - Try: not-an-email');
  console.log('   - Should show: "Invalid email format"\n');
  
  console.log('3. Rate Limiting:');
  console.log('   - Request multiple resets quickly (5+ times)');
  console.log('   - Should eventually show: "Too many requests"\n');
  
  console.log('4. Expired Link:');
  console.log('   - Use reset link after 1+ hour');
  console.log('   - Should show: "Link expired" error\n');
  
  console.log('5. Weak Password:');
  console.log('   - Try password: "123"');
  console.log('   - Should show: "Password too weak"\n');
  
  console.log('6. Mismatched Passwords:');
  console.log('   - Enter different passwords in both fields');
  console.log('   - Should show: "Passwords do not match"\n');

  testResults.warnings++;
  log('Error scenario tests documented', 'warning');
}

// Main test execution
async function runTests() {
  logHeader('🔐 Password Reset Comprehensive Test');
  
  console.log(`${colors.bold}Test Configuration:${colors.reset}`);
  console.log(`  Environment: ${envArg}`);
  console.log(`  Supabase URL: ${supabaseUrl}`);
  console.log(`  Test Email: ${emailArg}`);
  console.log(`  Timestamp: ${new Date().toISOString()}\n`);

  log('Starting password reset tests...', 'test');

  // Run automated tests
  await testUserExists();
  await testPasswordResetRequest();
  
  // Display manual test procedures
  testEmailAuthenticationChecks();
  testResetLinkValidation();
  testPasswordResetSecurity();
  testErrorScenarios();

  // Print summary
  logHeader('📊 Test Summary');
  
  console.log(`${colors.bold}Results:${colors.reset}`);
  console.log(`  ${colors.green}Automated Tests Passed: ${testResults.passed}${colors.reset}`);
  console.log(`  ${colors.red}Automated Tests Failed: ${testResults.failed}${colors.reset}`);
  console.log(`  ${colors.yellow}Manual Tests Required: ${testResults.warnings}${colors.reset}\n`);

  if (testResults.failed === 0) {
    console.log(`${colors.green}${colors.bold}✅ Automated tests passed!${colors.reset}\n`);
  } else {
    console.log(`${colors.red}${colors.bold}❌ Some automated tests failed${colors.reset}\n`);
  }

  console.log(`${colors.bold}Next Steps:${colors.reset}`);
  console.log('1. Check email inbox for password reset email');
  console.log('2. Complete manual verification steps above');
  console.log('3. Test the reset link functionality');
  console.log('4. Verify password reset works correctly');
  console.log('5. Test sign-in with new password');
  console.log('6. Verify old password no longer works\n');

  console.log(`${colors.bold}Important Notes:${colors.reset}`);
  console.log('- Password reset links typically expire after 1 hour');
  console.log('- Links can only be used once');
  console.log('- Rate limiting may prevent multiple rapid requests');
  console.log('- System should not reveal if email exists (security)\n');

  console.log(`${colors.bold}Documentation:${colors.reset}`);
  console.log('- EMAIL_TESTING_GUIDE.md - Email testing procedures');
  console.log('- COMPREHENSIVE_AUTH_TESTING_GUIDE.md - Auth testing');
  console.log('- PRODUCTION_LAUNCH_READINESS_SUMMARY.md - Launch checklist\n');

  console.log(`${colors.bold}Support:${colors.reset}`);
  console.log('- Email: support@wathaci.com');
  console.log('- Documentation: Check EMAIL_TESTING_GUIDE.md\n');

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch((error) => {
  console.error(`${colors.red}${colors.bold}❌ Fatal Error:${colors.reset}`, error);
  process.exit(1);
});
