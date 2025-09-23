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
import { supabase } from '../supabase-enhanced';

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
        callback_url: `${window.location.origin}/payment/callback`,
      };

      // Call payment service via Supabase edge function
      const response = await this.callPaymentService('initialize', {
        amount: Math.round(paymentRequest.amount * 100), // Convert to kobo/ngwee
        currency: paymentRequest.currency,
        email: paymentRequest.email,
        name: paymentRequest.name,
        phone: paymentRequest.phone,
        description: paymentRequest.description,
        paymentMethod: paymentRequest.payment_method,
        provider: paymentRequest.provider,
        metadata: paymentRequest.metadata
      });
      
      if (response.success) {
        // Store payment reference for tracking
        localStorage.setItem('currentPaymentRef', reference);
        
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
    try {
      const { data: response, error } = await supabase.functions.invoke('lenco-payment', {
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
