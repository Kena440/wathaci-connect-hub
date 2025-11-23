const createCorsMiddleware = ({ allowedOrigins = [], allowCredentials = false, allowNoOrigin = false } = {}) => {
  const normalizedOrigins = Array.from(new Set(allowedOrigins)).filter(Boolean);
  const allowAll = normalizedOrigins.length === 0 || normalizedOrigins.includes('*');

  return (req, res, next) => {
    const origin = req.headers.origin;
    const isAllowed = (allowNoOrigin && !origin) || allowAll || normalizedOrigins.includes(origin);

    if (!isAllowed) {
      // Check if headers were already sent by previous middleware
      if (res.headersSent) {
        return next(new Error('Not allowed by CORS'));
      }
      return res.status(403).json({ error: 'Not allowed by CORS' });
    }

    if (origin) {
      res.header('Access-Control-Allow-Origin', allowAll ? '*' : origin);
      res.header('Vary', 'Origin');
    }

    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (allowCredentials) {
      res.header('Access-Control-Allow-Credentials', 'true');
    }

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    return next();
  };
};

module.exports = { createCorsMiddleware };
