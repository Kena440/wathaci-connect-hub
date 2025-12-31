/**
 * Subscription service for handling subscription plans and user subscriptions
 */

import { BaseService } from './base-service';
import { supabase, withErrorHandling } from '@/lib/supabase-enhanced';
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
   * Get subscription plans for a specific account type
   */
  async getPlansByAccountType(accountType: AccountType): Promise<DatabaseResponse<SubscriptionPlan[]>> {
    return withErrorHandling(
      async () => {
        const result = await supabase
          .from('subscription_plans')
          .select('*')
          .contains('user_types', [accountType])
          .order('lenco_amount', { ascending: true });
        return result;
      },
      'SubscriptionService.getPlansByAccountType'
    );
  }

  /**
   * Get all subscription plans
   */
  async getAllPlans(): Promise<DatabaseResponse<SubscriptionPlan[]>> {
    return withErrorHandling(
      async () => {
        const result = await supabase
          .from('subscription_plans')
          .select('*')
          .order('category', { ascending: true })
          .order('lenco_amount', { ascending: true });
        return result;
      },
      'SubscriptionService.getAllPlans'
    );
  }

  /**
   * Get a specific subscription plan by ID
   */
  async getPlanById(planId: string): Promise<DatabaseResponse<SubscriptionPlan>> {
    return withErrorHandling(
      async () => {
        const result = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', planId)
          .single();
        return result;
      },
      'SubscriptionService.getPlanById'
    );
  }

  /**
   * Get user's current active subscription
   */
  async getCurrentUserSubscription(userId: string): Promise<DatabaseResponse<UserSubscription | null>> {
    return withErrorHandling(
      async () => {
        const result = await supabase
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
          .single();
        return result;
      },
      'SubscriptionService.getCurrentUserSubscription'
    );
  }

  /**
   * Get all user subscriptions (including expired)
   */
  async getUserSubscriptions(userId: string): Promise<DatabaseResponse<UserSubscription[]>> {
    return withErrorHandling(
      async () => {
        const result = await supabase
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
          .order('created_at', { ascending: false });
        return result;
      },
      'SubscriptionService.getUserSubscriptions'
    );
  }

  /**
   * Create a new subscription for a user
   */
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

        const result = await supabase
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

  /**
   * Activate a subscription (mark as active and paid)
   */
  async activateSubscription(subscriptionId: string): Promise<DatabaseResponse<UserSubscription>> {
    return withErrorHandling(
      async () => {
        const result = await supabase
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
          .single();
        return result;
      },
      'SubscriptionService.activateSubscription'
    );
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<DatabaseResponse<UserSubscription>> {
    return withErrorHandling(
      async () => {
        const result = await supabase
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
          .single();
        return result;
      },
      'SubscriptionService.cancelSubscription'
    );
  }

  /**
   * Renew a subscription
   */
  async renewSubscription(
    subscriptionId: string,
    durationMonths: number = 1
  ): Promise<DatabaseResponse<UserSubscription>> {
    return withErrorHandling(
      async () => {
        // Get current subscription
        const { data: currentSub, error: fetchError } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('id', subscriptionId)
          .single();

        if (fetchError || !currentSub) {
          return { data: null, error: fetchError || new Error('Subscription not found') };
        }

        // Calculate new end date
        const currentEndDate = new Date(currentSub.end_date);
        const newEndDate = new Date(currentEndDate);
        newEndDate.setMonth(newEndDate.getMonth() + durationMonths);

        const result = await supabase
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

  /**
   * Check if user has active subscription
   */
  async hasActiveSubscription(userId: string): Promise<DatabaseResponse<boolean>> {
    return withErrorHandling(
      async () => {
        const { data, error } = await supabase
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

  /**
   * Get subscription features for a user
   */
  async getUserSubscriptionFeatures(userId: string): Promise<DatabaseResponse<string[]>> {
    return withErrorHandling(
      async () => {
        const { data: subscription, error } = await supabase
          .from('user_subscriptions')
          .select(`
            subscription_plans (features)
          `)
          .eq('user_id', userId)
          .eq('status', 'active')
          .gte('end_date', new Date().toISOString())
          .single();

        if (error || !subscription) {
          return { data: [], error: null }; // Return empty array for non-subscribers
        }

        const features = (subscription as any).subscription_plans?.features || [];
        return { data: features, error: null };
      },
      'SubscriptionService.getUserSubscriptionFeatures'
    );
  }

  /**
   * Check if user has specific feature access
   */
  async hasFeatureAccess(userId: string, feature: string): Promise<DatabaseResponse<boolean>> {
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

  /**
   * Get expiring subscriptions (within 7 days)
   */
  async getExpiringSubscriptions(): Promise<DatabaseResponse<UserSubscription[]>> {
    return withErrorHandling(
      async () => {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        const result = await supabase
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
        return result;
      },
      'SubscriptionService.getExpiringSubscriptions'
    );
  }

  /**
   * Update subscription status (for webhooks/payment processing)
   */
  async updateSubscriptionStatus(
    subscriptionId: string,
    status: 'pending' | 'active' | 'cancelled' | 'expired',
    paymentStatus: 'pending' | 'paid' | 'failed'
  ): Promise<DatabaseResponse<UserSubscription>> {
    return withErrorHandling(
      async () => {
        const result = await supabase
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
          .single();
        return result;
      },
      'SubscriptionService.updateSubscriptionStatus'
    );
  }
}

export class TransactionService extends BaseService<Transaction> {
  constructor() {
    super('transactions');
  }

  /**
   * Create a new transaction
   */
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
      currency: 'ZMW', // Zambian Kwacha
      status: 'pending' as const,
      payment_method: paymentMethod,
      reference_number: referenceNumber,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return this.create(transactionData);
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    transactionId: string,
    status: 'pending' | 'completed' | 'failed' | 'refunded'
  ): Promise<DatabaseResponse<Transaction>> {
    return this.update(transactionId, {
      status,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Get user transactions
   */
  async getUserTransactions(userId: string): Promise<DatabaseResponse<Transaction[]>> {
    return withErrorHandling(
      async () => {
        const result = await supabase
          .from('transactions')
          .select(`
            *,
            user_subscriptions (
              id,
              subscription_plans (name, price, period)
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        return result;
      },
      'TransactionService.getUserTransactions'
    );
  }

  /**
   * Get transaction by reference number
   */
  async getByReference(referenceNumber: string): Promise<DatabaseResponse<Transaction>> {
    return withErrorHandling(
      async () => {
        const result = await supabase
          .from('transactions')
          .select('*')
          .eq('reference_number', referenceNumber)
          .single();
        return result;
      },
      'TransactionService.getByReference'
    );
  }
}

// Export singleton instances
export const subscriptionService = new SubscriptionService();
export const transactionService = new TransactionService();