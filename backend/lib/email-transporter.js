const nodemailer = require('nodemailer');

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;

  if (typeof value === 'boolean') return value;

  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || process.env.SMTP_TLS_PORT || 465);
const smtpUser = process.env.SMTP_USERNAME || process.env.SMTP_USER;
const smtpPassword = process.env.SMTP_PASSWORD;

const smtpSecure = parseBoolean(process.env.SMTP_SECURE, smtpPort === 465);
const smtpAuthMethod = process.env.SMTP_AUTH_METHOD || 'LOGIN';
const allowSelfSigned = !parseBoolean(process.env.SMTP_REJECT_UNAUTHORIZED, true);
const enableLogging = parseBoolean(process.env.SMTP_LOGGER, true);
const enableDebug = parseBoolean(process.env.SMTP_DEBUG, true);

const missingRequiredFields = [smtpHost, smtpPort, smtpUser, smtpPassword].some(
  value => value === undefined || value === ''
);

let transporter = null;

if (missingRequiredFields) {
  console.warn('[EmailTransporter] SMTP configuration is incomplete. Transporter not initialized.');
} else {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
      method: smtpAuthMethod,
    },
    logger: enableLogging,
    debug: enableDebug,
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    tls: {
      rejectUnauthorized: !allowSelfSigned,
    },
  });

  console.log(
    `[EmailTransporter] Initialized (host=${smtpHost}, port=${smtpPort}, secure=${smtpSecure}, authMethod=${smtpAuthMethod})`
  );
}

async function verifyTransporterConnection() {
  if (!transporter) {
    return {
      ok: false,
      message: 'SMTP transporter is not configured. Please set SMTP_* variables.',
    };
  }

  try {
    const verifyResult = await transporter.verify();
    return {
      ok: true,
      message: 'SMTP connection verified successfully',
      details: verifyResult,
    };
  } catch (error) {
    return {
      ok: false,
      message: error?.message || 'SMTP verification failed',
      error,
    };
  }
}

module.exports = {
  transporter,
  verifyTransporterConnection,
};
