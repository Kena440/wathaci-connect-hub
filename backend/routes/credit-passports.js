const express = require('express');
const {
  PRICING,
  resolveAmount,
  createPassportRun,
  updatePaymentStatus,
  getPassportRun,
  listPassportRuns,
  generatePassport,
  recordShare,
  markPdfPayment,
} = require('../services/credit-passport-service');
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
    pricing: {
      ...PRICING,
    },
    payment_rules: {
      generate: 'Payment required before generation',
      share: 'Each share link requires a paid share event',
      pdf: 'PDF export requires its own payment',
    },
  });
});

router.post('/pay', async (req, res) => {
  try {
    const body = req.body || {};
    requireFields(body, ['user_id', 'company_id', 'payment_method']);

    await ensureServiceAccess(body.user_id);

    const paymentStatus = body.auto_confirm ? 'success' : 'pending';
    const amount = body.amount || resolveAmount('generate');

    const record = await createPassportRun({
      user_id: body.user_id,
      company_id: body.company_id,
      payment_status: paymentStatus,
      payment_method: body.payment_method,
      payment_gateway: body.payment_gateway,
      payment_reference: body.payment_reference,
      amount,
      currency: body.currency || PRICING.currency,
      input_data: body.input_data || {},
    });

    res.status(201).json({
      run: record,
      payment: {
        status: record.payment_status,
        reference: record.payment_reference,
        requires_confirmation: paymentStatus !== 'success',
        message:
          paymentStatus === 'success'
            ? 'Payment confirmed. You can generate the credit passport.'
            : 'Payment initiated. Confirm before generation.',
      },
    });
  } catch (error) {
    console.error('[credit-passports/pay] error', error.message);
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post('/:id/confirm-payment', async (req, res) => {
  try {
    const { status = 'success', gateway, reference } = req.body || {};
    const updated = await updatePaymentStatus(req.params.id, status, { gateway, reference });
    res.json({ run: updated });
  } catch (error) {
    console.error('[credit-passports/confirm-payment] error', error.message);
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
    const record = await generatePassport(req.params.id, userId);
    res.json({ run: record });
  } catch (error) {
    console.error('[credit-passports/generate] error', error.message);
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post('/:id/share', async (req, res) => {
  try {
    const userId = req.body?.user_id;
    if (!userId) {
      return res.status(400).json({ error: 'user_id is required to share' });
    }
    await ensureServiceAccess(userId);

    const paymentStatus = req.body.payment_status || (req.body.auto_confirm ? 'success' : 'pending');
    if (paymentStatus !== 'success') {
      return res.status(402).json({ error: 'Share payment must be completed before sharing' });
    }

    const record = await recordShare(req.params.id, {
      userId,
      paymentStatus,
      gateway: req.body.payment_gateway,
      reference: req.body.payment_reference,
    });

    res.json({
      run: record,
      share: {
        price: resolveAmount('share'),
        status: 'success',
      },
    });
  } catch (error) {
    console.error('[credit-passports/share] error', error.message);
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post('/:id/pdf', async (req, res) => {
  try {
    const userId = req.body?.user_id;
    if (!userId) {
      return res.status(400).json({ error: 'user_id is required to request PDF' });
    }

    await ensureServiceAccess(userId);

    const paymentStatus = req.body.payment_status || (req.body.auto_confirm ? 'success' : 'pending');
    if (paymentStatus !== 'success') {
      return res.status(402).json({ error: 'PDF payment must be completed before download' });
    }

    const record = await markPdfPayment(req.params.id, {
      userId,
      paymentStatus,
      gateway: req.body.payment_gateway,
      reference: req.body.payment_reference,
    });

    res.json({
      run: record,
      pdf: {
        price: resolveAmount('pdf'),
        status: 'success',
      },
    });
  } catch (error) {
    console.error('[credit-passports/pdf] error', error.message);
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const userId = req.query.user_id;
    const record = await getPassportRun(req.params.id, userId);
    res.json({ run: record });
  } catch (error) {
    console.error('[credit-passports/get] error', error.message);
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
    const records = await listPassportRuns(userId);
    res.json({ runs: records });
  } catch (error) {
    console.error('[credit-passports/list] error', error.message);
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router;
