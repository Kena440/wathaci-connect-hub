const express = require('express');
const { logPaymentReadiness } = require('./lib/payment-readiness');
const { createCorsMiddleware } = require('./middleware/cors');

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

let cors;
try {
  // Prefer the official cors package when available
  cors = require('cors');
} catch (err) {
  cors = null;
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

// CORS configuration
const parseAllowedOrigins = (value = '') =>
  value
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

const defaultAllowedOrigins = [
  'https://wathaci-connect-platform-git-v3-amukenas-projects.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
];

const configuredOrigins = parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS);
const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...configuredOrigins]));
const allowAllOrigins = allowedOrigins.includes('*');

const corsMiddleware = cors
  ? cors({
      origin(origin, callback) {
        // Allow requests without Origin header (e.g., server-to-server, health checks, CLI tools)
        if (!origin) return callback(null, true);
        if (allowAllOrigins || allowedOrigins.includes(origin)) return callback(null, true);
        const error = new Error('Not allowed by CORS');
        error.status = 403;
        return callback(error);
      },
      credentials: true,
    })
  : createCorsMiddleware({ allowedOrigins, allowCredentials: true, allowNoOrigin: true });

app.use(corsMiddleware);

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

const userRoutes = require('./routes/users');
const logRoutes = require('./routes/logs');
const paymentRoutes = require('./routes/payment');
const resolveRoutes = require('./routes/resolve');
const otpRoutes = require('./routes/otp');
const emailRoutes = require('./routes/email');
const healthRoutes = require('./routes/health');
const auditRoutes = require('./routes/audit');
const diagnosticsRoutes = require('./routes/diagnostics');

// Health check endpoint
app.use(['/health', '/api/health'], healthRoutes);

// API info endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    name: 'WATHACI CONNECT API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health, GET /api/health',
      users: 'POST /users, POST /api/users',
      logs: 'POST /api/logs, GET /api/logs',
      payment: 'GET /api/payment/readiness, POST /api/payment/webhook',
      resolve: 'POST /resolve/lenco-merchant',
      otp: 'POST /api/auth/otp/send, POST /api/auth/otp/verify',
      email: 'GET /api/email/test, GET /api/email/status, POST /api/email/send, POST /api/email/send-otp, POST /api/email/send-verification, POST /api/email/send-password-reset',
      diagnostics: 'POST /api/diagnostics/run, GET /api/diagnostics/latest/:user_id, GET /api/diagnostics/history/:user_id, GET /api/diagnostics/partners, GET /api/diagnostics/sector-benchmarks',
    },
  });
});

app.use(['/users', '/api/users'], userRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/resolve', resolveRoutes);
app.use('/api/auth/otp', otpRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/diagnostics', diagnosticsRoutes);


// Global error handler
app.use((err, req, res, next) => {
  // Log error details (excluding sensitive information)
  console.error('Unhandled error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    url: req.url,
    method: req.method,
  });

  if (res.headersSent) {
    return next(err);
  }

  // Send JSON error response
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
