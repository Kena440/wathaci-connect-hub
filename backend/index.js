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

const app = express();

app.use(express.json());

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
app.use('/users', userRoutes);
app.use('/api/logs', logRoutes);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
