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
