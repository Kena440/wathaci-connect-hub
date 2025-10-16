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

  await new Promise((resolve) => server.close(resolve));
});

test('GET /api/logs requires auth and returns sanitized logs', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  // First, post a log entry with HTML content
  const postRes = await fetch(`http://localhost:${port}/api/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      level: 'error',
      message: '<script>alert("xss")</script>Test error',
      context: { reference: 'ref_123', note: '<b>Important</b>' },
    }),
  });

  assert.strictEqual(postRes.status, 201);

  // Test unauthorized access
  const unauthorized = await fetch(`http://localhost:${port}/api/logs`);
  assert.strictEqual(unauthorized.status, 401);

  // Test authorized access
  const getRes = await fetch(`http://localhost:${port}/api/logs`, {
    headers: { Authorization: `Bearer ${process.env.LOGS_API_TOKEN}` },
  });

  assert.strictEqual(getRes.status, 200);
  const data = await getRes.json();

  assert.ok(Array.isArray(data.logs));
  assert.ok(data.logs.length > 0);
  const latestLog = data.logs[data.logs.length - 1];

  // Verify HTML/script tags were sanitized (removed)
  assert.strictEqual(latestLog.message, 'Test error');
  assert.strictEqual(latestLog.context.note, 'Important');
  assert.ok(latestLog.receivedAt);

  await new Promise((resolve) => server.close(resolve));
});

