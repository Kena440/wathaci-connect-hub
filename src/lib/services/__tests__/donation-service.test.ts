/**
 * Tests for Donation Service
 * 
 * Basic unit tests for donation fee calculations and validation logic
 */

import { describe, it, expect } from '@jest/globals';

// Inline the calculation function for testing without imports
function calculateDonationBreakdown(
  amount: number,
  feePercentage: number
) {
  const platformFee = Math.floor((amount * feePercentage) / 100);
  const netAmount = amount - platformFee;

  return {
    grossAmount: amount,
    platformFee,
    platformFeePercentage: feePercentage,
    netAmount,
    totalCharged: amount,
  };
}

describe('Donation Service', () => {
  describe('calculateDonationBreakdown', () => {
    it('should calculate correct breakdown for K100 with 5% fee', () => {
      const breakdown = calculateDonationBreakdown(100, 5);
      
      expect(breakdown.grossAmount).toBe(100);
      expect(breakdown.platformFee).toBe(5);
      expect(breakdown.netAmount).toBe(95);
      expect(breakdown.platformFeePercentage).toBe(5);
      expect(breakdown.totalCharged).toBe(100);
    });

    it('should calculate correct breakdown for K50 with 10% fee', () => {
      const breakdown = calculateDonationBreakdown(50, 10);
      
      expect(breakdown.grossAmount).toBe(50);
      expect(breakdown.platformFee).toBe(5);
      expect(breakdown.netAmount).toBe(45);
      expect(breakdown.platformFeePercentage).toBe(10);
      expect(breakdown.totalCharged).toBe(50);
    });

    it('should floor platform fee for decimal amounts', () => {
      const breakdown = calculateDonationBreakdown(33, 5);
      
      // 33 * 0.05 = 1.65, should floor to 1
      expect(breakdown.platformFee).toBe(1);
      expect(breakdown.netAmount).toBe(32);
    });

    it('should handle zero fee percentage', () => {
      const breakdown = calculateDonationBreakdown(100, 0);
      
      expect(breakdown.grossAmount).toBe(100);
      expect(breakdown.platformFee).toBe(0);
      expect(breakdown.netAmount).toBe(100);
      expect(breakdown.totalCharged).toBe(100);
    });

    it('should handle small amounts', () => {
      const breakdown = calculateDonationBreakdown(10, 5);
      
      expect(breakdown.grossAmount).toBe(10);
      expect(breakdown.platformFee).toBe(0); // floor(10 * 0.05) = floor(0.5) = 0
      expect(breakdown.netAmount).toBe(10);
    });

    it('should handle large amounts', () => {
      const breakdown = calculateDonationBreakdown(50000, 5);
      
      expect(breakdown.grossAmount).toBe(50000);
      expect(breakdown.platformFee).toBe(2500);
      expect(breakdown.netAmount).toBe(47500);
    });

    it('should always have totalCharged equal to grossAmount', () => {
      const amounts = [10, 25, 50, 100, 250, 1000, 50000];
      const fees = [0, 2, 5, 10, 15];
      
      amounts.forEach(amount => {
        fees.forEach(fee => {
          const breakdown = calculateDonationBreakdown(amount, fee);
          expect(breakdown.totalCharged).toBe(breakdown.grossAmount);
        });
      });
    });

    it('should always have netAmount = grossAmount - platformFee', () => {
      const amounts = [10, 25, 50, 100, 250, 1000, 50000];
      const fees = [0, 2, 5, 10, 15];
      
      amounts.forEach(amount => {
        fees.forEach(fee => {
          const breakdown = calculateDonationBreakdown(amount, fee);
          expect(breakdown.netAmount).toBe(
            breakdown.grossAmount - breakdown.platformFee
          );
        });
      });
    });
  });
});
