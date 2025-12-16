const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { randomUUID } = require('crypto');

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

// Route modules
const userRoutes = require('./routes/users');
const logRoutes = require('./routes/logs');
const paymentRoutes = require('./routes/payment');
const documentRoutes = require('./routes/documents');
const resolveRoutes = require('./routes/resolve');
const otpRoutes = require('./routes/otp');
const emailRoutes = require('./routes/email');
const marketplaceRoutes = require('./routes/marketplace');
const healthRoutes = require('./routes/health');
const auditRoutes = require('./routes/audit');
const diagnosticsRoutes = require('./routes/diagnostics');
const creditPassportRoutes = require('./routes/credit-passports');
const agentRoutes = require('./routes/agent');
const supportRoutes = require('./routes/support');
const copilotRoutes = require('./routes/copilot');
const fundingRoutes = require('./routes/funding');
const partnershipRoutes = require('./routes/partnerships');

// Health helpers
const { getTwilioHealth } = require('./lib/twilioClient');

const {
  getEmailHealth,
  isEmailConfigured,
} = require('./services/email-service');

const {
  getSupabaseHealth,
  isSupabaseAdminConfigured,
} = require('./lib/supabaseAdmin');

const app = express();

// Trust first proxy so rate-limit + IP detection work correctly behind Vercel/NGINX
// See: https://expressjs.com/en/guide/behind-proxies.html
app.set('trust proxy', 1);

// Correlation IDs for every request
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || randomUUID();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  return next();
});

/**
 * Root route: simple ping
 */
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Wathaci Backend',
    message: 'Backend is running successfully',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Integrated health route: Supabase + Email + Twilio
 */
app.get('/health', (req, res) => {
  const twilio = getTwilioHealth();
  const email = getEmailHealth();
  const supabase = getSupabaseHealth();

  // Supabase + Email are required for "ok"
  // Twilio is optional but reported
  const overallHealthy =
    isSupabaseAdminConfigured() &&
    isEmailConfigured();

  res.status(overallHealthy ? 200 : 503).json({
    status: overallHealthy ? 'ok' : 'degraded',
    service: 'Wathaci Backend',
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    components: {
      supabaseAdmin: supabase,
      email,
      twilio,
    },
  });
});

// Log payment readiness on startup
logPaymentReadiness();

/**
 * CORS configuration
 */
const parseAllowedOrigins = (value = '') =>
  value
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => Boolean(origin) && origin !== '*');

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5173',
  'https://www.wathaci.com',
  'https://wathaci.com',
  'https://wathaci-connect-platform.vercel.app',
  'https://wathaci-connect-platform-amukenas-projects.vercel.app',
];

const configuredOrigins = parseAllowedOrigins(
  process.env.ALLOWED_ORIGINS ?? process.env.CORS_ALLOWED_ORIGINS
);

const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...configuredOrigins]));

const isAllowedVercelPreview = origin => {
  if (!origin) return false;
  try {
    const { hostname } = new URL(origin);
    return hostname.endsWith('.vercel.app') && hostname.includes('wathaci');
  } catch (error) {
    return false;
  }
};

const corsMiddleware = cors({
  origin: (origin, callback) => {
    const allowed =
      !origin ||
      allowedOrigins.includes(origin) ||
      isAllowedVercelPreview(origin);

    if (allowed) {
      return callback(null, true);
    }

    const error = new Error(`Not allowed by CORS: ${origin}`);
    error.code = 'CORS_NOT_ALLOWED';
    return callback(error);
  },
  credentials: true,
});

app.use((req, res, next) => {
  corsMiddleware(req, res, err => {
    if (err && err.code === 'CORS_NOT_ALLOWED') {
      console.warn('[CORS] Blocked request', {
        origin: req.headers.origin,
        method: req.method,
        path: req.originalUrl,
        requestId: req.requestId,
      });
      return res.status(403).json({
        code: 'CORS_NOT_ALLOWED',
        message: 'Request origin is not allowed.',
        requestId: req.requestId,
      });
    }
    return next(err);
  });
});

/**
 * JSON body parsing with rawBody retained for webhooks, etc.
 */
app.use(
  express.json({
    limit: '1mb',
    verify: (req, res, buf) => {
      if (buf?.length) {
        req.rawBody = buf.toString('utf8');
      } else {
        req.rawBody = '';
      }
    },
  })
);

/**
 * Logging, security, rate limiting
 */
app.use(morgan('dev'));
app.use(helmet());

const buildJsonLimiter = options =>
  rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const retryAfter = Math.ceil((options.windowMs ?? 0) / 1000);
      res.status(429).json({
        code: 'RATE_LIMITED',
        message: 'Too many attempts. Please wait and try again.',
        retryAfter,
        requestId: req.requestId,
      });
    },
    ...options,
  });

const limiter = buildJsonLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1000,
});

// Dedicated limiter for AI/agent traffic to avoid noisy neighbours blocking chat requests
const agentLimiter = buildJsonLimiter({
  windowMs: 60 * 1000,
  limit: 30,
});

const otpLimiter = buildJsonLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 5,
});

const emailLimiter = buildJsonLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
});

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  return limiter(req, res, next);
});

/**
 * API index / documentation
 */
app.get('/api', (req, res) => {
  res.status(200).json({
    name: 'WATHACI CONNECT API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health, GET /api/health',
      users: 'POST /users, POST /api/users',
      logs: 'POST /api/logs, GET /api/logs',
      payment: 'GET /api/payment/readiness, POST /api/payment/webhook',
      documents:
        'GET /api/documents, GET /api/documents/:id, POST /api/documents/pay, POST /api/documents/:id/confirm-payment, POST /api/documents/:id/generate',
      credit_passports:
        'GET /api/credit-passports, GET /api/credit-passports/:id, POST /api/credit-passports/pay, POST /api/credit-passports/:id/share, POST /api/credit-passports/:id/pdf',
      resolve: 'POST /resolve/lenco-merchant',
      otp: 'POST /api/auth/otp/send, POST /api/auth/otp/verify',
      email:
        'GET /api/email/test, GET /api/email/status, POST /api/email/send, POST /api/email/send-otp, POST /api/email/send-verification, POST /api/email/send-password-reset',
      diagnostics:
        'POST /api/diagnostics/run, GET /api/diagnostics/:companyId/latest, GET /api/diagnostics/:companyId/history',
      support: 'POST /api/support/contact',
      marketplace:
        'GET /api/marketplace/listings, GET /api/marketplace/listings/:id, POST /api/marketplace/orders, POST /api/marketplace/saved',
    },
  });
});

/**
 * Route mounting
 */
app.use('/api/health', healthRoutes);
app.use(['/users', '/api/users'], userRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/resolve', resolveRoutes);
const skipOptions = middleware => (req, res, next) =>
  req.method === 'OPTIONS' ? next() : middleware(req, res, next);

app.use('/api/auth/otp', skipOptions(otpLimiter), otpRoutes);
app.use('/api/email', skipOptions(emailLimiter), emailRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/diagnostics', diagnosticsRoutes);
app.use('/api/credit-passports', creditPassportRoutes);
app.use('/api/agent', agentLimiter, agentRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/copilot', copilotRoutes);
app.use('/api/funding', fundingRoutes);
app.use('/api/partnerships', partnershipRoutes);

/**
 * Global error handler
 */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    url: req.url,
    method: req.method,
    requestId: req.requestId,
  });

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    code: err.code || 'SERVER_ERROR',
    message:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
    requestId: req.requestId,
  });
});

module.exports = app;
