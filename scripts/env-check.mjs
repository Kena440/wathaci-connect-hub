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

  envFiles.forEach(({ absolutePath, relativePath }) => {
    const contents = fs.readFileSync(absolutePath, 'utf8');
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
    lowered.includes('your-lenco') ||
    lowered.includes('lenco-public-key') ||
    lowered.includes('lenco-secret-key') ||
    lowered.includes('lenco-webhook-secret') ||
    lowered.includes('example.com') ||
    lowered.includes('dummy') ||
    lowered.includes('test_') ||
    lowered.includes('sandbox')
  );
};

const looksLikeLencoPublicKey = (value = '') => {
  const trimmed = value.trim();
  if (!trimmed) return false;

  return (
    /^(pk_live_[a-z0-9]{10,})$/i.test(trimmed) || // legacy format documented earlier
    /^(pub-[a-z0-9]{32,})$/i.test(trimmed) // current dashboard format
  );
};

const looksLikeLencoSecretKey = (value = '') => {
  const trimmed = value.trim();
  if (!trimmed) return false;

  return (
    /^(sk_live_[a-z0-9]{10,})$/i.test(trimmed) || // legacy format documented earlier
    /^(sec-[a-z0-9]{32,})$/i.test(trimmed) || // dashboard-issued secrets
    /^[a-f0-9]{64}$/i.test(trimmed) // hexadecimal secrets returned by older live accounts
  );
};

const checks = [
  {
    heading: 'Supabase (Frontend)',
    required: [
      {
        key: 'VITE_SUPABASE_URL',
        description: 'Supabase project URL (https://<ref>.supabase.co)',
        aliases: ['VITE_SUPABASE_PROJECT_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'PUBLIC_SUPABASE_URL', 'SUPABASE_URL'],
      },
      {
        key: 'VITE_SUPABASE_KEY',
        description: 'Supabase anon/public key',
        aliases: [
          'VITE_SUPABASE_ANON_KEY',
          'NEXT_PUBLIC_SUPABASE_ANON_KEY',
          'PUBLIC_SUPABASE_ANON_KEY',
          'SUPABASE_KEY',
          'SUPABASE_ANON_KEY',
        ],
      },
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
let placeholderWarnings = 0;

const getEnvValueFromKeys = (keys = []) => {
  for (const key of keys) {
    const result = getEnvValue(key);
    if (result && result.value) {
      return { ...result, key };
    }
  }
  return null;
};

const formatEntry = ({ key, description, aliases = [] }, required = true) => {
  const lookupKeys = [key, ...aliases];
  const result = getEnvValueFromKeys(lookupKeys);

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

  const resolvedKeyLabel = result.key === key ? key : `${key} ← ${result.key}`;

  let status = `${green('✔')} ${resolvedKeyLabel} ${formattedSource}`;

  if (hasPlaceholder(result.value)) {
    placeholderWarnings += 1;
    status = `${yellow('▲')} ${key} ${formattedSource} ${yellow('[placeholder detected]')}`;
  }

  if (key === 'VITE_LENCO_PUBLIC_KEY') {
    if (!looksLikeLencoPublicKey(result.value)) {
      placeholderWarnings += 1;
      status = `${yellow('▲')} ${key} ${formattedSource} ${yellow('[expected live Lenco key]')}`;
    }
  } else if (key === 'LENCO_SECRET_KEY') {
    if (!looksLikeLencoSecretKey(result.value)) {
      placeholderWarnings += 1;
      status = `${yellow('▲')} ${key} ${formattedSource} ${yellow('[expected live Lenco key]')}`;
    }
  }

  console.log(`  ${status}`);
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

if (missingRequired === 0 && placeholderWarnings === 0) {
  console.log(`${green('🎉  All required environment variables are populated with non-placeholder values.')}`);
} else {
  if (missingRequired > 0) {
    console.log(`${red('⛔  Missing required variables:')} ${missingRequired}`);
  }
  if (placeholderWarnings > 0) {
    console.log(`${yellow('⚠️   Placeholder or non-production values detected:')} ${placeholderWarnings}`);
  }
}

if (missingRequired > 0 || placeholderWarnings > 0) {
  console.log('\nSee docs/PRODUCTION_READINESS_CHECKLIST.md for remediation steps.');
  process.exitCode = 1;
}
