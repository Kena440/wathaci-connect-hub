/**
 * Centralized Error Handler Middleware
 * 
 * This middleware catches all errors thrown in the application and
 * returns a consistent JSON error response to the client.
 * 
 * Features:
 * - Standardized error response format: { success: false, error: "message" }
 * - Structured logging with request context
 * - Prevents sensitive data from being exposed
 * - Uses appropriate HTTP status codes
 */

/**
 * Determines if we're in production mode
 * @returns {boolean} True if running in production
 */
const isProduction = () => process.env.NODE_ENV === 'production';

/**
 * Sanitize error messages to prevent sensitive data leaks
 * @param {string} message - Original error message
 * @returns {string} Sanitized message
 */
// Compile patterns once at module load time for better performance
const sensitivePatterns = [
  /postgresql:\/\/[^\s]*/gi,
  /mysql:\/\/[^\s]*/gi,
  /mongodb:\/\/[^\s]*/gi,
  /password[=:]\S+/gi,
  /token[=:]\S+/gi,
  /key[=:]\S+/gi,
  /secret[=:]\S+/gi,
  /\/home\/[^\s]*/gi,
  /\/usr\/[^\s]*/gi,
  /\/var\/[^\s]*/gi,
];

const sanitizeErrorMessage = (message) => {
  if (!message) return 'An error occurred';
  
  let sanitized = message;
  sensitivePatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  
  return sanitized;
};

/**
 * Global error handler middleware
 * 
 * Usage: Add as the last middleware in your Express app
 * app.use(errorHandler);
 * 
 * @param {Error} err - The error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Extract error details
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  // Structured error logging
  const errorLog = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: sanitizeErrorMessage(message),
    statusCode: status,
    method: req.method,
    path: req.path,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent'),
  };
  
  // Add stack trace in development
  if (!isProduction() && err.stack) {
    errorLog.stack = err.stack;
  }
  
  // Add error name if available
  if (err.name && err.name !== 'Error') {
    errorLog.errorType = err.name;
  }
  
  // Log the error as JSON for easier parsing by log aggregators
  console.error(JSON.stringify(errorLog));
  
  // Determine user-facing message
  let userMessage;
  if (status === 500 && isProduction()) {
    // Don't leak internal error details in production
    userMessage = 'Internal server error';
  } else {
    // In development or for client errors (4xx), show the actual message
    userMessage = sanitizeErrorMessage(message);
  }
  
  // Send standardized error response
  res.status(status).json({
    success: false,
    error: userMessage,
  });
};

/**
 * 404 Not Found Handler
 * 
 * Catches requests to undefined routes
 * Should be added before the error handler middleware
 * 
 * Usage: app.use(notFoundHandler);
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

/**
 * Async Route Wrapper
 * 
 * Wraps async route handlers to automatically catch errors
 * and pass them to the error handler middleware
 * 
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped route handler
 * 
 * @example
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await getUsersFromDB();
 *   res.json(users);
 * }));
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  sanitizeErrorMessage,
};
