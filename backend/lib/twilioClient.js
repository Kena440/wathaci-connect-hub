/**
 * Twilio Client Configuration
 * 
 * Initializes and exports a Twilio client for sending SMS and WhatsApp messages.
 * 
 * Required Environment Variables:
 * - TWILIO_ACCOUNT_SID: Your Twilio Account SID
 * - TWILIO_AUTH_TOKEN: Your Twilio Auth Token
 * 
 * Optional Environment Variables:
 * - TWILIO_PHONE_NUMBER: Your Twilio phone number for SMS (E.164 format)
 * - TWILIO_WHATSAPP_FROM: Your Twilio WhatsApp-enabled number (format: whatsapp:+1234567890)
 */

const Twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Initialize Twilio client if credentials are available
let twilioClient = null;

if (accountSid && authToken) {
  try {
    twilioClient = Twilio(accountSid, authToken);
    console.log('[TwilioClient] Twilio client initialized successfully');
  } catch (error) {
    console.error('[TwilioClient] Failed to initialize Twilio client:', error.message);
  }
} else {
  console.warn('[TwilioClient] Twilio credentials not configured. OTP functionality will not be available.');
}

/**
 * Get the Twilio client instance
 * @returns {import('twilio').Twilio | null} Twilio client or null if not configured
 */
function getTwilioClient() {
  return twilioClient;
}

/**
 * Check if Twilio is configured and ready to use
 * @returns {boolean} True if Twilio client is available
 */
function isTwilioConfigured() {
  return twilioClient !== null;
}

/**
 * Get the configured Twilio phone number for SMS
 * @returns {string | null} Phone number or null if not configured
 */
function getTwilioPhoneNumber() {
  return process.env.TWILIO_PHONE_NUMBER || null;
}

/**
 * Get the configured Twilio WhatsApp sender
 * @returns {string | null} WhatsApp sender or null if not configured
 */
function getTwilioWhatsAppFrom() {
  return process.env.TWILIO_WHATSAPP_FROM || null;
}

module.exports = {
  getTwilioClient,
  isTwilioConfigured,
  getTwilioPhoneNumber,
  getTwilioWhatsAppFrom,
};
