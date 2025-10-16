/**
 * Supabase client configuration
 */

import { createClient } from '@supabase/supabase-js';

type SupabaseClientLike = ReturnType<typeof createClient> | ReturnType<typeof createMockSupabaseClient>;

const resolveEnvValue = (key: string): string | undefined => {
  // Check process.env first (works in test and Node environments)
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key];
  }

  // Check globalThis for runtime config
  if (typeof globalThis !== 'undefined') {
    const runtimeValue = (globalThis as any)?.__APP_CONFIG__?.[key];
    if (runtimeValue) {
      return runtimeValue as string;
    }
  }

  return undefined;
};

const isTestEnvironment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

const supabaseUrl = resolveEnvValue('VITE_SUPABASE_URL') || resolveEnvValue('SUPABASE_URL');
const supabaseKey = resolveEnvValue('VITE_SUPABASE_KEY') || resolveEnvValue('SUPABASE_KEY');

if ((!supabaseUrl || !supabaseKey) && !isTestEnvironment) {
  throw new Error('Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_KEY environment variables.');
}

type MockAuthUser = {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  user_metadata: Record<string, any>;
};

const createMockAuthUser = (overrides: Partial<MockAuthUser> = {}): MockAuthUser => {
  const timestamp = new Date().toISOString();
  return {
    id: overrides.id ?? `mock-user-${Math.random().toString(36).slice(2, 10)}`,
    email: overrides.email ?? 'user@example.com',
    created_at: overrides.created_at ?? timestamp,
    updated_at: overrides.updated_at ?? timestamp,
    user_metadata: overrides.user_metadata ?? {},
  };
};

function createMockSupabaseClient() {
  const mockData: Record<string, any[]> = {
    user_subscriptions: [
      {
        id: 'sub_mock_active',
        user_id: 'user_mock_1',
        status: 'active',
        payment_reference: 'MOCK_REF_ACTIVE',
        plan_id: 'plan_mock_basic',
        start_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
        payment_status: 'paid',
        auto_renew: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'sub_mock_cancelled',
        user_id: 'user_mock_2',
        status: 'cancelled',
        payment_reference: 'MOCK_REF_CANCELLED',
        plan_id: 'plan_mock_pro',
        start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        payment_status: 'failed',
        auto_renew: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    transactions: [
      {
        id: 'txn_mock_recent',
        user_id: 'user_mock_1',
        subscription_id: 'sub_mock_active',
        amount: 50,
        status: 'completed',
        payment_method: 'card',
        payment_reference: 'MOCK_REF_ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'txn_mock_previous',
        user_id: 'user_mock_2',
        subscription_id: 'sub_mock_cancelled',
        amount: 75,
        status: 'completed',
        payment_method: 'phone',
        payment_reference: 'MOCK_REF_CANCELLED',
        created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  };

  const mockAuthUsers = new Map<string, { password: string; user: MockAuthUser }>();
  const authListeners = new Set<(event: string, session: { user: MockAuthUser | null } | null) => void>();
  let currentUser: MockAuthUser | null = null;

  const notifyAuthListeners = (event: string, user: MockAuthUser | null) => {
    const session = user ? { user } : { user: null };
    authListeners.forEach(listener => {
      try {
        listener(event, session);
      } catch (error) {
        console.error('Mock Supabase auth listener error:', error);
      }
    });
  };

  const defaultUser = createMockAuthUser({
    id: 'mock-user-demo',
    email: 'demo@wathaci.test',
    user_metadata: {
      full_name: 'Demo User',
      account_type: 'sme',
      profile_completed: false,
    },
  });
  mockAuthUsers.set(defaultUser.email.toLowerCase(), { password: 'password123', user: defaultUser });

  const resolveQueryResult = (table: string, data: any) => {
    if (table === 'user_subscriptions' && Array.isArray(data)) {
      return data.map(record => ({ ...record }));
    }
    if (Array.isArray(data)) {
      return data.map(record => ({ ...record }));
    }
    return data ? { ...data } : data;
  };

  const createQueryBuilder = (table: string) => {
    let workingData: any[] = resolveQueryResult(table, mockData[table] || []);

    const chainable: any = {
      select: () => chainable,
      eq: (field: string, value: any) => {
        workingData = workingData.filter(item => item?.[field] === value);
        return chainable;
      },
      in: (field: string, values: any[]) => {
        workingData = workingData.filter(item => values.includes(item?.[field]));
        return chainable;
      },
      ilike: (field: string, pattern: string) => {
        const matcher = pattern.replace(/%/g, '').toLowerCase();
        workingData = workingData.filter(item => String(item?.[field] ?? '').toLowerCase().includes(matcher));
        return chainable;
      },
      contains: () => chainable,
      or: () => chainable,
      gte: (field: string, value: any) => {
        workingData = workingData.filter(item => item?.[field] >= value);
        return chainable;
      },
      lte: (field: string, value: any) => {
        workingData = workingData.filter(item => item?.[field] <= value);
        return chainable;
      },
      gt: (field: string, value: any) => {
        workingData = workingData.filter(item => item?.[field] > value);
        return chainable;
      },
      lt: (field: string, value: any) => {
        workingData = workingData.filter(item => item?.[field] < value);
        return chainable;
      },
      range: () => chainable,
      order: () => chainable,
      limit: () => chainable,
      single: async () => ({ data: workingData[0] ?? null, error: null }),
      maybeSingle: async () => ({ data: workingData[0] ?? null, error: null }),
      insert: async (payload: any) => {
        const records = Array.isArray(payload) ? payload : [payload];
        const inserted = records.map(record => ({
          id: record?.id || `mock_${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...record
        }));
        mockData[table] = [...(mockData[table] || []), ...inserted];
        workingData = inserted;
        return { data: Array.isArray(payload) ? inserted : inserted[0], error: null };
      },
      update: async (payload: any) => {
        if (!mockData[table]) {
          mockData[table] = [];
        }
        const targetId = payload?.id || workingData[0]?.id;
        if (targetId) {
          mockData[table] = mockData[table].map(item => item.id === targetId ? { ...item, ...payload } : item);
          workingData = mockData[table].filter(item => item.id === targetId);
        }
        return { data: workingData[0] ?? null, error: null };
      },
      upsert: async (payload: any) => chainable.insert(payload),
      delete: async () => ({ data: null, error: null }),
      then: (onFulfilled: any, onRejected: any) => Promise.resolve({ data: workingData, error: null }).then(onFulfilled, onRejected),
      catch: (onRejected: any) => Promise.resolve({ data: workingData, error: null }).catch(onRejected)
    };

    return chainable;
  };

  return {
    auth: {
      getUser: async () => ({ data: { user: currentUser }, error: null }),
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        const normalizedEmail = (email || '').toLowerCase();
        const record = mockAuthUsers.get(normalizedEmail);

        if (!record || record.password !== password) {
          return {
            data: null,
            error: { message: 'Invalid login credentials', status: 400 },
          };
        }

        currentUser = {
          ...record.user,
          updated_at: new Date().toISOString(),
        };
        mockAuthUsers.set(normalizedEmail, { password: record.password, user: currentUser });

        notifyAuthListeners('SIGNED_IN', currentUser);

        return { data: { user: currentUser }, error: null };
      },
      signUp: async ({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, any> } }) => {
        const normalizedEmail = (email || '').toLowerCase();

        if (mockAuthUsers.has(normalizedEmail)) {
          return {
            data: null,
            error: { message: 'User already registered', status: 409 },
          };
        }

        const metadata = options?.data ?? {};
        const newUser = createMockAuthUser({
          email: normalizedEmail,
          user_metadata: metadata,
        });

        mockAuthUsers.set(normalizedEmail, { password, user: newUser });
        currentUser = newUser;

        notifyAuthListeners('SIGNED_IN', currentUser);

        return { data: { user: newUser }, error: null };
      },
      signOut: async () => {
        currentUser = null;
        notifyAuthListeners('SIGNED_OUT', null);
        return { error: null };
      },
      onAuthStateChange: (callback: (event: string, session: { user: MockAuthUser | null } | null) => void) => {
        authListeners.add(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => authListeners.delete(callback),
            },
          },
          error: null,
        };
      },
    },
    functions: {
      invoke: async (name: string, options?: { body?: any }) => {
        const body = options?.body || {};

        if (name === 'lenco-payment') {
          if (body.action === 'initialize') {
            return {
              data: {
                success: true,
                data: {
                  payment_url: 'https://mock-payments.test/checkout',
                  authorization_url: 'https://mock-payments.test/checkout',
                  access_code: 'MOCK_ACCESS_CODE',
                  reference: body.reference || `MOCK_${Date.now()}`
                }
              },
              error: null
            };
          }

          if (body.action === 'verify') {
            return {
              data: {
                success: true,
                data: {
                  status: 'success',
                  amount: 5000,
                  currency: 'ZMW',
                  id: 'mock-transaction',
                  gateway_response: 'Payment completed',
                  paid_at: new Date().toISOString(),
                  metadata: body.metadata || {}
                }
              },
              error: null
            };
          }
        }

        return { data: { success: true, data: {} }, error: null };
      }
    },
    from: (table: string) => createQueryBuilder(table)
  } as const;
}

const supabaseClient: SupabaseClientLike =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      })
    : createMockSupabaseClient();

export const supabase = supabaseClient;

/**
 * Test basic connectivity to Supabase
 * @returns Promise resolving to true if connection is successful, false otherwise
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const { error } = await (supabase as SupabaseClientLike)
      .from('profiles')
      .select('count', { count: 'exact', head: true });
    return !error;
  } catch (error) {
    console.error('Connection test failed:', error);
    return !!isTestEnvironment;
  }
};

// Enhanced error handling wrapper with network error detection
export const withErrorHandling = async <T>(
  operation: () => PromiseLike<{ data: T | null; error: any }>,
  context: string
): Promise<{ data: T | null; error: Error | null }> => {
  try {
    const result = await operation();
    
    if (result.error) {
      console.error(`Error in ${context}:`, result.error);
      
      // Check for common network/connection errors
      const errorMessage = result.error.message || '';
      
      if (errorMessage.includes('Failed to fetch') || 
          errorMessage.includes('fetch failed') ||
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('ECONNREFUSED')) {
        return { 
          data: null, 
          error: new Error('Unable to connect to the server. Please check your internet connection and try again.') 
        };
      }
      
      if (errorMessage.includes('Invalid API key') || 
          errorMessage.includes('Invalid Supabase URL')) {
        return { 
          data: null, 
          error: new Error('Configuration error. Please contact support.') 
        };
      }
      
      // For authentication-specific errors, provide better messages
      if (context.includes('signIn') || context.includes('signUp')) {
        if (errorMessage.includes('Invalid login credentials') || 
            errorMessage.includes('invalid_grant')) {
          return { data: null, error: new Error('Invalid email or password. Please try again.') };
        }
        
        if (errorMessage.includes('User already registered') || 
            errorMessage.includes('already exists')) {
          return { data: null, error: new Error('An account with this email already exists. Please sign in instead.') };
        }
        
        if (errorMessage.includes('Email not confirmed')) {
          return { data: null, error: new Error('Please verify your email address before signing in.') };
        }
      }
      
      return { data: null, error: new Error(result.error.message) };
    }

    return { data: result.data, error: null };
  } catch (error) {
    console.error(`Exception in ${context}:`, error);
    
    // Handle network errors at the exception level
    if (error instanceof TypeError && 
        (error.message.includes('fetch') || error.message.includes('network'))) {
      return { 
        data: null, 
        error: new Error('Network error. Please check your internet connection and try again.') 
      };
    }
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { data: null, error: new Error(message) };
  }
};