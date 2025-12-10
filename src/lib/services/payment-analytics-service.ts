/**
 * Payment Analytics and Reporting Service
 * Comprehensive analytics for payments and subscriptions
 */

import { getPlatformFeePercentage } from '../payment-config';
import { supabase } from '../supabase-enhanced';

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
  private readonly HIGH_VALUE_USER_THRESHOLD = 5000; // ZMW 5,000 in completed payments

  /**
   * Get comprehensive payment analytics for a date range
   */
  async getPaymentAnalytics(
    startDate: string,
    endDate: string,
    userId?: string
  ): Promise<PaymentAnalytics> {
    try {
      const payments = await this.getPaymentsInRange(startDate, endDate, userId);
      const completedPayments = payments.filter(p => p.status === 'completed');

      const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);
      const transactionCount = completedPayments.length;
      const averageTransactionValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;
      const successRate = payments.length > 0 ? (completedPayments.length / payments.length) * 100 : 0;

      const paymentMethodStats = this.calculatePaymentMethodStats(completedPayments);
      const monthlyTrends = this.calculateMonthlyTrends(payments);
      const userSegmentation = await this.calculateUserSegmentation(payments, startDate);

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
        const start = new Date(filters.startDate);
        filteredPayments = filteredPayments.filter(p => new Date(p.created_at) >= start);
      }

      if (filters?.endDate) {
        const end = new Date(filters.endDate);
        end.setUTCHours(23, 59, 59, 999);
        filteredPayments = filteredPayments.filter(p => new Date(p.created_at) <= end);
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
      const feePercentage = getPlatformFeePercentage('marketplace'); // Configured fee for marketplace/resource transactions
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
    const { start, end } = this.getDateRangeBounds(startDate, endDate);

    let query = supabase
      .from('payments')
      .select(
        'id, reference, amount, currency, status, payment_method, provider, description, created_at, paid_at, user_id, metadata'
      )
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message || 'Failed to fetch payments');
    }

    return (data || []).map((payment) => ({
      ...payment,
      amount: typeof payment.amount === 'number' ? payment.amount : Number(payment.amount) || 0,
      metadata: payment.metadata ?? undefined,
    })) as PaymentHistoryItem[];
  }

  private async getUserPayments(userId: string): Promise<PaymentHistoryItem[]> {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    return this.getPaymentsInRange('2000-01-01', endDate, userId);
  }

  private getDateRangeBounds(startDate: string, endDate: string): { start: string; end: string } {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error('Invalid date range provided');
    }

    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);

    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
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

  private calculateMonthlyTrends(payments: PaymentHistoryItem[]): Array<{ month: string; revenue: number; transactions: number }> {
    if (payments.length === 0) {
      return [];
    }

    const monthlySummary = new Map<string, { revenue: number; transactions: number; order: number }>();

    payments.forEach(payment => {
      const paymentDate = new Date(payment.created_at);
      if (Number.isNaN(paymentDate.getTime())) {
        return;
      }

      const monthKey = `${paymentDate.getUTCFullYear()}-${String(paymentDate.getUTCMonth() + 1).padStart(2, '0')}`;
      const existing = monthlySummary.get(monthKey) || { revenue: 0, transactions: 0, order: paymentDate.getTime() };

      if (payment.status === 'completed') {
        existing.revenue += payment.amount;
      }

      existing.transactions += 1;
      existing.order = Math.min(existing.order, paymentDate.getTime());
      monthlySummary.set(monthKey, existing);
    });

    return Array.from(monthlySummary.entries())
      .sort((a, b) => a[1].order - b[1].order)
      .map(([monthKey, summary]) => ({
        month: this.formatMonthLabel(monthKey),
        revenue: Number(summary.revenue.toFixed(2)),
        transactions: summary.transactions
      }));
  }

  private async calculateUserSegmentation(
    payments: PaymentHistoryItem[],
    startDate: string
  ): Promise<{ newUsers: number; returningUsers: number; highValueUsers: number }> {
    if (payments.length === 0) {
      return { newUsers: 0, returningUsers: 0, highValueUsers: 0 };
    }

    const uniqueUserIds = Array.from(new Set(payments.map(payment => payment.user_id).filter(Boolean)));

    if (uniqueUserIds.length === 0) {
      return { newUsers: 0, returningUsers: 0, highValueUsers: 0 };
    }

    const { start } = this.getDateRangeBounds(startDate, startDate);

    const { data: priorPayments, error } = await supabase
      .from('payments')
      .select('user_id')
      .in('user_id', uniqueUserIds)
      .lt('created_at', start);

    if (error) {
      throw new Error(error.message || 'Failed to load historical payment data');
    }

    const returningUserIds = new Set((priorPayments || []).map(payment => payment.user_id));

    const newUsers = uniqueUserIds.filter(id => !returningUserIds.has(id)).length;
    const returningUsers = uniqueUserIds.length - newUsers;

    const completedTotals = payments
      .filter(payment => payment.status === 'completed')
      .reduce((totals, payment) => {
        const current = totals.get(payment.user_id) || 0;
        totals.set(payment.user_id, current + payment.amount);
        return totals;
      }, new Map<string, number>());

    const highValueUsers = Array.from(completedTotals.values())
      .filter(total => total >= this.HIGH_VALUE_USER_THRESHOLD)
      .length;

    return { newUsers, returningUsers, highValueUsers };
  }

  private formatMonthLabel(monthKey: string): string {
    const [year, month] = monthKey.split('-');
    const parsedDate = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
    return parsedDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  }
}

// Export singleton instance
export const paymentAnalyticsService = new PaymentAnalyticsService();