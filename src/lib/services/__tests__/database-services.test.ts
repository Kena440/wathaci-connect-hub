import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Provide environment variables for Supabase client initialization
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
process.env.VITE_SUPABASE_KEY = 'test-key';

describe('Database Services', () => {
  describe('Service Imports', () => {
    it('should import all services without errors', async () => {
      const services = await import('../index.ts');
      assert.ok(services.userService);
      assert.ok(services.profileService);
      assert.ok(services.subscriptionService);
      assert.ok(services.transactionService);
      assert.ok(services.supabase);
    });

    it('should have proper service types', async () => {
      const { userService, profileService, subscriptionService } = await import('../index.ts');
      assert.equal(typeof userService, 'object');
      assert.equal(typeof profileService, 'object');
      assert.equal(typeof subscriptionService, 'object');
    });
  });

  describe('Service Methods', () => {
    it('should have expected methods on user service', async () => {
      const { userService } = await import('../index.ts');
      assert.equal(typeof userService.getCurrentUser, 'function');
      assert.equal(typeof userService.signIn, 'function');
      assert.equal(typeof userService.signUp, 'function');
      assert.equal(typeof userService.signOut, 'function');
    });

    it('should have expected methods on profile service', async () => {
      const { profileService } = await import('../index.ts');
      assert.equal(typeof profileService.getByUserId, 'function');
      assert.equal(typeof profileService.createProfile, 'function');
      assert.equal(typeof profileService.updateProfile, 'function');
      assert.equal(typeof profileService.setAccountType, 'function');
      assert.equal(typeof profileService.markProfileCompleted, 'function');
    });

    it('should have expected methods on subscription service', async () => {
      const { subscriptionService } = await import('../index.ts');
      assert.equal(typeof subscriptionService.getPlansByAccountType, 'function');
      assert.equal(typeof subscriptionService.getCurrentUserSubscription, 'function');
      assert.equal(typeof subscriptionService.createSubscription, 'function');
      assert.equal(typeof subscriptionService.hasActiveSubscription, 'function');
    });
  });

  describe('Database Types', () => {
    it('should import database types without errors', async () => {
      const types = await import('../../../@types/database.ts');
      assert.ok(types);
    });
  });

  describe('Utility Functions', () => {
    it('should have utility functions available', async () => {
      const { withErrorHandling, testConnection, healthCheck } = await import('../index.ts');
      assert.equal(typeof withErrorHandling, 'function');
      assert.equal(typeof testConnection, 'function');
      assert.equal(typeof healthCheck, 'function');
    });
  });
});
