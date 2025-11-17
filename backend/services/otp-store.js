const crypto = require('crypto');
const {
  isSupabaseConfigured,
  supabaseRequest,
} = require('../lib/supabaseClient');

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

const isFallbackAllowed = () => {
  if (process.env.ALLOW_IN_MEMORY_OTP === 'false') return false;
  if (process.env.ALLOW_IN_MEMORY_OTP === 'true') return true;
  return process.env.NODE_ENV === 'test' || !isSupabaseConfigured();
};

const fallbackStore = new Map(); // key => { hashedCode, expiresAt, attemptCount, maxAttempts }

const hashOtpCode = (code) => {
  const salt = process.env.OTP_HASH_SECRET || '';
  return crypto.createHash('sha256').update(`${code}:${salt}`).digest('hex');
};

const buildKey = (phone, channel) => `${channel}:${phone}`;

const persistOtp = async ({ phone, channel, code }) => {
  const hashedCode = hashOtpCode(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS).toISOString();

  if (!isSupabaseConfigured()) {
    if (!isFallbackAllowed()) {
      throw new Error('Supabase configuration is required for OTP persistence');
    }

    fallbackStore.set(buildKey(phone, channel), {
      hashedCode,
      expiresAt,
      attemptCount: 0,
      maxAttempts: MAX_ATTEMPTS,
    });

    return { expiresAt, maxAttempts: MAX_ATTEMPTS };
  }

  await supabaseRequest('otp_challenges', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: {
      phone,
      channel,
      hashed_code: hashedCode,
      expires_at: expiresAt,
      max_attempts: MAX_ATTEMPTS,
    },
  });

  return { expiresAt, maxAttempts: MAX_ATTEMPTS };
};

const loadActiveOtp = async (phone, channel) => {
  if (!isSupabaseConfigured()) {
    const fallback = fallbackStore.get(buildKey(phone, channel));
    if (!fallback) return null;
    return {
      hashed_code: fallback.hashedCode,
      expires_at: fallback.expiresAt,
      attempt_count: fallback.attemptCount,
      max_attempts: fallback.maxAttempts,
      id: buildKey(phone, channel),
    };
  }

  const searchParams = {
    select: '*',
    phone: `eq.${phone}`,
    channel: `eq.${channel}`,
    used_at: 'is.null',
    order: 'created_at.desc',
    limit: '1',
    expires_at: `gt.${new Date().toISOString()}`,
  };

  const data = await supabaseRequest('otp_challenges', { searchParams });
  if (Array.isArray(data) && data.length > 0) {
    return data[0];
  }
  return null;
};

const incrementAttempt = async (otpRecord) => {
  if (!otpRecord) return null;

  if (!isSupabaseConfigured()) {
    const fallback = fallbackStore.get(otpRecord.id);
    if (fallback) {
      fallback.attemptCount += 1;
      fallbackStore.set(otpRecord.id, fallback);
    }
    return {
      ...otpRecord,
      attempt_count: (otpRecord.attempt_count || 0) + 1,
    };
  }

  const response = await supabaseRequest('otp_challenges', {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    searchParams: { id: `eq.${otpRecord.id}` },
    body: {
      attempt_count: (otpRecord.attempt_count || 0) + 1,
      last_attempt_at: new Date().toISOString(),
    },
  });

  return Array.isArray(response) && response.length ? response[0] : otpRecord;
};

const markOtpUsed = async (otpRecord) => {
  if (!otpRecord) return;

  if (!isSupabaseConfigured()) {
    fallbackStore.delete(otpRecord.id);
    return;
  }

  await supabaseRequest('otp_challenges', {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    searchParams: { id: `eq.${otpRecord.id}` },
    body: {
      used_at: new Date().toISOString(),
    },
  });
};

module.exports = {
  persistOtp,
  loadActiveOtp,
  incrementAttempt,
  markOtpUsed,
  hashOtpCode,
  OTP_EXPIRY_MS,
  MAX_ATTEMPTS,
};
