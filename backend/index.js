const express = require('express');
const cors = require('cors');
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

// CORS Configuration
const parseAllowedOrigins = (value = '') =>
  value
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

const configuredOrigins = parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS);
const allowAllOrigins = configuredOrigins.length === 0 || configuredOrigins.includes('*');

// Default allowed origins for local development
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
];

// Combine configured origins with defaults
// If CORS_ALLOWED_ORIGINS is set and doesn't include *, use configured origins + defaults
// Otherwise, if CORS_ALLOWED_ORIGINS is empty or *, allow all origins
const allowedOrigins = allowAllOrigins ? [] : [...configuredOrigins, ...defaultOrigins];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser tools like curl/Postman (no origin header)
      if (!origin) return callback(null, true);
      
      // Allow all origins if wildcard is set or no configuration
      if (allowAllOrigins) return callback(null, true);
      
      // Allow if origin is in the allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true, // Allow cookies/sessions
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

const userRoutes = require('./routes/users');
const logRoutes = require('./routes/logs');
const paymentRoutes = require('./routes/payment');
const resolveRoutes = require('./routes/resolve');
const otpRoutes = require('./routes/otp');
const emailRoutes = require('./routes/email');
const healthRoutes = require('./routes/health');

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
    },
  });
});

app.use(['/users', '/api/users'], userRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/resolve', resolveRoutes);
app.use('/api/auth/otp', otpRoutes);
app.use('/api/email', emailRoutes);

// Helper function to determine if we're in production mode
const isProduction = () => process.env.NODE_ENV === 'production';

// Global error handler
app.use((err, req, res, next) => {
  // Log error details (excluding sensitive information)
  console.error('Unhandled error:', {
    message: err.message,
    stack: isProduction() ? undefined : err.stack,
    url: req.url,
    method: req.method,
  });

  // Send JSON error response
  res.status(err.status || 500).json({
    error: isProduction() ? 'Internal server error' : err.message,
  });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
