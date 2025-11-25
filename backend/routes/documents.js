/**
 * Document Generator Routes
 * API endpoints for AI document generation with payment
 * Merged implementation combining service-based approach with enhanced validation
 */

const express = require('express');
const {
  SUPPORTED_TYPES,
  createPaymentRequest,
  markPaymentStatus,
  getRequestById,
  listRequestsForUser,
  generateDocument,
  resolveAmount,
} = require('../services/document-request-service');

const router = express.Router();

const requireFields = (body, fields) => {
  const missing = fields.filter(key => !body[key]);
  if (missing.length) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }
};

router.get('/config', (req, res) => {
  res.json({
    supported_documents: SUPPORTED_TYPES,
    pricing: {
      business_plan: 150,
      pitch_deck: 150,
      bundle: 300,
      currency: 'ZMW',
    },
  });
});

router.post('/pay', async (req, res) => {
  try {
    const body = req.body || {};
    requireFields(body, ['document_type', 'payment_method', 'user_id']);

    // Validate document type
    if (!['business_plan', 'pitch_deck', 'bundle'].includes(body.document_type)) {
      return res.status(400).json({ error: 'Invalid document_type. Must be business_plan, pitch_deck, or bundle' });
    }

    // Validate payment method
    if (!['mobile_money', 'card'].includes(body.payment_method)) {
      return res.status(400).json({ error: 'Invalid payment_method. Must be mobile_money or card' });
    }

    // Validate mobile money specific fields
    if (body.payment_method === 'mobile_money') {
      if (body.provider && !['mtn', 'airtel', 'zamtel'].includes(body.provider)) {
        return res.status(400).json({ error: 'Invalid provider. Must be mtn, airtel, or zamtel' });
      }
    }

    const paymentStatus = body.auto_confirm ? 'success' : 'pending';
    const amount = body.amount || resolveAmount(body.document_type);

    const record = await createPaymentRequest({
      document_type: body.document_type,
      payment_method: body.payment_method,
      payment_gateway: body.payment_gateway,
      user_id: body.user_id,
      company_id: body.company_id || body.user_id,
      input_data: body.input_data || {},
      payment_status: paymentStatus,
      amount,
      currency: body.currency || 'ZMW',
      payment_reference: body.payment_reference,
      phone_number: body.phone_number,
      provider: body.provider,
    });

    console.log(`[document-pay] Payment initialized for ${body.document_type}`, {
      reference: record.payment_reference,
      user_id: body.user_id,
      payment_method: body.payment_method,
    });

    res.status(201).json({
      request: record,
      payment: {
        status: record.payment_status,
        reference: record.payment_reference,
        requires_confirmation: paymentStatus !== 'success',
        message: paymentStatus === 'success'
          ? 'Payment confirmed. You can proceed to generation.'
          : body.payment_method === 'mobile_money'
            ? `Payment request sent to your ${body.provider?.toUpperCase() || 'mobile'} phone`
            : 'Payment initiated. Awaiting confirmation before generation.',
      },
    });
  } catch (error) {
    console.error('[documents/pay] error', error.message);
    res.status(error.status || 500).json({ error: error.message });
  }
});

/**
 * POST /api/documents/webhook
 * Handle payment webhook callbacks
 */
router.post('/webhook', async (req, res) => {
  try {
    const { payment_reference, status, transaction_id, amount } = req.body;

    if (!payment_reference) {
      return res.status(400).json({ error: 'Missing payment_reference' });
    }

    // Update payment status via the service
    const paymentStatus = status === 'success' || status === 'completed' ? 'success' : 'failed';
    
    try {
      const updated = await markPaymentStatus(payment_reference, paymentStatus, {
        transaction_id,
        received_amount: amount,
      });

      console.log(`[document-webhook] Payment ${paymentStatus} for ${payment_reference}`);

      res.status(200).json({ 
        received: true, 
        status: paymentStatus,
        request: updated,
      });
    } catch (error) {
      if (error.message?.includes('not found')) {
        console.warn(`[document-webhook] Unknown payment reference: ${payment_reference}`);
        return res.status(404).json({ error: 'Payment reference not found' });
      }
      throw error;
    }

  } catch (error) {
    console.error('[document-webhook] Error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

router.post('/:id/confirm-payment', async (req, res) => {
  try {
    const { status = 'success', gateway, reference } = req.body || {};
    const updated = await markPaymentStatus(req.params.id, status, { gateway, reference });
    res.json({ request: updated });
  } catch (error) {
    console.error('[documents/confirm-payment] error', error.message);
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post('/:id/generate', async (req, res) => {
  try {
    const userId = req.body?.user_id;
    if (!userId) {
      return res.status(400).json({ error: 'user_id is required to generate' });
    }
    const record = await generateDocument(req.params.id, userId);
    
    console.log(`[document-generate] Started generation for ${req.params.id}`);
    
    res.json({ request: record });
  } catch (error) {
    console.error('[documents/generate] error', error.message);
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const records = await listRequestsForUser(userId);
    res.json({ 
      success: true,
      data: records,
    });
  } catch (error) {
    console.error('[documents/user-list] error', error.message);
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const userId = req.query.user_id;
    const record = await getRequestById(req.params.id, userId);
    res.json({ request: record });
  } catch (error) {
    console.error('[documents/get] error', error.message);
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const userId = req.query.user_id;
    if (!userId) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    const records = await listRequestsForUser(userId);
    res.json({ requests: records });
  } catch (error) {
    console.error('[documents/list] error', error.message);
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router;
