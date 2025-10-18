import { jest } from '@jest/globals';

describe('supabase-enhanced environment handling', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('strips quotes and whitespace from environment variables before creating the client', async () => {
    process.env.VITE_SUPABASE_URL = '  "https://example.supabase.co"  ';
    process.env.VITE_SUPABASE_KEY = "  'anon-test-key'  ";

    const createClient = jest.fn(() => ({ auth: {} }));

    jest.doMock('@supabase/supabase-js', () => ({
      createClient,
    }));

    await import('../supabase-enhanced');

    expect(createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-test-key',
      expect.objectContaining({ auth: expect.any(Object) })
    );
  });

  it('treats quoted "undefined" values as missing', async () => {
    process.env.VITE_SUPABASE_URL = '"undefined"';
    process.env.VITE_SUPABASE_KEY = '"undefined"';

    const createClient = jest.fn(() => ({ auth: {} }));

    jest.doMock('@supabase/supabase-js', () => ({
      createClient,
    }));

    const { supabase } = await import('../supabase-enhanced');

    expect(createClient).not.toHaveBeenCalled();
    expect(typeof supabase).toBe('object');
  });

  it('rejects supabase URLs that do not use https', async () => {
    process.env.NODE_ENV = 'production';
    process.env.VITE_SUPABASE_URL = 'http://example.supabase.co';
    process.env.VITE_SUPABASE_KEY = 'anon-test-key';

    jest.doMock('@supabase/supabase-js', () => ({
      createClient: jest.fn(() => ({ auth: {} })),
    }));

    await expect(import('../supabase-enhanced')).rejects.toThrow('https://');
  });
});
