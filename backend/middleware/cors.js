const createCorsMiddleware = ({
  allowedOrigins = [],
  allowCredentials = false,
  allowNoOrigin = false,
  allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders = ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
} = {}) => {
  const normalizedOrigins = Array.from(new Set(allowedOrigins))
    .filter(origin => Boolean(origin) && origin !== '*');

  return (req, res, next) => {
    const origin = req.headers.origin;
    const isAllowed = (allowNoOrigin && !origin) || normalizedOrigins.includes(origin);

    if (origin && normalizedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
    }

    res.header('Access-Control-Allow-Methods', allowedMethods.join(', '));
    res.header('Access-Control-Allow-Headers', allowedHeaders.join(', '));

    if (allowCredentials) {
      res.header('Access-Control-Allow-Credentials', 'true');
    }

    if (req.method === 'OPTIONS') {
      if (!isAllowed && origin) {
        return res.status(403).json({ error: 'Not allowed by CORS' });
      }

      return res.sendStatus(204);
    }

    if (!isAllowed) {
      const error = new Error('Not allowed by CORS');
      error.status = 403;
      return next(error);
    }

    return next();
  };
};

module.exports = { createCorsMiddleware };
