/**
 * Frontend-Backend Integration Tests
 * 
 * Tests the communication between the frontend and backend API,
 * ensuring all critical endpoints are properly integrated.
 */

import { test } from 'node:test';
import assert from 'node:assert';

process.env.ALLOW_IN_MEMORY_REGISTRATION = 'true';
process.env.ALLOW_IN_MEMORY_OTP = 'true';

import app from '../backend/index.js';

test('Health check endpoint returns server status', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://localhost:${port}/health`);
    
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    
    assert.strictEqual(data.status, 'healthy');
    assert.ok(data.timestamp);
    assert.ok(typeof data.uptime === 'number');
    assert.ok(data.environment);
  } finally {
    server.close();
  }
});

test('API info endpoint returns endpoint documentation', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://localhost:${port}/api`);
    
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    
    assert.strictEqual(data.name, 'WATHACI CONNECT API');
    assert.ok(data.version);
    assert.ok(data.endpoints);
    assert.ok(data.endpoints.health);
    assert.ok(data.endpoints.users);
    assert.ok(data.endpoints.logs);
    assert.ok(data.endpoints.payment);
    assert.ok(data.endpoints.otp);
  } finally {
    server.close();
  }
});

test('CORS headers are properly set for allowed origins', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  try {
    // Test with origin header
    const res = await fetch(`http://localhost:${port}/health`, {
      headers: {
        'Origin': 'https://www.wathaci.com',
      },
    });

    // CORS should allow configured origins
    const allowOriginHeader = res.headers.get('access-control-allow-origin');
    assert.ok(allowOriginHeader === '*' || allowOriginHeader === 'https://www.wathaci.com');
    
    const allowMethodsHeader = res.headers.get('access-control-allow-methods');
    assert.ok(allowMethodsHeader?.includes('GET'));
    assert.ok(allowMethodsHeader?.includes('POST'));
  } finally {
    server.close();
  }
});

test('OPTIONS request returns proper CORS headers', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://localhost:${port}/users`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://www.wathaci.com',
      },
    });
    
    assert.strictEqual(res.status, 204);
    
    const allowMethodsHeader = res.headers.get('access-control-allow-methods');
    assert.ok(allowMethodsHeader);
    assert.ok(allowMethodsHeader.includes('POST'));
  } finally {
    server.close();
  }
});

test('User registration endpoint is accessible from frontend', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const userData = {
      firstName: 'Integration',
      lastName: 'Test',
      email: 'integration@test.com',
      accountType: 'sme',
    };

      const res = await fetch(`http://localhost:${port}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://www.wathaci.com',
        },
        body: JSON.stringify(userData),
      });
    
    assert.strictEqual(res.status, 201);
    
    // Check CORS headers
    const corsHeader = res.headers.get('access-control-allow-origin');
    assert.ok(corsHeader);
    
    const data = await res.json();
    assert.ok(data.user);
    assert.strictEqual(data.user.email, userData.email);
  } finally {
    server.close();
  }
});

test('OTP send endpoint is accessible from frontend', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const otpRequest = {
      phone: '+260971234567',
      channel: 'sms',
    };

      const res = await fetch(`http://localhost:${port}/api/auth/otp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://www.wathaci.com',
        },
        body: JSON.stringify(otpRequest),
      });
    
    // Should succeed or fail gracefully (not 404)
    assert.notStrictEqual(res.status, 404);
    
    const data = await res.json();
    assert.ok('ok' in data || 'error' in data);
  } finally {
    server.close();
  }
});

test('Log endpoint accepts frontend logs', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const logEntry = {
      level: 'info',
      message: 'Integration test log entry',
      context: { test: true },
    };

      const res = await fetch(`http://localhost:${port}/api/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://www.wathaci.com',
        },
        body: JSON.stringify(logEntry),
      });
    
    assert.strictEqual(res.status, 201);
    
    const data = await res.json();
    assert.strictEqual(data.status, 'received');
  } finally {
    server.close();
  }
});

test('Payment readiness endpoint is accessible', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  try {
      const res = await fetch(`http://localhost:${port}/api/payment/readiness`, {
        headers: {
          'Origin': 'https://www.wathaci.com',
        },
      });
    
    // Should return 200 (configured) or 503 (not configured), not 404
    assert.ok(res.status === 200 || res.status === 503);
    
    const data = await res.json();
    assert.ok('errors' in data || 'status' in data);
  } finally {
    server.close();
  }
});

test('Multiple concurrent requests are handled correctly', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  try {
    // Make 5 concurrent requests
    const promises = Array.from({ length: 5 }, (_, i) =>
      fetch(`http://localhost:${port}/health`).then(res => res.json())
    );

    const results = await Promise.all(promises);
    
    // All should succeed
    assert.strictEqual(results.length, 5);
    results.forEach(result => {
      assert.strictEqual(result.status, 'healthy');
    });
  } finally {
    server.close();
  }
});

test('Error responses include proper JSON format', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  try {
    // Invalid user registration (missing required fields)
    const res = await fetch(`http://localhost:${port}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'test@test.com' }), // Missing required fields
    });
    
    assert.strictEqual(res.status, 400);
    
    const data = await res.json();
    assert.ok('error' in data);
    assert.ok(typeof data.error === 'string');
  } finally {
    server.close();
  }
});
