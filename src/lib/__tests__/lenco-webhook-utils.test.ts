import { webcrypto } from 'crypto';
import { TextDecoder, TextEncoder } from 'util';
import { createLencoSignature, verifyLencoSignature } from '../server/lenco-webhook-utils';

globalThis.crypto = webcrypto as unknown as Crypto;
globalThis.TextEncoder = TextEncoder as unknown as typeof globalThis.TextEncoder;
globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;

describe('lenco webhook signature utilities', () => {

  const secret = 'test-secret';
  const payload = JSON.stringify({
    event: 'payment.success',
    data: { reference: 'WC_TEST_123' },
  });

  it('accepts a valid hex signature', async () => {
    const { hex } = await createLencoSignature(payload, secret);
    await expect(verifyLencoSignature(hex, payload, secret)).resolves.toBe(true);
  });

  it('accepts a valid base64 signature', async () => {
    const { base64 } = await createLencoSignature(payload, secret);
    await expect(verifyLencoSignature(base64, payload, secret)).resolves.toBe(true);
  });

  it('rejects an invalid signature', async () => {
    await expect(verifyLencoSignature('invalid', payload, secret)).resolves.toBe(false);
  });
});
