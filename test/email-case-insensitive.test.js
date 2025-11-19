import { test } from 'node:test';
import assert from 'node:assert';

process.env.ALLOW_IN_MEMORY_REGISTRATION = 'true';

import app from '../backend/index.js';

// Test case-insensitive email duplicate detection
test('POST /users rejects duplicate emails regardless of case', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  try {
    // Register user with lowercase email
    const res1 = await fetch(`http://localhost:${port}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        email: 'test.user@example.com',
        accountType: 'sme',
      }),
    });

    assert.strictEqual(res1.status, 201, 'First registration should succeed');
    const data1 = await res1.json();
    assert.strictEqual(data1.user.email, 'test.user@example.com', 'Email should be lowercase');

    // Try to register with uppercase email (same user, different case)
    const res2 = await fetch(`http://localhost:${port}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'TEST.USER@EXAMPLE.COM',
        accountType: 'professional',
      }),
    });

    assert.strictEqual(res2.status, 409, 'Second registration with different case should be rejected');
    const data2 = await res2.json();
    assert.deepStrictEqual(data2, { error: 'User already registered' });

    // Try to register with mixed case email
    const res3 = await fetch(`http://localhost:${port}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Bob',
        lastName: 'Smith',
        email: 'Test.User@Example.Com',
        accountType: 'investor',
      }),
    });

    assert.strictEqual(res3.status, 409, 'Third registration with mixed case should be rejected');
    const data3 = await res3.json();
    assert.deepStrictEqual(data3, { error: 'User already registered' });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
