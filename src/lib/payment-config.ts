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
export const getPaymentConfig = (): PaymentConfig => {
  const config: PaymentConfig = {
    publicKey: import.meta.env.VITE_LENCO_PUBLIC_KEY || '',
    apiUrl: import.meta.env.VITE_LENCO_API_URL || 'https://api.lenco.co/access/v2',
    currency: import.meta.env.VITE_PAYMENT_CURRENCY || 'ZMK',
    country: import.meta.env.VITE_PAYMENT_COUNTRY || 'ZM',
    platformFeePercentage: parseFloat(import.meta.env.VITE_PLATFORM_FEE_PERCENTAGE || '2'),
    minAmount: parseFloat(import.meta.env.VITE_MIN_PAYMENT_AMOUNT || '5'),
    maxAmount: parseFloat(import.meta.env.VITE_MAX_PAYMENT_AMOUNT || '1000000'),
    environment: (import.meta.env.VITE_APP_ENV as 'development' | 'production') || 'development'
  };

  return config;
};

// Validate payment configuration
export const validatePaymentConfig = (config: PaymentConfig): boolean => {
  if (!config.publicKey) {
    console.warn(
      'Payment Warning: Lenco public key not configured - payment features will be disabled'
    );
    return false;
  }

  if (!config.apiUrl) {
    console.warn(
      'Payment Warning: Lenco API URL not configured - payment features will be disabled'
    );
    return false;
  }

  if (!config.currency) {
    console.warn(
      'Payment Warning: Payment currency not configured - payment features will be disabled'
    );
    return false;
  }

  if (!config.country) {
    console.warn(
      'Payment Warning: Payment country not configured - payment features will be disabled'
    );
    return false;
  }

  if (
    typeof config.platformFeePercentage !== 'number' ||
    isNaN(config.platformFeePercentage)
  ) {
    console.warn(
      'Payment Warning: Platform fee percentage not configured or invalid - payment features will be disabled'
    );
    return false;
  }

  if (typeof config.minAmount !== 'number' || isNaN(config.minAmount)) {
    console.warn(
      'Payment Warning: Minimum payment amount not configured or invalid - payment features will be disabled'
    );
    return false;
  }

  if (typeof config.maxAmount !== 'number' || isNaN(config.maxAmount)) {
    console.warn(
      'Payment Warning: Maximum payment amount not configured or invalid - payment features will be disabled'
    );
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