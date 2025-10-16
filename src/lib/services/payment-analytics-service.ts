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
      const userSegmentation = this.calculateUserSegmentation(payments);

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
        if (!Number.isNaN(start.getTime())) {
          filteredPayments = filteredPayments.filter(p => new Date(p.created_at) >= start);
        }
      }

      if (filters?.endDate) {
        const end = new Date(filters.endDate);
        if (!Number.isNaN(end.getTime())) {
          filteredPayments = filteredPayments.filter(p => new Date(p.created_at) <= end);
        }
      }

      filteredPayments = [...filteredPayments].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });

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
    const start = this.normalizeDate(startDate);
    const end = this.normalizeDate(endDate, true);

    let query = supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (start) {
      query = query.gte('created_at', start);
    }

    if (end) {
      query = query.lte('created_at', end);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      if ((error as any)?.code === '42P01') {
        return [];
      }

      console.error('Error fetching payments from Supabase:', error);
      throw new Error(error.message || 'Failed to fetch payment data');
    }

    return (data ?? []).map((payment: any) => {
      const amount = typeof payment.amount === 'number' ? payment.amount : Number(payment.amount ?? 0);
      return {
        id: payment.id,
        reference: payment.reference,
        amount: Number.isFinite(amount) ? amount : 0,
        currency: payment.currency || 'ZMW',
        status: payment.status,
        payment_method: payment.payment_method,
        provider: payment.provider || payment.payment_provider || undefined,
        description: payment.description || '',
        created_at: payment.created_at,
        paid_at: payment.paid_at || payment.processed_at || undefined,
        user_id: payment.user_id,
        metadata: typeof payment.metadata === 'object' && payment.metadata !== null
          ? payment.metadata
          : undefined,
      } as PaymentHistoryItem;
    });
  }

  private async getUserPayments(userId: string): Promise<PaymentHistoryItem[]> {
    const today = new Date().toISOString();
    return this.getPaymentsInRange('1970-01-01', today, userId);
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
    const formatter = new Intl.DateTimeFormat('en', { month: 'short' });
    const monthly = new Map<string, { month: string; revenue: number; transactions: number; order: number }>();

    payments.forEach((payment) => {
      if (!payment.created_at) {
        return;
      }

      const createdAt = new Date(payment.created_at);
      if (Number.isNaN(createdAt.getTime())) {
        return;
      }

      const order = createdAt.getUTCFullYear() * 12 + createdAt.getUTCMonth();
      const key = `${createdAt.getUTCFullYear()}-${createdAt.getUTCMonth()}`;

      if (!monthly.has(key)) {
        monthly.set(key, {
          month: formatter.format(createdAt),
          revenue: 0,
          transactions: 0,
          order,
        });
      }

      const entry = monthly.get(key)!;
      entry.transactions += 1;

      if (payment.status === 'completed') {
        entry.revenue += payment.amount;
      }
    });

    return Array.from(monthly.values())
      .sort((a, b) => a.order - b.order)
      .map(({ month, revenue, transactions }) => ({ month, revenue, transactions }));
  }

  private calculateUserSegmentation(payments: PaymentHistoryItem[]): { newUsers: number; returningUsers: number; highValueUsers: number } {
    const HIGH_VALUE_THRESHOLD = 1000;
    const userStats = new Map<string, { count: number; total: number }>();

    payments
      .filter((payment) => payment.status === 'completed')
      .forEach((payment) => {
        if (!payment.user_id) {
          return;
        }

        const stats = userStats.get(payment.user_id) || { count: 0, total: 0 };
        stats.count += 1;
        stats.total += payment.amount;
        userStats.set(payment.user_id, stats);
      });

    let newUsers = 0;
    let returningUsers = 0;
    let highValueUsers = 0;

    userStats.forEach(({ count, total }) => {
      if (count <= 1) {
        newUsers += 1;
      } else {
        returningUsers += 1;
      }

      if (total >= HIGH_VALUE_THRESHOLD) {
        highValueUsers += 1;
      }
    });

    return { newUsers, returningUsers, highValueUsers };
  }

  private normalizeDate(date: string, endOfDay: boolean = false): string | undefined {
    if (!date) {
      return undefined;
    }

    const value = date.includes('T')
      ? date
      : `${date}T${endOfDay ? '23:59:59' : '00:00:00'}Z`;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return undefined;
    }

    return parsed.toISOString();
  }
}

// Export singleton instance
export const paymentAnalyticsService = new PaymentAnalyticsService();