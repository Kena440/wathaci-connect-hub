/**
 * Supabase client configuration
 */

import { supabaseClient as supabaseBrowserClient } from './supabaseClient';
import type { SupabaseClient as SupabaseBrowserClient } from './supabaseClient';
import type { MarketplaceService } from '@/data/marketplace';
import {
  marketplaceProducts as datasetProducts,
  filterServicesByControls,
  runMarketplaceSearch,
  buildMarketplaceRecommendations,
  generatePricingAnalysis,
  generateAssistantResponse,
  generateProfessionalMatches,
  getMarketplaceCatalog
} from '@/data/marketplace';
import { SUPPORT_EMAIL } from './supportEmail';

type SupabaseClientLike = SupabaseBrowserClient | ReturnType<typeof createMockSupabaseClient>;

const sanitizeEnvValue = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  // Trim whitespace and remove surrounding quotes that may appear when values
  // are injected from JSON configuration files or shell exports.
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const unquoted = trimmed.replace(/^['"`]+|['"`]+$/g, '').trim();
  if (!unquoted || unquoted.toLowerCase() === 'undefined' || unquoted.toLowerCase() === 'null') {
    return undefined;
  }

  return unquoted;
};

const SUPABASE_URL_ENV_KEYS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PROJECT_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'PUBLIC_SUPABASE_URL',
  'SUPABASE_URL',
];

const SUPABASE_KEY_ENV_KEYS = [
  'VITE_SUPABASE_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_KEY',
  'SUPABASE_ANON_KEY',
];

const getImportMetaEnv = (): any => {
  // This function isolates import.meta from Jest's parser
  // Jest will skip parsing this when it's not called in test environments
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return undefined;
  }
  try {
    // Use Function constructor to completely hide import.meta from Jest parser
    return new Function('return typeof import.meta !== "undefined" ? import.meta : undefined')();
  } catch {
    return undefined;
  }
};

export const resolveEnvValue = (key: string): string | undefined => {
  // CRITICAL: Use explicit if/else for each key so Vite can replace import.meta.env.VITE_* at build time
  // Dynamic property access like import.meta.env[key] prevents Vite's static replacement
  let viteValue: string | undefined;
  
  // Check import.meta first with static property access for Vite replacement
  if (key === 'VITE_SUPABASE_URL') {
    viteValue = import.meta.env.VITE_SUPABASE_URL;
  } else if (key === 'VITE_SUPABASE_PROJECT_URL') {
    viteValue = import.meta.env.VITE_SUPABASE_PROJECT_URL;
  } else if (key === 'NEXT_PUBLIC_SUPABASE_URL') {
    viteValue = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
  } else if (key === 'PUBLIC_SUPABASE_URL') {
    viteValue = import.meta.env.PUBLIC_SUPABASE_URL;
  } else if (key === 'SUPABASE_URL') {
    viteValue = import.meta.env.SUPABASE_URL;
  } else if (key === 'VITE_SUPABASE_KEY') {
    viteValue = import.meta.env.VITE_SUPABASE_KEY;
  } else if (key === 'VITE_SUPABASE_ANON_KEY') {
    viteValue = import.meta.env.VITE_SUPABASE_ANON_KEY;
  } else if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
    viteValue = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  } else if (key === 'PUBLIC_SUPABASE_ANON_KEY') {
    viteValue = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  } else if (key === 'SUPABASE_KEY') {
    viteValue = import.meta.env.SUPABASE_KEY;
  } else if (key === 'SUPABASE_ANON_KEY') {
    viteValue = import.meta.env.SUPABASE_ANON_KEY;
  } else if (key === 'ALLOW_SUPABASE_MOCK') {
    viteValue = import.meta.env.ALLOW_SUPABASE_MOCK;
  }
  
  const sanitizedVite = sanitizeEnvValue(viteValue);
  if (sanitizedVite) {
    return sanitizedVite;
  }

  // Check process.env for test/Node.js environments
  if (typeof process !== 'undefined') {
    const processValue = sanitizeEnvValue(process.env?.[key]);
    if (processValue) {
      return processValue;
    }
  }

  // Check globalThis for runtime config
  if (typeof globalThis !== 'undefined') {
    const runtimeValue = sanitizeEnvValue((globalThis as any)?.__APP_CONFIG__?.[key]);
    if (runtimeValue) {
      return runtimeValue;
    }
  }

  return undefined;
};

const resolveFirstEnvValue = (keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = resolveEnvValue(key);
    if (value) {
      return value;
    }
  }
  return undefined;
};

const isTestEnvironment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
const isProductionEnvironment =
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') ||
  (typeof import.meta !== 'undefined' && Boolean((import.meta as any)?.env?.PROD));

const supabaseUrl = resolveFirstEnvValue(SUPABASE_URL_ENV_KEYS);
const supabaseKey = resolveFirstEnvValue(SUPABASE_KEY_ENV_KEYS);

const allowMockSupabaseClient =
  isTestEnvironment ||
  !isProductionEnvironment ||
  resolveEnvValue('ALLOW_SUPABASE_MOCK') === 'true';

const missingSupabaseConfig = !supabaseUrl || !supabaseKey;

const missingConfigMessage = [
  'Missing Supabase configuration for authentication.',
  `Set ${SUPABASE_URL_ENV_KEYS[0]} and ${SUPABASE_KEY_ENV_KEYS[0]} (or aliases) to enable sign-in and sign-up flows.`,
].join(' ');

if (missingSupabaseConfig) {
  const logPayload = {
    missingUrlKeys: SUPABASE_URL_ENV_KEYS,
    missingKeyKeys: SUPABASE_KEY_ENV_KEYS,
    environment: isProductionEnvironment ? 'production' : 'development',
    allowMockSupabaseClient,
  };

  if (!allowMockSupabaseClient) {
    console.error(`${missingConfigMessage} Falling back to mock client to avoid blocking sign-in/sign-up.`, logPayload);
  } else if (!isTestEnvironment) {
    console.warn(
      [
        missingConfigMessage,
        'Falling back to the mock Supabase client so the UI can still render.',
        'Set VITE_SUPABASE_URL (or its aliases) and either VITE_SUPABASE_KEY or VITE_SUPABASE_ANON_KEY environment variables to enable full functionality.',
      ].join(' '),
      logPayload,
    );
  }
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
  const mockData: Record<string, any> = {
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
    marketplace_orders: [],
    get marketplace_services() {
      return getMarketplaceCatalog();
    },
    get marketplace_products() {
      return datasetProducts.map(product => ({ ...product }));
    },
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
  const OTP_EXPIRY_MS = 5 * 60 * 1000;
  const otpChallenges = new Map<
    string,
    {
      token: string;
      expiresAt: number;
      type: 'email';
    }
  >();

  const generateOtpToken = () => Math.floor(100000 + Math.random() * 900000).toString();
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
          mockData[table] = mockData[table].map((item: any) => item.id === targetId ? { ...item, ...payload } : item);
          workingData = mockData[table].filter((item: any) => item.id === targetId);
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
      getSession: async () => ({
        data: {
          session: currentUser
            ? {
                user: currentUser,
                access_token: 'mock-access-token',
                token_type: 'bearer',
              }
            : null,
        },
        error: null,
      }),
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
      signInWithOtp: async ({
        email,
        options,
      }: {
        email: string;
        options?: { shouldCreateUser?: boolean; emailRedirectTo?: string; data?: Record<string, any> };
      }) => {
        const normalizedEmail = (email || '').toLowerCase();

        if (!normalizedEmail) {
          return {
            data: null,
            error: { message: 'Email is required', status: 400 },
          };
        }

        let record = mockAuthUsers.get(normalizedEmail);

        if (!record) {
          if (options?.shouldCreateUser) {
            const newUser = createMockAuthUser({
              email: normalizedEmail,
              user_metadata: options?.data ?? {},
            });
            mockAuthUsers.set(normalizedEmail, { password: '', user: newUser });
            record = { password: '', user: newUser };
          } else {
            return {
              data: null,
              error: { message: 'User not registered', status: 404 },
            };
          }
        }

        const token = generateOtpToken();
        otpChallenges.set(normalizedEmail, {
          token,
          expiresAt: Date.now() + OTP_EXPIRY_MS,
          type: 'email',
        });

        console.info('[mock-supabase] Generated OTP for %s: %s', normalizedEmail, token);

        return { data: { user: null, session: null }, error: null };
      },
      verifyOtp: async ({
        email,
        token,
        type,
      }: {
        email: string;
        token: string;
        type?: string;
      }) => {
        const normalizedEmail = (email || '').toLowerCase();

        if ((type ?? 'email') !== 'email') {
          return {
            data: null,
            error: { message: 'Unsupported verification type', status: 400 },
          };
        }

        const challenge = otpChallenges.get(normalizedEmail);

        if (!challenge) {
          return {
            data: null,
            error: { message: 'No pending verification code', status: 404 },
          };
        }

        if (challenge.expiresAt < Date.now()) {
          otpChallenges.delete(normalizedEmail);
          return {
            data: null,
            error: { message: 'Verification code expired', status: 400 },
          };
        }

        if (challenge.token !== token) {
          return {
            data: null,
            error: { message: 'Invalid verification code', status: 400 },
          };
        }

        const record = mockAuthUsers.get(normalizedEmail);

        if (!record) {
          otpChallenges.delete(normalizedEmail);
          return {
            data: null,
            error: { message: 'User not registered', status: 404 },
          };
        }

        currentUser = {
          ...record.user,
          updated_at: new Date().toISOString(),
        };

        mockAuthUsers.set(normalizedEmail, { password: record.password, user: currentUser });
        otpChallenges.delete(normalizedEmail);
        notifyAuthListeners('SIGNED_IN', currentUser);

        return { data: { user: currentUser, session: null }, error: null };
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
      resetPasswordForEmail: async (email: string, options?: { redirectTo?: string }) => {
        const normalizedEmail = (email || '').toLowerCase();
        const record = mockAuthUsers.get(normalizedEmail);

        // Mirror Supabase behaviour: always succeed to avoid user enumeration
        if (!record) {
          console.info(
            '[mock-supabase] Password reset email would be sent to %s (no matching account found)',
            normalizedEmail
          );
          return { data: {}, error: null };
        }

        console.info('[mock-supabase] Password reset email would be sent to %s', normalizedEmail);
        return { data: {}, error: null };
      },
      updateUser: async ({ password }: { password?: string; data?: Record<string, any> }) => {
        if (!currentUser) {
          return {
            data: null,
            error: { message: 'Not authenticated', status: 401 },
          };
        }

        if (password) {
          const normalizedEmail = currentUser.email.toLowerCase();
          const record = mockAuthUsers.get(normalizedEmail);
          
          if (record) {
            mockAuthUsers.set(normalizedEmail, { 
              password, 
              user: currentUser 
            });
          }
        }

        return { data: { user: currentUser }, error: null };
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

        if (name === 'lenco-transfer-recipient') {
          const walletNumber = typeof body.walletNumber === 'string' ? body.walletNumber : '0000';

          return {
            data: {
              status: true,
              message: 'Transfer recipient created successfully',
              data: {
                id: 'mock-transfer-recipient',
                currency: 'ZMW',
                type: 'wallet',
                country: 'ZM',
                details: {
                  type: 'lenco-money',
                  accountName: 'Mock Wallet Account',
                  walletNumber,
                },
              },
            },
            error: null,
          };
        }

        if (name === 'marketplace-manager') {
          const action = body.action ?? 'search';

          if (action === 'search') {
            const filters = body.filters ?? {};
            const services = filterServicesByControls(
              (mockData.marketplace_services || []) as MarketplaceService[],
              filters
            );

            return {
              data: { data: services },
              error: null
            };
          }

          if (action === 'list-products') {
            return {
              data: { data: mockData.marketplace_products || [] },
              error: null
            };
          }

          if (action === 'list-services') {
            return {
              data: { data: mockData.marketplace_services || [] },
              error: null
            };
          }

          return { data: { data: [] }, error: null };
        }

        if (name === 'ai-professional-matcher') {
          const type = body.type;

          if (type === 'marketplace_search') {
            const query = typeof body.query === 'string' ? body.query : '';
            const filters = Array.isArray(body.filters) ? body.filters : [];
            return {
              data: runMarketplaceSearch(query, filters),
              error: null
            };
          }

          if (type === 'marketplace_recommendations') {
            const recommendationType = body.recommendationType ?? 'personalized';
            return {
              data: { recommendations: buildMarketplaceRecommendations(recommendationType) },
              error: null
            };
          }

          if (type === 'pricing_analysis') {
            const analysis = generatePricingAnalysis({
              description: body.description ?? '',
              category: body.category,
              location: body.location
            });
            return { data: analysis, error: null };
          }

          if (type === 'marketplace_assistant') {
            const assistant = generateAssistantResponse(body.message ?? '', body.context);
            return { data: assistant, error: null };
          }

          if (type === 'marketplace_recommendation') {
            const recommendationType = body.recommendationType ?? 'personalized';
            return {
              data: { recommendations: buildMarketplaceRecommendations(recommendationType) },
              error: null
            };
          }

          const matches = generateProfessionalMatches(Array.isArray(body.gaps) ? body.gaps : []);
          return { data: { matches }, error: null };
        }

        return { data: { success: true, data: {} }, error: null };
      }
    },
    from: (table: string) => createQueryBuilder(table)
  } as const;
}

const forcedMockSupabaseClient = missingSupabaseConfig && !allowMockSupabaseClient;
const supabaseConfigWarning = missingSupabaseConfig ? missingConfigMessage : undefined;

const supabaseClient: SupabaseClientLike = supabaseBrowserClient || createMockSupabaseClient();

export const supabaseAuthConfigStatus = {
  hasValidConfig: !missingSupabaseConfig,
  supabaseUrl,
  supabaseAnonKey: supabaseKey,
  usingMockClient: missingSupabaseConfig,
  allowMockSupabaseClient,
  missingUrlKeys: SUPABASE_URL_ENV_KEYS,
  missingKeyKeys: SUPABASE_KEY_ENV_KEYS,
  isProductionEnvironment,
  forcedMockSupabaseClient,
  configWarning: supabaseConfigWarning,
};

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

export type HealthCheckStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckResult {
  status: HealthCheckStatus;
  timestamp: string;
  details: {
    connection: HealthCheckStatus;
    auth: HealthCheckStatus;
    error?: string;
  };
}

export const healthCheck = async (): Promise<HealthCheckResult> => {
  const timestamp = new Date().toISOString();
  const issues: string[] = [];

  let connectionStatus: HealthCheckStatus = 'unhealthy';
  try {
    const isConnected = await testConnection();
    connectionStatus = isConnected ? 'healthy' : 'unhealthy';
    if (!isConnected) {
      issues.push('Database connection failed');
    }
  } catch (error) {
    connectionStatus = isTestEnvironment ? 'degraded' : 'unhealthy';
    const message = error instanceof Error ? error.message : 'Unknown connection error';
    issues.push(`Connection exception: ${message}`);
  }

  let authStatus: HealthCheckStatus = 'unhealthy';
  try {
    const { data, error } = await (supabase as SupabaseClientLike).auth.getUser();

    if (error) {
      const message = error.message || 'Unknown authentication error';
      if (message.toLowerCase().includes('session')) {
        authStatus = 'degraded';
      } else {
        authStatus = 'unhealthy';
        issues.push(`Auth error: ${message}`);
      }
    } else if (data?.user) {
      authStatus = 'healthy';
    } else {
      authStatus = 'degraded';
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown authentication error';
    authStatus = isTestEnvironment ? 'degraded' : 'unhealthy';
    issues.push(`Auth exception: ${message}`);
  }

  let status: HealthCheckStatus = 'unhealthy';
  if (connectionStatus === 'healthy' && authStatus === 'healthy') {
    status = 'healthy';
  } else if (connectionStatus === 'healthy' && authStatus !== 'unhealthy') {
    status = 'degraded';
  } else if (connectionStatus !== 'unhealthy' && authStatus !== 'unhealthy') {
    status = 'degraded';
  }

  const errorMessage = issues.length > 0 ? issues.join('; ') : undefined;

  return {
    status,
    timestamp,
    details: {
      connection: connectionStatus,
      auth: authStatus,
      ...(errorMessage ? { error: errorMessage } : {}),
    },
  };
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
      const normalizedMessage = errorMessage.toLowerCase();

      if (normalizedMessage.includes('failed to fetch') ||
          normalizedMessage.includes('fetch failed') ||
          normalizedMessage.includes('networkerror') ||
          normalizedMessage.includes('econnrefused')) {
        return {
          data: null,
          error: new Error('Unable to connect to the server right now. Please try again shortly.')
        };
      }

      if (normalizedMessage.includes('invalid api key') ||
          normalizedMessage.includes('invalid supabase url')) {
        return {
          data: null,
          error: new Error(`Configuration error. Please contact ${SUPPORT_EMAIL}.`)
        };
      }

      // For authentication-specific errors, provide better messages
      if (context.includes('signIn') || context.includes('signUp')) {
        if (normalizedMessage.includes('invalid login credentials') ||
            normalizedMessage.includes('invalid_grant')) {
          return { data: null, error: new Error('Invalid email or password. Please try again.') };
        }

        const duplicateSignupError =
          normalizedMessage.includes('user already registered') ||
          normalizedMessage.includes('already exists') ||
          normalizedMessage.includes('database error saving new user');

        if (duplicateSignupError) {
          return { data: null, error: new Error('An account with this email already exists. Please sign in instead.') };
        }

        if (normalizedMessage.includes('email not confirmed')) {
          return { data: null, error: new Error('Please verify your email address before signing in.') };
        }

        if (context.includes('signUp') && normalizedMessage.includes('password')) {
          return { data: null, error: new Error('Password does not meet requirements. Please use a stronger password.') };
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
        error: new Error('Unable to reach the server right now. Please try again shortly.')
      };
    }
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { data: null, error: new Error(message) };
  }
};