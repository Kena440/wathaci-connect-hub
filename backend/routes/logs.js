const express = require('express');
const Joi = require('joi');

const validate = require('../middleware/validate');

const router = express.Router();

const MAX_LOG_HISTORY = 1000;
const logs = [];

const logSchema = Joi.object({
  level: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
  message: Joi.string().min(1).required(),
  timestamp: Joi.string().isoDate().optional(),
}).unknown(true);

const LOGS_API_TOKEN = process.env.LOGS_API_TOKEN;

const extractToken = (authorizationHeader = '') => {
  const header = authorizationHeader.trim();
  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  return header || null;
};

const requireLogHistoryAuth = (req, res, next) => {
  if (!LOGS_API_TOKEN) {
    return res.status(403).json({ error: 'Log history access is not configured' });
  }

  const providedToken = extractToken(req.get('authorization') || '');
  if (!providedToken || providedToken !== LOGS_API_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

router.post('/', validate(logSchema), (req, res) => {
  const logEntry = {
    ...req.body,
    timestamp: req.body.timestamp ?? new Date().toISOString(),
  };

  logs.push(logEntry);
  if (logs.length > MAX_LOG_HISTORY) {
    logs.shift();
  }

  res.status(201).json({ status: 'logged' });
});

router.get('/history', requireLogHistoryAuth, (req, res) => {
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, logs.length)
    : logs.length;

  const startIndex = Math.max(logs.length - limit, 0);
  const history = logs.slice(startIndex).reverse();

  res.json({ logs: history });
});

module.exports = router;
