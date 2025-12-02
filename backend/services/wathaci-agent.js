const { v4: uuidv4 } = require('uuid');
const { getSupabaseClient, isSupabaseConfigured } = require('../lib/supabaseAdmin');
const { LencoPaymentProvider } = require('./payment-provider');

class AgentError extends Error {
  constructor(message, code = 'AGENT_ERROR', status = 400, details) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const normalizeAccountType = (value = '') => value?.toString()?.toUpperCase() || 'SME';

const isGracePeriodActive = () => {
  const graceDeadline = process.env.GRACE_PERIOD_END_DATE;
  if (!graceDeadline) return true;
  return new Date(graceDeadline).getTime() >= Date.now();
};

class WathaciOnboardingAgent {
  constructor(options = {}) {
    this.supabase = getSupabaseClient();
    this.paymentProvider = options.paymentProvider || new LencoPaymentProvider();

    if (!isSupabaseConfigured()) {
      console.warn('[WathaciOnboardingAgent] Supabase is not configured. Agent operations will fail.');
    }
  }

  async logEvent(entry) {
    if (!isSupabaseConfigured()) {
      console.error('[AgentLog]', entry);
      return;
    }

    const payload = {
      id: entry.id || uuidv4(),
      user_id: entry.userId || entry.user_id || null,
      event_type: entry.eventType,
      payload: entry.payload || null,
      status: entry.status || 'info',
      message: entry.message,
    };

    const { error } = await this.supabase.from('agent_logs').insert(payload);
    if (error) {
      console.error('[AgentLog] Failed to persist log', error);
    }
  }

  ensureConfigured() {
    if (!isSupabaseConfigured()) {
      throw new AgentError('Supabase is not configured', 'SUPABASE_NOT_CONFIGURED', 500);
    }
  }

  async signup({ email, password, account_type, profile = {} }) {
    this.ensureConfigured();

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new AgentError('Invalid email format', 'INVALID_INPUT', 400, { field: 'email' });
    }

    if (!password || password.length < 6) {
      throw new AgentError('Password must be at least 6 characters', 'INVALID_INPUT', 400, { field: 'password' });
    }

    const accountType = normalizeAccountType(account_type);
    const correlationId = uuidv4();

    try {
      const { data, error } = await this.supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (error || !data?.user) {
        throw new AgentError(error?.message || 'Failed to create auth user', 'AUTH_CREATE_FAILED', 500, error);
      }

      const userId = data.user.id;

      const profilePayload = {
        id: userId,
        user_id: userId,
        email,
        account_type: accountType,
        status: 'incomplete',
        profile_completed: false,
        ...profile,
      };

      const { error: profileError } = await this.supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' });

      if (profileError) {
        await this.supabase.auth.admin.deleteUser(userId);
        throw new AgentError('Failed to create profile', 'PROFILE_CREATE_FAILED', 500, profileError);
      }

      let subscriptionRecord = null;
      if (isGracePeriodActive()) {
        const { data: subscriptionData, error: subscriptionError } = await this.supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            plan_code: process.env.DEFAULT_PLAN_CODE || 'FREE_TRIAL',
            status: 'grace_period',
            valid_from: new Date().toISOString(),
            valid_to: null,
            metadata: { correlationId },
          })
          .select()
          .single();

        if (subscriptionError) {
          await this.logEvent({
            userId,
            eventType: 'subscription_create',
            status: 'warning',
            message: 'Failed to attach grace period subscription',
            payload: { subscriptionError },
          });
        } else {
          subscriptionRecord = subscriptionData;
        }
      }

      await this.logEvent({
        userId,
        eventType: 'signup',
        status: 'info',
        message: 'User signed up via onboarding agent',
        payload: { correlationId, accountType },
      });

      return {
        userId,
        profileId: userId,
        subscription: subscriptionRecord,
        nextStep: '/onboarding',
      };
    } catch (error) {
      await this.logEvent({
        eventType: 'signup',
        status: 'error',
        message: error.message,
        payload: { code: error.code, details: error.details },
      });
      if (error instanceof AgentError) {
        throw error;
      }
      throw new AgentError('Unable to complete signup', 'SIGNUP_FAILED', 500, error);
    }
  }

  async signin({ email, password }) {
    this.ensureConfigured();
    if (!email || !password) {
      throw new AgentError('Email and password are required', 'INVALID_INPUT', 400);
    }

    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error || !data?.session) {
      await this.logEvent({ eventType: 'signin', status: 'error', message: error?.message || 'Invalid credentials' });
      throw new AgentError('Invalid credentials', 'AUTH_FAILED', 401, error);
    }

    await this.logEvent({ userId: data.user?.id, eventType: 'signin', status: 'info', message: 'User signed in' });
    return { session: data.session, user: data.user };
  }

  async getProfile(userId) {
    this.ensureConfigured();
    if (!userId) throw new AgentError('userId is required', 'INVALID_INPUT', 400);
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      throw new AgentError('Profile not found', 'PROFILE_NOT_FOUND', 404, error);
    }

    return data;
  }

  async updateProfile(userId, updates = {}) {
    this.ensureConfigured();
    if (!userId) throw new AgentError('userId is required', 'INVALID_INPUT', 400);

    const requiredFields = ['full_name', 'phone'];
    const missingRequired = requiredFields.filter((field) => updates[field] === undefined || updates[field] === null);

    const status = missingRequired.length === 0 ? 'active' : 'pending_verification';
    const profileUpdate = {
      ...updates,
      status,
      profile_completed: missingRequired.length === 0,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      await this.logEvent({
        userId,
        eventType: 'profile_update',
        status: 'error',
        message: 'Profile update failed',
        payload: { error },
      });
      throw new AgentError('Profile update failed', 'PROFILE_UPDATE_FAILED', 500, error);
    }

    await this.logEvent({ userId, eventType: 'profile_update', status: 'info', message: 'Profile updated' });
    return data;
  }

  async initiateCheckout(userId, { plan_code, amount, currency = 'ZMW', type = 'subscription', metadata = {} }) {
    this.ensureConfigured();
    if (!userId) throw new AgentError('userId is required', 'INVALID_INPUT', 400);

    const reference = uuidv4();
    const normalizedAmount = amount ?? Number(process.env.DEFAULT_PLAN_AMOUNT || 0);
    if (!normalizedAmount || Number.isNaN(normalizedAmount)) {
      throw new AgentError('Amount is required for checkout', 'INVALID_INPUT', 400, { field: 'amount' });
    }

    const { data: paymentRecord, error: paymentError } = await this.supabase
      .from('payments')
      .insert({
        user_id: userId,
        amount: normalizedAmount,
        currency,
        payment_provider: this.paymentProvider.name,
        status: 'initiated',
        type,
        reference,
        metadata: { plan_code, ...metadata },
      })
      .select()
      .single();

    if (paymentError) {
      throw new AgentError('Failed to record payment', 'PAYMENT_RECORD_FAILED', 500, paymentError);
    }

    const providerResponse = await this.paymentProvider.createCheckout({
      amount: normalizedAmount,
      currency,
      reference,
      metadata,
    });

    const { error: updateError } = await this.supabase
      .from('payments')
      .update({ provider_payment_id: providerResponse.providerPaymentId, metadata: { ...metadata, providerResponse } })
      .eq('id', paymentRecord.id);

    if (updateError) {
      await this.logEvent({
        userId,
        eventType: 'payment',
        status: 'warning',
        message: 'Failed to attach provider reference to payment',
        payload: { updateError },
      });
    }

    await this.logEvent({
      userId,
      eventType: 'payment',
      status: 'info',
      message: 'Checkout initiated',
      payload: { reference, plan_code },
    });

    return {
      paymentId: paymentRecord.id,
      providerPaymentId: providerResponse.providerPaymentId,
      checkoutUrl: providerResponse.checkoutUrl,
      reference,
    };
  }

  async handleWebhook(payload = {}) {
    this.ensureConfigured();
    const normalized = await this.paymentProvider.parseWebhook(payload);
    if (!normalized?.providerPaymentId) {
      throw new AgentError('Missing provider payment id', 'INVALID_WEBHOOK', 400);
    }

    const { data: payment, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('provider_payment_id', normalized.providerPaymentId)
      .single();

    if (error || !payment) {
      await this.logEvent({
        eventType: 'payment_webhook',
        status: 'warning',
        message: 'Payment not found for webhook',
        payload: { normalized },
      });
      throw new AgentError('Payment not found', 'PAYMENT_NOT_FOUND', 404, error);
    }

    const { error: updateError } = await this.supabase
      .from('payments')
      .update({ status: normalized.status, metadata: { ...(payment.metadata || {}), webhook: normalized.metadata } })
      .eq('id', payment.id);

    if (updateError) {
      throw new AgentError('Failed to update payment', 'PAYMENT_UPDATE_FAILED', 500, updateError);
    }

    if (normalized.status === 'succeeded') {
      const validFrom = new Date();
      const validTo = new Date(validFrom);
      validTo.setMonth(validTo.getMonth() + 1);

      const { error: subscriptionError } = await this.supabase
        .from('subscriptions')
        .upsert(
          {
            user_id: payment.user_id,
            plan_code: payment.metadata?.plan_code || 'PRO_MONTHLY',
            status: 'active',
            valid_from: validFrom.toISOString(),
            valid_to: validTo.toISOString(),
            metadata: { paymentId: payment.id },
          },
          { onConflict: 'user_id' },
        );

      if (subscriptionError) {
        await this.logEvent({
          userId: payment.user_id,
          eventType: 'subscription_update',
          status: 'error',
          message: 'Failed to activate subscription after payment',
          payload: { subscriptionError },
        });
        throw new AgentError('Failed to update subscription', 'SUBSCRIPTION_UPDATE_FAILED', 500, subscriptionError);
      }

      await this.logEvent({
        userId: payment.user_id,
        eventType: 'subscription_update',
        status: 'info',
        message: 'Subscription activated',
        payload: { paymentId: payment.id },
      });
    }

    await this.logEvent({
      userId: payment.user_id,
      eventType: 'payment_webhook',
      status: 'info',
      message: 'Payment webhook processed',
      payload: normalized,
    });

    return { ok: true };
  }
}

module.exports = { WathaciOnboardingAgent, AgentError };
