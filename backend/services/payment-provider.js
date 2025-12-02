const { v4: uuidv4 } = require('uuid');

/**
 * Payment provider abstraction to keep gateways pluggable.
 */
class PaymentProvider {
  constructor(name = 'unknown') {
    this.name = name;
  }

  /**
   * Initiate a checkout session.
   * @param {{ amount: number; currency: string; reference: string; metadata?: Record<string, unknown> }} params
   * @returns {Promise<{ checkoutUrl: string; providerPaymentId: string; rawResponse?: unknown }>}
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createCheckout(params) {
    throw new Error('createCheckout not implemented');
  }

  /**
   * Verify a webhook payload and return normalized event data.
   * @param {object} payload
   * @returns {Promise<{ providerPaymentId: string; status: 'succeeded' | 'failed' | 'pending'; metadata?: Record<string, unknown> }>}
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async parseWebhook(payload) {
    throw new Error('parseWebhook not implemented');
  }
}

/**
 * Lightweight placeholder implementation for Lenco until full gateway SDK is wired.
 */
class LencoPaymentProvider extends PaymentProvider {
  constructor() {
    super('lenco');
  }

  async createCheckout(params) {
    const providerPaymentId = uuidv4();
    const checkoutUrl = `${process.env.LENCO_CHECKOUT_BASE_URL || 'https://pay.lenco.example/checkout'}/${providerPaymentId}`;
    return {
      checkoutUrl,
      providerPaymentId,
      rawResponse: {
        simulated: true,
        params,
      },
    };
  }

  async parseWebhook(payload) {
    const status = payload?.status === 'success' ? 'succeeded' : payload?.status === 'failed' ? 'failed' : 'pending';
    return {
      providerPaymentId: payload?.provider_payment_id || payload?.reference || payload?.id,
      status,
      metadata: payload || {},
    };
  }
}

module.exports = {
  PaymentProvider,
  LencoPaymentProvider,
};
