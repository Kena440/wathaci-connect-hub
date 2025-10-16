import { test } from 'node:test';
import assert from 'node:assert';

process.env.LOGS_API_TOKEN = 'test-logs-token';

const { default: app } = await import('../backend/index.js');

// Ensure the server still responds after adding security middleware
// Uses dynamic port to avoid conflicts

test('POST /users returns provided user data', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  const res = await fetch(`http://localhost:${port}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Alice', email: 'alice@example.com' }),
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.deepStrictEqual(data, {
    user: { name: 'Alice', email: 'alice@example.com' },
  });

  await new Promise((resolve) => server.close(resolve));
});

test('GET /api/logs/history requires auth and returns stored logs', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  const logRes = await fetch(`http://localhost:${port}/api/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      level: 'error',
      message: 'Payment verification failed',
      context: { reference: 'ref_123' },
    }),
  });

  assert.strictEqual(logRes.status, 201);

  const unauthorized = await fetch(`http://localhost:${port}/api/logs/history`);
  assert.strictEqual(unauthorized.status, 401);

  const historyRes = await fetch(`http://localhost:${port}/api/logs/history`, {
    headers: { Authorization: `Bearer ${process.env.LOGS_API_TOKEN}` },
  });

  assert.strictEqual(historyRes.status, 200);
  const historyData = await historyRes.json();
  assert.ok(Array.isArray(historyData.logs));
  assert.ok(
    historyData.logs.some((entry) => entry.message === 'Payment verification failed'),
    'Expected the stored log entry to be present in the history response',
  );

  await new Promise((resolve) => server.close(resolve));
});

