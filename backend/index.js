require('./lib/loadEnv');

const express = require('express');

let helmet;
try {
  helmet = require('helmet');
} catch (err) {
  helmet = () => (req, res, next) => next();
}

let rateLimit;
try {
  rateLimit = require('express-rate-limit');
} catch (err) {
  rateLimit = () => (req, res, next) => next();
}

const parseNumber = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};

const parseAllowedOrigins = (value = '') =>
  value
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

const createRateLimiter = () => {
  const windowMs = parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
  const max = parseNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 100);

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
  });
};

const configureCors = app => {
  const configuredOrigins = parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS);
  const allowAllOrigins = configuredOrigins.length === 0 || configuredOrigins.includes('*');

  app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin && (allowAllOrigins || configuredOrigins.includes(origin))) {
      res.header('Access-Control-Allow-Origin', allowAllOrigins ? '*' : origin);
      res.header('Vary', 'Origin');
    }

    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    next();
  });
};

const createApp = () => {
  const app = express();

  app.use(express.json());

  // Security middlewares
  app.use(helmet()); // Sets various HTTP headers for security
  app.use(createRateLimiter()); // Basic rate limiting

  // Lightweight CORS support to allow the frontend onboarding flow
  configureCors(app);

  const userRoutes = require('./routes/users');
  const logRoutes = require('./routes/logs');
  app.use('/users', userRoutes);
  app.use('/api/logs', logRoutes);

  return app;
};

const app = createApp();

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
module.exports.createApp = createApp;
