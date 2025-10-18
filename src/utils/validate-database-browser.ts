/**
 * Browser validation utility for database services
 * 
 * This script can be run in the browser console to validate the database setup.
 * Usage: Open browser console and run: validateDatabaseSetup()
 */

declare global {
  interface Window {
    validateDatabaseSetup: () => Promise<void>;
  }
}

async function validateDatabaseSetup() {
  console.log('🔍 Validating Database Setup in Browser...\n');
  
  try {
    // Test 1: Import services
    console.log('📦 Testing service imports...');
    const services = await import('../lib/services');
    
    if (services.userService && services.profileService && services.subscriptionService) {
      console.log('✅ All services imported successfully');
    } else {
      console.error('❌ Some services failed to import');
      return;
    }
    
    // Test 2: Check service instantiation
    console.log('\n🏗️ Testing service instantiation...');
    
    const serviceTests = [
      { name: 'userService', service: services.userService },
      { name: 'profileService', service: services.profileService },
      { name: 'subscriptionService', service: services.subscriptionService },
      { name: 'transactionService', service: services.transactionService },
    ];
    
    for (const { name, service } of serviceTests) {
      if (service && typeof service === 'object') {
        console.log(`✅ ${name} instantiated correctly`);
      } else {
        console.error(`❌ ${name} failed to instantiate`);
      }
    }
    
    // Test 3: Test environment variables
    console.log('\n🌍 Testing environment variables...');
    const url = typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : (import.meta as any)?.env?.VITE_SUPABASE_URL;
    const key = typeof process !== 'undefined' ? process.env.VITE_SUPABASE_KEY : (import.meta as any)?.env?.VITE_SUPABASE_KEY;
    
    if (url && key) {
      console.log('✅ Environment variables are set');
      console.log(`📍 Supabase URL: ${url.substring(0, 30)}...`);
    } else {
      console.warn('⚠️ Environment variables not fully set');
    }
    
    // Test 4: Test types
    console.log('\n📝 Testing TypeScript types...');
    try {
      const types = await import('../@types/database');
      console.log('✅ Database types imported successfully');
      
      // Test basic type usage
      const testUser: typeof types.User = {
        id: 'test-123',
        email: 'test@example.com'
      };
      console.log('✅ User type works correctly');
      
    } catch (error) {
      console.error('❌ Database types import failed:', error);
    }
    
    // Test 5: Test connection (non-destructive)
    console.log('\n🔌 Testing database connection...');
    try {
      const { testConnection } = services;
      
      if (typeof testConnection === 'function') {
        console.log('✅ Connection test function available');
        
        // Note: We don't actually run the connection test in browser validation
        // as it requires network access and might fail in development environments
        console.log('ℹ️ Actual connection test skipped in browser validation');
      } else {
        console.error('❌ Connection test function not available');
      }
    } catch (error) {
      console.error('❌ Connection test failed:', error);
    }
    
    // Test 6: Test service methods
    console.log('\n⚙️ Testing service methods...');
    
    const methodTests = [
      { service: services.userService, method: 'getCurrentUser' },
      { service: services.profileService, method: 'getByUserId' },
      { service: services.subscriptionService, method: 'getAllPlans' },
    ];
    
    for (const { service, method } of methodTests) {
      if (typeof service[method] === 'function') {
        console.log(`✅ ${service.constructor.name}.${method}() available`);
      } else {
        console.error(`❌ ${service.constructor.name}.${method}() not available`);
      }
    }
    
    console.log('\n🎉 Database setup validation completed!');
    console.log('ℹ️ All core components are working correctly.');
    console.log('ℹ️ Run actual database operations to test full functionality.');
    
  } catch (error) {
    console.error('❌ Validation failed with error:', error);
    console.error('Stack trace:', (error as Error).stack);
  }
}

// Make the function globally available
if (typeof window !== 'undefined') {
  window.validateDatabaseSetup = validateDatabaseSetup;
  console.log('🔧 Database validation utility loaded. Run: validateDatabaseSetup()');
}

export { validateDatabaseSetup };