/**
 * OTP Service - SMS and WhatsApp Verification
 * 
 * This service handles One-Time Password (OTP) generation, delivery, and verification
 * via SMS and WhatsApp using Twilio.
 * 
 * Features:
 * - Generate secure 6-digit OTP codes
 * - Send OTP via SMS or WhatsApp
 * - Verify OTP codes with attempt limiting
 * - Automatic expiration (10 minutes)
 * - Secure hashing (SHA-256) for storage
 * 
 * Security Measures:
 * - OTP codes are hashed before storage
 * - Maximum 5 verification attempts per OTP
 * - 10-minute expiration window
 * - Rate limiting should be applied at the route level
 */

const crypto = require('crypto');
const { getTwilioClient, getTwilioPhoneNumber, getTwilioWhatsAppFrom } = require('../lib/twilioClient');
const { getSupabaseClient } = require('../lib/supabaseAdmin');

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;

/**
 * Generate a secure random 6-digit OTP code
 * @returns {string} 6-digit OTP code
 */
function generateOTP() {
  // Generate random bytes and convert to 6-digit number
  const randomNum = crypto.randomInt(0, 1000000);
  return randomNum.toString().padStart(OTP_LENGTH, '0');
}

/**
 * Hash an OTP code using SHA-256
 * @param {string} code - The OTP code to hash
 * @returns {string} Hexadecimal hash of the code
 */
function hashOTP(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Normalize phone number to E.164 format
 * @param {string} phone - Phone number to normalize
 * @returns {string} Normalized phone number
 */
function normalizePhoneNumber(phone) {
  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // Ensure it starts with +
  if (!normalized.startsWith('+')) {
    // Default to Zambia (+260) if no country code provided
    normalized = '+260' + normalized;
  }
  
  return normalized;
}

/**
 * Format phone number for WhatsApp (whatsapp:+1234567890)
 * @param {string} phone - Phone number in E.164 format
 * @returns {string} WhatsApp-formatted number
 */
function formatWhatsAppNumber(phone) {
  const normalized = normalizePhoneNumber(phone);
  return normalized.startsWith('whatsapp:') ? normalized : `whatsapp:${normalized}`;
}

/**
 * Send OTP via SMS or WhatsApp using Twilio
 * 
 * @param {Object} params - Send OTP parameters
 * @param {string} params.phone - Phone number in E.164 format
 * @param {string} params.channel - Channel: 'sms' or 'whatsapp'
 * @param {string} [params.userId] - Optional user ID to associate with OTP
 * @returns {Promise<{ok: boolean, message: string, expiresAt?: Date}>}
 */
async function sendOTP({ phone, channel, userId = null }) {
  const twilioClient = getTwilioClient();
  
  if (!twilioClient) {
    console.error('[OTPService] Twilio not configured');
    return {
      ok: false,
      message: 'SMS/WhatsApp service is not configured',
    };
  }

  // Validate channel
  if (!['sms', 'whatsapp'].includes(channel)) {
    return {
      ok: false,
      message: 'Invalid channel. Must be "sms" or "whatsapp"',
    };
  }

  // Normalize phone number
  const normalizedPhone = normalizePhoneNumber(phone);

  // Generate OTP
  const otpCode = generateOTP();
  const hashedCode = hashOTP(otpCode);

  // Calculate expiration time
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  try {
    // Store OTP in database
    const supabase = getSupabaseClient();
    const { error: dbError } = await supabase
      .from('otp_verifications')
      .insert({
        phone: normalizedPhone,
        channel,
        hashed_code: hashedCode,
        expires_at: expiresAt.toISOString(),
        user_id: userId,
      });

    if (dbError) {
      console.error('[OTPService] Database error:', dbError);
      return {
        ok: false,
        message: 'Failed to store OTP. Please try again.',
      };
    }

    // Prepare message
    const messageBody = `Your Wathaci verification code is ${otpCode}. It expires in ${OTP_EXPIRY_MINUTES} minutes. Do not share this code with anyone.`;

    // Determine sender and recipient
    let fromNumber;
    let toNumber;

    if (channel === 'whatsapp') {
      fromNumber = getTwilioWhatsAppFrom();
      toNumber = formatWhatsAppNumber(normalizedPhone);
      
      if (!fromNumber) {
        console.error('[OTPService] WhatsApp sender not configured');
        return {
          ok: false,
          message: 'WhatsApp service is not configured',
        };
      }
    } else {
      // SMS
      fromNumber = getTwilioPhoneNumber();
      toNumber = normalizedPhone;
      
      if (!fromNumber) {
        console.error('[OTPService] SMS phone number not configured');
        return {
          ok: false,
          message: 'SMS service is not configured',
        };
      }
    }

    // Send message via Twilio
    const message = await twilioClient.messages.create({
      body: messageBody,
      from: fromNumber,
      to: toNumber,
    });

    console.log(`[OTPService] OTP sent successfully via ${channel} to ${normalizedPhone.slice(-4)} (SID: ${message.sid})`);

    return {
      ok: true,
      message: 'OTP sent successfully',
      expiresAt,
    };
  } catch (error) {
    console.error('[OTPService] Error sending OTP:', error.message);
    
    // Don't expose internal Twilio errors to clients
    return {
      ok: false,
      message: 'Failed to send OTP. Please check your phone number and try again.',
    };
  }
}

/**
 * Verify OTP code
 * 
 * @param {Object} params - Verify OTP parameters
 * @param {string} params.phone - Phone number in E.164 format
 * @param {string} params.channel - Channel: 'sms' or 'whatsapp'
 * @param {string} params.code - 6-digit OTP code entered by user
 * @returns {Promise<{ok: boolean, message: string, phoneVerified?: boolean}>}
 */
async function verifyOTP({ phone, channel, code }) {
  // Validate inputs
  if (!phone || !channel || !code) {
    return {
      ok: false,
      message: 'Missing required fields',
    };
  }

  if (!/^\d{6}$/.test(code)) {
    return {
      ok: false,
      message: 'Invalid code format. Must be 6 digits.',
    };
  }

  const normalizedPhone = normalizePhoneNumber(phone);
  const hashedCode = hashOTP(code);

  try {
    const supabase = getSupabaseClient();

    // Find the most recent OTP for this phone/channel combination
    const { data: otpRecords, error: fetchError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone', normalizedPhone)
      .eq('channel', channel)
      .is('verified_at', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('[OTPService] Database error:', fetchError);
      return {
        ok: false,
        message: 'Verification failed. Please try again.',
      };
    }

    if (!otpRecords || otpRecords.length === 0) {
      return {
        ok: false,
        message: 'No OTP found. Please request a new code.',
      };
    }

    const otpRecord = otpRecords[0];

    // Check if expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      return {
        ok: false,
        message: 'OTP has expired. Please request a new code.',
      };
    }

    // Check attempt count
    if (otpRecord.attempt_count >= MAX_ATTEMPTS) {
      return {
        ok: false,
        message: 'Maximum verification attempts exceeded. Please request a new code.',
      };
    }

    // Increment attempt count
    const { error: updateError } = await supabase
      .from('otp_verifications')
      .update({ attempt_count: otpRecord.attempt_count + 1 })
      .eq('id', otpRecord.id);

    if (updateError) {
      console.error('[OTPService] Failed to update attempt count:', updateError);
    }

    // Verify the code
    if (otpRecord.hashed_code !== hashedCode) {
      return {
        ok: false,
        message: 'Invalid verification code.',
      };
    }

    // Mark OTP as verified
    const { error: verifyError } = await supabase
      .from('otp_verifications')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', otpRecord.id);

    if (verifyError) {
      console.error('[OTPService] Failed to mark OTP as verified:', verifyError);
    }

    // Update user profile if user_id is present
    if (otpRecord.user_id) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          phone: normalizedPhone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', otpRecord.user_id);

      if (profileError) {
        console.error('[OTPService] Failed to update profile:', profileError);
      }
    }

    console.log(`[OTPService] OTP verified successfully for ${normalizedPhone.slice(-4)}`);

    return {
      ok: true,
      message: 'OTP verified successfully',
      phoneVerified: true,
    };
  } catch (error) {
    console.error('[OTPService] Error verifying OTP:', error.message);
    return {
      ok: false,
      message: 'Verification failed. Please try again.',
    };
  }
}

module.exports = {
  sendOTP,
  verifyOTP,
  generateOTP,
  hashOTP,
  normalizePhoneNumber,
  formatWhatsAppNumber,
};
