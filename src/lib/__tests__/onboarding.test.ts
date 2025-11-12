/**
 * Tests for onboarding helper functions
 */

import { upsertProfile } from '../onboarding';
import { supabaseClient } from '../supabaseClient';

// Mock supabase client
jest.mock('../supabaseClient', () => ({
  supabaseClient: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('onboarding helper', () => {
  describe('upsertProfile', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('throws error when user is not authenticated', async () => {
      (supabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(
        upsertProfile({
          account_type: 'sme',
          msisdn: '+260123456789',
        })
      ).rejects.toThrow('User not authenticated');
    });

    it('throws error when msisdn is not provided', async () => {
      (supabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });

      await expect(
        upsertProfile({
          account_type: 'sme',
          msisdn: '',
        })
      ).rejects.toThrow('MSISDN (mobile money number) is required for all profiles and must include 9-15 digits.');
    });

    it('successfully creates profile with required fields', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockProfile = {
        id: 'user-123',
        account_type: 'sme',
        msisdn: '+260123456789',
        phone: '+260123456789',
        email: 'test@example.com',
      };

      (supabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      });

      const mockUpsert = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabaseClient.from as jest.Mock).mockReturnValue({
        upsert: mockUpsert,
      });

      const result = await upsertProfile({
        account_type: 'sme',
        msisdn: ' +260 123 456 789 ',
      });

      expect(result).toEqual(mockProfile);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-123',
          account_type: 'sme',
          msisdn: '+260123456789',
          phone: '+260123456789',
          email: 'test@example.com',
        }),
        { onConflict: 'id' }
      );
    });

    it('includes business name when provided', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      (supabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {},
          error: null,
        }),
      });

      const mockUpsert = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabaseClient.from as jest.Mock).mockReturnValue({
        upsert: mockUpsert,
      });

      await upsertProfile({
        account_type: 'sme',
        msisdn: '+260123456789',
        business_name: 'Test Business Ltd',
      });

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          business_name: 'Test Business Ltd',
        }),
        { onConflict: 'id' }
      );
    });

    it('validates msisdn format', async () => {
      (supabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });

      // Valid formats should work
      const validMsisdns = [
        { input: '+260123456789', expected: '+260123456789' },
        { input: '260123456789', expected: '+260123456789' },
        { input: '1234567890', expected: '+1234567890' },
        { input: '+123 456 789 01234', expected: '+12345678901234' },
      ];

      for (const { input, expected } of validMsisdns) {
        const mockSelect = jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { msisdn: expected },
            error: null,
          }),
        });

        const mockUpsert = jest.fn().mockReturnValue({
          select: mockSelect,
        });

        (supabaseClient.from as jest.Mock).mockReturnValue({
          upsert: mockUpsert,
        });

        await expect(
          upsertProfile({
            account_type: 'sme',
            msisdn: input,
          })
        ).resolves.toBeDefined();

        expect(mockUpsert).toHaveBeenCalledWith(
          expect.objectContaining({
            msisdn: expected,
            phone: expected,
          }),
          { onConflict: 'id' }
        );
      }
    });

    it('throws when msisdn length is invalid', async () => {
      (supabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });

      await expect(
        upsertProfile({
          account_type: 'sme',
          msisdn: '+1234',
        })
      ).rejects.toThrow('MSISDN (mobile money number) is required for all profiles and must include 9-15 digits.');
    });
  });
});
