const express = require('express');
const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');

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
  timestamp: Joi.string().isoDate().optional(),
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

router.post('/', (req, res) => {
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

  return res.status(201).json({ status: 'received' });
});

router.get('/', (_req, res) => {
  const recentLogs = Array.isArray(res.app.locals.logs) ? res.app.locals.logs.slice(-50) : [];
  res.json({ logs: recentLogs });
});

module.exports = router;

