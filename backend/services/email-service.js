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

module.exports = {
  sendEmail,
  verifyEmailTransport,
  defaultFromEmail,
  defaultReplyTo,
  emailProvider: process.env.EMAIL_PROVIDER || 'SMTP',
  smtpSecure: parseBoolean(process.env.SMTP_SECURE, process.env.SMTP_PORT === '465'),
};
