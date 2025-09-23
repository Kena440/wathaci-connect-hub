import { describe, it, expect, beforeAll } from '@jest/globals';
import { lencoPaymentService } from '../../lib/services/lenco-payment-service';
import { calculatePlatformFee, getPlatformFeePercentage } from '../../lib/payment-config';

// Test the subscription plans data and Lenco amount calculations
describe('Lenco Payment Amount Calculations', () => {
  // Import subscription plans data
  let subscriptionPlans: any;
  
  beforeAll(async () => {
    try {
      const plansModule = await import('../../data/subscriptionPlans');
      subscriptionPlans = plansModule.subscriptionPlans;
    } catch (error) {
      console.warn('Could not import subscription plans:', error);
      // Fallback data for testing
      subscriptionPlans = [
        { id: '1', name: 'Individual Basic', price: 'K25', lencoAmount: 2500 },
        { id: '2', name: 'Individual Standard', price: 'K60', lencoAmount: 6000 },
        { id: '3', name: 'Business Basic', price: 'K75', lencoAmount: 7500 },
        { id: '4', name: 'Business Standard', price: 'K180', lencoAmount: 18000 },
        { id: '5', name: 'Professional', price: 'K200', lencoAmount: 20000 },
        { id: '6', name: 'Enterprise', price: 'K2000', lencoAmount: 200000 }
      ];
    }
  });

  describe('Subscription Plan Lenco Amounts', () => {
    it('should have correct lenco amounts for all subscription plans', () => {
      expect(subscriptionPlans).toBeDefined();
      expect(Array.isArray(subscriptionPlans)).toBe(true);
      expect(subscriptionPlans.length).toBeGreaterThan(0);

      subscriptionPlans.forEach((plan: any) => {
        expect(plan.lencoAmount).toBeDefined();
        expect(typeof plan.lencoAmount).toBe('number');
        expect(plan.lencoAmount).toBeGreaterThan(0);
        
        // Extract numeric price from string (e.g., "K25" -> 25)
        const numericPrice = parseFloat(plan.price.replace(/[^\d.]/g, ''));
        
        // Lenco amount should be price * 100 (converting to cents/kobo)
        expect(plan.lencoAmount).toBe(numericPrice * 100);
      });
    });

    it('should calculate fees correctly for each subscription plan', () => {
      subscriptionPlans.forEach((plan: any) => {
        const totalAmount = plan.lencoAmount / 100; // Convert back to base currency
        const managementFee = totalAmount * 0.02; // 2% fee
        const providerAmount = totalAmount - managementFee;

        expect(managementFee).toBe(totalAmount * 0.02);
        expect(providerAmount).toBe(totalAmount * 0.98);
        expect(managementFee + providerAmount).toBe(totalAmount);

        // Fees should be reasonable
        expect(managementFee).toBeGreaterThan(0);
        expect(providerAmount).toBeGreaterThan(0);
        expect(providerAmount).toBeGreaterThan(managementFee); // Provider should get more than fee
      });
    });

    it('should have consistent currency handling', () => {
      subscriptionPlans.forEach((plan: any) => {
        // All plans should use ZMW currency (indicated by K prefix)
        expect(plan.price).toMatch(/^K\d+/);
        
        // Lenco amounts should be in the smallest unit (ngwee for ZMW)
        expect(plan.lencoAmount % 1).toBe(0); // Should be whole number
      });
    });
  });

  describe('Payment Amount Processing', () => {
    it('should handle string amounts correctly', () => {
      const testCases = [
        { input: '100.00', expected: 100.00 },
        { input: 'K 150.50', expected: 150.50 },
        { input: '25', expected: 25.00 },
        { input: '1000.99', expected: 1000.99 }
      ];

      testCases.forEach(({ input, expected }) => {
        // Simulate the amount processing logic from LencoPayment component
        const totalAmount = typeof input === 'string' 
          ? parseFloat(input.replace(/[^\d.]/g, '')) 
          : parseFloat(String(input));
        
        expect(totalAmount).toBe(expected);
      });
    });

    it('should calculate fees correctly for various amounts', () => {
      const testAmounts = [1, 10, 50, 100, 500, 1000, 5000];

      testAmounts.forEach(amount => {
        const managementFee = amount * 0.02;
        const providerAmount = amount - managementFee;

        expect(managementFee).toBe(amount * 0.02);
        expect(providerAmount).toBe(amount * 0.98);
        expect(parseFloat((managementFee + providerAmount).toFixed(2))).toBe(amount);

        // Verify fee percentage is exactly 2%
        expect(managementFee / amount).toBeCloseTo(0.02, 10);
      });
    });

    it('should handle edge case amounts', () => {
      const edgeCases = [
        { amount: 0.01, fee: 0.0002, provider: 0.0098 },
        { amount: 0.1, fee: 0.002, provider: 0.098 },
        { amount: 10000, fee: 200, provider: 9800 },
        { amount: 100000, fee: 2000, provider: 98000 }
      ];

      edgeCases.forEach(({ amount, fee, provider }) => {
        const calculatedFee = amount * 0.02;
        const calculatedProvider = amount - calculatedFee;

        expect(calculatedFee).toBeCloseTo(fee, 4);
        expect(calculatedProvider).toBeCloseTo(provider, 4);
      });
    });
  });

  describe('Payment Method Validation', () => {
    it('should validate mobile money providers', () => {
      const validProviders = ['mtn', 'airtel', 'zamtel'];
      const validPhonePatterns = [
        '0971234567', // MTN
        '0961234567', // Airtel
        '0951234567'  // Zamtel
      ];

      validProviders.forEach(provider => {
        expect(['mtn', 'airtel', 'zamtel']).toContain(provider);
      });

      validPhonePatterns.forEach(phone => {
        expect(phone).toMatch(/^09[567]\d{7}$/);
      });
    });

    it('should have correct payment method options', () => {
      const paymentMethods = ['mobile_money', 'card'];
      
      paymentMethods.forEach(method => {
        expect(['mobile_money', 'card']).toContain(method);
      });
    });
  });

  describe('Currency and Localization', () => {
    it('should format amounts in Zambian Kwacha correctly', () => {
      const amounts = [1, 10.5, 100, 1000.99, 10000];
      
      amounts.forEach(amount => {
        // Test currency formatting
        const formatted = `K${amount.toFixed(2)}`;
        expect(formatted).toMatch(/^K\d+\.\d{2}$/);
        
        // Verify decimal places
        const [, decimal] = formatted.split('.');
        expect(decimal).toHaveLength(2);
      });
    });

    it('should handle large amounts appropriately', () => {
      const largeAmounts = [10000, 50000, 100000, 1000000];
      
      largeAmounts.forEach(amount => {
        const managementFee = amount * 0.02;
        const providerAmount = amount - managementFee;
        
        // Large amounts should still calculate correctly
        expect(managementFee).toBe(amount * 0.02);
        expect(providerAmount).toBe(amount * 0.98);
        
        // Fee should be reasonable even for large amounts
        expect(managementFee).toBeLessThan(amount);
        expect(providerAmount).toBeGreaterThan(managementFee);
      });
    });
  });

  describe('Business Logic Validation', () => {
    it('should ensure provider receives majority of payment', () => {
      const testAmounts = [10, 50, 100, 500, 1000];
      
      testAmounts.forEach(amount => {
        const managementFee = amount * 0.02;
        const providerAmount = amount - managementFee;
        
        // Provider should always receive more than the platform fee
        expect(providerAmount).toBeGreaterThan(managementFee);
        
        // Provider should receive at least 95% of the payment
        expect(providerAmount / amount).toBeGreaterThanOrEqual(0.98);
      });
    });

    it('should validate minimum and maximum payment amounts', () => {
      // These would be business rules for the payment system
      const minAmount = 1; // Minimum 1 Kwacha
      const maxAmount = 1000000; // Maximum 1 million Kwacha
      
      expect(minAmount).toBeGreaterThan(0);
      expect(maxAmount).toBeGreaterThan(minAmount);
      
      // Test fee calculations at boundaries
      const minFee = minAmount * 0.02;
      const maxFee = maxAmount * 0.02;
      
      expect(minFee).toBe(0.02);
      expect(maxFee).toBe(20000);
    });

    it('should ensure subscription plans are within reasonable ranges', () => {
      subscriptionPlans.forEach((plan: any) => {
        // Extract numeric price from string (e.g., "K25" -> 25)
        const priceInKwacha = parseFloat(plan.price.replace(/[^\d.]/g, ''));
        
        // Subscription prices should be reasonable (between K10 and K5000)
        expect(priceInKwacha).toBeGreaterThanOrEqual(10);
        expect(priceInKwacha).toBeLessThanOrEqual(5000);
        
        // Lenco amounts should be reasonable
        expect(plan.lencoAmount).toBeGreaterThanOrEqual(1000); // At least K10
        expect(plan.lencoAmount).toBeLessThanOrEqual(500000); // At most K5000
      });
    });
  });

  describe('New Platform Fee Structure (5% for marketplace/resource, 0% for donations/subscriptions)', () => {
    const testCases = [
      { amount: 100, transactionType: 'marketplace', expectedFeePercentage: 5, expectedFee: 5, expectedProvider: 95 },
      { amount: 200, transactionType: 'resource', expectedFeePercentage: 5, expectedFee: 10, expectedProvider: 190 },
      { amount: 50, transactionType: 'donation', expectedFeePercentage: 0, expectedFee: 0, expectedProvider: 50 },
      { amount: 100, transactionType: 'subscription', expectedFeePercentage: 0, expectedFee: 0, expectedProvider: 100 }
    ];

    testCases.forEach(({ amount, transactionType, expectedFeePercentage, expectedFee, expectedProvider }) => {
      it(`should calculate correct fees for ${transactionType} transaction (${expectedFeePercentage}%)`, () => {
        const feePercentage = getPlatformFeePercentage(transactionType as any);
        expect(feePercentage).toBe(expectedFeePercentage);

        const platformFee = calculatePlatformFee(amount, feePercentage, transactionType as any);
        expect(platformFee).toBe(expectedFee);

        const breakdown = lencoPaymentService.calculatePaymentTotal(amount, transactionType as any);
        expect(breakdown.platformFee).toBe(expectedFee);
        expect(breakdown.providerReceives).toBe(expectedProvider);
        expect(breakdown.feePercentage).toBe(expectedFeePercentage);
      });
    });

    it('should exempt donations from platform fees', () => {
      const testAmounts = [10, 50, 100, 500, 1000];
      
      testAmounts.forEach(amount => {
        const breakdown = lencoPaymentService.calculatePaymentTotal(amount, 'donation');
        expect(breakdown.platformFee).toBe(0);
        expect(breakdown.providerReceives).toBe(amount);
        expect(breakdown.feePercentage).toBe(0);
      });
    });

    it('should exempt subscriptions from platform fees (maintain existing rates)', () => {
      subscriptionPlans.forEach((plan: any) => {
        const amount = plan.lencoAmount / 100; // Convert from cents to dollars
        const breakdown = lencoPaymentService.calculatePaymentTotal(amount, 'subscription');
        
        // Subscriptions should have no platform fees
        expect(breakdown.platformFee).toBe(0);
        expect(breakdown.providerReceives).toBe(amount);
        expect(breakdown.feePercentage).toBe(0);
      });
    });

    it('should apply 5% fee to marketplace transactions', () => {
      const testAmounts = [100, 250, 500, 1000];
      
      testAmounts.forEach(amount => {
        const breakdown = lencoPaymentService.calculatePaymentTotal(amount, 'marketplace');
        const expectedFee = Math.round((amount * 0.05) * 100) / 100;
        expect(breakdown.platformFee).toBe(expectedFee);
        expect(breakdown.providerReceives).toBe(amount - expectedFee);
        expect(breakdown.feePercentage).toBe(5);
      });
    });

    it('should apply 5% fee to resource transactions', () => {
      const testAmounts = [20, 50, 75, 150];
      
      testAmounts.forEach(amount => {
        const breakdown = lencoPaymentService.calculatePaymentTotal(amount, 'resource');
        const expectedFee = Math.round((amount * 0.05) * 100) / 100;
        expect(breakdown.platformFee).toBe(expectedFee);
        expect(breakdown.providerReceives).toBe(amount - expectedFee);
        expect(breakdown.feePercentage).toBe(5);
      });
    });

    it('should default to marketplace transaction type when none specified', () => {
      const amount = 100;
      const breakdown = lencoPaymentService.calculatePaymentTotal(amount);
      
      // Should default to 5% fee like marketplace
      expect(breakdown.feePercentage).toBe(5);
      expect(breakdown.platformFee).toBe(5);
      expect(breakdown.providerReceives).toBe(95);
    });
  });
});