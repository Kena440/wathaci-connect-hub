/**
 * Payment Configuration
 * Centralized configuration for Lenco payment integration
 */

import { getEnvValue, type EnvKey } from "@/config/appConfig";

export interface PaymentConfig {
  publicKey: string;
  apiUrl: string;
  currency: string;
  country: string;
  platformFeePercentage: number;
  minAmount: number;
  maxAmount: number;
  environment: 'development' | 'production';
  webhookUrl?: string;
  sources?: {
    publicKey?: EnvKey;
    apiUrl?: EnvKey;
    webhookUrl?: EnvKey;
  };
}

export type TransactionType = 'marketplace' | 'resource' | 'donation' | 'subscription';

export interface LencoPaymentRequest {
  amount: number;
  currency: string;
  email?: string;
  phone: string;
  name: string;
  description: string;
  reference: string;
  callback_url?: string;
  metadata?: Record<string, any>;
  payment_method?: 'mobile_money' | 'card' | 'bank_transfer';
  provider?: 'mtn' | 'airtel' | 'zamtel';
}

export interface LencoPaymentResponse {
  success: boolean;
  data?: {
    payment_url: string;
    reference: string;
    access_code: string;
  };
  message?: string;
  error?: string;
}

export interface PaymentStatus {
  reference: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  transaction_id?: string;
  gateway_response?: string;
  paid_at?: string;
  metadata?: Record<string, any>;
}

// Load configuration from environment variables
const DEFAULT_DEV_PUBLIC_KEY = 'pub-dea560c94d379a23e7b85a265d7bb9acbd585481e6e1393e';

const LENCO_PUBLIC_KEY_KEYS: readonly EnvKey[] = ["VITE_LENCO_PUBLIC_KEY", "LENCO_PUBLIC_KEY"];
const LENCO_API_URL_KEYS: readonly EnvKey[] = ["VITE_LENCO_API_URL", "LENCO_API_URL"];
const LENCO_WEBHOOK_URL_KEYS: readonly EnvKey[] = ["VITE_LENCO_WEBHOOK_URL", "LENCO_WEBHOOK_URL"];
const PLATFORM_FEE_KEYS: readonly EnvKey[] = ["VITE_PLATFORM_FEE_PERCENTAGE", "PLATFORM_FEE_PERCENTAGE"];
const MIN_AMOUNT_KEYS: readonly EnvKey[] = ["VITE_MIN_PAYMENT_AMOUNT", "MIN_PAYMENT_AMOUNT"];
const MAX_AMOUNT_KEYS: readonly EnvKey[] = ["VITE_MAX_PAYMENT_AMOUNT", "MAX_PAYMENT_AMOUNT"];
const CURRENCY_KEYS: readonly EnvKey[] = ["VITE_PAYMENT_CURRENCY", "PAYMENT_CURRENCY"];
const COUNTRY_KEYS: readonly EnvKey[] = ["VITE_PAYMENT_COUNTRY", "PAYMENT_COUNTRY"];
const ENVIRONMENT_KEYS: readonly EnvKey[] = ["VITE_APP_ENV"];

interface PaymentEnvResolution {
  key?: EnvKey;
  value?: string;
}

const resolveFromEnv = (keys: readonly EnvKey[]): PaymentEnvResolution => {
  for (const key of keys) {
    const value = getEnvValue(key);
    if (value) {
      return { key, value };
    }
  }
  return {};
};

export const getPaymentEnvValue = (key: string): string | undefined => {
  return getEnvValue(key as EnvKey);
};

export const getPaymentConfig = (): PaymentConfig => {
  const environment =
    (resolveFromEnv(ENVIRONMENT_KEYS).value as 'development' | 'production' | undefined) ||
    (import.meta.env.MODE === 'production' ? 'production' : 'development');

  const publicKeyResolution = resolveFromEnv(LENCO_PUBLIC_KEY_KEYS);
  let publicKey = publicKeyResolution.value || '';

  if (!publicKey && environment === 'development') {
    console.warn('Payment Warning: Missing VITE_LENCO_PUBLIC_KEY. Falling back to default development key.');
    publicKey = DEFAULT_DEV_PUBLIC_KEY;
  }

  const apiUrlResolution = resolveFromEnv(LENCO_API_URL_KEYS);
  const webhookResolution = resolveFromEnv(LENCO_WEBHOOK_URL_KEYS);

  const config: PaymentConfig = {
    publicKey,
    apiUrl: apiUrlResolution.value || 'https://api.lenco.co/access/v2',
    currency: resolveFromEnv(CURRENCY_KEYS).value || 'ZMW',
    country: resolveFromEnv(COUNTRY_KEYS).value || 'ZM',
    platformFeePercentage: parseFloat(resolveFromEnv(PLATFORM_FEE_KEYS).value || '10'),
    minAmount: parseFloat(resolveFromEnv(MIN_AMOUNT_KEYS).value || '0'),
    maxAmount: parseFloat(resolveFromEnv(MAX_AMOUNT_KEYS).value || '50000'),
    environment,
    webhookUrl: webhookResolution.value || undefined,
    sources: {
      publicKey: publicKeyResolution.key,
      apiUrl: apiUrlResolution.key,
      webhookUrl: webhookResolution.key,
    },
  };

  return config;
};

// Validate payment configuration
export const validatePaymentConfig = (config: PaymentConfig): boolean => {
  if (!config.publicKey) {
    console.warn('Payment Warning: Lenco public key not configured - payment features will be disabled');
    return false;
  }

  if (!config.apiUrl) {
    console.warn('Payment Warning: Lenco API URL not configured - payment features will be disabled');
    return false;
  }

  if (config.environment === 'production' && config.publicKey.startsWith('pk_test_')) {
    console.error('Payment Error: Production environment is using a test public key (pk_test_).');
    return false;
  }

  if (!config.webhookUrl) {
    console.warn('Payment Warning: Lenco webhook URL not configured - webhook events will not be received');
  } else if (!/^https:\/\//i.test(config.webhookUrl)) {
    console.warn('Payment Warning: Lenco webhook URL must be HTTPS');
  }

  return true;
};

// Calculate platform fee based on transaction type
export const calculatePlatformFee = (amount: number, feePercentage: number, transactionType?: TransactionType): number => {
  // Exempt donations and subscriptions from platform fees
  if (transactionType === 'donation' || transactionType === 'subscription') {
    return 0;
  }
  
  // Apply platform fee for marketplace and resource transactions
  return Math.round((amount * feePercentage / 100) * 100) / 100;
};

// Get platform fee percentage based on transaction type
export const getPlatformFeePercentage = (transactionType?: TransactionType): number => {
  const config = getPaymentConfig();
  
  // Exempt donations and subscriptions from platform fees
  if (transactionType === 'donation' || transactionType === 'subscription') {
    return 0;
  }
  
  // Use configured fee percentage for marketplace and resource transactions
  return config.platformFeePercentage;
};

// Generate payment reference
export const generatePaymentReference = (prefix: string = 'WC'): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
};

// Validate phone number for mobile money
export const validatePhoneNumber = (phone: string, country: string = 'ZM'): boolean => {
  if (country === 'ZM') {
    // Zambian mobile number validation
    // Supports MTN (096/076), Airtel (097/077) and Zamtel (095) prefixes
    // Accepts optional country code +260
    const sanitized = phone.replace(/\s/g, '');
    const zambianRegex =
      /^(?:0(95|96|97|76|77)\d{7}|(?:\+?260)(95|96|97|76|77)\d{7})$/;
    return zambianRegex.test(sanitized);
  }
  return phone.length >= 10;
};

// Format amount for display
export const formatAmount = (amount: number, currency: string = 'ZMW'): string => {
  if (currency === 'ZMW') {
    // Display ZMW instead of K for clarity
    return `ZMW ${amount.toFixed(2)}`;
  }
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
};