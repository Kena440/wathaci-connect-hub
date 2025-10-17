/**
 * Basic functionality test for database services
 */

import { describe, it, expect, jest } from '@jest/globals';

// Mock the environment variables before importing services
const mockEnv = {
  VITE_SUPABASE_URL: 'https://test.supabase.co',
  VITE_SUPABASE_KEY: 'test-key'
};

// Mock import.meta.env
Object.defineProperty(global, 'import', {
  value: {
    meta: {
      env: mockEnv
    }
  }
});

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } }))
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      delete: jest.fn(),
      range: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis()
    }))
  }))
}));

describe('Database Services', () => {
  describe('Service Imports', () => {
    it('should import all services without errors', async () => {
      const services = await import('@/lib/services');
      
      expect(services.userService).toBeDefined();
      expect(services.profileService).toBeDefined();
      expect(services.subscriptionService).toBeDefined();
      expect(services.transactionService).toBeDefined();
      expect(services.supabase).toBeDefined();
    });

    it('should have proper service types', async () => {
      const { userService, profileService, subscriptionService } = await import('@/lib/services');
      
      expect(typeof userService).toBe('object');
      expect(typeof profileService).toBe('object');
      expect(typeof subscriptionService).toBe('object');
    });
  });

  describe('Service Methods', () => {
    it('should have expected methods on user service', async () => {
      const { userService } = await import('@/lib/services');
      
      expect(typeof userService.getCurrentUser).toBe('function');
      expect(typeof userService.signIn).toBe('function');
      expect(typeof userService.signUp).toBe('function');
      expect(typeof userService.signOut).toBe('function');
    });

    it('should have expected methods on profile service', async () => {
      const { profileService } = await import('@/lib/services');
      
      expect(typeof profileService.getByUserId).toBe('function');
      expect(typeof profileService.createProfile).toBe('function');
      expect(typeof profileService.updateProfile).toBe('function');
      expect(typeof profileService.setAccountType).toBe('function');
      expect(typeof profileService.markProfileCompleted).toBe('function');
    });

    it('should have expected methods on subscription service', async () => {
      const { subscriptionService } = await import('@/lib/services');
      
      expect(typeof subscriptionService.getPlansByAccountType).toBe('function');
      expect(typeof subscriptionService.getCurrentUserSubscription).toBe('function');
      expect(typeof subscriptionService.createSubscription).toBe('function');
      expect(typeof subscriptionService.hasActiveSubscription).toBe('function');
    });
  });

  describe('Database Types', () => {
    it('should import database types without errors', async () => {
      const types = await import('@/@types/database');

      expect(types).toBeDefined();
      expect(typeof types).toBe('object');
    });
  });

  describe('Utility Functions', () => {
    it('should have utility functions available', async () => {
      const { withErrorHandling, testConnection, healthCheck } = await import('@/lib/services');

      const healthStatus = await healthCheck();

      expect(typeof withErrorHandling).toBe('function');
      expect(typeof testConnection).toBe('function');
      expect(typeof healthCheck).toBe('function');
      expect(healthStatus).toHaveProperty('status');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(healthStatus.status);
    });
  });
});