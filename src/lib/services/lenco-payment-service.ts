/**
 * Lenco Payment Service
 * Handles all Lenco payment gateway interactions
 */

import {
  PaymentConfig,
  LencoPaymentRequest,
  LencoPaymentResponse,
  PaymentStatus,
  TransactionType,
  getPaymentConfig,
  validatePaymentConfig,
  generatePaymentReference,
  validatePhoneNumber,
  calculatePlatformFee,
  getPlatformFeePercentage
} from '../payment-config';
import { logger } from '../logger';
import { supabaseClient } from '../supabaseClient';

const DEFAULT_APP_ORIGIN = 'https://wathaci.com';
const ORIGIN_ENV_KEYS = ['VITE_APP_BASE_URL', 'VITE_SITE_URL', 'VITE_PUBLIC_SITE_URL'];

const getRuntimeOrigin = (): string => {
  for (const key of ORIGIN_ENV_KEYS) {
    const value = typeof import.meta !== 'undefined' ? (import.meta as any)?.env?.[key] : undefined;
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  if (typeof globalThis !== 'undefined' && (globalThis as any).__APP_URL__) {
    return (globalThis as any).__APP_URL__ as string;
  }

  return DEFAULT_APP_ORIGIN;
};

const persistPaymentReference = (reference: string) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('currentPaymentRef', reference);
    } else if (typeof globalThis !== 'undefined') {
      (globalThis as any).__CURRENT_PAYMENT_REF__ = reference;
    }
  } catch (error) {
    console.warn('Unable to persist payment reference for tracking', error);
  }
};

export interface LencoTransferRecipientDetails {
  type: 'lenco-merchant';
  accountName: string;
  tillNumber: string;
}

export interface LencoTransferRecipient {
  id: string;
  currency: string;
  type: string;
  country: string;
  details: LencoTransferRecipientDetails;
}

export interface LencoTransferRecipientResponse {
  success: boolean;
  message?: string;
  data?: LencoTransferRecipient;
  error?: string;
}

export class LencoPaymentService {
  private config: PaymentConfig;
  private isConfigValid: boolean;

  constructor() {
    this.config = getPaymentConfig();
    this.isConfigValid = validatePaymentConfig(this.config);
  }

  private refreshConfig(): void {
    const latestConfig = getPaymentConfig();
    const hasChanged = JSON.stringify(this.config) !== JSON.stringify(latestConfig);

    if (hasChanged) {
      this.config = latestConfig;
      this.isConfigValid = validatePaymentConfig(this.config);
    }
  }

  private ensureConfig(): void {
    if (!this.isConfigValid) {
      this.config = getPaymentConfig();
      this.isConfigValid = validatePaymentConfig(this.config);
    } else {
      this.refreshConfig();
    }
  }

  /**
   * Initialize payment with Lenco
   */
  async initializePayment(request: Omit<LencoPaymentRequest, 'reference' | 'currency'>): Promise<LencoPaymentResponse> {
    let reference: string | undefined;
    try {
      this.ensureConfig();

      if (!this.isConfigValid) {
        throw new Error('Payment configuration is invalid. Please check environment variables.');
      }

      // Validate request
      const validationResult = this.validatePaymentRequest(request);
      if (!validationResult.isValid) {
        throw new Error(validationResult.error);
      }

      // Generate reference
      reference = generatePaymentReference();
      
      const paymentRequest: LencoPaymentRequest = {
        ...request,
        reference,
        currency: this.config.currency,
        callback_url: `${getRuntimeOrigin()}/payment/callback`,
      };

      // Call payment service via Supabase edge function
      const response = await this.callPaymentService('initialize', {
        reference,
        amount: Math.round(paymentRequest.amount * 100), // Convert to kobo/ngwee
        currency: paymentRequest.currency,
        email: paymentRequest.email,
        name: paymentRequest.name,
        phone: paymentRequest.phone,
        phoneNumber: paymentRequest.phone,
        description: paymentRequest.description,
        paymentMethod: paymentRequest.payment_method,
        provider: paymentRequest.provider,
        metadata: paymentRequest.metadata
      });
      
      if (response.success) {
        // Store payment reference for tracking
        persistPaymentReference(reference);

        return {
          success: true,
          data: {
            payment_url: response.data?.payment_url || response.data?.authorization_url,
            reference: reference,
            access_code: response.data?.access_code
          }
        };
      } else {
        throw new Error(response.message || 'Payment initialization failed');
      }

    } catch (error: any) {
      logger.error('Payment initialization error', error, {
        paymentReference: reference,
      });
      return {
        success: false,
        error: error.message || 'Payment initialization failed'
      };
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(reference: string): Promise<PaymentStatus> {
    try {
      this.ensureConfig();

      const response = await this.callPaymentService('verify', {
        reference
      });

      return {
        reference,
        status: this.mapLencoStatus(response.data.status),
        amount: response.data.amount / 100, // Convert from kobo to naira/kwacha
        currency: response.data.currency,
        transaction_id: response.data.id,
        gateway_response: response.data.gateway_response,
        paid_at: response.data.paid_at,
        metadata: response.data.metadata
      };

    } catch (error: any) {
      logger.error('Payment verification error', error, {
        paymentReference: reference,
      });
      return {
        reference,
        status: 'failed',
        amount: 0,
        currency: this.config.currency
      };
    }
  }

  /**
   * Create a Lenco merchant transfer recipient
   */
  async createMerchantTransferRecipient(tillNumber: string): Promise<LencoTransferRecipientResponse> {
    try {
      this.ensureConfig();

      if (typeof tillNumber !== 'string' || !tillNumber.trim()) {
        throw new Error('A valid till number is required to create a transfer recipient.');
      }

      const sanitizedTillNumber = tillNumber.trim();

      const response = await this.callPaymentService('create_recipient', {
        tillNumber: sanitizedTillNumber
      });

      return {
        success: true,
        message: response.message || 'Transfer recipient created successfully',
        data: response.data as LencoTransferRecipient
      };
    } catch (error: any) {
      logger.error('Transfer recipient creation error', error, {
        tillNumber
      });
      return {
        success: false,
        error: error?.message || 'Failed to create transfer recipient'
      };
    }
  }

  /**
   * Process mobile money payment
   */
  async processMobileMoneyPayment(request: {
    amount: number;
    phone: string;
    provider: 'mtn' | 'airtel' | 'zamtel';
    email?: string;
    name: string;
    description: string;
    transactionType?: TransactionType;
  }): Promise<LencoPaymentResponse> {
    if (!request.phone) {
      return {
        success: false,
        error: 'Mobile money phone number is required'
      };
    }

    // Validate phone number
    if (!validatePhoneNumber(request.phone, this.config.country)) {
      return {
        success: false,
        error: 'Invalid phone number format'
      };
    }

    this.ensureConfig();

    return this.initializePayment({
      ...request,
      payment_method: 'mobile_money',
      metadata: {
        payment_type: 'mobile_money',
        provider: request.provider,
        transaction_type: request.transactionType
      }
    });
  }

  /**
   * Process card payment
   */
  async processCardPayment(request: {
    amount: number;
    email?: string;
    name: string;
    description: string;
    phone?: string;
    transactionType?: TransactionType;
  }): Promise<LencoPaymentResponse> {
    this.ensureConfig();

    return this.initializePayment({
      ...request,
      phone: request.phone || '',
      payment_method: 'card',
      metadata: {
        payment_type: 'card',
        transaction_type: request.transactionType
      }
    });
  }

  /**
   * Calculate total with fees
   */
  calculatePaymentTotal(amount: number, transactionType?: TransactionType): {
    baseAmount: number;
    platformFee: number;
    totalAmount: number;
    providerReceives: number;
    feePercentage: number;
  } {
    this.ensureConfig();

    const feePercentage = getPlatformFeePercentage(transactionType);
    const platformFee = calculatePlatformFee(amount, feePercentage, transactionType);
    return {
      baseAmount: amount,
      platformFee,
      totalAmount: amount,
      providerReceives: amount - platformFee,
      feePercentage
    };
  }

  /**
   * Validate payment request
   */
  private validatePaymentRequest(request: Omit<LencoPaymentRequest, 'reference' | 'currency'>): {
    isValid: boolean;
    error?: string;
  } {
    if (!request.amount || request.amount < this.config.minAmount) {
      return { isValid: false, error: `Minimum payment amount is ${this.config.minAmount}` };
    }

    if (request.amount > this.config.maxAmount) {
      return { isValid: false, error: `Maximum payment amount is ${this.config.maxAmount}` };
    }

    if (request.email && !this.isValidEmail(request.email)) {
      return { isValid: false, error: 'Valid email address format is required' };
    }

    if (!request.name || request.name.trim().length < 2) {
      return { isValid: false, error: 'Valid name is required' };
    }

    if (!request.description || request.description.trim().length < 5) {
      return { isValid: false, error: 'Payment description is required' };
    }

    // Sanitize description length and remove potential HTML tags
    const sanitizedDescription = request.description.replace(/<[^>]*>/g, '').trim();
    const MAX_DESCRIPTION_LENGTH = 200;
    request.description = sanitizedDescription.slice(0, MAX_DESCRIPTION_LENGTH);

    if (request.payment_method === 'mobile_money') {
      if (!request.provider) {
        return { isValid: false, error: 'Mobile money provider is required' };
      }

      if (!request.phone || !validatePhoneNumber(request.phone, this.config.country)) {
        return { isValid: false, error: 'Valid mobile money phone number is required' };
      }
    }

    return { isValid: true };
  }

  /**
   * Call payment service via Supabase edge function
   */
  private async callPaymentService(action: string, data?: any): Promise<any> {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
      return this.handleTestPaymentService(action, data);
    }

    try {
      const { data: response, error } = await supabaseClient.functions.invoke('lenco-payment', {
        body: {
          action,
          ...data
        }
      });

      if (error) {
        throw new Error(error.message || 'Payment service error');
      }

      if (!response.success) {
        throw new Error(response.error || response.message || 'Payment service failed');
      }

      return response;
    } catch (error: any) {
      // Enhanced error handling for common network issues
      if (error.message?.includes('fetch')) {
        throw new Error('Network connection error. Please check your internet connection and try again.');
      }
      if (error.message?.includes('Failed to fetch')) {
        throw new Error('Unable to connect to payment service. Please try again later.');
      }
      throw error;
    }
  }

  /**
   * Provide deterministic mock responses when running unit tests
   */
  private handleTestPaymentService(action: string, data?: any) {
    if (action === 'initialize') {
      return {
        success: true,
        data: {
          payment_url: 'https://mock-payments.test/checkout',
          authorization_url: 'https://mock-payments.test/checkout',
          access_code: 'MOCK_ACCESS_CODE',
          reference: data?.reference || generatePaymentReference('MOCK')
        }
      };
    }

    if (action === 'verify') {
      return {
        success: true,
        data: {
          status: 'success',
          amount: data?.amount ?? 5000,
          currency: data?.currency || this.config.currency,
          id: 'mock-transaction',
          gateway_response: 'Payment completed',
          paid_at: new Date().toISOString(),
          metadata: data?.metadata || {}
        }
      };
    }

    if (action === 'create_recipient') {
      return {
        success: true,
        message: 'Transfer recipient created successfully',
        data: {
          id: 'mock-recipient',
          currency: this.config.currency,
          type: 'lenco-merchant',
          country: this.config.country,
          details: {
            type: 'lenco-merchant',
            accountName: 'Mock Merchant',
            tillNumber: data?.tillNumber || '1234567890'
          }
        }
      };
    }

    return { success: true, data: {} };
  }

  /**
   * Map Lenco status to our status
   */
  private mapLencoStatus(lencoStatus: string): PaymentStatus['status'] {
    const statusMap: Record<string, PaymentStatus['status']> = {
      'success': 'completed',
      'failed': 'failed',
      'pending': 'pending',
      'cancelled': 'cancelled',
      'abandoned': 'cancelled'
    };

    return statusMap[lencoStatus.toLowerCase()] || 'failed';
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get payment configuration
   */
  getConfig(): PaymentConfig {
    this.refreshConfig();
    return { ...this.config };
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    this.ensureConfig();
    return this.isConfigValid;
  }
}

// Create singleton instance
export const lencoPaymentService = new LencoPaymentService();
