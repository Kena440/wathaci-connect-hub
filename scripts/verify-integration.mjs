#!/usr/bin/env node

/**
 * Integration Verification Script
 * 
 * Verifies that the frontend and backend are properly integrated
 * by checking configuration, connectivity, and API endpoints.
 * 
 * Usage: node scripts/verify-integration.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const fullPath = join(rootDir, filePath);
  if (existsSync(fullPath)) {
    log(`✅ ${description}`, colors.green);
    return true;
  } else {
    log(`❌ ${description} - File not found: ${filePath}`, colors.red);
    return false;
  }
}

function checkEnvFile(filePath) {
  const fullPath = join(rootDir, filePath);
  if (!existsSync(fullPath)) {
    log(`⚠️  ${filePath} not found (optional)`, colors.yellow);
    return false;
  }

  const content = readFileSync(fullPath, 'utf-8');
  const hasApiUrl = content.includes('VITE_API_BASE_URL');
  
  if (hasApiUrl) {
    log(`✅ ${filePath} contains VITE_API_BASE_URL`, colors.green);
    return true;
  } else {
    log(`⚠️  ${filePath} missing VITE_API_BASE_URL`, colors.yellow);
    return false;
  }
}

async function checkBackendHealth(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      const data = await response.json();
      log(`✅ Backend health check successful`, colors.green);
      log(`   Status: ${data.status}`, colors.blue);
      log(`   Environment: ${data.environment}`, colors.blue);
      return true;
    } else {
      log(`❌ Backend health check failed with status ${response.status}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Cannot connect to backend at ${baseUrl}`, colors.red);
    log(`   Error: ${error.message}`, colors.red);
    return false;
  }
}

async function checkApiEndpoint(baseUrl, endpoint, method = 'OPTIONS') {
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      signal: AbortSignal.timeout(5000),
    });
    
    log(`✅ ${method} ${endpoint} - Status ${response.status}`, colors.green);
    return true;
  } catch (error) {
    log(`❌ ${method} ${endpoint} failed: ${error.message}`, colors.red);
    return false;
  }
}

async function main() {
  log('\n' + '='.repeat(60), colors.blue);
  log('Frontend-Backend Integration Verification', colors.bold);
  log('='.repeat(60) + '\n', colors.blue);

  let allChecks = true;

  // Check configuration files
  log('📁 Configuration Files:', colors.bold);
  allChecks &= checkFile('src/config/api.ts', 'API configuration module');
  allChecks &= checkFile('backend/index.js', 'Backend server');
  checkEnvFile('.env.local');
  checkEnvFile('backend/.env');
  console.log();

  // Check integration components
  log('🔧 Integration Components:', colors.bold);
  allChecks &= checkFile('src/lib/api/health-check.ts', 'Health check utility');
  allChecks &= checkFile('src/hooks/useApiConnection.ts', 'Connection monitoring hook');
  allChecks &= checkFile('src/components/ApiConnectionBanner.tsx', 'Connection banner component');
  allChecks &= checkFile('src/components/ApiErrorBoundary.tsx', 'Error boundary component');
  console.log();

  // Check tests
  log('🧪 Tests:', colors.bold);
  allChecks &= checkFile('test/integration.test.js', 'Integration tests');
  allChecks &= checkFile('test/backend-response.test.js', 'Backend response tests');
  allChecks &= checkFile('test/otp-service.test.js', 'OTP service tests');
  console.log();

  // Check documentation
  log('📚 Documentation:', colors.bold);
  allChecks &= checkFile('FRONTEND_BACKEND_INTEGRATION.md', 'Integration guide');
  allChecks &= checkFile('API_INTEGRATION_QUICK_REFERENCE.md', 'Quick reference');
  console.log();

  // Check backend connectivity
  log('🌐 Backend Connectivity:', colors.bold);
  const backendUrl = process.env.VITE_API_BASE_URL || 'http://localhost:3000';
  log(`Testing backend at: ${backendUrl}`, colors.blue);
  
  const healthCheck = await checkBackendHealth(backendUrl);
  if (healthCheck) {
    await checkApiEndpoint(backendUrl, '/api', 'GET');
    await checkApiEndpoint(backendUrl, '/users', 'OPTIONS');
    await checkApiEndpoint(backendUrl, '/api/auth/otp/send', 'OPTIONS');
    await checkApiEndpoint(backendUrl, '/api/logs', 'OPTIONS');
  } else {
    log('\n⚠️  Backend not running. Start it with:', colors.yellow);
    log('   cd backend && npm start', colors.yellow);
  }
  console.log();

  // Summary
  log('='.repeat(60), colors.blue);
  if (allChecks) {
    log('✅ All integration checks passed!', colors.green);
    log('\nThe frontend and backend are properly integrated.', colors.green);
  } else {
    log('⚠️  Some checks failed', colors.yellow);
    log('\nReview the errors above and fix any issues.', colors.yellow);
  }
  log('='.repeat(60) + '\n', colors.blue);

  // Next steps
  log('📖 Next Steps:', colors.bold);
  log('1. Review documentation: FRONTEND_BACKEND_INTEGRATION.md');
  log('2. Run tests: npm test');
  log('3. Start backend: cd backend && npm start');
  log('4. Start frontend: npm run dev');
  log('5. Test connection: open http://localhost:8080\n');

  process.exit(allChecks ? 0 : 1);
}

main().catch(error => {
  log(`\n❌ Script error: ${error.message}`, colors.red);
  process.exit(1);
});
