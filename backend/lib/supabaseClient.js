const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.VITE_SUPABASE_PROJECT_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.PUBLIC_SUPABASE_URL ||
  '';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '';

const normalizeUrl = (url = '') => url.replace(/\/$/, '');

const buildRestUrl = (baseUrl) => {
  if (!baseUrl) return '';
  return `${normalizeUrl(baseUrl)}/rest/v1`;
};

const config = {
  baseUrl: normalizeUrl(SUPABASE_URL),
  restUrl: buildRestUrl(SUPABASE_URL),
  serviceKey: SUPABASE_SERVICE_ROLE_KEY,
};

const isSupabaseConfigured = () => Boolean(config.baseUrl && config.serviceKey);

const parseJsonResponse = async (response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    const parseError = new Error('Failed to parse Supabase response as JSON');
    parseError.cause = error;
    parseError.status = response.status;
    throw parseError;
  }
};

const createRequestUrl = (table, searchParams = {}) => {
  if (!config.restUrl) {
    throw new Error('Supabase is not configured');
  }

  const url = new URL(`${config.restUrl}/${table}`);

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    url.searchParams.set(key, String(value));
  });

  return url;
};

const supabaseRequest = async (table, { method = 'GET', searchParams, body, headers = {} } = {}) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  const url = createRequestUrl(table, searchParams);

  const response = await fetch(url, {
    method,
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    const error = new Error(data?.message || 'Supabase request failed');
    error.status = response.status;
    error.code = data?.code;
    error.details = data;
    throw error;
  }

  return data;
};

const buildFilterValue = (value) => {
  if (Array.isArray(value)) {
    const formattedValues = value.map((item) => `"${item}"`).join(',');
    return `in.(${formattedValues})`;
  }

  return `eq.${value}`;
};

const select = async (
  table,
  {
    columns = '*',
    filters = {},
    limit,
    single = false,
  } = {},
) => {
  const searchParams = { select: columns };

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    searchParams[key] = buildFilterValue(value);
  });

  if (limit) {
    searchParams.limit = String(limit);
  }

  const data = await supabaseRequest(table, { searchParams });

  if (single) {
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  }

  return Array.isArray(data) ? data : [];
};

const insert = async (table, payload) => {
  const body = Array.isArray(payload) ? payload : [payload];

  const data = await supabaseRequest(table, {
    method: 'POST',
    headers: {
      Prefer: 'return=representation',
    },
    body,
  });

  return Array.isArray(data) ? data : [];
};

module.exports = {
  isSupabaseConfigured,
  supabaseRequest,
  select,
  insert,
};
