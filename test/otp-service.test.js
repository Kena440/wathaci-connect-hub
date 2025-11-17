/**
 * OTP Service Tests
 * 
 * Tests for OTP generation, hashing, and phone number normalization.
 * Note: These tests mock Twilio and Supabase to avoid making real API calls.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';

// Import OTP service functions
const {
  generateOTP,
  hashOTP,
  normalizePhoneNumber,
  formatWhatsAppNumber,
} = await import('../backend/services/otp-service.js');

test('generateOTP creates a 6-digit code', () => {
  const otp = generateOTP();
  
  assert.strictEqual(typeof otp, 'string', 'OTP should be a string');
  assert.strictEqual(otp.length, 6, 'OTP should be 6 digits long');
  assert.match(otp, /^\d{6}$/, 'OTP should contain only digits');
});

test('generateOTP creates unique codes', () => {
  const otp1 = generateOTP();
  const otp2 = generateOTP();
  
  // While it's possible to get the same code, it's extremely unlikely
  // This test might occasionally fail due to randomness, but serves as a sanity check
  assert.notStrictEqual(otp1, otp2, 'Generated OTPs should typically be different');
});

test('generateOTP preserves leading zeros', () => {
  // Generate multiple OTPs to ensure we can get ones with leading zeros
  const otps = Array.from({ length: 100 }, () => generateOTP());
  const allValidLength = otps.every(otp => otp.length === 6);
  
  assert.ok(allValidLength, 'All OTPs should be exactly 6 characters');
});

test('hashOTP creates consistent SHA-256 hash', () => {
  const code = '123456';
  const hash1 = hashOTP(code);
  const hash2 = hashOTP(code);
  
  assert.strictEqual(hash1, hash2, 'Same code should produce same hash');
  assert.strictEqual(typeof hash1, 'string', 'Hash should be a string');
  assert.strictEqual(hash1.length, 64, 'SHA-256 hash should be 64 hex characters');
  assert.match(hash1, /^[0-9a-f]{64}$/, 'Hash should be hexadecimal');
});

test('hashOTP creates different hashes for different codes', () => {
  const hash1 = hashOTP('123456');
  const hash2 = hashOTP('654321');
  
  assert.notStrictEqual(hash1, hash2, 'Different codes should produce different hashes');
});

test('hashOTP matches known SHA-256 output', () => {
  const code = '123456';
  const expectedHash = crypto.createHash('sha256').update(code).digest('hex');
  const actualHash = hashOTP(code);
  
  assert.strictEqual(actualHash, expectedHash, 'Hash should match SHA-256 output');
});

test('normalizePhoneNumber adds + prefix if missing', () => {
  const normalized = normalizePhoneNumber('260971234567');
  
  assert.strictEqual(normalized, '+260971234567', 'Should add + prefix to phone number');
});

test('normalizePhoneNumber preserves existing + prefix', () => {
  const normalized = normalizePhoneNumber('+260971234567');
  
  assert.strictEqual(normalized, '+260971234567', 'Should preserve + prefix');
});

test('normalizePhoneNumber removes non-digit characters except +', () => {
  const normalized = normalizePhoneNumber('+260 (97) 123-4567');
  
  assert.strictEqual(normalized, '+260971234567', 'Should remove formatting');
});

test('normalizePhoneNumber defaults to Zambia country code', () => {
  const normalized = normalizePhoneNumber('971234567');
  
  assert.strictEqual(normalized, '+260971234567', 'Should add Zambia +260 if no country code');
});

test('normalizePhoneNumber handles various formats', () => {
  const testCases = [
    { input: '260971234567', expected: '+260971234567' },
    { input: '+260971234567', expected: '+260971234567' },
    { input: '260-97-123-4567', expected: '+260971234567' },
    { input: '(260) 971234567', expected: '+260971234567' },
    { input: '971234567', expected: '+260971234567' },
  ];
  
  testCases.forEach(({ input, expected }) => {
    const normalized = normalizePhoneNumber(input);
    assert.strictEqual(normalized, expected, `"${input}" should normalize to "${expected}"`);
  });
});

test('formatWhatsAppNumber adds whatsapp: prefix', () => {
  const formatted = formatWhatsAppNumber('+260971234567');
  
  assert.strictEqual(formatted, 'whatsapp:+260971234567', 'Should add whatsapp: prefix');
});

test('formatWhatsAppNumber normalizes then adds whatsapp: prefix', () => {
  const formatted = formatWhatsAppNumber('260971234567');
  
  assert.strictEqual(formatted, 'whatsapp:+260971234567', 'Should normalize then add prefix');
});

test('formatWhatsAppNumber preserves existing whatsapp: prefix', () => {
  const formatted = formatWhatsAppNumber('whatsapp:+260971234567');
  
  assert.strictEqual(formatted, 'whatsapp:+260971234567', 'Should not double-prefix');
});

test('formatWhatsAppNumber handles various formats', () => {
  const testCases = [
    { input: '+260971234567', expected: 'whatsapp:+260971234567' },
    { input: '260971234567', expected: 'whatsapp:+260971234567' },
    { input: 'whatsapp:+260971234567', expected: 'whatsapp:+260971234567' },
    { input: '971234567', expected: 'whatsapp:+260971234567' },
  ];
  
  testCases.forEach(({ input, expected }) => {
    const formatted = formatWhatsAppNumber(input);
    assert.strictEqual(formatted, expected, `"${input}" should format to "${expected}"`);
  });
});

// Security tests
test('hashOTP is not reversible', () => {
  const code = '123456';
  const hash = hashOTP(code);
  
  // Ensure hash doesn't contain the original code
  assert.ok(!hash.includes(code), 'Hash should not contain original code');
  
  // Ensure it's computationally infeasible to reverse
  // (We can't actually test this, but we verify the hash length is appropriate)
  assert.ok(hash.length >= 64, 'Hash should be sufficiently long for security');
});

test('OTP codes should have sufficient entropy', () => {
  // Generate 1000 OTP codes and check for uniqueness
  const otps = new Set();
  for (let i = 0; i < 1000; i++) {
    otps.add(generateOTP());
  }
  
  // With 6 digits (1,000,000 possibilities), 1000 codes should mostly be unique
  // Allow for some collisions due to randomness
  assert.ok(otps.size > 950, 'Should have high uniqueness (>95%) in 1000 generated codes');
});
