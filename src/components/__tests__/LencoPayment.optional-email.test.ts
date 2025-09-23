/**
 * Test email optional functionality for Lenco Payment
 */

// Mock the payment config first, before importing anything
jest.mock('@/lib/payment-config', () => ({
  getPaymentConfig: () => ({
    publicKey: 'test-key',
    apiUrl: 'https://api.lenco.co/access/v2',
    currency: 'ZMK',
    country: 'ZM',
    platformFeePercentage: 2,
    minAmount: 5,
    maxAmount: 1000000,
    environment: 'development'
  }),
  validatePaymentConfig: () => true,
  generatePaymentReference: () => 'WC_TEST_123',
  validatePhoneNumber: (phone: string) => /^09[5-7]\d{7}$/.test(phone),
  calculatePlatformFee: (amount: number) => Math.round(amount * 0.02 * 100) / 100
}));

import { lencoPaymentService } from '@/lib/services/lenco-payment-service';

describe('LencoPayment - Optional Email Functionality', () => {
  beforeEach(() => {
    // Reset any previous method mocks
    jest.clearAllMocks();
  });

  describe('Email Validation Logic', () => {
    it('should accept payment request without email', () => {
      // Test the validation logic directly
      const validationMethod = (lencoPaymentService as any).validatePaymentRequest;
      
      const requestWithoutEmail = {
        amount: 100,
        phone: '0978123456',
        name: 'Test User',
        description: 'Test payment without email',
        payment_method: 'mobile_money',
        provider: 'mtn'
      };

      const result = validationMethod.call(lencoPaymentService, requestWithoutEmail);
      expect(result.isValid).toBe(true);
    });

    it('should reject payment request with invalid email when provided', () => {
      const validationMethod = (lencoPaymentService as any).validatePaymentRequest;
      
      const requestWithInvalidEmail = {
        amount: 100,
        phone: '0978123456',
        email: 'invalid-email',
        name: 'Test User',
        description: 'Test payment with invalid email',
        payment_method: 'mobile_money',
        provider: 'mtn'
      };

      const result = validationMethod.call(lencoPaymentService, requestWithInvalidEmail);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Valid email address format is required');
    });

    it('should accept payment request with valid email when provided', () => {
      const validationMethod = (lencoPaymentService as any).validatePaymentRequest;
      
      const requestWithValidEmail = {
        amount: 100,
        phone: '0978123456',
        email: 'test@example.com',
        name: 'Test User',
        description: 'Test payment with valid email',
        payment_method: 'mobile_money',
        provider: 'mtn'
      };

      const result = validationMethod.call(lencoPaymentService, requestWithValidEmail);
      expect(result.isValid).toBe(true);
    });

    it('should accept payment request with empty email', () => {
      const validationMethod = (lencoPaymentService as any).validatePaymentRequest;
      
      const requestWithEmptyEmail = {
        amount: 100,
        phone: '0978123456',
        email: '',
        name: 'Test User',
        description: 'Test payment with empty email',
        payment_method: 'mobile_money',
        provider: 'mtn'
      };

      const result = validationMethod.call(lencoPaymentService, requestWithEmptyEmail);
      expect(result.isValid).toBe(true);
    });
  });
});