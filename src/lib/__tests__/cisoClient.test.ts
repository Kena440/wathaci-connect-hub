import { jest } from '@jest/globals';

jest.mock('../supabaseClient', () => ({
  supabaseClient: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

jest.mock('@/config/appConfig', () => ({
  supabaseConfigStatus: { resolvedAnonKey: 'anon-key' },
}));

const originalEnv = { ...process.env };

const setBaseEnv = () => {
  process.env = {
    ...originalEnv,
    VITE_CISO_AGENT_URL: 'http://localhost:9999/agent',
    VITE_SUPABASE_ANON_KEY: 'anon-key',
  };
};

describe('callCisoAgent', () => {
  beforeEach(() => {
    jest.resetModules();
    setBaseEnv();
    (global.fetch as jest.Mock).mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns assistant reply when backend responds successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ answer: 'Hello from Ciso' }),
      headers: { get: () => 'application/json' },
      text: async () => '',
    });

    const { callCisoAgent } = await import('../cisoClient');
    const reply = await callCisoAgent([
      { role: 'user', content: 'Hi Ciso' },
    ]);

    expect(reply).toBe('Hello from Ciso');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:9999/agent',
      expect.any(Object),
    );
  });

  it('surfaces structured errors with user-friendly messaging', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        error: true,
        type: 'upstream_error',
        message: 'model unavailable',
        traceId: 'trace-123',
      }),
      headers: { get: () => 'application/json' },
      text: async () => '',
    });

    const { callCisoAgent, CisoAgentError } = await import('../cisoClient');

    let thrown: unknown;

    try {
      await callCisoAgent([{ role: 'user', content: 'Hello' }]);
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(CisoAgentError);
    expect(thrown).toMatchObject({
      type: 'upstream_error',
      traceId: 'trace-123',
    });
  });

  it('maps network failures to a clear error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('network down'),
    );

    const { callCisoAgent, CisoAgentError } = await import('../cisoClient');

    let thrown: unknown;

    try {
      await callCisoAgent([{ role: 'user', content: 'Hello' }]);
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(CisoAgentError);
    expect(thrown).toMatchObject({
      type: 'network_error',
    });
  });
});
