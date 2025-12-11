/**
 * Twilio Client Configuration (Safe / Non-Crashing Version)
 *
 * This module:
 * - Tries to require the 'twilio' package.
 * - If the module is missing, logs a warning and keeps the app running.
 * - If credentials are missing, logs a warning and disables OTP.
 * - If everything is present, exposes a working Twilio client.
 *
 * Required Environment Variables (for real OTP usage):
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 *
 * Optional Environment Variables:
 * - TWILIO_PHONE_NUMBER    (default SMS from number)
 * - TWILIO_WHATSAPP_FROM   (default WhatsApp from number, e.g. "whatsapp:+1415...")
 */

let Twilio = null;

// Try to load the module, but don't crash if it's missing
try {
  Twilio = require('twilio');
} catch (error) {
  console.warn(
    '[TwilioClient] "twilio" module is not installed. OTP via Twilio will be disabled.',
    `Error: ${error.message}`
  );
}

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
  TWILIO_WHATSAPP_FROM,
} = process.env;

let twilioClient = null;

if (!Twilio) {
  // Module isn't installed: we already logged this above.
  twilioClient = null;
} else if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  console.warn(
    '[TwilioClient] Twilio credentials (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN) not configured. OTP via Twilio will be disabled.'
  );
  twilioClient = null;
} else {
  try {
    twilioClient = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    console.log('[TwilioClient] Twilio client initialized successfully');
  } catch (error) {
    console.error(
      '[TwilioClient] Failed to initialize Twilio client:',
      error.message
    );
    twilioClient = null;
  }
}

/**
 * Get the Twilio client instance
 * @returns {import('twilio').Twilio | null} Twilio client or null if not available
 */
function getTwilioClient() {
  return twilioClient;
}

/**
 * Check if Twilio is configured and ready to use
 * @returns {boolean} True if Twilio client is available
 */
function isTwilioConfigured() {
  return !!twilioClient;
}

/**
 * Get the configured Twilio phone number for SMS
 * @returns {string | null} Phone number or null if not configured
 */
function getTwilioPhoneNumber() {
  return TWILIO_PHONE_NUMBER || null;
}

/**
 * Get the configured Twilio WhatsApp sender
 * @returns {string | null} WhatsApp sender or null if not configured
 */
function getTwilioWhatsAppFrom() {
  return TWILIO_WHATSAPP_FROM || null;
}

module.exports = {
  getTwilioClient,
  isTwilioConfigured,
  getTwilioPhoneNumber,
  getTwilioWhatsAppFrom,
};
