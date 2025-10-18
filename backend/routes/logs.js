const express = require('express');
const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');
const { persistLog, LogStoreError } = require('../services/log-store');
const { notifyPaymentAlert } = require('../services/payment-alerts');

const router = express.Router();

const sanitizeValue = (value) => {
  if (typeof value === 'string') {
    const sanitized = sanitizeHtml(value, {
      allowedTags: [],
      allowedAttributes: {},
    });

    if (sanitized === '') {
      return value.replace(/<[^>]+>/g, '');
    }

    return sanitized;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, sanitizeValue(nestedValue)]),
    );
  }

  return value;
};

const logSchema = Joi.object({
  level: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  message: Joi.string().max(1000).required(),
  timestamp: Joi.date().iso().optional().raw(),
  stack: Joi.string().allow('', null),
  componentStack: Joi.string().allow('', null),
  context: Joi.object().unknown(true).default({}),
  error: Joi.object({
    message: Joi.string().allow('', null),
    stack: Joi.string().allow('', null),
  })
    .unknown(true)
    .optional(),
}).unknown(true);

// Helper function to check if a tag is a payment-related string
const isPaymentTag = (tag) => {
  return typeof tag === 'string' && tag.toLowerCase().includes('payment');
};

const shouldTriggerPaymentAlert = (logEntry) => {
  if (!logEntry) {
    return false;
  }

  if (Array.isArray(logEntry.tags) && logEntry.tags.some(isPaymentTag)) {
    return true;
  }

  if (typeof logEntry.paymentReference === 'string' && logEntry.paymentReference.trim() !== '') {
    return true;
  }

  if (logEntry.context && typeof logEntry.context === 'object') {
    const contextReference = logEntry.context.paymentReference || logEntry.context.payment_reference;
    if (typeof contextReference === 'string' && contextReference.trim() !== '') {
      return true;
    }
  }

  return false;
};

router.post('/', async (req, res) => {
  const { error, value } = logSchema.validate(req.body, { abortEarly: false, allowUnknown: true });

  if (error) {
    return res.status(400).json({ error: error.details.map((detail) => detail.message).join(', ') });
  }

  const sanitizedLog = {
    ...sanitizeValue(value),
    receivedAt: new Date().toISOString(),
  };

  if (!Array.isArray(req.app.locals.logs)) {
    req.app.locals.logs = [];
  }

  req.app.locals.logs.push(sanitizedLog);

  if (req.app.locals.logs.length > 1000) {
    req.app.locals.logs.shift();
  }

  console.log('[frontend-log]', sanitizedLog);

  try {
    await persistLog(sanitizedLog);
  } catch (logError) {
    if (logError instanceof LogStoreError) {
      console.error('[routes/logs] Failed to persist log entry to Supabase:', logError);
    } else {
      console.error('[routes/logs] Unexpected log persistence error:', logError);
    }
  }

  if (shouldTriggerPaymentAlert(sanitizedLog)) {
    notifyPaymentAlert(sanitizedLog).catch((error) => {
      console.error('[routes/logs] Failed to dispatch payment alert', error);
    });
  }

  return res.status(201).json({ status: 'received' });
});

router.get('/', (_req, res) => {
  const recentLogs = Array.isArray(res.app.locals.logs) ? res.app.locals.logs.slice(-50) : [];
  res.json({ logs: recentLogs });
});

module.exports = router;
