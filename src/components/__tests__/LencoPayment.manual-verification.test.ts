import { validatePaymentRequest, demoPayments } from './LencoPayment.manual-verification';

describe('Manual Verification Functions', () => {
  describe('validatePaymentRequest', () => {
    it('should validate a correct MTN payment', () => {
      const paymentData = {
        amount: 100,
        paymentMethod: 'mobile_money',
        phoneNumber: '0971234567',
        provider: 'mtn',
        description: 'Test payment'
      };

      const result = validatePaymentRequest(paymentData);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.calculations.totalAmount).toBe(100);
      expect(result.calculations.platformFee).toBe(5);
      expect(result.calculations.providerAmount).toBe(95);
    });

    it('should validate a correct Airtel payment', () => {
      const paymentData = {
        amount: 50,
        paymentMethod: 'mobile_money',
        phoneNumber: '0961234567',
        provider: 'airtel',
        description: 'Test payment'
      };

      const result = validatePaymentRequest(paymentData);
      
      expect(result.valid).toBe(true);
      expect(result.calculations.totalAmount).toBe(50);
      expect(result.calculations.platformFee).toBe(2.5);
      expect(result.calculations.providerAmount).toBe(47.5);
    });

    it('should reject invalid payment data', () => {
      const invalidPaymentData = {
        amount: -10,
        paymentMethod: 'invalid',
        phoneNumber: '1234567890',
        provider: 'mtn',
        description: 'Invalid payment'
      };

      const result = validatePaymentRequest(invalidPaymentData);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn about provider mismatch', () => {
      const paymentData = {
        amount: 100,
        paymentMethod: 'mobile_money',
        phoneNumber: '0971234567', // MTN number
        provider: 'airtel', // But claiming Airtel
        description: 'Mismatched payment'
      };

      const result = validatePaymentRequest(paymentData);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("doesn't match provider");
    });
  });

  describe('Demo Payment Data', () => {
    it('should have valid demo payments', () => {
      expect(demoPayments).toHaveLength(3);
      
      demoPayments.forEach(demo => {
        const result = validatePaymentRequest(demo.data);
        expect(result.valid).toBe(true);
        expect(result.calculations.feePercentage).toBe(5);
      });
    });

    it('should have different providers in demo data', () => {
      const providers = demoPayments.map(demo => demo.data.provider);
      expect(providers).toContain('mtn');
      expect(providers).toContain('airtel');
      expect(providers).toContain('zamtel');
    });
  });
});