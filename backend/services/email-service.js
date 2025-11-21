const { transporter, verifyTransporterConnection } = require('../lib/email-transporter');
const { getSupabaseClient, isSupabaseConfigured } = require('../lib/supabaseAdmin');

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

const defaultFromEmail =
  process.env.FROM_EMAIL ||
  process.env.SMTP_FROM_EMAIL ||
  process.env.SMTP_USER ||
  process.env.SMTP_USERNAME ||
  'support@wathaci.com';

const defaultFromName = process.env.SMTP_FROM_NAME || 'Wathaci';

const defaultReplyTo =
  process.env.REPLY_TO_EMAIL ||
  process.env.SMTP_REPLY_TO ||
  defaultFromEmail;

/**
 * Persist email delivery attempt to the email_logs table if configured.
 */
async function persistLog({ email, template, status, error, messageId, envelope, metadata }) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseClient();
  try {
    const { error: dbError } = await supabase.from('email_logs').insert({
      email,
      template,
      status,
      error,
      message_id: messageId,
      envelope,
      metadata,
      created_at: new Date().toISOString(),
    });

    if (dbError) {
      console.warn('[EmailService] Failed to persist email log:', dbError.message);
    }
  } catch (dbError) {
    console.warn('[EmailService] Unexpected error persisting email log:', dbError.message);
  }
}

/**
 * Send an email using the shared SMTP transporter.
 */
async function sendEmail({ to, subject, html, text, cc, bcc, template = 'custom', metadata = {} }) {
  if (!transporter) {
    const message = 'SMTP transporter is not configured. Set SMTP_* variables to enable email sending.';
    console.error('[EmailService] ' + message);
    return { ok: false, message };
  }

  const from = `${defaultFromName} <${defaultFromEmail}>`;
  const replyTo = metadata.replyTo || defaultReplyTo;

  const mailOptions = {
    from,
    to,
    subject,
    html,
    text,
    cc,
    bcc,
    replyTo,
    envelope: {
      from: defaultFromEmail,
      to,
    },
  };

  try {
    const info = await transporter.sendMail(mailOptions);

    await persistLog({
      email: to,
      template,
      status: 'sent',
      messageId: info.messageId,
      envelope: info.envelope,
      metadata,
    });

    console.log('[EmailService] Email sent', {
      to,
      messageId: info.messageId,
      response: info.response,
      envelope: info.envelope,
    });

    return {
      ok: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
      response: info.response,
      envelope: info.envelope,
    };
  } catch (error) {
    console.error('[EmailService] Failed to send email', {
      to,
      subject,
      error: error?.message,
    });

    await persistLog({
      email: to,
      template,
      status: 'failed',
      error: error?.message,
      metadata,
    });

    return {
      ok: false,
      message: error?.message || 'Failed to send email',
    };
  }
}

/**
 * Verify the SMTP transporter connection, exposing a normalized response.
 */
async function verifyEmailTransport() {
  const result = await verifyTransporterConnection();

  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      error: result.error,
    };
  }

  return {
    ok: true,
    message: result.message,
    details: result.details,
  };
}

/**
 * Send OTP verification email
 * @param {Object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.otpCode - OTP code to send
 * @param {number} [params.expiryMinutes=10] - OTP expiry time in minutes
 */
async function sendOTPEmail({ to, otpCode, expiryMinutes = 10 }) {
  const subject = 'Your Wathaci Verification Code';
  
  const text = `Your Wathaci verification code is ${otpCode}. It expires in ${expiryMinutes} minutes. Do not share this code with anyone.

If you did not request this code, please ignore this email.

Need help? Contact us at ${defaultReplyTo}`;

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
    <p>Need help? Contact us at <a href="mailto:${defaultReplyTo}" style="color: #0066cc;">${defaultReplyTo}</a></p>
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
 * @param {Object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.verificationUrl - Verification URL
 * @param {string} [params.userName=''] - User's name
 */
async function sendVerificationEmail({ to, verificationUrl, userName = '' }) {
  const subject = 'Verify Your Wathaci Email Address';
  const greeting = userName ? `Hi ${userName}` : 'Hello';
  
  const text = `${greeting},

Thank you for signing up with Wathaci! Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours.

If you did not create a Wathaci account, please ignore this email.

Need help? Contact us at ${defaultReplyTo}`;

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
    <h1 style="color: #2c3e50; margin: 0 0 10px 0;">Verify Your Email</h1>
  </div>
  
  <div style="background-color: #ffffff; padding: 30px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <p>${greeting},</p>
    
    <p>Thank you for signing up with Wathaci! To complete your registration, please verify your email address by clicking the button below:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" style="display: inline-block; padding: 15px 30px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email Address</a>
    </div>
    
    <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #0066cc; font-size: 14px;">${verificationUrl}</p>
    
    <p style="color: #666; font-size: 14px; margin-top: 20px;">This link will expire in 24 hours.</p>
    
    <p style="color: #666; font-size: 14px;">If you did not create a Wathaci account, please ignore this email.</p>
  </div>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center;">
    <p>Need help? Contact us at <a href="mailto:${defaultReplyTo}" style="color: #0066cc;">${defaultReplyTo}</a></p>
    <p>&copy; ${new Date().getFullYear()} Wathaci. All rights reserved.</p>
  </div>
</body>
</html>`;

  return sendEmail({
    to,
    subject,
    text,
    html,
    template: 'verification',
    metadata: {
      userName,
      verificationUrl,
    },
  });
}

/**
 * Send password reset email
 * @param {Object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.resetUrl - Password reset URL
 * @param {string} [params.userName=''] - User's name
 */
async function sendPasswordResetEmail({ to, resetUrl, userName = '' }) {
  const subject = 'Reset Your Wathaci Password';
  const greeting = userName ? `Hi ${userName}` : 'Hello';
  
  const text = `${greeting},

We received a request to reset your Wathaci password. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour.

If you did not request a password reset, please ignore this email and your password will remain unchanged.

Need help? Contact us at ${defaultReplyTo}`;

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
    <p>${greeting},</p>
    
    <p>We received a request to reset your Wathaci password. Click the button below to create a new password:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="display: inline-block; padding: 15px 30px; background-color: #dc3545; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
    </div>
    
    <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #0066cc; font-size: 14px;">${resetUrl}</p>
    
    <p style="color: #666; font-size: 14px; margin-top: 20px;">This link will expire in 1 hour.</p>
    
    <p style="color: #666; font-size: 14px;">If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
  </div>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center;">
    <p>Need help? Contact us at <a href="mailto:${defaultReplyTo}" style="color: #0066cc;">${defaultReplyTo}</a></p>
    <p>&copy; ${new Date().getFullYear()} Wathaci. All rights reserved.</p>
  </div>
</body>
</html>`;

  return sendEmail({
    to,
    subject,
    text,
    html,
    template: 'password-reset',
    metadata: {
      userName,
      resetUrl,
    },
  });
}

/**
 * Check if email is configured
 */
function isEmailConfigured() {
  return transporter !== null;
}

/**
 * Get email configuration status
 */
function getConfigStatus() {
  return {
    configured: transporter !== null,
    host: process.env.SMTP_HOST || null,
    port: process.env.SMTP_PORT || null,
    secure: parseBoolean(process.env.SMTP_SECURE, process.env.SMTP_PORT === '465'),
    from: defaultFromEmail,
  };
}

module.exports = {
  sendEmail,
  sendOTPEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  verifyEmailTransport,
  verifyConnection: verifyEmailTransport, // Alias for backward compatibility
  isEmailConfigured,
  getConfigStatus,
  defaultFromEmail,
  defaultReplyTo,
  emailProvider: process.env.EMAIL_PROVIDER || 'SMTP',
  smtpSecure: parseBoolean(process.env.SMTP_SECURE, process.env.SMTP_PORT === '465'),
};
