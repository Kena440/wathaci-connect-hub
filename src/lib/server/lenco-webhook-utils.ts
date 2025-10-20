/**
 * Utility helpers for validating and normalising Lenco webhook events.
 */

export interface LencoWebhookEventData {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  gateway_response: string;
  paid_at?: string;
  metadata?: Record<string, any>;
}

export interface LencoWebhookPayload {
  event: 'payment.success' | 'payment.failed' | 'payment.pending' | 'payment.cancelled';
  data: LencoWebhookEventData;
  created_at: string;
}

/**
 * Maps the status returned by Lenco to the internal status values used by the app.
 */
export function mapLencoStatusToInternal(lencoStatus: string): string {
  const statusMap: Record<string, string> = {
    success: 'completed',
    failed: 'failed',
    pending: 'pending',
    cancelled: 'cancelled',
    abandoned: 'cancelled',
  };

  return statusMap[lencoStatus?.toLowerCase?.()] ?? 'failed';
}

/**
 * Title used when notifying end users about a payment update.
 */
export function getNotificationTitle(event: string): string {
  const titles: Record<string, string> = {
    'payment.success': 'Payment Successful',
    'payment.failed': 'Payment Failed',
    'payment.pending': 'Payment Pending',
    'payment.cancelled': 'Payment Cancelled',
  };

  return titles[event] ?? 'Payment Update';
}

/**
 * Human friendly message summarising a payment update.
 */
export function getNotificationMessage(event: string, paymentData: { amount: number; currency: string }): string {
  const amount = paymentData.currency === 'ZMK'
    ? `K${(paymentData.amount / 100).toFixed(2)}`
    : `${paymentData.amount / 100} ${paymentData.currency}`;

  const messages: Record<string, string> = {
    'payment.success': `Your payment of ${amount} was successful.`,
    'payment.failed': `Your payment of ${amount} failed. Please try again.`,
    'payment.pending': `Your payment of ${amount} is being processed.`,
    'payment.cancelled': `Your payment of ${amount} was cancelled.`,
  };

  return messages[event] ?? `Payment update for ${amount}`;
}

/**
 * Verifies an incoming webhook signature using the shared secret.
 */
export async function verifyLencoSignature(signature: string, rawBody: string, secret: string): Promise<boolean> {
  if (!signature || !rawBody || !secret) {
    return false;
  }

  const encoder = new TextEncoder();
  const bodyBytes = encoder.encode(rawBody);

  try {
    const hashKey = await deriveWebhookHashKey(secret);
    if (!hashKey) {
      return false;
    }

    const secretBytes = encoder.encode(hashKey);
    const expectedHmac = await computeHmacSha512(secretBytes, bodyBytes);
    if (!expectedHmac) {
      return false;
    }

    const providedBytes = decodeSignature(signature);
    if (providedBytes && timingSafeEqualBytes(expectedHmac, providedBytes)) {
      return true;
    }

    const expectedHex = toHex(expectedHmac);
    const normalisedSignature = /^[0-9a-fA-F]+$/.test(signature) ? signature.toLowerCase() : signature;
    if (timingSafeEqual(expectedHex, normalisedSignature)) {
      return true;
    }

    const expectedBase64 = toBase64(expectedHmac);
    if (timingSafeEqual(expectedBase64, signature)) {
      return true;
    }
  } catch (error) {
    console.error('verifyLencoSignature error', error);
    return false;
  }

  return false;
}

/**
 * Utility to generate deterministic signatures for tests.
 */
export async function createLencoSignature(rawBody: string, secret: string): Promise<{ hex: string; base64: string }> {
  const encoder = new TextEncoder();
  const bodyBytes = encoder.encode(rawBody);
  const hashKey = await deriveWebhookHashKey(secret);
  if (!hashKey) {
    throw new Error('Unable to derive Lenco webhook hash key');
  }

  const secretBytes = encoder.encode(hashKey);
  const signature = await computeHmacSha512(secretBytes, bodyBytes);
  if (!signature) {
    throw new Error('Unable to compute signature in current runtime');
  }

  return {
    hex: toHex(signature),
    base64: toBase64(signature),
  };
}

async function computeHmacSha512(secret: Uint8Array, payload: Uint8Array): Promise<Uint8Array | null> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const key = await crypto.subtle.importKey(
      'raw',
      secret,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );

    return new Uint8Array(await crypto.subtle.sign('HMAC', key, payload));
  }

  const nodeCrypto = await loadNodeCrypto();
  if (nodeCrypto && typeof Buffer !== 'undefined') {
    const hmac = nodeCrypto.createHmac('sha512', Buffer.from(secret));
    hmac.update(Buffer.from(payload));
    return new Uint8Array(hmac.digest());
  }

  return null;
}

async function computeSha256(payload: Uint8Array): Promise<Uint8Array | null> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return new Uint8Array(await crypto.subtle.digest('SHA-256', payload));
  }

  const nodeCrypto = await loadNodeCrypto();
  if (nodeCrypto && typeof Buffer !== 'undefined') {
    const hash = nodeCrypto.createHash('sha256');
    hash.update(Buffer.from(payload));
    return new Uint8Array(hash.digest());
  }

  return null;
}

function decodeSignature(signature: string): Uint8Array | null {
  return decodeHex(signature) ?? decodeBase64(signature);
}

function decodeBase64(signature: string): Uint8Array | null {
  try {
    if (typeof atob === 'function') {
      const binary = atob(signature);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }

    if (typeof Buffer !== 'undefined') {
      const buffer = Buffer.from(signature, 'base64');
      return buffer.length ? new Uint8Array(buffer) : null;
    }
  } catch (_error) {
    // fallthrough
  }

  return null;
}

function decodeHex(signature: string): Uint8Array | null {
  if (!/^[0-9a-fA-F]+$/.test(signature) || signature.length % 2 !== 0) {
    return null;
  }

  const bytes = new Uint8Array(signature.length / 2);
  for (let i = 0; i < signature.length; i += 2) {
    bytes[i / 2] = parseInt(signature.slice(i, i + 2), 16);
  }

  return bytes;
}

function toHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function toBase64(buffer: Uint8Array): string {
  if (typeof btoa === 'function') {
    let binary = '';
    buffer.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buffer).toString('base64');
  }

  return '';
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}

async function deriveWebhookHashKey(secret: string): Promise<string | null> {
  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(secret);
  const digest = await computeSha256(secretBytes);
  return digest ? toHex(digest) : null;
}

let cachedNodeCrypto: (typeof import('crypto')) | null = null;

async function loadNodeCrypto(): Promise<(typeof import('crypto')) | null> {
  if (cachedNodeCrypto) {
    return cachedNodeCrypto;
  }

  if (typeof process === 'undefined' || !process.versions?.node) {
    return null;
  }

  try {
    cachedNodeCrypto = await import('node:crypto');
    return cachedNodeCrypto;
  } catch (_error) {
    try {
      cachedNodeCrypto = await import('crypto');
      return cachedNodeCrypto;
    } catch (_err) {
      return null;
    }
  }
}
