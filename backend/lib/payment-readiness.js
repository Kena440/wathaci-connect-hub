const LIVE_PUBLIC_KEY_PREFIX = 'pk_live_';
const TEST_PUBLIC_KEY_PREFIX = 'pk_test_';
const LIVE_SECRET_KEY_PREFIX = 'sk_live_';
const TEST_SECRET_KEY_PREFIX = 'sk_test_';

const ENV_KEYS = {
  publicKey: ['VITE_LENCO_PUBLIC_KEY', 'LENCO_PUBLIC_KEY'],
  secretKey: ['LENCO_SECRET_KEY', 'VITE_LENCO_SECRET_KEY'],
  webhookUrl: ['LENCO_WEBHOOK_URL', 'PAYMENT_WEBHOOK_URL', 'VITE_LENCO_WEBHOOK_URL'],
  webhookSecret: ['LENCO_WEBHOOK_SECRET'],
  supabaseUrl: ['SUPABASE_URL', 'VITE_SUPABASE_URL'],
  serviceRoleKey: ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY', 'SUPABASE_KEY'],
  environment: ['APP_ENV', 'NODE_ENV', 'VITE_APP_ENV'],
};

const normalizeEnvValue = (value) => {
  if (!value) return '';
  return String(value).trim();
};

const readEnvValue = (keys) => {
  for (const key of keys) {
    const value = normalizeEnvValue(process.env[key]);
    if (value) {
      return { key, value };
    }
  }
  return { key: keys[0], value: '' };
};

const interpretEnvironment = () => {
  const envValue = readEnvValue(ENV_KEYS.environment).value.toLowerCase();
  if (envValue === 'prod' || envValue === 'production') {
    return 'production';
  }
  return envValue || 'development';
};

const buildIssue = (severity, message) => ({ severity, message });

const cached = { logged: false };

const getPaymentReadiness = () => {
  const errors = [];
  const warnings = [];

  const publicKeyEntry = readEnvValue(ENV_KEYS.publicKey);
  const secretKeyEntry = readEnvValue(ENV_KEYS.secretKey);
  const webhookUrlEntry = readEnvValue(ENV_KEYS.webhookUrl);
  const webhookSecretEntry = readEnvValue(ENV_KEYS.webhookSecret);
  const supabaseUrlEntry = readEnvValue(ENV_KEYS.supabaseUrl);
  const serviceRoleEntry = readEnvValue(ENV_KEYS.serviceRoleKey);

  const environment = interpretEnvironment();
  const isProduction = environment === 'production';

  const details = {
    environment,
    publicKeySource: publicKeyEntry.key,
    webhookUrlSource: webhookUrlEntry.key,
    supabaseConfigured: Boolean(supabaseUrlEntry.value),
    serviceRoleConfigured: Boolean(serviceRoleEntry.value),
  };

  if (!supabaseUrlEntry.value) {
    errors.push(buildIssue('error', 'SUPABASE_URL is not configured. Set SUPABASE_URL for backend persistence.'));
  }

  if (!serviceRoleEntry.value) {
    errors.push(buildIssue('error', 'SUPABASE_SERVICE_ROLE_KEY is missing. Configure the service role key to enable persistence.'));
  }

  if (!publicKeyEntry.value) {
    errors.push(buildIssue('error', 'Lenco public key is not configured. Set VITE_LENCO_PUBLIC_KEY with your live key.'));
  } else if (isProduction && publicKeyEntry.value.startsWith(TEST_PUBLIC_KEY_PREFIX)) {
    errors.push(
      buildIssue(
        'error',
        'Lenco public key is using a test key (pk_test_). Replace it with the live pk_live_ key before going live.'
      )
    );
  } else if (!publicKeyEntry.value.startsWith(LIVE_PUBLIC_KEY_PREFIX)) {
    warnings.push(
      buildIssue(
        'warning',
        'Lenco public key does not use the expected live prefix (pk_live_). Double-check that production keys are configured.'
      )
    );
  }

  if (!secretKeyEntry.value) {
    errors.push(buildIssue('error', 'LENCO_SECRET_KEY is missing. Configure the live sk_live_ secret key for server-side calls.'));
  } else if (isProduction && secretKeyEntry.value.startsWith(TEST_SECRET_KEY_PREFIX)) {
    errors.push(
      buildIssue(
        'error',
        'LENCO_SECRET_KEY is using a test key (sk_test_). Replace it with the live sk_live_ key for production payments.'
      )
    );
  }

  if (!webhookSecretEntry.value) {
    errors.push(buildIssue('error', 'LENCO_WEBHOOK_SECRET is not set. Configure the webhook secret from the Lenco dashboard.'));
  }

  if (!webhookUrlEntry.value) {
    errors.push(buildIssue('error', 'LENCO_WEBHOOK_URL is not configured. Provide the deployed webhook endpoint URL.'));
  } else if (!/^https:\/\//i.test(webhookUrlEntry.value)) {
    errors.push(buildIssue('error', 'LENCO_WEBHOOK_URL must be an HTTPS URL.'));
  }

  const status = errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ready';

  return {
    status,
    environment,
    errors,
    warnings,
    details,
  };
};

const logPaymentReadiness = () => {
  if (cached.logged) {
    return;
  }
  cached.logged = true;

  const readiness = getPaymentReadiness();

  if (readiness.errors.length > 0) {
    console.error('[payment-readiness] Configuration errors detected:',
      readiness.errors.map((issue) => issue.message));
  } else if (readiness.warnings.length > 0) {
    console.warn('[payment-readiness] Configuration warnings:',
      readiness.warnings.map((issue) => issue.message));
  } else {
    console.log('[payment-readiness] Lenco payment integration verified for', readiness.environment, 'environment.');
  }
};

module.exports = {
  getPaymentReadiness,
  logPaymentReadiness,
};
