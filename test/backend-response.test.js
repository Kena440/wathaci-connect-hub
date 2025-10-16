import { test } from 'node:test';
import assert from 'node:assert';

process.env.ALLOW_IN_MEMORY_REGISTRATION = 'true';

import app from '../backend/index.js';

// Ensure the server still responds after adding security middleware
// Uses dynamic port to avoid conflicts

test('POST /users registers sanitized user payloads', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  const res = await fetch(`http://localhost:${port}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: ' Alice ',
      lastName: ' <b>Ngoma</b> ',
      email: 'ALICE@example.com',
      accountType: 'sme',
      company: '<i>Acme Corp</i>',
      mobileNumber: '+260 96 1234567',
    }),
  });

  assert.strictEqual(res.status, 201);
  const data = await res.json();

  assert.ok(data.user.id);
  assert.strictEqual(data.user.firstName, 'Alice');
  assert.strictEqual(data.user.lastName, 'Ngoma');
  assert.strictEqual(data.user.email, 'alice@example.com');
  assert.strictEqual(data.user.accountType, 'sme');
  assert.strictEqual(data.user.company, 'Acme Corp');
  assert.strictEqual(data.user.mobileNumber, '+260 96 1234567');
  assert.ok(Date.parse(data.user.registeredAt));

  const duplicateRes = await fetch(`http://localhost:${port}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Alice',
      lastName: 'Ngoma',
      email: 'alice@example.com',
      accountType: 'sme',
    }),
  });

  assert.strictEqual(duplicateRes.status, 409);
  const duplicateBody = await duplicateRes.json();
  assert.deepStrictEqual(duplicateBody, { error: 'User already registered' });

  await new Promise((resolve) => server.close(resolve));
});

test('POST /api/logs stores sanitized log entries', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  const postRes = await fetch(`http://localhost:${port}/api/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      level: 'error',
      message: '<script>alert("x")</script>',
      context: { details: '<b>bold</b>' },
    }),
  });

  assert.strictEqual(postRes.status, 201);
  const postBody = await postRes.json();
  assert.deepStrictEqual(postBody, { status: 'received' });

  const getRes = await fetch(`http://localhost:${port}/api/logs`);
  assert.strictEqual(getRes.status, 200);
  const data = await getRes.json();

  assert.ok(Array.isArray(data.logs));
  assert.ok(data.logs.length > 0);
  const latestLog = data.logs[data.logs.length - 1];

  assert.strictEqual(latestLog.message, 'alert("x")');
  assert.strictEqual(latestLog.context.details, 'bold');
  assert.ok(latestLog.receivedAt);

  await new Promise((resolve) => server.close(resolve));
});

