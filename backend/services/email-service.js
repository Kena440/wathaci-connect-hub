/**
 * Email Service - SMTP Email Delivery
 * 
 * This service provides centralized email sending functionality using Nodemailer.
 * It supports transactional emails including:
 * - Email verification
 * - OTP delivery
 * - Password reset
 * - System notifications
 * - Admin alerts
 * 
 * Features:
 * - Secure SMTP connection (SSL/TLS)
 * - HTML and plain text email support
 * - Email logging and tracking
 * - Connection verification
 * - Debug logging support
 * - Retry handling
 * 
 * Environment Variables Required:
 * - SMTP_HOST: SMTP server hostname
 * - SMTP_PORT: SMTP server port (465 or 587)
 * - SMTP_SECURE: true for port 465, false for port 587
 * - SMTP_USERNAME: SMTP authentication username
 * - SMTP_PASSWORD: SMTP authentication password
 * - FROM_EMAIL: Default sender email address
 * - FROM_NAME: Default sender name (optional)
 * - REPLY_TO_EMAIL: Reply-to email address (optional)
 */

const nodemailer = require('nodemailer');
const { getSupabaseClient } = require('../lib/supabaseAdmin');

// Email configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USERNAME = process.env.SMTP_USERNAME || '';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';
const FROM_EMAIL = process.env.FROM_EMAIL || process.env.SUPPORT_EMAIL || 'support@wathaci.com';
const FROM_NAME = process.env.FROM_NAME || 'Wathaci';
const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || FROM_EMAIL;
const EMAIL_DEBUG = process.env.EMAIL_DEBUG === 'true';

// Validate configuration
let configurationValid = true;
let configurationErrors = [];

if (!SMTP_HOST) {
  configurationErrors.push('SMTP_HOST is not configured');
  configurationValid = false;
}

if (!SMTP_USERNAME) {
  configurationErrors.push('SMTP_USERNAME is not configured');
  configurationValid = false;
}

if (!SMTP_PASSWORD) {
  configurationErrors.push('SMTP_PASSWORD is not configured');
  configurationValid = false;
}

if (!configurationValid) {
  console.warn('[EmailService] SMTP configuration incomplete:');
  configurationErrors.forEach(error => console.warn(`  - ${error}`));
  console.warn('[EmailService] Email functionality will be disabled until configuration is complete.');
}

// Create transporter (null if not configured)
let transporter = null;

if (configurationValid) {
  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USERNAME,
        pass: SMTP_PASSWORD,
      },
      tls: {
        // Allow self-signed certificates in development
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
      debug: EMAIL_DEBUG,
      logger: EMAIL_DEBUG,
    });

    console.log('[EmailService] SMTP transporter created successfully');
    console.log(`[EmailService] Host: ${SMTP_HOST}:${SMTP_PORT} (secure: ${SMTP_SECURE})`);
  } catch (error) {
    console.error('[EmailService] Failed to create transporter:', error.message);
    transporter = null;
  }
}

/**
 * Verify SMTP connection
 * 
 * @returns {Promise<{ok: boolean, message: string, details?: object}>}
 */
async function verifyConnection() {
  if (!transporter) {
    return {
      ok: false,
      message: 'Email service is not configured',
      details: {
        errors: configurationErrors,
      },
    };
  }

  try {
    await transporter.verify();
    console.log('[EmailService] SMTP connection verified successfully');
    return {
      ok: true,
      message: 'SMTP connection verified successfully',
      details: {
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        from: FROM_EMAIL,
      },
    };
  } catch (error) {
    console.error('[EmailService] SMTP verification failed:', error.message);
    return {
      ok: false,
      message: 'SMTP connection verification failed',
      details: {
        error: error.message,
        host: SMTP_HOST,
        port: SMTP_PORT,
      },
    };
  }
}

/**
 * Log email send attempt to database
 * 
 * @param {Object} logData - Email log data
 * @param {string} logData.email - Recipient email address
 * @param {string} logData.template - Email template/type identifier
 * @param {string} logData.status - Status: 'sent', 'failed', 'pending'
 * @param {string} [logData.error] - Error message if failed
 * @param {string} [logData.messageId] - SMTP message ID if sent
 * @param {object} [logData.metadata] - Additional metadata
 * @returns {Promise<void>}
 */
async function logEmail(logData) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('[EmailService] Cannot log email: Supabase not configured');
      return;
    }

    const { error } = await supabase
      .from('email_logs')
      .insert({
        recipient_email: logData.email,
        template_type: logData.template,
        status: logData.status,
        error_message: logData.error || null,
        message_id: logData.messageId || null,
        metadata: logData.metadata || {},
        sent_at: logData.status === 'sent' ? new Date().toISOString() : null,
      });

    if (error) {
      console.error('[EmailService] Failed to log email:', error.message);
    }
  } catch (error) {
    console.error('[EmailService] Error logging email:', error.message);
  }
}

/**
 * Send email using SMTP
 * 
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address(es)
 * @param {string} options.subject - Email subject
 * @param {string} [options.text] - Plain text content
 * @param {string} [options.html] - HTML content
 * @param {string} [options.from] - Sender email (defaults to FROM_EMAIL)
 * @param {string} [options.fromName] - Sender name (defaults to FROM_NAME)
 * @param {string} [options.replyTo] - Reply-to address (defaults to REPLY_TO_EMAIL)
 * @param {string} [options.template] - Template identifier for logging
 * @param {object} [options.metadata] - Additional metadata for logging
 * @returns {Promise<{ok: boolean, message: string, messageId?: string, error?: string}>}
 */
async function sendEmail(options) {
  const {
    to,
    subject,
    text,
    html,
    from = FROM_EMAIL,
    fromName = FROM_NAME,
    replyTo = REPLY_TO_EMAIL,
    template = 'generic',
    metadata = {},
  } = options;

  // Validate inputs
  if (!to) {
    return {
      ok: false,
      message: 'Recipient email address is required',
    };
  }

  if (!subject) {
    return {
      ok: false,
      message: 'Email subject is required',
    };
  }

  if (!text && !html) {
    return {
      ok: false,
      message: 'Email content (text or html) is required',
    };
  }

  if (!transporter) {
    await logEmail({
      email: to,
      template,
      status: 'failed',
      error: 'Email service not configured',
      metadata,
    });

    return {
      ok: false,
      message: 'Email service is not configured',
      error: 'SMTP transporter not initialized',
    };
  }

  try {
    // Prepare mail options
    const mailOptions = {
      from: fromName ? `"${fromName}" <${from}>` : from,
      to,
      subject,
      text,
      html,
      replyTo,
    };

    // Send email
    console.log(`[EmailService] Sending email to ${to} (template: ${template})`);
    const info = await transporter.sendMail(mailOptions);

    console.log(`[EmailService] Email sent successfully. Message ID: ${info.messageId}`);

    // Log success
    await logEmail({
      email: to,
      template,
      status: 'sent',
      messageId: info.messageId,
      metadata: {
        ...metadata,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected,
      },
    });

    return {
      ok: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
      envelope: info.envelope,
      response: info.response,
    };
  } catch (error) {
    console.error('[EmailService] Failed to send email:', error.message);

    // Log failure
    await logEmail({
      email: to,
      template,
      status: 'failed',
      error: error.message,
      metadata,
    });

    return {
      ok: false,
      message: 'Failed to send email',
      error: error.message,
    };
  }
}

/**
 * Send OTP email
 * 
 * @param {Object} options - OTP email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.otpCode - The OTP code to send
 * @param {number} [options.expiryMinutes=10] - OTP expiry time in minutes
 * @returns {Promise<{ok: boolean, message: string, messageId?: string}>}
 */
async function sendOTPEmail({ to, otpCode, expiryMinutes = 10 }) {
  const subject = 'Your Wathaci Verification Code';
  
  const text = `Your Wathaci verification code is ${otpCode}. It expires in ${expiryMinutes} minutes. Do not share this code with anyone.

If you did not request this code, please ignore this email.

Need help? Contact us at ${REPLY_TO_EMAIL}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Code</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
    <h1 style="color: #2c3e50; margin: 0 0 10px 0;">Verification Code</h1>
  </div>
  
  <div style="background-color: #ffffff; padding: 30px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <p>Your Wathaci verification code is:</p>
    
    <div style="background-color: #f0f7ff; border: 2px solid #0066cc; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
      <h2 style="margin: 0; color: #0066cc; font-size: 32px; letter-spacing: 8px;">${otpCode}</h2>
    </div>
    
    <p style="color: #666; font-size: 14px;">This code expires in <strong>${expiryMinutes} minutes</strong>.</p>
    
    <p style="color: #666; font-size: 14px;">Do not share this code with anyone. If you did not request this code, please ignore this email.</p>
  </div>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center;">
    <p>Need help? Contact us at <a href="mailto:${REPLY_TO_EMAIL}" style="color: #0066cc;">${REPLY_TO_EMAIL}</a></p>
    <p>&copy; ${new Date().getFullYear()} Wathaci. All rights reserved.</p>
  </div>
</body>
</html>`;

  return sendEmail({
    to,
    subject,
    text,
    html,
    template: 'otp',
    metadata: {
      otpLength: otpCode.length,
      expiryMinutes,
    },
  });
}

/**
 * Send email verification email
 * 
 * @param {Object} options - Verification email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.verificationUrl - URL for email verification
 * @param {string} [options.userName] - User's name (optional)
 * @returns {Promise<{ok: boolean, message: string, messageId?: string}>}
 */
async function sendVerificationEmail({ to, verificationUrl, userName = '' }) {
  const subject = 'Verify Your Wathaci Email Address';
  
  const greeting = userName ? `Hello ${userName},` : 'Hello,';
  
  const text = `${greeting}

Thank you for signing up with Wathaci!

Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours.

If you did not create an account, please ignore this email.

Need help? Contact us at ${REPLY_TO_EMAIL}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
    <h1 style="color: #2c3e50; margin: 0 0 10px 0;">Welcome to Wathaci!</h1>
  </div>
  
  <div style="background-color: #ffffff; padding: 30px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <p>${greeting}</p>
    
    <p>Thank you for signing up with Wathaci! To complete your registration, please verify your email address.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" style="display: inline-block; background-color: #0066cc; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold;">Verify Email Address</a>
    </div>
    
    <p style="color: #666; font-size: 14px;">Or copy and paste this URL into your browser:</p>
    <p style="color: #0066cc; font-size: 12px; word-break: break-all;">${verificationUrl}</p>
    
    <p style="color: #666; font-size: 14px; margin-top: 20px;">This link will expire in 24 hours.</p>
    
    <p style="color: #666; font-size: 14px;">If you did not create an account, please ignore this email.</p>
  </div>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center;">
    <p>Need help? Contact us at <a href="mailto:${REPLY_TO_EMAIL}" style="color: #0066cc;">${REPLY_TO_EMAIL}</a></p>
    <p>&copy; ${new Date().getFullYear()} Wathaci. All rights reserved.</p>
  </div>
</body>
</html>`;

  return sendEmail({
    to,
    subject,
    text,
    html,
    template: 'email_verification',
    metadata: {
      userName: userName || 'unknown',
    },
  });
}

/**
 * Send password reset email
 * 
 * @param {Object} options - Password reset email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.resetUrl - URL for password reset
 * @param {string} [options.userName] - User's name (optional)
 * @returns {Promise<{ok: boolean, message: string, messageId?: string}>}
 */
async function sendPasswordResetEmail({ to, resetUrl, userName = '' }) {
  const subject = 'Reset Your Wathaci Password';
  
  const greeting = userName ? `Hello ${userName},` : 'Hello,';
  
  const text = `${greeting}

We received a request to reset your Wathaci password.

Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour.

If you did not request a password reset, please ignore this email or contact us if you have concerns.

Need help? Contact us at ${REPLY_TO_EMAIL}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
    <h1 style="color: #2c3e50; margin: 0 0 10px 0;">Reset Your Password</h1>
  </div>
  
  <div style="background-color: #ffffff; padding: 30px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <p>${greeting}</p>
    
    <p>We received a request to reset your Wathaci password.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="display: inline-block; background-color: #0066cc; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold;">Reset Password</a>
    </div>
    
    <p style="color: #666; font-size: 14px;">Or copy and paste this URL into your browser:</p>
    <p style="color: #0066cc; font-size: 12px; word-break: break-all;">${resetUrl}</p>
    
    <p style="color: #666; font-size: 14px; margin-top: 20px;">This link will expire in 1 hour.</p>
    
    <p style="color: #666; font-size: 14px;">If you did not request a password reset, please ignore this email or contact us if you have concerns.</p>
  </div>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center;">
    <p>Need help? Contact us at <a href="mailto:${REPLY_TO_EMAIL}" style="color: #0066cc;">${REPLY_TO_EMAIL}</a></p>
    <p>&copy; ${new Date().getFullYear()} Wathaci. All rights reserved.</p>
  </div>
</body>
</html>`;

  return sendEmail({
    to,
    subject,
    text,
    html,
    template: 'password_reset',
    metadata: {
      userName: userName || 'unknown',
    },
  });
}

/**
 * Check if email service is configured and ready
 * 
 * @returns {boolean}
 */
function isEmailConfigured() {
  return configurationValid && transporter !== null;
}

/**
 * Get email service configuration status
 * 
 * @returns {Object} Configuration status
 */
function getConfigStatus() {
  return {
    configured: configurationValid,
    host: SMTP_HOST || 'not set',
    port: SMTP_PORT || 'not set',
    secure: SMTP_SECURE,
    from: FROM_EMAIL || 'not set',
    errors: configurationErrors,
  };
}

module.exports = {
  sendEmail,
  sendOTPEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  verifyConnection,
  isEmailConfigured,
  getConfigStatus,
  logEmail,
};
