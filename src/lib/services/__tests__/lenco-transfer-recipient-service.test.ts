import { lencoTransferRecipientService } from '../lenco-transfer-recipient-service';
import { supabaseClient } from '../../supabaseClient';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
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
      lte: jest.fn().mockReturnThis(),
    })),
    functions: {
      invoke: jest.fn(),
    },
  })),
}));

jest.mock('../../logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('LencoTransferRecipientService', () => {
  const originalInvoke = supabaseClient.functions.invoke;
  const invokeSpy = jest.spyOn(supabaseClient.functions, 'invoke');

  beforeEach(() => {
    invokeSpy.mockClear();
    invokeSpy.mockImplementation(originalInvoke as any);
  });

  afterAll(() => {
    invokeSpy.mockRestore();
  });

  it('creates a transfer recipient with sanitized wallet number', async () => {
    const response = await lencoTransferRecipientService.createRecipient({ walletNumber: ' 1234 567890 ' });

    expect(response.status).toBe(true);
    expect(response.data?.details.walletNumber).toBe('1234567890');
    expect(invokeSpy).toHaveBeenCalledWith('lenco-transfer-recipient', {
      body: { walletNumber: '1234567890' },
    });
  });

  it('rejects an empty wallet number', async () => {
    const response = await lencoTransferRecipientService.createRecipient({ walletNumber: '   ' });

    expect(response.status).toBe(false);
    expect(response.message).toMatch(/walletNumber is required/i);
    expect(invokeSpy).not.toHaveBeenCalled();
  });

  it('surfaces API errors gracefully', async () => {
    invokeSpy.mockResolvedValueOnce({ data: null, error: { message: 'API failure' } } as any);

    const response = await lencoTransferRecipientService.createRecipient({ walletNumber: '9988776655' });

    expect(response.status).toBe(false);
    expect(response.message).toBe('API failure');
    expect(invokeSpy).toHaveBeenCalledWith('lenco-transfer-recipient', {
      body: { walletNumber: '9988776655' },
    });
  });
});
