import { test, mock } from 'node:test';
import assert from 'node:assert';

process.env.ALLOW_IN_MEMORY_OTP = 'true';
process.env.TWILIO_ACCOUNT_SID = 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
process.env.TWILIO_AUTH_TOKEN = 'test_token';
process.env.TWILIO_MESSAGE_SERVICE_SID = 'MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

import app from '../backend/index.js';
import * as twilioModule from '../backend/lib/twilioClient.js';
import { loadActiveOtp, OTP_EXPIRY_MS } from '../backend/services/otp-store.js';

test('POST /api/auth/otp/send dispatches via Twilio client', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  const sentMessages = [];
  const twilioClient = twilioModule.default || twilioModule;
  const originalSend = twilioClient.sendTwilioMessage;
  twilioClient.sendTwilioMessage = mock.fn(async (payload) => {
    sentMessages.push(payload);
    return { sid: 'SM123' };
  });

  try {
    const res = await fetch(`http://localhost:${port}/api/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+260961234567', channel: 'sms' }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.deepStrictEqual(body, { ok: true, message: 'OTP sent successfully.' });

    assert.strictEqual(sentMessages.length, 1);
    assert.strictEqual(sentMessages[0].to, '+260961234567');
    assert.ok(sentMessages[0].body.includes('verification code'));
  } finally {
    twilioClient.sendTwilioMessage = originalSend;
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/auth/otp/verify approves valid codes and rejects invalid ones', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  const sentMessages = [];
  const twilioClient = twilioModule.default || twilioModule;
  const originalSend = twilioClient.sendTwilioMessage;
  twilioClient.sendTwilioMessage = mock.fn(async (payload) => {
    sentMessages.push(payload);
    return { sid: 'SM234' };
  });

  try {
    const sendRes = await fetch(`http://localhost:${port}/api/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+260971234567', channel: 'whatsapp' }),
    });
    assert.strictEqual(sendRes.status, 200);

    const codeMatch = sentMessages[0].body.match(/(\d{6})/);
    const code = codeMatch ? codeMatch[1] : '000000';

    const invalidRes = await fetch(`http://localhost:${port}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+260971234567', channel: 'whatsapp', code: '999999' }),
    });
    assert.strictEqual(invalidRes.status, 400);
    const invalidBody = await invalidRes.json();
    assert.strictEqual(invalidBody.ok, false);

    const verifyRes = await fetch(`http://localhost:${port}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+260971234567', channel: 'whatsapp', code }),
    });

    assert.strictEqual(verifyRes.status, 200);
    const verifyBody = await verifyRes.json();
    assert.strictEqual(verifyBody.ok, true);
    assert.strictEqual(verifyBody.result.max_attempts > 0, true);

    const challenge = await loadActiveOtp('+260971234567', 'whatsapp');
    assert.strictEqual(challenge, null); // used codes are cleared

    const lateRes = await fetch(`http://localhost:${port}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+260971234567', channel: 'whatsapp', code }),
    });
    assert.strictEqual(lateRes.status, 400);
  } finally {
    twilioClient.sendTwilioMessage = originalSend;
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/auth/otp/send rejects missing input quickly', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://localhost:${port}/api/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '' }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.ok, undefined);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('OTP expiry metadata matches expectation', async () => {
  const now = Date.now();
  assert.strictEqual(Math.round(OTP_EXPIRY_MS / 60000), 10);
  assert.ok(OTP_EXPIRY_MS > 0 && OTP_EXPIRY_MS <= 10 * 60 * 1000);
  assert.ok(Date.now() >= now);
});
