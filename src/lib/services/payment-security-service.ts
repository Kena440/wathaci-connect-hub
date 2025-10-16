/**
 * Payment Security and Compliance Service
 * Handles payment security, fraud detection, and compliance
 */

import { supabase } from '../supabase-enhanced';

export interface SecurityCheck {
  type: 'fraud' | 'compliance' | 'validation';
  passed: boolean;
  reason?: string;
  riskScore?: number;
}

export interface ComplianceData {
  userLocation: string;
  paymentMethod: string;
  amount: number;
  frequency: number;
  deviceFingerprint?: string;
}

export class PaymentSecurityService {
  private readonly MAX_DAILY_AMOUNT = 50000; // ZMW 50,000
  private readonly MAX_TRANSACTION_AMOUNT = 10000; // ZMW 10,000
  private readonly SUSPICIOUS_PATTERNS = [
    'rapid_transactions',
    'unusual_amount',
    'new_device',
    'location_mismatch'
  ];

  /**
   * Perform comprehensive security checks
   */
  async performSecurityChecks(
    userId: string,
    amount: number,
    paymentMethod: string,
    metadata: Record<string, any> = {}
  ): Promise<SecurityCheck[]> {
    const checks: SecurityCheck[] = [];

    // Amount validation
    checks.push(this.validateAmount(amount));

    // Frequency checks
    checks.push(await this.checkTransactionFrequency(userId, amount));

    // Device fingerprinting
    checks.push(this.checkDeviceFingerprint(metadata.deviceFingerprint));

    // Location verification
    checks.push(await this.verifyLocation(userId, metadata.location));

    // Pattern analysis
    checks.push(await this.analyzePaymentPatterns(userId, amount, paymentMethod));

    return checks;
  }

  /**
   * Validate transaction amount
   */
  private validateAmount(amount: number): SecurityCheck {
    if (amount > this.MAX_TRANSACTION_AMOUNT) {
      return {
        type: 'compliance',
        passed: false,
        reason: `Transaction amount exceeds maximum limit of K${this.MAX_TRANSACTION_AMOUNT}`,
        riskScore: 8
      };
    }

    if (amount < 5) {
      return {
        type: 'validation',
        passed: false,
        reason: 'Transaction amount below minimum threshold',
        riskScore: 2
      };
    }

    return {
      type: 'validation',
      passed: true,
      riskScore: 1
    };
  }

  /**
   * Check transaction frequency and daily limits
   */
  private async checkTransactionFrequency(userId: string, amount: number): Promise<SecurityCheck> {
    try {
      // This would typically query a database
      const today = new Date().toISOString().split('T')[0];
      
      // Simulate database query for daily transaction total
      const dailyTotal = await this.getDailyTransactionTotal(userId, today);
      
      if (dailyTotal + amount > this.MAX_DAILY_AMOUNT) {
        return {
          type: 'compliance',
          passed: false,
          reason: `Daily transaction limit exceeded. Current: K${dailyTotal}, Limit: K${this.MAX_DAILY_AMOUNT}`,
          riskScore: 9
        };
      }

      // Check transaction frequency
      const recentTransactions = await this.getRecentTransactionCount(userId, 3600000); // Last hour
      
      if (recentTransactions > 5) {
        return {
          type: 'fraud',
          passed: false,
          reason: 'Suspicious transaction frequency detected',
          riskScore: 7
        };
      }

      return {
        type: 'fraud',
        passed: true,
        riskScore: 2
      };

    } catch (error) {
      return {
        type: 'fraud',
        passed: false,
        reason: 'Unable to verify transaction frequency',
        riskScore: 5
      };
    }
  }

  /**
   * Check device fingerprint for suspicious activity
   */
  private checkDeviceFingerprint(fingerprint?: string): SecurityCheck {
    if (!fingerprint) {
      return {
        type: 'fraud',
        passed: true,
        reason: 'No device fingerprint provided',
        riskScore: 3
      };
    }

    // Simulate device fingerprint analysis
    const suspiciousPatterns = ['tor_browser', 'vpn_detected', 'emulator'];
    const isSuspicious = suspiciousPatterns.some(pattern => 
      fingerprint.toLowerCase().includes(pattern)
    );

    if (isSuspicious) {
      return {
        type: 'fraud',
        passed: false,
        reason: 'Suspicious device characteristics detected',
        riskScore: 8
      };
    }

    return {
      type: 'fraud',
      passed: true,
      riskScore: 1
    };
  }

  /**
   * Verify user location against known patterns
   */
  private async verifyLocation(userId: string, location?: string): Promise<SecurityCheck> {
    if (!location) {
      return {
        type: 'fraud',
        passed: true,
        reason: 'No location data provided',
        riskScore: 2
      };
    }

    try {
      // Get user's typical locations
      const userLocations = await this.getUserTypicalLocations(userId);
      
      // Check if current location is significantly different
      const isLocationNormal = userLocations.some(loc => 
        this.calculateLocationDistance(loc, location) < 100 // 100km threshold
      );

      if (!isLocationNormal && userLocations.length > 0) {
        return {
          type: 'fraud',
          passed: false,
          reason: 'Transaction from unusual location detected',
          riskScore: 6
        };
      }

      return {
        type: 'fraud',
        passed: true,
        riskScore: 1
      };

    } catch (error) {
      return {
        type: 'fraud',
        passed: true,
        reason: 'Unable to verify location',
        riskScore: 3
      };
    }
  }

  /**
   * Analyze payment patterns for fraud detection
   */
  private async analyzePaymentPatterns(
    userId: string,
    amount: number,
    paymentMethod: string
  ): Promise<SecurityCheck> {
    try {
      const userHistory = await this.getUserPaymentHistory(userId);
      
      // Check for unusual amount patterns
      const averageAmount = userHistory.reduce((sum, t) => sum + t.amount, 0) / userHistory.length;
      const isAmountUnusual = amount > averageAmount * 3;

      // Check for unusual payment method
      const commonMethods = this.getMostCommonPaymentMethods(userHistory);
      const isMethodUnusual = !commonMethods.includes(paymentMethod);

      let riskScore = 1;
      const reasons: string[] = [];

      if (isAmountUnusual) {
        riskScore += 3;
        reasons.push('unusual transaction amount');
      }

      if (isMethodUnusual) {
        riskScore += 2;
        reasons.push('unusual payment method');
      }

      if (riskScore > 5) {
        return {
          type: 'fraud',
          passed: false,
          reason: `Suspicious patterns detected: ${reasons.join(', ')}`,
          riskScore
        };
      }

      return {
        type: 'fraud',
        passed: true,
        riskScore
      };

    } catch (error) {
      return {
        type: 'fraud',
        passed: true,
        reason: 'Unable to analyze payment patterns',
        riskScore: 3
      };
    }
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(checks: SecurityCheck[]): {
    overallRisk: 'low' | 'medium' | 'high';
    recommendation: 'approve' | 'review' | 'decline';
    details: string[];
  } {
    const totalRisk = checks.reduce((sum, check) => sum + (check.riskScore || 0), 0);
    const failedChecks = checks.filter(check => !check.passed);
    
    let overallRisk: 'low' | 'medium' | 'high' = 'low';
    let recommendation: 'approve' | 'review' | 'decline' = 'approve';

    if (totalRisk > 15 || failedChecks.length > 2) {
      overallRisk = 'high';
      recommendation = 'decline';
    } else if (totalRisk > 8 || failedChecks.length > 0) {
      overallRisk = 'medium';
      recommendation = 'review';
    }

    const details = failedChecks.map(check => check.reason || 'Unknown security concern');

    return {
      overallRisk,
      recommendation,
      details
    };
  }

  /**
   * Sanitize payment data for storage
   */
  sanitizePaymentData(data: any): any {
    const sanitized = { ...data };
    
    // Remove or mask sensitive fields
    if (sanitized.card_number) {
      sanitized.card_number = this.maskCardNumber(sanitized.card_number);
    }
    
    if (sanitized.phone) {
      sanitized.phone = this.maskPhoneNumber(sanitized.phone);
    }

    // Remove internal fields
    delete sanitized.internal_notes;
    delete sanitized.admin_flags;

    return sanitized;
  }

  /**
   * Mask card number for display
   */
  private maskCardNumber(cardNumber: string): string {
    return cardNumber.replace(/(\d{4})\d{8}(\d{4})/, '$1****$2');
  }

  /**
   * Mask phone number for display
   */
  private maskPhoneNumber(phone: string): string {
    return phone.replace(/(\d{3})\d{4}(\d{3})/, '$1***$2');
  }

  private async getDailyTransactionTotal(userId: string, date: string): Promise<number> {
    const { start, end } = this.getDayBounds(date);

    const { data, error } = await supabase
      .from('payments')
      .select('amount, status')
      .eq('user_id', userId)
      .gte('created_at', start)
      .lte('created_at', end);

    if (error) {
      throw new Error(error.message || 'Failed to fetch daily transaction totals');
    }

    return (data || []).reduce((sum, payment) => {
      if (payment.status === 'failed' || payment.status === 'cancelled') {
        return sum;
      }

      const amount = typeof payment.amount === 'number'
        ? payment.amount
        : Number(payment.amount) || 0;

      return sum + amount;
    }, 0);
  }

  private async getRecentTransactionCount(userId: string, timeWindow: number): Promise<number> {
    const windowStart = new Date(Date.now() - timeWindow).toISOString();

    const { data, error } = await supabase
      .from('payments')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', windowStart);

    if (error) {
      throw new Error(error.message || 'Failed to fetch recent transactions');
    }

    return data?.length ?? 0;
  }

  private async getUserTypicalLocations(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('metadata')
      .eq('user_id', userId)
      .not('metadata', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(error.message || 'Failed to determine user locations');
    }

    const locations = new Set<string>();

    (data || []).forEach(record => {
      const metadata = record.metadata as Record<string, any> | null;
      if (!metadata) {
        return;
      }

      const candidates = [
        metadata.location,
        metadata.city,
        metadata.region,
        metadata?.billing_address?.city,
        metadata?.billing_address?.country
      ];

      candidates.forEach(candidate => {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
          locations.add(candidate.trim());
        }
      });
    });

    return Array.from(locations);
  }

  private calculateLocationDistance(loc1: string, loc2: string): number {
    const normalize = (value: string) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9,\s]/g, '')
        .trim();

    const normalizedLoc1 = normalize(loc1);
    const normalizedLoc2 = normalize(loc2);

    if (!normalizedLoc1 || !normalizedLoc2) {
      return Number.POSITIVE_INFINITY;
    }

    if (normalizedLoc1 === normalizedLoc2) {
      return 0;
    }

    const [city1] = normalizedLoc1.split(',');
    const [city2] = normalizedLoc2.split(',');

    if (city1 && city2 && city1 === city2) {
      return 50;
    }

    return 200;
  }

  private async getUserPaymentHistory(userId: string): Promise<Array<{ amount: number; method: string }>> {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('payments')
      .select('amount, payment_method, status')
      .eq('user_id', userId)
      .gte('created_at', ninetyDaysAgo);

    if (error) {
      throw new Error(error.message || 'Failed to fetch payment history');
    }

    return (data || [])
      .filter(payment => payment.status === 'completed')
      .map(payment => ({
        amount: typeof payment.amount === 'number' ? payment.amount : Number(payment.amount) || 0,
        method: payment.payment_method
      }));
  }

  private getDayBounds(date: string): { start: string; end: string } {
    const targetDate = new Date(date);

    if (Number.isNaN(targetDate.getTime())) {
      throw new Error('Invalid date provided');
    }

    targetDate.setUTCHours(0, 0, 0, 0);
    const start = targetDate.toISOString();

    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return { start, end: endOfDay.toISOString() };
  }

  private getMostCommonPaymentMethods(history: Array<{ method: string }>): string[] {
    const methodCounts = history.reduce((acc, t) => {
      acc[t.method] = (acc[t.method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(methodCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([method]) => method);
  }
}

// Export singleton instance
export const paymentSecurityService = new PaymentSecurityService();