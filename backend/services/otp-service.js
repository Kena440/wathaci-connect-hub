/**
 * OTP delivery and verification via Twilio SMS & WhatsApp.
 *
 * API contracts (Express routes):
 *  • POST /api/auth/otp/send
 *      Body: { phone: string, channel: 'sms' | 'whatsapp' }
 *      Response: { ok: true, message: string }
 *  • POST /api/auth/otp/verify
 *      Body: { phone: string, channel?: 'sms' | 'whatsapp', code: string }
 *      Response: { ok: true, message: string, result: { phone_verified: boolean } }
 *
 * Behaviour:
 *  • Generates a 6-digit OTP, stores a hashed copy with 10-minute expiry and a
 *    5-attempt limit (Supabase-backed with in-memory fallback for tests).
 *  • Sends OTP via Twilio using TWILIO_MESSAGE_SERVICE_SID (or TWILIO_PHONE_NUMBER / TWILIO_WHATSAPP_FROM).
 *  • Verifies codes, increments attempt counters, and marks the phone as verified in Supabase profiles when available.
 *
 * Required environment variables:
 *  - TWILIO_ACCOUNT_SID
 *  - TWILIO_AUTH_TOKEN
 *  - TWILIO_MESSAGE_SERVICE_SID (preferred) or TWILIO_MESSAGING_SERVICE_SID
 *  - TWILIO_PHONE_NUMBER (fallback for SMS)
 *  - TWILIO_WHATSAPP_FROM (fallback for WhatsApp)
 *  - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (optional; enables persistence)
 */

const { randomInt } = require('crypto');
const twilioClient = require('../lib/twilioClient');
const {
  persistOtp,
  loadActiveOtp,
  incrementAttempt,
  markOtpUsed,
  hashOtpCode,
  OTP_EXPIRY_MS,
  MAX_ATTEMPTS,
} = require('./otp-store');
const { markPhoneVerified, normalizePhone } = require('./phone-verification');

const generateOtp = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

const normalizeChannel = (channel = 'sms') => (channel || 'sms').toLowerCase();

const formatDestination = (phone, channel) => {
  if (channel === 'whatsapp') {
    return phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
  }
  return phone;
};

const resolveMessagingConfig = (channel) => {
  const messagingServiceSid = twilioClient.twilioConfig.messagingServiceSid;
  const whatsappFrom = twilioClient.twilioConfig.whatsappFrom;
  const phoneNumber = twilioClient.twilioConfig.phoneNumber;

  if (!messagingServiceSid && channel === 'sms' && !phoneNumber) {
    throw new Error('Missing Twilio SMS sender configuration');
  }

  if (channel === 'whatsapp' && !messagingServiceSid && !whatsappFrom && !phoneNumber) {
    throw new Error('Missing Twilio WhatsApp sender configuration');
  }

  if (channel === 'whatsapp') {
    return {
      messagingServiceSid,
      from: whatsappFrom || phoneNumber || undefined,
    };
  }

  return {
    messagingServiceSid,
    from: phoneNumber || undefined,
  };
};

const sendOtp = async ({ phone, channel = 'sms' }) => {
  const normalizedChannel = normalizeChannel(channel);
  const normalizedPhone = normalizePhone(phone);
  const destination = formatDestination(normalizedPhone, normalizedChannel);

  const code = generateOtp();
  const { expiresAt } = await persistOtp({ phone: normalizedPhone, channel: normalizedChannel, code });

  const senderConfig = resolveMessagingConfig(normalizedChannel);
  const messageBody = `Your Wathaci verification code is ${code}. It expires in ${Math.floor(
    OTP_EXPIRY_MS / 60000,
  )} minutes.`;

  await twilioClient.sendTwilioMessage({
    to: destination,
    body: messageBody,
    messagingServiceSid: senderConfig.messagingServiceSid,
    from: senderConfig.from,
  });

  const maskedCode = `${code.slice(0, 2)}****`;
  console.info('[otp-service] OTP dispatched', {
    channel: normalizedChannel,
    phone: normalizedPhone ? `${normalizedPhone.slice(0, 4)}***` : 'unknown',
    code_hint: maskedCode,
    expires_at: expiresAt,
  });

  return { expiresAt };
};

const verifyOtp = async ({ phone, channel = 'sms', code }) => {
  const normalizedChannel = normalizeChannel(channel);
  const normalizedPhone = normalizePhone(phone);
  const challenge = await loadActiveOtp(normalizedPhone, normalizedChannel);

  if (!challenge) {
    return { ok: false, reason: 'not_found' };
  }

  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    await markOtpUsed(challenge);
    return { ok: false, reason: 'expired' };
  }

  if ((challenge.attempt_count || 0) >= (challenge.max_attempts || MAX_ATTEMPTS)) {
    return { ok: false, reason: 'locked' };
  }

  await incrementAttempt(challenge);

  const submittedHash = hashOtpCode(code);
  if (submittedHash !== challenge.hashed_code) {
    return { ok: false, reason: 'mismatch' };
  }

  await markOtpUsed(challenge);
  const verification = await markPhoneVerified(normalizedPhone);

  return { ok: true, reason: 'approved', verification };
};

module.exports = {
  sendOtp,
  verifyOtp,
};
