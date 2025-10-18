import { test } from 'node:test';
import assert from 'node:assert';

process.env.ALLOW_IN_MEMORY_REGISTRATION = 'true';
process.env.RATE_LIMIT_MAX_REQUESTS = '3';
process.env.RATE_LIMIT_WINDOW_MS = '60000';

import { createApp } from '../backend/index.js';

const requestLogsEndpoint = async (baseUrl) => {
  const response = await fetch(`${baseUrl}/api/logs`);
  await response.text();
  return response;
};

test('rate limiting middleware emits headers and enforces caps', async () => {
  const server = createApp().listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  const firstResponse = await requestLogsEndpoint(baseUrl);
  assert.strictEqual(firstResponse.status, 200);
  assert.strictEqual(firstResponse.headers.get('ratelimit-limit'), '3');
  assert.ok(Number.parseInt(firstResponse.headers.get('ratelimit-remaining') || '0', 10) >= 0);

  await requestLogsEndpoint(baseUrl);
  await requestLogsEndpoint(baseUrl);

  const blockedResponse = await requestLogsEndpoint(baseUrl);
  assert.strictEqual(blockedResponse.status, 429);

  await new Promise((resolve) => server.close(resolve));
});
