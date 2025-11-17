import { test } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';

process.env.ALLOW_IN_MEMORY_REGISTRATION = 'true';
process.env.ALLOW_IN_MEMORY_OTP = 'true';

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

test('POST /api/users routes to the same registration handler', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  const res = await fetch(`http://localhost:${port}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Bob',
      lastName: 'Mwila',
      email: `bob-${crypto.randomUUID()}@example.com`,
      accountType: 'professional',
    }),
  });

  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.strictEqual(data.user.firstName, 'Bob');
  assert.strictEqual(data.user.lastName, 'Mwila');
  assert.strictEqual(data.user.accountType, 'professional');

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

test('POST /resolve/lenco-merchant proxies lookup to Lenco API', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  const originalFetch = global.fetch.bind(global);
  const previousSecret = process.env.LENCO_SECRET_KEY;
  const previousApiUrl = process.env.LENCO_API_URL;

  process.env.LENCO_SECRET_KEY = 'sk_live_example1234567890';
  process.env.LENCO_API_URL = 'https://mock-lenco.test';

  global.fetch = async (url, options) => {
    if (typeof url === 'string' && url.startsWith('https://mock-lenco.test/resolve/lenco-merchant')) {
      assert.strictEqual(options?.method, 'POST');
      assert.strictEqual(options?.headers?.Authorization, 'Bearer sk_live_example1234567890');
      const payload = JSON.parse(options?.body);
      assert.deepStrictEqual(payload, { tillNumber: '123456' });

      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: true,
          message: 'Merchant found',
          data: {
            type: 'lenco-merchant',
            accountName: 'Test Shop',
            tillNumber: '123456',
          },
        }),
      };
    }

    return originalFetch(url, options);
  };

  try {
    const res = await fetch(`http://localhost:${port}/resolve/lenco-merchant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tillNumber: ' 123456 ' }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.deepStrictEqual(body, {
      status: true,
      message: 'Merchant found',
      data: {
        type: 'lenco-merchant',
        accountName: 'Test Shop',
        tillNumber: '123456',
      },
    });
  } finally {
    global.fetch = originalFetch;
    if (previousSecret === undefined) {
      delete process.env.LENCO_SECRET_KEY;
    } else {
      process.env.LENCO_SECRET_KEY = previousSecret;
    }
    if (previousApiUrl === undefined) {
      delete process.env.LENCO_API_URL;
    } else {
      process.env.LENCO_API_URL = previousApiUrl;
    }

    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /resolve/lenco-merchant surfaces Lenco validation errors', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  const originalFetch = global.fetch.bind(global);
  const previousSecret = process.env.LENCO_SECRET_KEY;
  const previousApiUrl = process.env.LENCO_API_URL;

  process.env.LENCO_SECRET_KEY = 'sk_live_example1234567890';
  process.env.LENCO_API_URL = 'https://mock-lenco.test';

  global.fetch = async (url, options) => {
    if (typeof url === 'string' && url.startsWith('https://mock-lenco.test/resolve/lenco-merchant')) {
      return {
        ok: false,
        status: 400,
        json: async () => ({
          status: false,
          message: 'Till number is invalid',
          data: null,
        }),
      };
    }

    return originalFetch(url, options);
  };

  try {
    const res = await fetch(`http://localhost:${port}/resolve/lenco-merchant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tillNumber: 'invalid' }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.deepStrictEqual(body, {
      status: false,
      message: 'Till number is invalid',
      data: null,
    });
  } finally {
    global.fetch = originalFetch;
    if (previousSecret === undefined) {
      delete process.env.LENCO_SECRET_KEY;
    } else {
      process.env.LENCO_SECRET_KEY = previousSecret;
    }
    if (previousApiUrl === undefined) {
      delete process.env.LENCO_API_URL;
    } else {
      process.env.LENCO_API_URL = previousApiUrl;
    }

    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/payment/webhook validates Lenco signature', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  const previousSecret = process.env.LENCO_WEBHOOK_SECRET;
  process.env.LENCO_WEBHOOK_SECRET = 'whsec_live_example_1234567890';

  const payload = {
    event: 'payment.success',
    data: {
      reference: 'INV-12345',
      status: 'success',
    },
  };

  const rawBody = JSON.stringify(payload);
  const signature = crypto
    .createHash('sha256')
    .update(`${process.env.LENCO_WEBHOOK_SECRET}${rawBody}`)
    .digest('hex');

  try {
    const res = await fetch(`http://localhost:${port}/api/payment/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lenco-signature': signature,
      },
      body: rawBody,
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.deepStrictEqual(body, { received: true });

    const invalidRes = await fetch(`http://localhost:${port}/api/payment/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lenco-signature': 'invalid-signature',
      },
      body: rawBody,
    });

    assert.strictEqual(invalidRes.status, 400);
    const invalidBody = await invalidRes.json();
    assert.deepStrictEqual(invalidBody, { error: 'Invalid webhook signature' });
  } finally {
    if (previousSecret === undefined) {
      delete process.env.LENCO_WEBHOOK_SECRET;
    } else {
      process.env.LENCO_WEBHOOK_SECRET = previousSecret;
    }

    await new Promise((resolve) => server.close(resolve));
  }
});

