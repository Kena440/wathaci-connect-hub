#!/usr/bin/env node
import { spawn } from 'node:child_process';

const child = spawn(process.execPath, ['--test'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'test',
    ALLOW_IN_MEMORY_REGISTRATION: process.env.ALLOW_IN_MEMORY_REGISTRATION ?? 'true',
  },
});

child.on('exit', code => {
  process.exit(code ?? 1);
});
