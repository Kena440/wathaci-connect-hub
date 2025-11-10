#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

const CANDIDATE_PATHS = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  path.join(process.env.HOME ?? '', 'Applications', 'Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome'),
];

async function fileExists(executablePath) {
  if (!executablePath) return false;
  try {
    await access(executablePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveChromePath() {
  for (const candidate of CANDIDATE_PATHS) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  try {
    const chromiumPath = require('chromium');
    if (await fileExists(chromiumPath)) {
      return chromiumPath;
    }
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') {
      console.warn('Unable to load optional "chromium" package:', error);
    }
  }

  console.error(
    'Unable to locate a Chrome/Chromium binary. Install Chrome in CI or set CHROME_PATH before running Lighthouse.'
  );
  process.exit(1);
}

async function run() {
  const chromePath = await resolveChromePath();
  const child = spawn(
    'lighthouse',
    ['http://localhost:5173', '--quiet', '--no-update-notifier', "--chrome-flags=--headless"],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        CHROME_PATH: chromePath,
      },
    }
  );

  child.on('exit', code => {
    process.exit(code ?? 1);
  });
}

run();
