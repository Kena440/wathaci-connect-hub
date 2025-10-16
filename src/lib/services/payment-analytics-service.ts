/**
 * Payment Analytics and Reporting Service
 * Comprehensive analytics for payments and subscriptions
 */

import { getPlatformFeePercentage, TransactionType } from '../payment-config';

export interface PaymentAnalytics {
  totalRevenue: number;
  transactionCount: number;
  averageTransactionValue: number;
  successRate: number;
  topPaymentMethods: Array<{ method: string; count: number; percentage: number }>;
  monthlyTrends: Array<{ month: string; revenue: number; transactions: number }>;
  userSegmentation: {
    newUsers: number;
    returningUsers: number;
    highValueUsers: number;
  };
}

export interface PaymentHistoryItem {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  payment_method: 'mobile_money' | 'card';
  provider?: string;
  description: string;
  created_at: string;
  paid_at?: string;
  user_id: string;
  metadata?: Record<string, any>;
}

export interface RevenueBreakdown {
  subscriptions: number;
  services: number;
  other: number;
  donations: number;
  platformFees: number;
  providerPayouts: number;
}

export class PaymentAnalyticsService {
  /**
   * Get comprehensive payment analytics for a date range
   */
  async getPaymentAnalytics(
    startDate: string,
    endDate: string,
    userId?: string
  ): Promise<PaymentAnalytics> {
    try {
      // This would typically involve complex database queries
      // For now, we'll simulate with realistic data
      
      const payments = await this.getPaymentsInRange(startDate, endDate, userId);
      const completedPayments = payments.filter(p => p.status === 'completed');
      
      const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);
      const transactionCount = completedPayments.length;
      const averageTransactionValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;
      const successRate = payments.length > 0 ? (completedPayments.length / payments.length) * 100 : 0;
      
      const paymentMethodStats = this.calculatePaymentMethodStats(completedPayments);
      const monthlyTrends = await this.calculateMonthlyTrends(startDate, endDate, userId);
      const userSegmentation = await this.calculateUserSegmentation(startDate, endDate);

      return {
        totalRevenue,
        transactionCount,
        averageTransactionValue,
        successRate,
        topPaymentMethods: paymentMethodStats,
        monthlyTrends,
        userSegmentation
      };

    } catch (error) {
      console.error('Error calculating payment analytics:', error);
      throw new Error('Failed to calculate payment analytics');
    }
  }

  /**
   * Get paginated payment history for a user
   */
  async getPaymentHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: string;
      paymentMethod?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{
    payments: PaymentHistoryItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      // Simulate database query with filters
      const allPayments = await this.getUserPayments(userId);
      
      let filteredPayments = allPayments;
      
      if (filters?.status) {
        filteredPayments = filteredPayments.filter(p => p.status === filters.status);
      }
      
      if (filters?.paymentMethod) {
        filteredPayments = filteredPayments.filter(p => p.payment_method === filters.paymentMethod);
      }
      
      if (filters?.startDate) {
        filteredPayments = filteredPayments.filter(p => p.created_at >= filters.startDate!);
      }
      
      if (filters?.endDate) {
        filteredPayments = filteredPayments.filter(p => p.created_at <= filters.endDate!);
      }

      const total = filteredPayments.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const payments = filteredPayments.slice(startIndex, startIndex + limit);

      return {
        payments,
        total,
        page,
        totalPages
      };

    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw new Error('Failed to fetch payment history');
    }
  }

  /**
   * Generate revenue breakdown report
   */
  async getRevenueBreakdown(
    startDate: string,
    endDate: string
  ): Promise<RevenueBreakdown> {
    try {
      const payments = await this.getPaymentsInRange(startDate, endDate);
      const completedPayments = payments.filter(p => p.status === 'completed');

      let subscriptions = 0;
      let services = 0;
      let other = 0;
      let donations = 0;

      completedPayments.forEach(payment => {
        const description = payment.description.toLowerCase();
        if (description.includes('subscription')) {
          subscriptions += payment.amount;
        } else if (description.includes('service')) {
          services += payment.amount;
        } else if (description.includes('donation')) {
          donations += payment.amount;
        } else {
          other += payment.amount;
        }
      });

      // Calculate platform fees based on transaction types
      // Donations and subscriptions are exempt from platform fees
      const marketplaceAndResourceRevenue = services + other;
      const feePercentage = getPlatformFeePercentage('marketplace'); // 5% for marketplace/resource transactions
      const platformFees = marketplaceAndResourceRevenue * (feePercentage / 100);
      
      const totalRevenue = subscriptions + services + other + donations;
      const providerPayouts = totalRevenue - platformFees;

      return {
        subscriptions,
        services,
        other,
        donations,
        platformFees,
        providerPayouts
      };

    } catch (error) {
      console.error('Error calculating revenue breakdown:', error);
      throw new Error('Failed to calculate revenue breakdown');
    }
  }

  /**
   * Get payment statistics for dashboard
   */
  async getDashboardStats(userId?: string): Promise<{
    todayRevenue: number;
    weekRevenue: number;
    monthRevenue: number;
    pendingPayments: number;
    failedPayments: number;
    successRate: number;
    topProvider: string;
    growthRate: number;
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [todayPayments, weekPayments, monthPayments] = await Promise.all([
        this.getPaymentsInRange(today, today, userId),
        this.getPaymentsInRange(weekAgo, today, userId),
        this.getPaymentsInRange(monthAgo, today, userId)
      ]);

      const todayRevenue = todayPayments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);

      const weekRevenue = weekPayments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);

      const monthRevenue = monthPayments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);

      const pendingPayments = monthPayments.filter(p => p.status === 'pending').length;
      const failedPayments = monthPayments.filter(p => p.status === 'failed').length;
      const successRate = monthPayments.length > 0 
        ? (monthPayments.filter(p => p.status === 'completed').length / monthPayments.length) * 100 
        : 0;

      const providerStats = this.calculateProviderStats(monthPayments);
      const topProvider = providerStats.length > 0 ? providerStats[0].method : 'N/A';

      // Calculate growth rate (current week vs previous week)
      const previousWeekStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const previousWeekPayments = await this.getPaymentsInRange(previousWeekStart, weekAgo, userId);
      const previousWeekRevenue = previousWeekPayments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);

      const currentWeekRevenue = weekRevenue - todayRevenue;
      const growthRate = previousWeekRevenue > 0 
        ? ((currentWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100 
        : 0;

      return {
        todayRevenue,
        weekRevenue,
        monthRevenue,
        pendingPayments,
        failedPayments,
        successRate,
        topProvider,
        growthRate
      };

    } catch (error) {
      console.error('Error calculating dashboard stats:', error);
      throw new Error('Failed to calculate dashboard statistics');
    }
  }

  /**
   * Export payment data to CSV
   */
  async exportPaymentData(
    startDate: string,
    endDate: string,
    userId?: string,
    format: 'csv' | 'json' = 'csv'
  ): Promise<string> {
    try {
      const payments = await this.getPaymentsInRange(startDate, endDate, userId);
      
      if (format === 'json') {
        return JSON.stringify(payments, null, 2);
      }

      // Generate CSV
      const headers = [
        'Reference',
        'Amount',
        'Currency',
        'Status',
        'Payment Method',
        'Provider',
        'Description',
        'Created At',
        'Paid At'
      ];

      const csvRows = [
        headers.join(','),
        ...payments.map(p => [
          p.reference,
          p.amount,
          p.currency,
          p.status,
          p.payment_method,
          p.provider || '',
          `"${p.description.replace(/"/g, '""')}"`,
          p.created_at,
          p.paid_at || ''
        ].join(','))
      ];

      return csvRows.join('\n');

    } catch (error) {
      console.error('Error exporting payment data:', error);
      throw new Error('Failed to export payment data');
    }
  }

  // Private helper methods
  private async getPaymentsInRange(
    startDate: string,
    endDate: string,
    userId?: string
  ): Promise<PaymentHistoryItem[]> {
    // Simulate database query
    const mockPayments: PaymentHistoryItem[] = [
      {
        id: '1',
        reference: 'WC_1234567890_ABC123',
        amount: 100,
        currency: 'ZMK',
        status: 'completed',
        payment_method: 'mobile_money',
        provider: 'mtn',
        description: 'Professional Monthly Subscription',
        created_at: '2024-01-15T10:30:00Z',
        paid_at: '2024-01-15T10:31:00Z',
        user_id: userId || 'user123'
      },
      {
        id: '2',
        reference: 'WC_1234567891_DEF456',
        amount: 250,
        currency: 'ZMK',
        status: 'completed',
        payment_method: 'card',
        description: 'Service Payment - Web Development',
        created_at: '2024-01-14T14:20:00Z',
        paid_at: '2024-01-14T14:21:00Z',
        user_id: userId || 'user456'
      },
      {
        id: '3',
        reference: 'WC_1234567892_GHI789',
        amount: 50,
        currency: 'ZMK',
        status: 'failed',
        payment_method: 'mobile_money',
        provider: 'airtel',
        description: 'Basic Monthly Subscription',
        created_at: '2024-01-13T09:15:00Z',
        user_id: userId || 'user789'
      }
    ];

    return mockPayments.filter(p => {
      const paymentDate = p.created_at.split('T')[0];
      return paymentDate >= startDate && paymentDate <= endDate && 
             (!userId || p.user_id === userId);
    });
  }

  private async getUserPayments(userId: string): Promise<PaymentHistoryItem[]> {
    // Simulate user-specific payment history
    return this.getPaymentsInRange('2024-01-01', '2024-12-31', userId);
  }

  private calculatePaymentMethodStats(payments: PaymentHistoryItem[]): Array<{ method: string; count: number; percentage: number }> {
    const methodCounts = payments.reduce((acc, p) => {
      const key = p.payment_method;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = payments.length;
    return Object.entries(methodCounts)
      .map(([method, count]) => ({
        method,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  private calculateProviderStats(payments: PaymentHistoryItem[]): Array<{ method: string; count: number }> {
    const providerCounts = payments.reduce((acc, p) => {
      const key = p.provider || p.payment_method;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(providerCounts)
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count);
  }

  private async calculateMonthlyTrends(startDate: string, endDate: string, userId?: string): Promise<Array<{ month: string; revenue: number; transactions: number }>> {
    // Simulate monthly trend calculation
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => ({
      month,
      revenue: Math.random() * 10000,
      transactions: Math.floor(Math.random() * 100)
    }));
  }

  private async calculateUserSegmentation(startDate: string, endDate: string): Promise<{ newUsers: number; returningUsers: number; highValueUsers: number }> {
    // Simulate user segmentation
    return {
      newUsers: Math.floor(Math.random() * 50),
      returningUsers: Math.floor(Math.random() * 200),
      highValueUsers: Math.floor(Math.random() * 20)
    };
  }
}

// Export singleton instance
export const paymentAnalyticsService = new PaymentAnalyticsService();