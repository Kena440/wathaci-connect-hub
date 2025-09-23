/**
 * Payment Configuration
 * Centralized configuration for Lenco payment integration
 */

export interface PaymentConfig {
  publicKey: string;
  apiUrl: string;
  currency: string;
  country: string;
  platformFeePercentage: number;
  minAmount: number;
  maxAmount: number;
  environment: 'development' | 'production';
}

export interface LencoPaymentRequest {
  amount: number;
  currency: string;
  email: string;
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

const resolveRuntimeValue = (key: string): string | undefined => {
  try {
    const viteValue = (import.meta as any)?.env?.[key];
    if (viteValue) {
      return viteValue as string;
    }
  } catch (error) {
    // import.meta is not available (e.g. during Jest tests)
  }

  if (typeof globalThis !== 'undefined') {
    const runtimeValue = (globalThis as any).__APP_CONFIG__?.[key];
    if (runtimeValue) {
      return runtimeValue as string;
    }
  }

  if (typeof process !== 'undefined' && process.env) {
    const processValue = process.env[key];
    if (processValue) {
      return processValue;
    }
  }

  return undefined;
};

export const getPaymentConfig = (): PaymentConfig => {
  const environment = (resolveRuntimeValue('VITE_APP_ENV') as 'development' | 'production') || 'development';

  let publicKey = resolveRuntimeValue('VITE_LENCO_PUBLIC_KEY') || '';
  if (!publicKey) {
    publicKey = resolveRuntimeValue('LENCO_PUBLIC_KEY') || '';
  }

  if (!publicKey && environment === 'development') {
    console.warn('Payment Warning: Missing VITE_LENCO_PUBLIC_KEY. Falling back to default development key.');
    publicKey = DEFAULT_DEV_PUBLIC_KEY;
  }

  const config: PaymentConfig = {
    publicKey,
    apiUrl: resolveRuntimeValue('VITE_LENCO_API_URL') || 'https://api.lenco.co/access/v2',
    currency: resolveRuntimeValue('VITE_PAYMENT_CURRENCY') || 'ZMK',
    country: resolveRuntimeValue('VITE_PAYMENT_COUNTRY') || 'ZM',
    platformFeePercentage: parseFloat(resolveRuntimeValue('VITE_PLATFORM_FEE_PERCENTAGE') || '2'),
    minAmount: parseFloat(resolveRuntimeValue('VITE_MIN_PAYMENT_AMOUNT') || '5'),
    maxAmount: parseFloat(resolveRuntimeValue('VITE_MAX_PAYMENT_AMOUNT') || '1000000'),
    environment,
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

  return true;
};

// Calculate platform fee
export const calculatePlatformFee = (amount: number, feePercentage: number): number => {
  return Math.round((amount * feePercentage / 100) * 100) / 100;
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
export const formatAmount = (amount: number, currency: string = 'ZMK'): string => {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
};