const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

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

const allowedOrigins = Array.from(
  new Set([...defaultAllowedOrigins, ...configuredOrigins])
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

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

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

// Dedicated limiter for AI/agent traffic to avoid noisy neighbours blocking chat requests
const agentLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

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
app.use('/resolve', resolveRoutes);
app.use('/api/auth/otp', otpRoutes);
app.use('/api/email', emailRoutes);
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
  });

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    error:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
  });
});

module.exports = app;
