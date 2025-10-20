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

test('POST /resolve/lenco-money proxies successful Lenco wallet lookups', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  const originalFetch = global.fetch;
  const originalSecret = process.env.LENCO_SECRET_KEY;
  process.env.LENCO_SECRET_KEY = 'sk_live_example';

  const lencoResponse = {
    status: true,
    message: 'Wallet resolved',
    data: {
      type: 'lenco-money',
      accountName: 'Alice Banda',
      walletNumber: '1234567890',
    },
  };

  global.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url === 'https://api.lenco.co/access/v2/resolve/lenco-money') {
      assert.strictEqual(init?.method, 'POST');
      assert.strictEqual(init?.headers?.Authorization, 'Bearer sk_live_example');
      assert.strictEqual(init?.headers?.['Content-Type'], 'application/json');
      const body = JSON.parse(init?.body);
      assert.deepStrictEqual(body, { walletNumber: '1234567890' });

      return new Response(JSON.stringify(lencoResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return originalFetch(input, init);
  };

  try {
    const res = await fetch(`http://localhost:${port}/resolve/lenco-money`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletNumber: '1234567890' }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.deepStrictEqual(data, lencoResponse);
  } finally {
    global.fetch = originalFetch;
    process.env.LENCO_SECRET_KEY = originalSecret;
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /resolve/lenco-money forwards Lenco validation errors', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  const originalFetch = global.fetch;
  const originalSecret = process.env.LENCO_SECRET_KEY;
  process.env.LENCO_SECRET_KEY = 'sk_live_example';

  const lencoError = {
    status: false,
    message: 'Wallet not found',
  };

  global.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url === 'https://api.lenco.co/access/v2/resolve/lenco-money') {
      return new Response(JSON.stringify(lencoError), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return originalFetch(input, init);
  };

  try {
    const res = await fetch(`http://localhost:${port}/resolve/lenco-money`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletNumber: '9999999999' }),
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.deepStrictEqual(data, lencoError);
  } finally {
    global.fetch = originalFetch;
    process.env.LENCO_SECRET_KEY = originalSecret;
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /resolve/lenco-money requires a configured secret key', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  const originalSecret = process.env.LENCO_SECRET_KEY;
  delete process.env.LENCO_SECRET_KEY;

  try {
    const res = await fetch(`http://localhost:${port}/resolve/lenco-money`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletNumber: '1234567890' }),
    });

    assert.strictEqual(res.status, 503);
    const data = await res.json();
    assert.deepStrictEqual(data, {
      status: false,
      message: 'LENCO_SECRET_KEY is not configured. Set the live secret key before resolving wallets.',
    });
  } finally {
    process.env.LENCO_SECRET_KEY = originalSecret;
    await new Promise((resolve) => server.close(resolve));
  }
});

