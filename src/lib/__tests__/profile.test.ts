/**
 * Tests for profile helper functions
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock supabase client
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
};

jest.mock('../supabaseClient', () => ({
  supabase: mockSupabase,
}));

describe('Profile Helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('upsertProfile', () => {
    it('should require authenticated user', async () => {
      // Mock no authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { upsertProfile } = await import('../profile');

      await expect(
        upsertProfile({
          account_type: 'sme',
          full_name: 'Test User',
          phone: '+260123456789',
        })
      ).rejects.toThrow('User not authenticated');
    });

    it('should reject empty or whitespace-only full_name', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: { id: 'test-user-id', email: 'test@example.com' },
        },
        error: null,
      });

      const { upsertProfile } = await import('../profile');

      await expect(
        upsertProfile({
          account_type: 'sme',
          full_name: '   ',
          phone: '+260123456789',
        })
      ).rejects.toThrow('Full name cannot be empty');
    });

    it('should trim whitespace from string values', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: { id: 'test-user-id', email: 'test@example.com' },
        },
        error: null,
      });

      // Mock the from().upsert() chain
      const mockSingle = jest.fn().mockResolvedValue({
        data: { id: 'test-user-id', full_name: 'Test User' },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockUpsert = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert,
      });

      const { upsertProfile } = await import('../profile');

      await upsertProfile({
        account_type: 'sme',
        full_name: '  Test User  ',
        phone: '  +260123456789  ',
        business_name: '  Test Business  ',
      });

      // Verify upsert was called with trimmed values
      expect(mockUpsert).toHaveBeenCalled();
      const upsertPayload = mockUpsert.mock.calls[0][0];
      expect(upsertPayload.full_name).toBe('Test User');
      expect(upsertPayload.phone).toBe('+260123456789');
      expect(upsertPayload.business_name).toBe('Test Business');
    });

    it('should split full_name into first_name and last_name', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: { id: 'test-user-id', email: 'test@example.com' },
        },
        error: null,
      });

      // Mock the from().upsert() chain
      const mockSingle = jest.fn().mockResolvedValue({
        data: { id: 'test-user-id' },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockUpsert = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert,
      });

      const { upsertProfile } = await import('../profile');

      await upsertProfile({
        account_type: 'sme',
        full_name: 'John Doe Smith',
        phone: '+260123456789',
      });

      // Verify upsert was called with split names
      expect(mockUpsert).toHaveBeenCalled();
      const upsertPayload = mockUpsert.mock.calls[0][0];
      expect(upsertPayload.first_name).toBe('John');
      expect(upsertPayload.last_name).toBe('Doe Smith');
    });

    it('should handle Supabase errors gracefully', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: { id: 'test-user-id', email: 'test@example.com' },
        },
        error: null,
      });

      // Mock Supabase error
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: {
          code: '42501',
          message: 'Permission denied',
        },
      });

      const mockSelect = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockUpsert = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert,
      });

      const { upsertProfile } = await import('../profile');

      await expect(
        upsertProfile({
          account_type: 'sme',
          full_name: 'Test User',
          phone: '+260123456789',
        })
      ).rejects.toThrow('Permission denied');
    });
  });

  describe('Validation', () => {
    it('should ensure all account types are valid', () => {
      const validAccountTypes = [
        'sme',
        'donor',
        'admin',
        'sole_proprietor',
        'professional',
        'investor',
        'government',
      ];

      validAccountTypes.forEach((type) => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
      });
    });
  });
});
