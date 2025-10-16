import { test } from 'node:test';
import assert from 'node:assert';
import app from '../backend/index.js';

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

