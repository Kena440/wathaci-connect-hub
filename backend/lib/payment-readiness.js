const LIVE_PUBLIC_KEY_PATTERNS = [/^pk_live_[a-z0-9]{10,}$/i, /^pub-[a-z0-9]{32,}$/i];
const LIVE_SECRET_KEY_PATTERNS = [/^sk_live_[a-z0-9]{10,}$/i, /^sec-[a-z0-9]{32,}$/i, /^[a-f0-9]{64}$/i];

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

const matchesAnyPattern = (value, patterns) => patterns.some((pattern) => pattern.test(value));

const looksLikeLivePublicKey = (value) => matchesAnyPattern(value, LIVE_PUBLIC_KEY_PATTERNS);

const looksLikeTestPublicKey = (value) => {
  const lowered = value.toLowerCase();
  return lowered.startsWith('pk_test_') || lowered.includes('test_') || lowered.includes('test-');
};

const looksLikeLiveSecretKey = (value) => matchesAnyPattern(value, LIVE_SECRET_KEY_PATTERNS);

const looksLikeTestSecretKey = (value) => {
  const lowered = value.toLowerCase();
  return lowered.startsWith('sk_test_') || lowered.includes('test_') || lowered.includes('test-');
};

const looksLikeWebhookSecret = (value) => {
  return /^[a-f0-9]{32,}$/i.test(value) || /^whsec_[a-z0-9]{16,}$/i.test(value);
};

const hasPlaceholderValue = (value = '') => {
  const lowered = value.toLowerCase();
  return (
    lowered.includes('your-lenco') ||
    lowered.includes('placeholder') ||
    lowered.includes('dummy') ||
    lowered.includes('changeme')
  );
};

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
  } else if (hasPlaceholderValue(publicKeyEntry.value)) {
    errors.push(
      buildIssue(
        'error',
        'Lenco public key contains placeholder text. Replace it with the publishable key from the Lenco dashboard.'
      )
    );
  } else if (isProduction && looksLikeTestPublicKey(publicKeyEntry.value)) {
    errors.push(
      buildIssue(
        'error',
        'Lenco public key is using a test key (pk_test_/pub-test). Replace it with the live publishable key from the Lenco dashboard.'
      )
    );
  } else if (!looksLikeLivePublicKey(publicKeyEntry.value)) {
    warnings.push(
      buildIssue(
        'warning',
        'Lenco public key does not match the expected live format (pub-/pk_live_). Double-check that production keys are configured.'
      )
    );
  }

  if (!secretKeyEntry.value) {
    errors.push(buildIssue('error', 'LENCO_SECRET_KEY is missing. Configure the live sk_live_ secret key for server-side calls.'));
  } else if (hasPlaceholderValue(secretKeyEntry.value)) {
    errors.push(
      buildIssue(
        'error',
        'LENCO_SECRET_KEY contains placeholder text. Replace it with the live secret key from the Lenco dashboard.'
      )
    );
  } else if (isProduction && looksLikeTestSecretKey(secretKeyEntry.value)) {
    errors.push(
      buildIssue(
        'error',
        'LENCO_SECRET_KEY is using a test key (sk_test_/sec-test). Replace it with the live secret key from the Lenco dashboard.'
      )
    );
  } else if (!looksLikeLiveSecretKey(secretKeyEntry.value)) {
    warnings.push(
      buildIssue(
        'warning',
        'LENCO_SECRET_KEY does not appear to be a live key (sec-/sk_live_/64-char hex). Verify the configured value.'
      )
    );
  }

  if (!webhookSecretEntry.value) {
    errors.push(buildIssue('error', 'LENCO_WEBHOOK_SECRET is not set. Configure the webhook secret from the Lenco dashboard.'));
  } else if (hasPlaceholderValue(webhookSecretEntry.value)) {
    errors.push(
      buildIssue(
        'error',
        'LENCO_WEBHOOK_SECRET contains placeholder text. Replace it with the webhook signing secret from the Lenco dashboard.'
      )
    );
  } else if (!looksLikeWebhookSecret(webhookSecretEntry.value)) {
    warnings.push(
      buildIssue('warning', 'LENCO_WEBHOOK_SECRET format is unexpected. Confirm the live webhook signing secret is configured.')
    );
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
