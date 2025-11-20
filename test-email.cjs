#!/usr/bin/env node

/**
 * SMTP Email Testing Script
 * 
 * This script tests all email endpoints and provides detailed feedback.
 * 
 * Usage:
 *   node test-email.js                           # Run all tests
 *   node test-email.js status                    # Check configuration status
 *   node test-email.js verify                    # Verify SMTP connection
 *   node test-email.js send user@example.com    # Send test email
 *   node test-email.js otp user@example.com     # Send OTP email
 */

const http = require('http');
const https = require('https');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (data) {
      const body = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }
    
    const req = client.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: json,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: body,
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testStatus() {
  log('\n📊 Checking Email Service Configuration Status...', 'bright');
  
  try {
    const response = await makeRequest('GET', '/api/email/status');
    
    if (response.statusCode === 200) {
      const { data } = response;
      
      logSuccess('Email service configuration retrieved');
      log('\nConfiguration Details:', 'cyan');
      log(`  Configured: ${data.configured ? '✅ Yes' : '❌ No'}`, data.configured ? 'green' : 'red');
      log(`  Host: ${data.host}`);
      log(`  Port: ${data.port}`);
      log(`  Secure: ${data.secure}`);
      log(`  From: ${data.from}`);
      
      if (data.errors && data.errors.length > 0) {
        logWarning('\nConfiguration Errors:');
        data.errors.forEach(error => log(`  - ${error}`, 'yellow'));
      }
      
      return data.configured;
    } else {
      logError(`Failed to get status: ${response.statusCode}`);
      console.log(response.data);
      return false;
    }
  } catch (error) {
    logError(`Error checking status: ${error.message}`);
    return false;
  }
}

async function testVerify() {
  log('\n🔌 Verifying SMTP Connection...', 'bright');
  
  try {
    const response = await makeRequest('GET', '/api/email/test');
    
    if (response.statusCode === 200 && response.data.ok) {
      logSuccess('SMTP connection verified successfully!');
      
      if (response.data.details) {
        log('\nConnection Details:', 'cyan');
        log(`  Host: ${response.data.details.host}`);
        log(`  Port: ${response.data.details.port}`);
        log(`  Secure: ${response.data.details.secure}`);
        log(`  From: ${response.data.details.from}`);
      }
      
      return true;
    } else {
      logError('SMTP connection verification failed');
      
      if (response.data.details && response.data.details.errors) {
        logWarning('\nErrors:');
        response.data.details.errors.forEach(error => log(`  - ${error}`, 'yellow'));
      }
      
      if (response.data.details && response.data.details.error) {
        log(`\nError: ${response.data.details.error}`, 'red');
      }
      
      return false;
    }
  } catch (error) {
    logError(`Error verifying connection: ${error.message}`);
    return false;
  }
}

async function testSendEmail(to) {
  log(`\n📧 Sending Test Email to ${to}...`, 'bright');
  
  try {
    const response = await makeRequest('POST', '/api/email/send', {
      to,
      subject: 'SMTP Test Email from Wathaci',
      text: 'This is a test email to verify SMTP functionality.',
      html: '<h1>Test Email</h1><p>This is a test email to verify SMTP functionality.</p><p>If you received this, SMTP is working correctly!</p>',
    });
    
    if (response.statusCode === 200 && response.data.ok) {
      logSuccess('Email sent successfully!');
      log(`\nMessage ID: ${response.data.messageId}`, 'cyan');
      logInfo('Check your inbox (and spam folder) for the email.');
      return true;
    } else {
      logError('Failed to send email');
      log(`Error: ${response.data.error || 'Unknown error'}`, 'red');
      return false;
    }
  } catch (error) {
    logError(`Error sending email: ${error.message}`);
    return false;
  }
}

async function testSendOTP(to) {
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  log(`\n🔐 Sending OTP Email to ${to}...`, 'bright');
  log(`OTP Code: ${otpCode}`, 'cyan');
  
  try {
    const response = await makeRequest('POST', '/api/email/send-otp', {
      to,
      otpCode,
      expiryMinutes: 10,
    });
    
    if (response.statusCode === 200 && response.data.ok) {
      logSuccess('OTP email sent successfully!');
      log(`\nMessage ID: ${response.data.messageId}`, 'cyan');
      logInfo('Check your inbox for the OTP email with code: ' + otpCode);
      return true;
    } else {
      logError('Failed to send OTP email');
      log(`Error: ${response.data.error || 'Unknown error'}`, 'red');
      return false;
    }
  } catch (error) {
    logError(`Error sending OTP email: ${error.message}`);
    return false;
  }
}

async function testSendVerification(to) {
  log(`\n✉️  Sending Verification Email to ${to}...`, 'bright');
  
  try {
    const response = await makeRequest('POST', '/api/email/send-verification', {
      to,
      verificationUrl: 'https://wathaci.com/verify?token=test-token-12345',
      userName: 'Test User',
    });
    
    if (response.statusCode === 200 && response.data.ok) {
      logSuccess('Verification email sent successfully!');
      log(`\nMessage ID: ${response.data.messageId}`, 'cyan');
      logInfo('Check your inbox for the verification email.');
      return true;
    } else {
      logError('Failed to send verification email');
      log(`Error: ${response.data.error || 'Unknown error'}`, 'red');
      return false;
    }
  } catch (error) {
    logError(`Error sending verification email: ${error.message}`);
    return false;
  }
}

async function testSendPasswordReset(to) {
  log(`\n🔑 Sending Password Reset Email to ${to}...`, 'bright');
  
  try {
    const response = await makeRequest('POST', '/api/email/send-password-reset', {
      to,
      resetUrl: 'https://wathaci.com/reset-password?token=test-reset-token-67890',
      userName: 'Test User',
    });
    
    if (response.statusCode === 200 && response.data.ok) {
      logSuccess('Password reset email sent successfully!');
      log(`\nMessage ID: ${response.data.messageId}`, 'cyan');
      logInfo('Check your inbox for the password reset email.');
      return true;
    } else {
      logError('Failed to send password reset email');
      log(`Error: ${response.data.error || 'Unknown error'}`, 'red');
      return false;
    }
  } catch (error) {
    logError(`Error sending password reset email: ${error.message}`);
    return false;
  }
}

async function runAllTests(email) {
  log('═══════════════════════════════════════════════════════', 'bright');
  log('         SMTP EMAIL SYSTEM TEST SUITE', 'bright');
  log('═══════════════════════════════════════════════════════', 'bright');
  logInfo(`API Base URL: ${API_BASE_URL}`);
  
  const results = {
    status: false,
    verify: false,
    send: false,
    otp: false,
    verification: false,
    passwordReset: false,
  };
  
  // Test 1: Configuration Status
  results.status = await testStatus();
  
  if (!results.status) {
    logWarning('\n⚠️  Email service is not configured. Please set environment variables.');
    logInfo('Required variables: SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD');
    log('\n═══════════════════════════════════════════════════════', 'bright');
    return;
  }
  
  // Test 2: Connection Verification
  results.verify = await testVerify();
  
  if (!results.verify) {
    logWarning('\n⚠️  SMTP connection failed. Cannot proceed with email sending tests.');
    log('\n═══════════════════════════════════════════════════════', 'bright');
    return;
  }
  
  // If email is provided, run sending tests
  if (email) {
    logInfo(`\n📬 Running email sending tests to: ${email}`);
    
    results.send = await testSendEmail(email);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between emails
    
    results.otp = await testSendOTP(email);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    results.verification = await testSendVerification(email);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    results.passwordReset = await testSendPasswordReset(email);
  } else {
    logWarning('\n⚠️  No email address provided. Skipping email sending tests.');
    logInfo('Usage: node test-email.js <your-email@example.com>');
  }
  
  // Summary
  log('\n═══════════════════════════════════════════════════════', 'bright');
  log('                    TEST SUMMARY', 'bright');
  log('═══════════════════════════════════════════════════════', 'bright');
  
  log(`Status Check:          ${results.status ? '✅ PASS' : '❌ FAIL'}`, results.status ? 'green' : 'red');
  log(`Connection Verify:     ${results.verify ? '✅ PASS' : '❌ FAIL'}`, results.verify ? 'green' : 'red');
  
  if (email) {
    log(`Generic Email:         ${results.send ? '✅ PASS' : '❌ FAIL'}`, results.send ? 'green' : 'red');
    log(`OTP Email:             ${results.otp ? '✅ PASS' : '❌ FAIL'}`, results.otp ? 'green' : 'red');
    log(`Verification Email:    ${results.verification ? '✅ PASS' : '❌ FAIL'}`, results.verification ? 'green' : 'red');
    log(`Password Reset Email:  ${results.passwordReset ? '✅ PASS' : '❌ FAIL'}`, results.passwordReset ? 'green' : 'red');
  }
  
  log('═══════════════════════════════════════════════════════\n', 'bright');
  
  const allPassed = Object.values(results).every(result => result === true || result === false);
  const anyFailed = Object.values(results).some(result => result === false);
  
  if (email && !anyFailed) {
    logSuccess('All tests passed! ✨');
  } else if (anyFailed) {
    logWarning('Some tests failed. Check the output above for details.');
  }
}

// Command line interface
const args = process.argv.slice(2);
const command = args[0] || 'all';
const email = args[1] || args[0];

(async () => {
  try {
    switch (command) {
      case 'status':
        await testStatus();
        break;
      case 'verify':
        await testVerify();
        break;
      case 'send':
        if (!email || !email.includes('@')) {
          logError('Please provide a valid email address');
          log('Usage: node test-email.js send user@example.com');
          process.exit(1);
        }
        await testSendEmail(email);
        break;
      case 'otp':
        if (!email || !email.includes('@')) {
          logError('Please provide a valid email address');
          log('Usage: node test-email.js otp user@example.com');
          process.exit(1);
        }
        await testSendOTP(email);
        break;
      case 'verification':
        if (!email || !email.includes('@')) {
          logError('Please provide a valid email address');
          log('Usage: node test-email.js verification user@example.com');
          process.exit(1);
        }
        await testSendVerification(email);
        break;
      case 'password-reset':
        if (!email || !email.includes('@')) {
          logError('Please provide a valid email address');
          log('Usage: node test-email.js password-reset user@example.com');
          process.exit(1);
        }
        await testSendPasswordReset(email);
        break;
      case 'all':
      default:
        // Check if first arg is an email
        const testEmail = email && email.includes('@') ? email : null;
        await runAllTests(testEmail);
        break;
    }
  } catch (error) {
    logError(`Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
})();
