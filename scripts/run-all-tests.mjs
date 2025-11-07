#!/usr/bin/env node
/**
 * Unified test runner for WATHACI CONNECT
 * 
 * Runs both backend tests (Node.js native test runner) and frontend tests (Jest)
 * This ensures all tests in the project are executed when running `npm test`
 */
import { spawn } from 'node:child_process';

let hasErrors = false;

/**
 * Run a test command and capture the result
 * 
 * Note: This function resolves (not rejects) on errors to allow all test suites
 * to run even if one fails. The hasErrors flag tracks failures for final exit code.
 */
function runTests(name, command, args, env = {}) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running ${name}...`);
    console.log(`${'='.repeat(60)}\n`);

    const child = spawn(command, args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        ...env,
      },
    });

    child.on('exit', (code) => {
      if (code !== 0) {
        console.error(`\n❌ ${name} failed with exit code ${code}`);
        hasErrors = true;
      } else {
        console.log(`\n✅ ${name} passed`);
      }
      resolve();
    });

    child.on('error', (err) => {
      console.error(`\n❌ ${name} error:`, err);
      hasErrors = true;
      resolve();
    });
  });
}

async function runAllTests() {
  console.log('🧪 WATHACI CONNECT - Running All Tests\n');

  // Run backend tests (Node.js native test runner)
  await runTests(
    'Backend Tests (Node.js)',
    process.execPath,
    ['--test'],
    {
      NODE_ENV: 'test',
      ALLOW_IN_MEMORY_REGISTRATION: process.env.ALLOW_IN_MEMORY_REGISTRATION ?? 'true',
    }
  );

  // Run frontend tests (Jest)
  await runTests(
    'Frontend Tests (Jest)',
    'npm',
    ['run', 'test:frontend', '--', '--passWithNoTests']
  );

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('Test Summary');
  console.log(`${'='.repeat(60)}\n`);
  
  if (hasErrors) {
    console.error('❌ Some tests failed. See output above for details.\n');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!\n');
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
