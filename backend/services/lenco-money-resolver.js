const DEFAULT_API_BASE_URL = 'https://api.lenco.co/access/v2';
const RESOLVE_PATH = '/resolve/lenco-money';

const getApiBaseUrl = () => {
  const envUrl = process.env.LENCO_API_URL || process.env.VITE_LENCO_API_URL || DEFAULT_API_BASE_URL;
  return String(envUrl).replace(/\/$/, '');
};

const getResolveUrl = () => `${getApiBaseUrl()}${RESOLVE_PATH}`;

const getSecretKey = () => process.env.LENCO_SECRET_KEY || process.env.VITE_LENCO_SECRET_KEY || '';

const parseJsonResponse = async (response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    const parseError = new Error('Failed to parse Lenco response as JSON');
    parseError.status = response.status;
    parseError.cause = error;
    throw parseError;
  }
};

const resolveLencoMoneyWallet = async (walletNumber, { fetchImpl = global.fetch } = {}) => {
  if (!fetchImpl || typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required to resolve wallet numbers');
  }

  const secretKey = getSecretKey();
  if (!secretKey) {
    const error = new Error('LENCO_SECRET_KEY is not configured. Set the live secret key before resolving wallets.');
    error.status = 503;
    error.code = 'LENCO_SECRET_KEY_MISSING';
    throw error;
  }

  const response = await fetchImpl(getResolveUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secretKey}`,
    },
    body: JSON.stringify({ walletNumber }),
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    const error = new Error(data?.message || 'Failed to resolve Lenco Money wallet');
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
};

module.exports = {
  resolveLencoMoneyWallet,
  __internal: {
    getResolveUrl,
    getSecretKey,
    getApiBaseUrl,
  },
};
