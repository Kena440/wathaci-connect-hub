/**
 * Request Logging Middleware
 * 
 * Provides structured logging for all HTTP requests with timing information.
 * Logs are output as JSON for easy parsing by log aggregation tools.
 * 
 * Features:
 * - Structured JSON logging
 * - Request duration tracking
 * - Status code categorization
 * - IP address and user agent logging
 * - Color-coded output in development
 */

/**
 * Determines if we're in production mode
 * @returns {boolean} True if running in production
 */
const isProduction = () => process.env.NODE_ENV === 'production';

/**
 * Get color code for status code (for development console)
 * @param {number} statusCode - HTTP status code
 * @returns {string} ANSI color code
 */
const getStatusColor = (statusCode) => {
  if (statusCode >= 500) return '\x1b[31m'; // Red
  if (statusCode >= 400) return '\x1b[33m'; // Yellow
  if (statusCode >= 300) return '\x1b[36m'; // Cyan
  if (statusCode >= 200) return '\x1b[32m'; // Green
  return '\x1b[0m'; // Reset
};

/**
 * Format duration with appropriate unit
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
const formatDuration = (ms) => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

/**
 * Request logging middleware
 * 
 * Logs each request with timing information after the response is sent.
 * 
 * Usage: Add early in middleware chain
 * app.use(requestLogger);
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Listen for response finish event
  res.on('finish', () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();
    
    // Build log entry
    const logEntry = {
      timestamp,
      level: 'info',
      type: 'http_request',
      method: req.method,
      path: req.path,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
    };
    
    // Add query params if present (for debugging)
    if (req.query && Object.keys(req.query).length > 0) {
      logEntry.queryParams = Object.keys(req.query).length;
    }
    
    // Add content length if available
    const contentLength = res.get('content-length');
    if (contentLength) {
      logEntry.responseSize = contentLength;
    }
    
    // Determine log level based on status code
    if (res.statusCode >= 500) {
      logEntry.level = 'error';
    } else if (res.statusCode >= 400) {
      logEntry.level = 'warn';
    }
    
    // Output log
    if (isProduction()) {
      // Structured JSON logging in production
      console.log(JSON.stringify(logEntry));
    } else {
      // Human-readable format in development with colors
      const color = getStatusColor(res.statusCode);
      const reset = '\x1b[0m';
      const formattedDuration = formatDuration(duration);
      
      console.log(
        `${color}[${timestamp}] ${req.method} ${req.originalUrl} ${res.statusCode}${reset} - ${formattedDuration}`
      );
      
      // Log slow requests (>1s) with warning
      if (duration > 1000) {
        console.warn(`⚠️  Slow request detected: ${req.method} ${req.originalUrl} took ${formattedDuration}`);
      }
    }
  });
  
  next();
};

/**
 * Request start logger
 * 
 * Logs when a request starts (before processing)
 * Useful for debugging stuck requests
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
const requestStartLogger = (req, res, next) => {
  if (!isProduction()) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] → ${req.method} ${req.originalUrl} started`);
  }
  next();
};

module.exports = {
  requestLogger,
  requestStartLogger,
};
