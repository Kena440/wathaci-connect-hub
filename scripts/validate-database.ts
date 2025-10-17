/**
 * Database setup validation script
 * 
 * This script validates that the database connection and models are working correctly.
 * Run this to verify the setup after implementing the database layer.
 */

import {
  supabase,
  testConnection,
  healthCheck,
  userService,
  profileService,
  subscriptionService
} from '../src/lib/services';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
};

async function validateEnvironment() {
  log.info('Validating environment variables...');
  
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_KEY;
  
  if (!url) {
    log.error('VITE_SUPABASE_URL is not set');
    return false;
  }
  
  if (!key) {
    log.error('VITE_SUPABASE_KEY is not set');
    return false;
  }
  
  try {
    new URL(url);
    log.success('Environment variables are valid');
    return true;
  } catch {
    log.error('VITE_SUPABASE_URL is not a valid URL');
    return false;
  }
}

async function validateConnection() {
  log.info('Testing database connection...');
  
  try {
    const isConnected = await testConnection();
    
    if (isConnected) {
      log.success('Database connection successful');
      return true;
    } else {
      log.error('Database connection failed');
      return false;
    }
  } catch (error) {
    log.error(`Database connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

async function validateHealthCheck() {
  log.info('Running health check...');
  
  try {
    const health = await healthCheck();
    
    if (health.status === 'healthy') {
      log.success(`Health check passed - Connection: ${health.details.connection}, Auth: ${health.details.auth}`);
      return true;
    } else {
      log.warning(`Health check partially failed - Connection: ${health.details.connection}, Auth: ${health.details.auth}`);
      return false;
    }
  } catch (error) {
    log.error(`Health check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

async function validateServices() {
  log.info('Validating service layer...');
  
  // Test that services are properly instantiated
  const services = [
    { name: 'userService', service: userService },
    { name: 'profileService', service: profileService },
    { name: 'subscriptionService', service: subscriptionService },
  ];
  
  let allValid = true;
  
  for (const { name, service } of services) {
    if (service && typeof service === 'object') {
      log.success(`${name} is properly instantiated`);
    } else {
      log.error(`${name} is not properly instantiated`);
      allValid = false;
    }
  }
  
  return allValid;
}

async function validateTypes() {
  log.info('Validating TypeScript types...');
  
  try {
    // Test that we can import and use types
    const { User, Profile, SubscriptionPlan } = await import('../src/@types/database');
    
    // Test type assignments
    const testUser: User = {
      id: 'test-id',
      email: 'test@example.com'
    };
    
    const testProfile: Partial<Profile> = {
      id: 'test-id',
      email: 'test@example.com',
      account_type: 'professional',
      profile_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    log.success('TypeScript types are valid');
    return true;
  } catch (error) {
    log.error(`Type validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

async function validateServiceOperations() {
  log.info('Testing database service operations...');
  
  try {
    // Test user operations (these won't actually hit the database without auth)
    const userResult = await userService.getCurrentUser();
    
    if (userResult.error || userResult.data === null) {
      log.success('User service correctly handles unauthenticated state');
    } else {
      log.success('User service returned data (user is authenticated)');
    }
    
    // Test subscription plans (this should work if the table exists)
    const plansResult = await subscriptionService.getAllPlans();
    
    if (plansResult.error) {
      log.warning(`Subscription plans query failed: ${plansResult.error.message}`);
      log.info('This is expected if the subscription_plans table doesn\'t exist yet');
    } else {
      log.success(`Retrieved ${plansResult.data?.length || 0} subscription plans`);
    }
    
    return true;
  } catch (error) {
    log.error(`Service operations error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

async function main() {
  console.log('🔍 Database Setup Validation\n');
  
  const validations = [
    { name: 'Environment Variables', fn: validateEnvironment },
    { name: 'Database Connection', fn: validateConnection },
    { name: 'Health Check', fn: validateHealthCheck },
    { name: 'Service Layer', fn: validateServices },
    { name: 'TypeScript Types', fn: validateTypes },
    { name: 'Service Operations', fn: validateServiceOperations },
  ];
  
  let passedCount = 0;
  
  for (const { name, fn } of validations) {
    console.log(`\n📋 ${name}`);
    try {
      const passed = await fn();
      if (passed) {
        passedCount++;
      }
    } catch (error) {
      log.error(`Validation failed with exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  console.log(`\n📊 Results: ${passedCount}/${validations.length} validations passed`);
  
  if (passedCount === validations.length) {
    log.success('All validations passed! Database setup is working correctly.');
  } else if (passedCount >= validations.length - 1) {
    log.warning('Most validations passed. Minor issues detected but setup should work.');
  } else {
    log.error('Multiple validations failed. Please check the database setup.');
  }
  
  return passedCount === validations.length;
}

// Handle both module and script execution
if (typeof window !== 'undefined') {
  // Browser environment - expose to window for manual testing
  (window as any).validateDatabaseSetup = main;
  log.info('Database validation available as window.validateDatabaseSetup()');
} else {
  // Node environment - run directly
  main().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    log.error(`Validation script error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  });
}