const createCorsMiddleware = ({
  allowedOrigins = [],
  allowCredentials = false,
  allowNoOrigin = false,
  allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders = ['Content-Type', 'Authorization'],
} = {}) => {
  const normalizedOrigins = Array.from(new Set(allowedOrigins)).filter(Boolean);
  const allowAll = normalizedOrigins.length === 0 || normalizedOrigins.includes('*');

  return (req, res, next) => {
    const origin = req.headers.origin;
    const isAllowed = (allowNoOrigin && !origin) || allowAll || normalizedOrigins.includes(origin);

    if (!isAllowed) {
      const error = new Error('Not allowed by CORS');
      error.status = 403;
      return next(error);
    }

    if (origin) {
      // When credentials are allowed, we cannot use wildcard '*'
      // We must echo back the specific origin
      res.header('Access-Control-Allow-Origin', (allowAll && !allowCredentials) ? '*' : origin);
      res.header('Vary', 'Origin');
    }

    res.header('Access-Control-Allow-Methods', allowedMethods.join(','));
    res.header('Access-Control-Allow-Headers', allowedHeaders.join(','));

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
