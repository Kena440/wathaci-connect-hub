const express = require('express');
const { logPaymentReadiness } = require('./lib/payment-readiness');

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

const app = express();

logPaymentReadiness();

app.use(express.json({
  limit: '1mb',
  verify: (req, res, buf) => {
    if (buf?.length) {
      req.rawBody = buf.toString('utf8');
    } else {
      req.rawBody = '';
    }
  },
}));

// Security middlewares
app.use(helmet()); // Sets various HTTP headers for security
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter); // Basic rate limiting

// Lightweight CORS support to allow the frontend onboarding flow
const parseAllowedOrigins = (value = '') =>
  value
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

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

const userRoutes = require('./routes/users');
const logRoutes = require('./routes/logs');
const paymentRoutes = require('./routes/payment');
const resolveRoutes = require('./routes/resolve');
const otpRoutes = require('./routes/otp');
const emailRoutes = require('./routes/email');

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    name: 'WATHACI CONNECT API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      users: 'POST /users, POST /api/users',
      logs: 'POST /api/logs, GET /api/logs',
      payment: 'GET /api/payment/readiness, POST /api/payment/webhook',
      resolve: 'POST /resolve/lenco-merchant',
      otp: 'POST /api/auth/otp/send, POST /api/auth/otp/verify',
    },
  });
});

app.use(['/users', '/api/users'], userRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/resolve', resolveRoutes);
app.use('/api/auth/otp', otpRoutes);
app.use('/api/email', emailRoutes);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
