const DEFAULT_API_URL = 'https://api.lenco.co/access/v2';
const REQUEST_TIMEOUT_MS = 5000;

class LencoMerchantResolverError extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'LencoMerchantResolverError';
    this.status = options.status ?? 500;
    this.details = options.details;
  }
}

const getSecretKey = () => {
  const keys = ['LENCO_SECRET_KEY', 'VITE_LENCO_SECRET_KEY'];
  for (const key of keys) {
    const value = process.env[key];
    if (value && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
};

const getApiBaseUrl = () => {
  const candidates = ['LENCO_API_URL', 'VITE_LENCO_API_URL'];
  for (const key of candidates) {
    const value = process.env[key];
    if (value && String(value).trim()) {
      return String(value).trim().replace(/\/$/, '');
    }
  }
  return DEFAULT_API_URL;
};

const resolveLencoMerchant = async (tillNumber, options = {}) => {
  const secretKey = getSecretKey();
  if (!secretKey) {
    throw new LencoMerchantResolverError(
      'LENCO_SECRET_KEY is not configured. Set LENCO_SECRET_KEY with your live secret key.',
      { status: 503 }
    );
  }

  const fetchImpl = options.fetch ?? global.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new LencoMerchantResolverError('Fetch implementation is not available in this environment.', {
      status: 500,
    });
  }

  const apiBaseUrl = getApiBaseUrl();
  const endpoint = `${apiBaseUrl.replace(/\/$/, '')}/resolve/lenco-merchant`;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), options.timeout ?? REQUEST_TIMEOUT_MS)
    : null;

  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({ tillNumber }),
      signal: controller?.signal,
    });
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new LencoMerchantResolverError('Lenco resolve request timed out. Please try again.', {
        status: 504,
        details: { endpoint },
      });
    }

    throw new LencoMerchantResolverError('Failed to contact Lenco API. Please try again later.', {
      status: 503,
      details: { endpoint },
      cause: error,
    });
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new LencoMerchantResolverError('Invalid response from Lenco API.', {
      status: 502,
      details: { endpoint },
      cause: error,
    });
  }

  if (!response.ok || !payload?.status) {
    const status = response.status === 400 ? 400 : response.status || 502;
    const message = payload?.message || 'Failed to resolve Lenco merchant.';
    throw new LencoMerchantResolverError(message, {
      status,
      details: { endpoint, responseStatus: response.status },
    });
  }

  const data = payload?.data ?? {};

  return {
    status: true,
    message: payload.message || 'Merchant resolved successfully.',
    data: {
      type: data.type || 'lenco-merchant',
      accountName: data.accountName ?? null,
      tillNumber: data.tillNumber ?? tillNumber,
    },
  };
};

module.exports = {
  resolveLencoMerchant,
  LencoMerchantResolverError,
};
