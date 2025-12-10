/**
 * Enhanced Subscription service for handling subscription plans and user subscriptions with Lenco payments
 */

import { BaseService } from './base-service';
import { supabaseClient } from '@/lib/supabaseClient';
import { withErrorHandling } from '@/lib/supabase-enhanced';
import { lencoPaymentService } from './lenco-payment-service';
import { logger } from '../logger';
import { isSubscriptionTemporarilyDisabled } from '@/lib/subscriptionWindow';
import type { 
  SubscriptionPlan, 
  UserSubscription, 
  Transaction,
  AccountType,
  DatabaseResponse 
} from '@/@types/database';

export class SubscriptionService extends BaseService<UserSubscription> {
  constructor() {
    super('user_subscriptions');
  }

  /**
   * Subscribe user to a plan with Lenco payment integration
   */
  async subscribeToPlan(
    userId: string,
    planId: string,
    paymentMethod: 'mobile_money' | 'card',
    paymentDetails: {
      email: string;
      name: string;
      phone?: string;
      provider?: 'mtn' | 'airtel' | 'zamtel';
    }
  ): Promise<{
    success: boolean;
    subscription?: UserSubscription;
    payment_url?: string;
    error?: string;
  }> {
    let paymentReference: string | undefined;
    try {
      // Check if user already has an active subscription
      const existingSubscription = await this.getCurrentUserSubscription(userId);
      if (existingSubscription.data) {
        throw new Error('User already has an active subscription. Please cancel current subscription first.');
      }

      // Get plan details
      const planResult = await this.getPlanById(planId);
      if (!planResult.data) {
        throw new Error('Subscription plan not found');
      }
      const plan = planResult.data;

      // Calculate subscription period
      const startDate = new Date();
      const endDate = this.calculateEndDate(startDate, plan.period);

      // Create subscription record
      const subscriptionData = {
        user_id: userId,
        plan_id: planId,
        status: 'pending' as const,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        payment_status: 'pending' as const,
        auto_renew: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const subscriptionResult = await this.create(subscriptionData);
      if (!subscriptionResult.data) {
        throw new Error('Failed to create subscription record');
      }

      const subscription = subscriptionResult.data;

      // Process payment
      const paymentAmount = plan.lencoAmount / 100; // Convert from ngwee to kwacha
      const paymentResponse = paymentMethod === 'mobile_money'
        ? await lencoPaymentService.processMobileMoneyPayment({
            amount: paymentAmount,
            phone: paymentDetails.phone!,
            provider: paymentDetails.provider!,
            email: paymentDetails.email,
            name: paymentDetails.name,
            description: `${plan.name} Subscription - ${plan.description || plan.price}`
          })
        : await lencoPaymentService.processCardPayment({
            amount: paymentAmount,
            email: paymentDetails.email,
            name: paymentDetails.name,
            description: `${plan.name} Subscription - ${plan.description || plan.price}`,
            phone: paymentDetails.phone
          });

      if (!paymentResponse.success) {
        // Clean up failed subscription
        await this.delete(subscription.id);
        throw new Error(paymentResponse.error || 'Payment failed');
      }

      // Update subscription with payment reference
      await this.update(subscription.id, {
        payment_reference: paymentResponse.data?.reference,
        updated_at: new Date().toISOString()
      });

      paymentReference = paymentResponse.data?.reference;

      // Create transaction record
      await transactionService.createTransaction(
        userId,
        subscription.id,
        paymentAmount,
        paymentMethod === 'mobile_money' ? 'phone' : 'card',
        paymentResponse.data?.reference || ''
      );

      return {
        success: true,
        subscription: subscription as UserSubscription,
        payment_url: paymentResponse.data?.payment_url
      };

    } catch (error: any) {
      logger.error('Subscription error', error, {
        userId,
        paymentReference,
      });
      return {
        success: false,
        error: error.message || 'Subscription failed'
      };
    }
  }

  /**
   * Verify subscription payment and activate
   */
  async verifySubscriptionPayment(paymentReference: string): Promise<{
    success: boolean;
    subscription?: UserSubscription;
    error?: string;
  }> {
    let userId: string | undefined;
    try {
      // Verify payment with Lenco
      const paymentStatus = await lencoPaymentService.verifyPayment(paymentReference);

      // Update transaction record
      const transactionResult = await transactionService.getByReference(paymentReference);
      if (transactionResult.data) {
        userId = transactionResult.data.user_id;
        await transactionService.updateTransactionStatus(
          transactionResult.data.id,
          paymentStatus.status === 'completed' ? 'completed' : 'failed'
        );
      }

      if (paymentStatus.status === 'completed') {
        // Find subscription by payment reference
        const { data: subscription, error } = await supabaseClient
          .from('user_subscriptions')
          .select('*')
          .eq('payment_reference', paymentReference)
          .single();

        if (error || !subscription) {
          throw new Error('Subscription not found for payment reference');
        }

        // Activate subscription
        const activatedResult = await this.activateSubscription(subscription.id);
        if (!activatedResult.data) {
          throw new Error('Failed to activate subscription');
        }

        userId = subscription.user_id;

        return {
          success: true,
          subscription: activatedResult.data as UserSubscription
        };
      } else {
        throw new Error('Payment verification failed');
      }

    } catch (error: any) {
      logger.error('Payment verification error', error, {
        userId,
        paymentReference,
      });
      return {
        success: false,
        error: error.message || 'Payment verification failed'
      };
    }
  }

  /**
   * Renew subscription with payment
   */
  async renewSubscriptionWithPayment(
    subscriptionId: string,
    paymentMethod: 'mobile_money' | 'card',
    paymentDetails: {
      email: string;
      name: string;
      phone?: string;
      provider?: 'mtn' | 'airtel' | 'zamtel';
    }
  ): Promise<{
    success: boolean;
    payment_url?: string;
    error?: string;
  }> {
    let userId: string | undefined;
    let paymentReference: string | undefined;
    try {
      // Get current subscription with plan details
      const { data: subscription, error: subError } = await supabaseClient
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('id', subscriptionId)
        .single();

      if (subError || !subscription) {
        throw new Error('Subscription not found');
      }

      userId = subscription.user_id;

      const plan = (subscription as any).subscription_plans;
      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      // Process renewal payment
      const paymentAmount = plan.lencoAmount / 100;
      const paymentResponse = paymentMethod === 'mobile_money'
        ? await lencoPaymentService.processMobileMoneyPayment({
            amount: paymentAmount,
            phone: paymentDetails.phone!,
            provider: paymentDetails.provider!,
            email: paymentDetails.email,
            name: paymentDetails.name,
            description: `${plan.name} Subscription Renewal`
          })
        : await lencoPaymentService.processCardPayment({
            amount: paymentAmount,
            email: paymentDetails.email,
            name: paymentDetails.name,
            description: `${plan.name} Subscription Renewal`,
            phone: paymentDetails.phone
          });

      if (!paymentResponse.success) {
        throw new Error(paymentResponse.error || 'Renewal payment failed');
      }

      // Update subscription with new end date and payment reference
      const currentEndDate = new Date(subscription.end_date);
      const newEndDate = this.calculateEndDate(currentEndDate, plan.period);

      await this.update(subscriptionId, {
        end_date: newEndDate.toISOString(),
        status: 'active',
        payment_status: 'paid',
        payment_reference: paymentResponse.data?.reference,
        updated_at: new Date().toISOString()
      });

      paymentReference = paymentResponse.data?.reference;

      // Create transaction record for renewal
      await transactionService.createTransaction(
        subscription.user_id,
        subscriptionId,
        paymentAmount,
        paymentMethod === 'mobile_money' ? 'phone' : 'card',
        paymentResponse.data?.reference || ''
      );

      return {
        success: true,
        payment_url: paymentResponse.data?.payment_url
      };

    } catch (error: any) {
      logger.error('Renewal error', error, {
        userId,
        paymentReference,
      });
      return {
        success: false,
        error: error.message || 'Renewal failed'
      };
    }
  }

  /**
   * Calculate subscription end date based on period
   */
  private calculateEndDate(startDate: Date, period: string): Date {
    const endDate = new Date(startDate);

    if (period.includes('3 months') || period.includes('/3 months')) {
      endDate.setMonth(endDate.getMonth() + 3);
    } else if (period.includes('year') || period.includes('/year')) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      // Default to 1 month for monthly plans
      endDate.setMonth(endDate.getMonth() + 1);
    }

    return endDate;
  }

  /**
   * Get subscription analytics
   */
  async getSubscriptionAnalytics(userId?: string): Promise<{
    activeSubscriptions: number;
    totalRevenue: number;
    monthlyRevenue: number;
    churnRate: number;
  }> {
    try {
      let subscriptionsQuery = supabaseClient.from('user_subscriptions').select('*');
      
      if (userId) {
        subscriptionsQuery = subscriptionsQuery.eq('user_id', userId);
      }

      const { data: subscriptions } = await subscriptionsQuery;

      if (!subscriptions) {
        return {
          activeSubscriptions: 0,
          totalRevenue: 0,
          monthlyRevenue: 0,
          churnRate: 0
        };
      }

      type SubscriptionRecord = { status?: string | null };
      const subscriptionList = subscriptions as SubscriptionRecord[];

      const activeCount = subscriptionList.filter(subscription => subscription.status === 'active').length;
      const cancelledCount = subscriptionList.filter(subscription => subscription.status === 'cancelled').length;
      
      // Get transaction data for revenue calculation
      let transactionsQuery = supabaseClient
        .from('transactions')
        .select('amount, created_at, status')
        .eq('status', 'completed');

      if (userId) {
        transactionsQuery = transactionsQuery.eq('user_id', userId);
      }

      const { data: transactions } = await transactionsQuery;

      type TransactionRecord = { amount: number; created_at: string };
      const transactionList = (transactions ?? []) as TransactionRecord[];

      const totalRevenue = transactionList.reduce((sum, transaction) => sum + transaction.amount, 0);
      
      const currentMonth = new Date();
      const monthlyTransactions = transactionList.filter(transaction => {
        const transactionDate = new Date(transaction.created_at);
        return transactionDate.getMonth() === currentMonth.getMonth() &&
               transactionDate.getFullYear() === currentMonth.getFullYear();
      });

      const monthlyRevenue = monthlyTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
      const churnRate = subscriptions.length > 0 ? (cancelledCount / subscriptions.length) * 100 : 0;

      return {
        activeSubscriptions: activeCount,
        totalRevenue,
        monthlyRevenue,
        churnRate
      };

    } catch (error) {
      logger.error('Error getting subscription analytics', error, { userId });
      return {
        activeSubscriptions: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        churnRate: 0
      };
    }
  }

  /**
   * Process expired subscriptions (run as scheduled task)
   */
  async processExpiredSubscriptions(): Promise<number> {
    try {
      const { data: expiredSubscriptions, error } = await supabaseClient
        .from('user_subscriptions')
        .select('id')
        .eq('status', 'active')
        .lt('end_date', new Date().toISOString());

      if (error || !expiredSubscriptions) {
        logger.error('Error finding expired subscriptions', error);
        return 0;
      }

      let processedCount = 0;
      for (const subscription of expiredSubscriptions) {
        try {
          await this.update(subscription.id, {
            status: 'expired',
            updated_at: new Date().toISOString()
          });
          processedCount++;
        } catch (updateError) {
          logger.error(`Error updating subscription ${subscription.id}`, updateError);
        }
      }

      return processedCount;
    } catch (error) {
      logger.error('Error processing expired subscriptions', error);
      return 0;
    }
  }

  // Keep all existing methods from the original class
  async getPlansByAccountType(accountType: AccountType): Promise<DatabaseResponse<SubscriptionPlan[]>> {
    return withErrorHandling(
      () => supabaseClient
        .from('subscription_plans')
        .select('*')
        .contains('user_types', [accountType])
        .order('lenco_amount', { ascending: true }),
      'SubscriptionService.getPlansByAccountType'
    );
  }

  async getAllPlans(): Promise<DatabaseResponse<SubscriptionPlan[]>> {
    return withErrorHandling(
      () => supabaseClient
        .from('subscription_plans')
        .select('*')
        .order('category', { ascending: true })
        .order('lenco_amount', { ascending: true }),
      'SubscriptionService.getAllPlans'
    );
  }

  async getPlanById(planId: string): Promise<DatabaseResponse<SubscriptionPlan>> {
    return withErrorHandling(
      () => supabaseClient
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single(),
      'SubscriptionService.getPlanById'
    );
  }

  async getCurrentUserSubscription(userId: string): Promise<DatabaseResponse<UserSubscription | null>> {
    return withErrorHandling(
      () => supabaseClient
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (
            id,
            name,
            price,
            period,
            features,
            category,
            lenco_amount
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString())
        .single(),
      'SubscriptionService.getCurrentUserSubscription'
    );
  }

  async getUserSubscriptions(userId: string): Promise<DatabaseResponse<UserSubscription[]>> {
    return withErrorHandling(
      () => supabaseClient
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (
            id,
            name,
            price,
            period,
            features,
            category,
            lenco_amount
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      'SubscriptionService.getUserSubscriptions'
    );
  }

  async createSubscription(
    userId: string,
    planId: string,
    durationMonths: number = 1
  ): Promise<DatabaseResponse<UserSubscription>> {
    return withErrorHandling(
      async () => {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + durationMonths);

        const subscriptionData = {
          user_id: userId,
          plan_id: planId,
          status: 'pending' as const,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          payment_status: 'pending' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const result = await supabaseClient
          .from('user_subscriptions')
          .insert(subscriptionData)
          .select(`
            *,
            subscription_plans (
              id,
              name,
              price,
              period,
              features,
              category,
              lenco_amount
            )
          `)
          .single();

        return result;
      },
      'SubscriptionService.createSubscription'
    );
  }

  async activateSubscription(subscriptionId: string): Promise<DatabaseResponse<UserSubscription>> {
    return withErrorHandling(
      () => supabaseClient
        .from('user_subscriptions')
        .update({
          status: 'active',
          payment_status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId)
        .select(`
          *,
          subscription_plans (
            id,
            name,
            price,
            period,
            features,
            category,
            lenco_amount
          )
        `)
        .single(),
      'SubscriptionService.activateSubscription'
    );
  }

  async cancelSubscription(subscriptionId: string): Promise<DatabaseResponse<UserSubscription>> {
    return withErrorHandling(
      () => supabaseClient
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId)
        .select(`
          *,
          subscription_plans (
            id,
            name,
            price,
            period,
            features,
            category,
            lenco_amount
          )
        `)
        .single(),
      'SubscriptionService.cancelSubscription'
    );
  }

  async renewSubscription(
    subscriptionId: string,
    durationMonths: number = 1
  ): Promise<DatabaseResponse<UserSubscription>> {
    return withErrorHandling(
      async () => {
        const { data: currentSub, error: fetchError } = await supabaseClient
          .from('user_subscriptions')
          .select('*')
          .eq('id', subscriptionId)
          .single();

        if (fetchError || !currentSub) {
          return { data: null, error: fetchError || new Error('Subscription not found') };
        }

        const currentEndDate = new Date(currentSub.end_date);
        const newEndDate = new Date(currentEndDate);
        newEndDate.setMonth(newEndDate.getMonth() + durationMonths);

        const result = await supabaseClient
          .from('user_subscriptions')
          .update({
            end_date: newEndDate.toISOString(),
            status: 'active',
            payment_status: 'paid',
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscriptionId)
          .select(`
            *,
            subscription_plans (
              id,
              name,
              price,
              period,
              features,
              category,
              lenco_amount
            )
          `)
          .single();

        return result;
      },
      'SubscriptionService.renewSubscription'
    );
  }

  async hasActiveSubscription(userId: string): Promise<DatabaseResponse<boolean>> {
    if (isSubscriptionTemporarilyDisabled()) {
      return { data: true, error: null };
    }

    return withErrorHandling(
      async () => {
        const { data, error } = await supabaseClient
          .from('user_subscriptions')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'active')
          .gte('end_date', new Date().toISOString())
          .single();

        return { 
          data: !error && !!data, 
          error: null 
        };
      },
      'SubscriptionService.hasActiveSubscription'
    );
  }

  async getUserSubscriptionFeatures(userId: string): Promise<DatabaseResponse<string[]>> {
    return withErrorHandling(
      async () => {
        const { data: subscription, error } = await supabaseClient
          .from('user_subscriptions')
          .select(`
            subscription_plans (features)
          `)
          .eq('user_id', userId)
          .eq('status', 'active')
          .gte('end_date', new Date().toISOString())
          .single();

        if (error || !subscription) {
          return { data: [], error: null };
        }

        const features = (subscription as any).subscription_plans?.features || [];
        return { data: features, error: null };
      },
      'SubscriptionService.getUserSubscriptionFeatures'
    );
  }

  async hasFeatureAccess(userId: string, feature: string): Promise<DatabaseResponse<boolean>> {
    if (isSubscriptionTemporarilyDisabled()) {
      return { data: true, error: null };
    }

    return withErrorHandling(
      async () => {
        const { data: features, error } = await this.getUserSubscriptionFeatures(userId);
        
        if (error) {
          return { data: false, error };
        }

        return { 
          data: features?.includes(feature) || false, 
          error: null 
        };
      },
      'SubscriptionService.hasFeatureAccess'
    );
  }

  async getExpiringSubscriptions(): Promise<DatabaseResponse<UserSubscription[]>> {
    return withErrorHandling(
      () => {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        return supabaseClient
          .from('user_subscriptions')
          .select(`
            *,
            profiles (first_name, last_name, email),
            subscription_plans (name, price, period)
          `)
          .eq('status', 'active')
          .lte('end_date', sevenDaysFromNow.toISOString())
          .gte('end_date', new Date().toISOString())
          .order('end_date', { ascending: true });
      },
      'SubscriptionService.getExpiringSubscriptions'
    );
  }

  async updateSubscriptionStatus(
    subscriptionId: string,
    status: 'pending' | 'active' | 'cancelled' | 'expired',
    paymentStatus: 'pending' | 'paid' | 'failed'
  ): Promise<DatabaseResponse<UserSubscription>> {
    return withErrorHandling(
      () => supabaseClient
        .from('user_subscriptions')
        .update({
          status,
          payment_status: paymentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId)
        .select(`
          *,
          subscription_plans (
            id,
            name,
            price,
            period,
            features,
            category,
            lenco_amount
          )
        `)
        .single(),
      'SubscriptionService.updateSubscriptionStatus'
    );
  }
}

export class TransactionService extends BaseService<Transaction> {
  constructor() {
    super('transactions');
  }

  async createTransaction(
    userId: string,
    subscriptionId: string,
    amount: number,
    paymentMethod: 'phone' | 'card',
    referenceNumber: string
  ): Promise<DatabaseResponse<Transaction>> {
    const transactionData = {
      user_id: userId,
      subscription_id: subscriptionId,
      amount,
      currency: 'ZMW',
      status: 'pending' as const,
      payment_method: paymentMethod,
      reference_number: referenceNumber,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return this.create(transactionData);
  }

  async updateTransactionStatus(
    transactionId: string,
    status: 'pending' | 'completed' | 'failed' | 'refunded'
  ): Promise<DatabaseResponse<Transaction>> {
    return this.update(transactionId, {
      status,
      updated_at: new Date().toISOString(),
    });
  }

  async getUserTransactions(userId: string): Promise<DatabaseResponse<Transaction[]>> {
    return withErrorHandling(
      () => supabaseClient
        .from('transactions')
        .select(`
          *,
          user_subscriptions (
            id,
            subscription_plans (name, price, period)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      'TransactionService.getUserTransactions'
    );
  }

  async getByReference(referenceNumber: string): Promise<DatabaseResponse<Transaction>> {
    return withErrorHandling(
      () => supabaseClient
        .from('transactions')
        .select('*')
        .eq('reference_number', referenceNumber)
        .single(),
      'TransactionService.getByReference'
    );
  }
}

// Export singleton instances
export const subscriptionService = new SubscriptionService();
export const transactionService = new TransactionService();