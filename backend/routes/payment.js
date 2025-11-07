const express = require('express');
const crypto = require('node:crypto');
const { getPaymentReadiness } = require('../lib/payment-readiness');

const router = express.Router();

router.get('/readiness', (req, res) => {
  const readiness = getPaymentReadiness();
  const hasErrors = readiness.errors.length > 0;
  res.status(hasErrors ? 503 : 200).json(readiness);
});

router.post('/webhook', (req, res) => {
  const webhookSecret = process.env.LENCO_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(500).json({ error: 'LENCO_WEBHOOK_SECRET is not configured' });
  }

  const signature = (req.get('x-lenco-signature') || '').trim();
  if (!signature) {
    return res.status(400).json({ error: 'Missing webhook signature' });
  }

  const rawBody = typeof req.rawBody === 'string' ? req.rawBody : '';
  if (!rawBody) {
    return res.status(400).json({ error: 'Missing request body' });
  }

  if (!verifyLencoSignature(signature, rawBody, webhookSecret)) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const payload = req.body && typeof req.body === 'object' ? req.body : {};

  if (payload?.event && payload?.data?.reference) {
    console.log('[lenco-webhook] Received', payload.event, 'for reference', payload.data.reference);
  } else {
    console.log('[lenco-webhook] Received webhook with valid signature');
  }

  return res.status(200).json({ received: true });
});

const verifyLencoSignature = (signature, rawBody, secret) => {
  const digest = crypto.createHash('sha256').update(secret + rawBody, 'utf8').digest();
  const digestHex = digest.toString('hex');
  const digestBase64 = digest.toString('base64');

  if (timingSafeEqual(signature, digestHex)) {
    return true;
  }

  if (timingSafeEqual(signature.toLowerCase(), digestHex)) {
    return true;
  }

  if (timingSafeEqual(signature, digestBase64)) {
    return true;
  }

  return false;
};

const timingSafeEqual = (received, expected) => {
  if (!received || !expected) {
    return false;
  }

  const receivedBuffer = Buffer.from(received, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
};

module.exports = router;
module.exports.verifyLencoSignature = verifyLencoSignature;
