#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const envFilenames = [
  '.env.local',
  '.env.production',
  '.env',
];

const backendEnvFilenames = [
  path.join('backend', '.env.local'),
  path.join('backend', '.env.production'),
  path.join('backend', '.env'),
];

const envValuesPerFile = new Map();

const envFiles = [...envFilenames, ...backendEnvFilenames]
  .map((relativePath) => ({
    relativePath,
    absolutePath: path.join(projectRoot, relativePath),
  }))
  .filter(({ absolutePath }) => fs.existsSync(absolutePath));

const parseEnvLine = (line) => {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const exportPrefix = 'export ';
  const normalized = trimmed.startsWith(exportPrefix)
    ? trimmed.slice(exportPrefix.length)
    : trimmed;

  const equalsIndex = normalized.indexOf('=');
  if (equalsIndex === -1) {
    return null;
  }

  const key = normalized.slice(0, equalsIndex).trim();
  if (!key) {
    return null;
  }

  let value = normalized.slice(equalsIndex + 1);

  const stripInlineComment = (input) => {
    let inSingleQuote = false;
    let inDoubleQuote = false;

    for (let index = 0; index < input.length; index += 1) {
      const char = input[index];

      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
      } else if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
      } else if (char === '#' && !inSingleQuote && !inDoubleQuote) {
        return input.slice(0, index);
      }
    }

    return input;
  };

  value = stripInlineComment(value).trim();
  if (!value) {
    return { key, value: '' };
  }

  const isQuoted =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"));

  if (isQuoted) {
    value = value.slice(1, -1);
  }

  return { key, value };
};

const collectEnvFromFiles = () => {
  const results = new Map();

  envValuesPerFile.clear();

  envFiles.forEach(({ absolutePath, relativePath }) => {
    const contents = fs.readFileSync(absolutePath, 'utf8');
    const fileEntries = new Map();
    envValuesPerFile.set(relativePath, fileEntries);

    contents.split(/\r?\n/).forEach((line) => {
      const parsed = parseEnvLine(line);
      if (!parsed) {
        return;
      }

      if (!results.has(parsed.key)) {
        results.set(parsed.key, {
          value: parsed.value,
          source: relativePath,
        });
      }

      if (!fileEntries.has(parsed.key)) {
        fileEntries.set(parsed.key, parsed.value);
      }
    });
  });

  return results;
};

const envFromFiles = collectEnvFromFiles();

const getEnvValue = (key) => {
  if (process.env[key]) {
    return { value: process.env[key], source: 'process.env' };
  }

  if (envFromFiles.has(key)) {
    return envFromFiles.get(key);
  }

  return null;
};

const red = (text) => `\u001b[31m${text}\u001b[0m`;
const green = (text) => `\u001b[32m${text}\u001b[0m`;
const yellow = (text) => `\u001b[33m${text}\u001b[0m`;
const cyan = (text) => `\u001b[36m${text}\u001b[0m`;

const hasPlaceholder = (value = '') => {
  const lowered = value.toLowerCase();
  return (
    lowered.includes('your-project') ||
    lowered.includes('your-service-role') ||
    lowered.includes('your-anon-key') ||
    lowered.includes('example.com') ||
    lowered.includes('dummy') ||
    lowered.includes('test_') ||
    lowered.includes('sandbox')
  );
};

const looksLikeLiveLencoKey = (value = '') =>
  /^pk_live_[a-z0-9]+$/i.test(value.trim()) || /^sk_live_[a-z0-9]+$/i.test(value.trim());

const httpsRequirements = new Map([
  ['VITE_SUPABASE_URL', { hostSuffix: '.supabase.co' }],
  ['SUPABASE_URL', { hostSuffix: '.supabase.co' }],
  ['VITE_LENCO_API_URL', {}],
  ['PAYMENT_ALERT_WEBHOOK_URL', {}],
]);

const validateHttpsValue = (value = '', { hostSuffix } = {}) => {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);

    if (parsed.protocol !== 'https:') {
      return 'expected https:// scheme';
    }

    if (hostSuffix && !parsed.hostname.endsWith(hostSuffix)) {
      return `host must end with ${hostSuffix}`;
    }

    return null;
  } catch (error) {
    return 'invalid URL';
  }
};

const checks = [
  {
    heading: 'Supabase (Frontend)',
    required: [
      { key: 'VITE_SUPABASE_URL', description: 'Supabase project URL (https://<ref>.supabase.co)' },
      { key: 'VITE_SUPABASE_KEY', description: 'Supabase anon/public key' },
    ],
  },
  {
    heading: 'Supabase (Backend)',
    required: [
      { key: 'SUPABASE_URL', description: 'Supabase project URL for server usage' },
      { key: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Supabase service role key' },
    ],
    optional: [
      { key: 'SUPABASE_ANON_KEY', description: 'Supabase anon key (used by some edge functions)' },
    ],
  },
  {
    heading: 'Lenco Payments',
    required: [
      { key: 'VITE_LENCO_PUBLIC_KEY', description: 'Lenco publishable key (pk_live_...)' },
      { key: 'LENCO_SECRET_KEY', description: 'Lenco secret key (sk_live_...)' },
      { key: 'LENCO_WEBHOOK_SECRET', description: 'Webhook signing secret from Lenco dashboard' },
      { key: 'VITE_LENCO_API_URL', description: 'Lenco API base URL' },
    ],
  },
  {
    heading: 'Payment Limits & Metadata',
    required: [
      { key: 'VITE_PAYMENT_CURRENCY', description: 'ISO currency code for payments' },
      { key: 'VITE_PAYMENT_COUNTRY', description: 'ISO country code for payments' },
      { key: 'VITE_PLATFORM_FEE_PERCENTAGE', description: 'Platform fee percentage' },
      { key: 'VITE_MIN_PAYMENT_AMOUNT', description: 'Minimum payment amount' },
      { key: 'VITE_MAX_PAYMENT_AMOUNT', description: 'Maximum payment amount' },
    ],
  },
  {
    heading: 'Monitoring & Alerts',
    required: [
      { key: 'PAYMENT_ALERT_WEBHOOK_URL', description: 'HTTPS webhook for payment alert notifications' },
    ],
    optional: [
      { key: 'MONITORING_LOG_ENDPOINT', description: 'Custom HTTPS endpoint for structured log ingestion' },
    ],
  },
  {
    heading: 'Runtime Environment Metadata',
    required: [
      { key: 'VITE_APP_ENV', description: 'Runtime environment label (development/production)' },
      { key: 'VITE_APP_NAME', description: 'Application display name' },
    ],
    optional: [
      { key: 'CORS_ALLOWED_ORIGINS', description: 'Comma-delimited list of origins for the Express backend' },
    ],
  },
];

let missingRequired = 0;
let warningCount = 0;

const formatEntry = ({ key, description }, required = true) => {
  const result = getEnvValue(key);

  if (!result || !result.value) {
    if (required) {
      missingRequired += 1;
      console.log(`  ${red('✖')} ${key} ${cyan(`– ${description}`)}`);
    } else {
      console.log(`  ${yellow('!')} ${key} ${cyan(`– ${description} (optional)`)} `);
    }
    return;
  }

  const displaySource = result.source === 'process.env' ? 'process.env' : result.source;
  const formattedSource = cyan(`(${displaySource})`);

  const annotations = [];

  if (hasPlaceholder(result.value)) {
    warningCount += 1;
    annotations.push('placeholder detected');
  }

  if (httpsRequirements.has(key)) {
    const violation = validateHttpsValue(result.value, httpsRequirements.get(key));
    if (violation) {
      warningCount += 1;
      annotations.push(violation);
    }
  }

  if (key === 'VITE_LENCO_PUBLIC_KEY' || key === 'LENCO_SECRET_KEY') {
    if (!looksLikeLiveLencoKey(result.value)) {
      warningCount += 1;
      annotations.push('expected live Lenco key');
    }
  }

  const icon = annotations.length > 0 ? yellow('▲') : green('✔');
  const annotationText = annotations.length > 0 ? ` ${yellow('[' + annotations.join('; ') + ']')}` : '';

  console.log(`  ${icon} ${key} ${formattedSource}${annotationText}`);
};

console.log('\n🔍 WATHACI CONNECT environment audit');
console.log('────────────────────────────────────');

if (envFiles.length === 0) {
  console.log(`  ${yellow('!')} No .env files found. The script will fall back to process.env only.`);
} else {
  envFiles.forEach(({ relativePath }) => {
    console.log(`  ${cyan('•')} Loaded ${relativePath}`);
  });
}

console.log('');

checks.forEach((section) => {
  console.log(`${section.heading}`);
  console.log('────────────────');
  section.required.forEach((entry) => formatEntry(entry, true));
  if (section.optional) {
    section.optional.forEach((entry) => formatEntry(entry, false));
  }
  console.log('');
});

const reportWebhookSecretCoverage = () => {
  const secretKey = 'LENCO_WEBHOOK_SECRET';

  if (envFiles.length === 0) {
    console.log('Webhook secret coverage');
    console.log('──────────────────────');
    console.log(`  ${yellow('!')} No environment files detected. Unable to verify ${secretKey} per environment.`);
    console.log('');
    return;
  }

  console.log('Webhook secret coverage');
  console.log('──────────────────────');

  envFiles.forEach(({ relativePath }) => {
    const values = envValuesPerFile.get(relativePath);
    const value = values?.get(secretKey);

    if (!value) {
      warningCount += 1;
      console.log(`  ${red('✖')} ${relativePath} ${yellow(`[${secretKey} missing]`)}`);
      return;
    }

    if (hasPlaceholder(value)) {
      warningCount += 1;
      console.log(`  ${yellow('▲')} ${relativePath} ${yellow('[placeholder secret detected]')}`);
      return;
    }

    console.log(`  ${green('✔')} ${relativePath}`);
  });

  if (process.env[secretKey]) {
    console.log(`  ${green('✔')} process.env (${secretKey} provided)`);
  }

  console.log('');
};

reportWebhookSecretCoverage();

if (missingRequired === 0 && warningCount === 0) {
  console.log(`${green('🎉  All required environment variables are populated with production-ready values.')}`);
} else {
  if (missingRequired > 0) {
    console.log(`${red('⛔  Missing required variables:')} ${missingRequired}`);
  }
  if (warningCount > 0) {
    console.log(`${yellow('⚠️   Placeholder or invalid configuration values detected:')} ${warningCount}`);
  }
}

if (missingRequired > 0 || warningCount > 0) {
  console.log('\nSee docs/PRODUCTION_READINESS_CHECKLIST.md for remediation steps.');
  process.exitCode = 1;
}
