/**
 * Subscription service for handling subscription plans and user subscriptions
 * Uses 'as any' type assertions for Supabase queries since the actual
 * database schema differs from the generated types
 */

import { BaseService } from './base-service';
import { supabase, withErrorHandling } from '@/lib/supabase-enhanced';
import type { DatabaseResponse } from '@/@types/database';

// Local type definitions matching actual database schema
interface SubscriptionPlanRow {
  id: string;
  name: string;
  account_type: string;
  billing_interval: string;
  price_usd: number;
  price_zmw: number;
  description: string | null;
  features: any;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

interface UserSubscriptionRow {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  cancel_at_period_end: boolean | null;
  cancelled_at: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
  subscription_plans?: SubscriptionPlanRow;
}

export class SubscriptionService extends BaseService<UserSubscriptionRow> {
  constructor() {
    super('subscriptions');
  }

  /**
   * Get subscription plans for a specific account type
   */
  async getPlansByAccountType(accountType: string): Promise<DatabaseResponse<SubscriptionPlanRow[]>> {
    return withErrorHandling(
      async () => {
        const result = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('account_type', accountType)
          .eq('is_active', true)
          .order('price_usd', { ascending: true });
        return { data: result.data as SubscriptionPlanRow[] | null, error: result.error };
      },
      'SubscriptionService.getPlansByAccountType'
    );
  }

  /**
   * Get all subscription plans
   */
  async getAllPlans(): Promise<DatabaseResponse<SubscriptionPlanRow[]>> {
    return withErrorHandling(
      async () => {
        const result = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('account_type', { ascending: true })
          .order('price_usd', { ascending: true });
        return { data: result.data as SubscriptionPlanRow[] | null, error: result.error };
      },
      'SubscriptionService.getAllPlans'
    );
  }

  /**
   * Get a specific subscription plan by ID
   */
  async getPlanById(planId: string): Promise<DatabaseResponse<SubscriptionPlanRow>> {
    return withErrorHandling(
      async () => {
        const result = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', planId)
          .single();
        return { data: result.data as SubscriptionPlanRow | null, error: result.error };
      },
      'SubscriptionService.getPlanById'
    );
  }

  /**
   * Get user's current active subscription
   */
  async getCurrentUserSubscription(userId: string): Promise<DatabaseResponse<UserSubscriptionRow | null>> {
    return withErrorHandling(
      async () => {
        const result = await supabase
          .from('subscriptions')
          .select(`
            *,
            subscription_plans (*)
          `)
          .eq('user_id', userId)
          .eq('status', 'active')
          .gte('current_period_end', new Date().toISOString())
          .maybeSingle();
        return { data: result.data as UserSubscriptionRow | null, error: result.error };
      },
      'SubscriptionService.getCurrentUserSubscription'
    );
  }

  /**
   * Get all user subscriptions (including expired)
   */
  async getUserSubscriptions(userId: string): Promise<DatabaseResponse<UserSubscriptionRow[]>> {
    return withErrorHandling(
      async () => {
        const result = await supabase
          .from('subscriptions')
          .select(`
            *,
            subscription_plans (*)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        return { data: result.data as UserSubscriptionRow[] | null, error: result.error };
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
  ): Promise<DatabaseResponse<UserSubscriptionRow>> {
    return withErrorHandling(
      async () => {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + durationMonths);

        const subscriptionData = {
          user_id: userId,
          plan_id: planId,
          status: 'trialing' as const,
          current_period_start: startDate.toISOString(),
          current_period_end: endDate.toISOString(),
          currency: 'ZMW',
        };

        const result = await supabase
          .from('subscriptions')
          .insert(subscriptionData as any)
          .select(`
            *,
            subscription_plans (*)
          `)
          .single();

        return { data: result.data as UserSubscriptionRow | null, error: result.error };
      },
      'SubscriptionService.createSubscription'
    );
  }

  /**
   * Activate a subscription (mark as active and paid)
   */
  async activateSubscription(subscriptionId: string): Promise<DatabaseResponse<UserSubscriptionRow>> {
    return withErrorHandling(
      async () => {
        const result = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscriptionId)
          .select(`
            *,
            subscription_plans (*)
          `)
          .single();
        return { data: result.data as UserSubscriptionRow | null, error: result.error };
      },
      'SubscriptionService.activateSubscription'
    );
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<DatabaseResponse<UserSubscriptionRow>> {
    return withErrorHandling(
      async () => {
        const result = await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled' as const,
            cancel_at_period_end: true,
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', subscriptionId)
          .select(`
            *,
            subscription_plans (*)
          `)
          .single();
        return { data: result.data as UserSubscriptionRow | null, error: result.error };
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
  ): Promise<DatabaseResponse<UserSubscriptionRow>> {
    return withErrorHandling(
      async () => {
        // Get current subscription
        const { data: currentSub, error: fetchError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('id', subscriptionId)
          .single();

        if (fetchError || !currentSub) {
          return { data: null, error: fetchError || new Error('Subscription not found') };
        }

        // Calculate new end date
        const currentEndDate = new Date(currentSub.current_period_end);
        const newEndDate = new Date(currentEndDate);
        newEndDate.setMonth(newEndDate.getMonth() + durationMonths);

        const result = await supabase
          .from('subscriptions')
          .update({
            current_period_end: newEndDate.toISOString(),
            status: 'active',
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscriptionId)
          .select(`
            *,
            subscription_plans (*)
          `)
          .single();

        return { data: result.data as UserSubscriptionRow | null, error: result.error };
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
          .from('subscriptions')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'active')
          .gte('current_period_end', new Date().toISOString())
          .maybeSingle();

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
          .from('subscriptions')
          .select(`
            subscription_plans (features)
          `)
          .eq('user_id', userId)
          .eq('status', 'active')
          .gte('current_period_end', new Date().toISOString())
          .maybeSingle();

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
  async getExpiringSubscriptions(): Promise<DatabaseResponse<UserSubscriptionRow[]>> {
    return withErrorHandling(
      async () => {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        const result = await supabase
          .from('subscriptions')
          .select(`
            *,
            subscription_plans (*)
          `)
          .eq('status', 'active')
          .lte('current_period_end', sevenDaysFromNow.toISOString())
          .gte('current_period_end', new Date().toISOString())
          .order('current_period_end', { ascending: true });
        return { data: result.data as UserSubscriptionRow[] | null, error: result.error };
      },
      'SubscriptionService.getExpiringSubscriptions'
    );
  }

  /**
   * Update subscription status (for webhooks/payment processing)
   */
  async updateSubscriptionStatus(
    subscriptionId: string,
    status: 'trialing' | 'active' | 'cancelled' | 'expired' | 'past_due'
  ): Promise<DatabaseResponse<UserSubscriptionRow>> {
    return withErrorHandling(
      async () => {
        const result = await supabase
          .from('subscriptions')
          .update({
            status,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', subscriptionId)
          .select(`
            *,
            subscription_plans (*)
          `)
          .single();
        return { data: result.data as UserSubscriptionRow | null, error: result.error };
      },
      'SubscriptionService.updateSubscriptionStatus'
    );
  }
}

export class TransactionService extends BaseService<any> {
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
  ): Promise<DatabaseResponse<any>> {
    const transactionData = {
      user_id: userId,
      subscription_id: subscriptionId,
      amount,
      currency: 'ZMW', // Zambian Kwacha
      status: 'pending',
      transaction_type: 'subscription_payment',
      description: `Subscription payment - ${referenceNumber}`,
    };

    return this.create(transactionData);
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    transactionId: string,
    status: 'pending' | 'successful' | 'failed'
  ): Promise<DatabaseResponse<any>> {
    return this.update(transactionId, {
      status,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Get user transactions
   */
  async getUserTransactions(userId: string): Promise<DatabaseResponse<any[]>> {
    return withErrorHandling(
      async () => {
        const result = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        return { data: result.data, error: result.error };
      },
      'TransactionService.getUserTransactions'
    );
  }

  /**
   * Get transaction by reference number
   */
  async getByReference(referenceNumber: string): Promise<DatabaseResponse<any>> {
    return withErrorHandling(
      async () => {
        const result = await supabase
          .from('transactions')
          .select('*')
          .eq('lenco_reference', referenceNumber)
          .maybeSingle();
        return { data: result.data, error: result.error };
      },
      'TransactionService.getByReference'
    );
  }
}

// Export singleton instances
export const subscriptionService = new SubscriptionService();
export const transactionService = new TransactionService();
