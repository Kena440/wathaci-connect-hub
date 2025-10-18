#!/usr/bin/env node
import https from 'https';
import { URL } from 'url';

const green = (text) => `\u001b[32m${text}\u001b[0m`;
const yellow = (text) => `\u001b[33m${text}\u001b[0m`;
const red = (text) => `\u001b[31m${text}\u001b[0m`;
const cyan = (text) => `\u001b[36m${text}\u001b[0m`;

const candidateEnvEndpoints = [
  { key: 'VITE_SUPABASE_URL', label: 'Supabase (frontend)' },
  { key: 'SUPABASE_URL', label: 'Supabase (backend)' },
  { key: 'VITE_LENCO_API_URL', label: 'Lenco API' },
  { key: 'PAYMENT_ALERT_WEBHOOK_URL', label: 'Payment alert webhook' },
  { key: 'MONITORING_LOG_ENDPOINT', label: 'Monitoring log endpoint' },
];

const cliEndpoints = process.argv.slice(2)
  .map((arg) => arg.trim())
  .filter((arg) => arg);

const seen = new Set();

const endpoints = [];

candidateEnvEndpoints.forEach(({ key, label }) => {
  const value = process.env[key];
  if (!value || !/^https:/i.test(value)) {
    return;
  }

  if (seen.has(value)) {
    return;
  }

  seen.add(value);
  endpoints.push({ label, url: value });
});

cliEndpoints.forEach((entry) => {
  const normalized = entry.startsWith('https://') ? entry : `https://${entry}`;
  if (seen.has(normalized)) {
    return;
  }

  try {
    const url = new URL(normalized);
    if (url.protocol !== 'https:') {
      console.log(`${yellow('▲')} Skipping ${entry} – only https:// endpoints are supported.`);
      return;
    }

    seen.add(url.toString());
    endpoints.push({ label: `CLI: ${url.hostname}`, url: url.toString() });
  } catch (error) {
    console.log(`${yellow('▲')} Skipping ${entry} – invalid URL (${error.message}).`);
  }
});

if (endpoints.length === 0) {
  console.log(`${yellow('!')} No HTTPS endpoints found in environment variables or CLI arguments.`);
  console.log('Set environment variables or pass URLs as arguments to audit certificates.');
  process.exit(0);
}

const performTlsCheck = (label, targetUrl) => new Promise((resolve) => {
  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (error) {
    resolve({ label, url: targetUrl, error: `Invalid URL: ${error.message}` });
    return;
  }

  const options = {
    method: 'HEAD',
    timeout: 5000,
  };

  const start = Date.now();
  const request = https.request(parsedUrl, options, (response) => {
    const elapsedMs = Date.now() - start;
    const certificate = response.socket.getPeerCertificate();
    const authorised = response.socket.authorized;
    const authorizationError = response.socket.authorizationError || null;
    const protocol = response.socket.alpnProtocol || response.socket.getProtocol?.() || null;

    resolve({
      label,
      url: targetUrl,
      authorised,
      authorizationError,
      statusCode: response.statusCode,
      certificate,
      protocol,
      elapsedMs,
    });
  });

  request.on('timeout', () => {
    request.destroy();
    resolve({ label, url: targetUrl, error: 'Connection timed out' });
  });

  request.on('error', (error) => {
    resolve({ label, url: targetUrl, error: error.message });
  });

  request.end();
});

const daysUntil = (isoDate) => {
  if (!isoDate) {
    return null;
  }

  const target = new Date(isoDate);
  if (Number.isNaN(target.getTime())) {
    return null;
  }

  return Math.floor((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

const results = await Promise.all(endpoints.map(({ label, url }) => performTlsCheck(label, url)));

console.log('\nTLS verification report');
console.log('──────────────────────');

let failureCount = 0;
let warningCount = 0;

results.forEach((result) => {
  const descriptor = `${result.label} ${cyan(result.url)}`;

  if (result.error) {
    failureCount += 1;
    console.log(`  ${red('✖')} ${descriptor}`);
    console.log(`     ${red(result.error)}`);
    return;
  }

  const notes = [];

  if (!result.authorised) {
    failureCount += 1;
    notes.push(`certificate rejected: ${result.authorizationError || 'unknown error'}`);
  }

  if (result.statusCode && result.statusCode >= 400) {
    warningCount += 1;
    notes.push(`HTTP ${result.statusCode}`);
  }

  if (result.certificate && Object.keys(result.certificate).length > 0) {
    const daysRemaining = daysUntil(result.certificate.valid_to);
    if (daysRemaining !== null) {
      if (daysRemaining < 0) {
        failureCount += 1;
        notes.push(`certificate expired ${Math.abs(daysRemaining)}d ago (${result.certificate.valid_to})`);
      } else if (daysRemaining <= 30) {
        warningCount += 1;
        notes.push(`certificate expires in ${daysRemaining}d (${result.certificate.valid_to})`);
      } else {
        notes.push(`certificate valid until ${result.certificate.valid_to} (${daysRemaining}d remaining)`);
      }
    }
  } else {
    warningCount += 1;
    notes.push('no certificate metadata available');
  }

  if (result.protocol) {
    notes.push(`ALPN protocol: ${result.protocol}`);
  }

  if (typeof result.elapsedMs === 'number') {
    notes.push(`latency: ${result.elapsedMs}ms`);
  }

  const hasFailure = !result.authorised || notes.some((note) => note.startsWith('certificate rejected') || note.startsWith('certificate expired'));
  const hasWarning = !hasFailure && notes.some((note) => note.startsWith('HTTP') || note.includes('expires in') || note.includes('no certificate metadata'));
  const statusIcon = hasFailure ? red('✖') : hasWarning ? yellow('▲') : green('✔');

  console.log(`  ${statusIcon} ${descriptor}`);
  notes.forEach((note) => {
    console.log(`     - ${note}`);
  });
});

if (failureCount === 0 && warningCount === 0) {
  console.log(`\n${green('All inspected HTTPS endpoints passed certificate checks.')}`);
} else {
  console.log(`\n${yellow('Summary:')} ${failureCount} failures, ${warningCount} warnings.`);
  if (failureCount > 0) {
    process.exitCode = 1;
  }
}
