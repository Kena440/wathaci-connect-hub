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

const app = express();

logPaymentReadiness();

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
  'https://wathaci-connect-platform-amukenas-projects.vercel.app'
];

const configuredOrigins = parseAllowedOrigins(
  process.env.ALLOWED_ORIGINS ?? process.env.CORS_ALLOWED_ORIGINS
);
const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...configuredOrigins]));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true
  })
);

app.use(
  express.json({
    limit: '1mb',
    verify: (req, res, buf) => {
      if (buf?.length) {
        req.rawBody = buf.toString('utf8');
      } else {
        req.rawBody = '';
      }
    }
  })
);

app.use(morgan('dev'));
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'wathaci-connect-backend',
    supabaseConfigured: !!process.env.SUPABASE_URL,
    lencoConfigured: !!process.env.LENCO_API_URL,
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

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
        'GET /api/credit-passports, GET /api/credit-passports/:id, POST /api/credit-passports/pay, POST /api/credit-passports/:id/confirm-payment, POST /api/credit-passports/:id/generate, POST /api/credit-passports/:id/share, POST /api/credit-passports/:id/pdf',
      resolve: 'POST /resolve/lenco-merchant',
      otp: 'POST /api/auth/otp/send, POST /api/auth/otp/verify',
      email: 'GET /api/email/test, GET /api/email/status, POST /api/email/send, POST /api/email/send-otp, POST /api/email/send-verification, POST /api/email/send-password-reset',
      diagnostics: 'POST /api/diagnostics/run, GET /api/diagnostics/:companyId/latest, GET /api/diagnostics/:companyId/history',
      support: 'POST /api/support/contact'
    }
  });
});

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
app.use('/api/agent', agentRoutes);
app.use('/api/support', supportRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    url: req.url,
    method: req.method
  });

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

module.exports = app;
