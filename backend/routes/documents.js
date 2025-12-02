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
const { ensureServiceAccess } = require('../lib/service-access');

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

    await ensureServiceAccess(body.user_id);

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
    });

    res.status(201).json({
      request: record,
      payment: {
        status: record.payment_status,
        reference: record.payment_reference,
        requires_confirmation: paymentStatus !== 'success',
        message: paymentStatus === 'success'
          ? 'Payment confirmed. You can proceed to generation.'
          : 'Payment initiated. Awaiting confirmation before generation.',
      },
    });
  } catch (error) {
    console.error('[documents/pay] error', error.message);
    res.status(error.status || 500).json({ error: error.message });
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
    await ensureServiceAccess(userId);
    const record = await generateDocument(req.params.id, userId);
    res.json({ request: record });
  } catch (error) {
    console.error('[documents/generate] error', error.message);
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
    await ensureServiceAccess(userId);
    const records = await listRequestsForUser(userId);
    res.json({ requests: records });
  } catch (error) {
    console.error('[documents/list] error', error.message);
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router;
