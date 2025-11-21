const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const {
  sendEmail,
  sendOTPEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  verifyEmailTransport,
  isEmailConfigured,
  getConfigStatus,
  defaultFromEmail,
  defaultReplyTo,
  emailProvider,
  smtpSecure,
} = require('../services/email-service');

const router = express.Router();

// Validation schemas
const sendEmailSchema = Joi.object({
  to: Joi.string().email().required(),
  subject: Joi.string().min(3).required(),
  html: Joi.string().optional().allow('', null),
  text: Joi.string().optional().allow('', null),
  cc: Joi.string().email().optional(),
  bcc: Joi.string().email().optional(),
  template: Joi.string().optional(),
});

const sendOTPEmailSchema = Joi.object({
  to: Joi.string().email().required(),
  otpCode: Joi.string().required(),
  expiryMinutes: Joi.number().integer().min(1).max(60).optional(),
});

const sendVerificationEmailSchema = Joi.object({
  to: Joi.string().email().required(),
  verificationUrl: Joi.string().uri().required(),
  userName: Joi.string().optional().allow(''),
});

const sendPasswordResetEmailSchema = Joi.object({
  to: Joi.string().email().required(),
  resetUrl: Joi.string().uri().required(),
  userName: Joi.string().optional().allow(''),
});

// Test SMTP connection - Legacy endpoint
router.get('/test', async (req, res) => {
  const result = await verifyEmailTransport();
  
  if (!result.ok) {
    return res.status(500).json({
      ok: false,
      message: result.message,
      error: result.error,
    });
  }
  
  return res.status(200).json({
    ok: true,
    message: result.message,
    details: result.details,
  });
});

// Get email configuration status
router.get('/status', (req, res) => {
  const status = getConfigStatus();
  res.status(200).json(status);
});

// Verify SMTP connection - New endpoint
router.get('/verify', async (_req, res) => {
  const result = await verifyEmailTransport();

  if (!result.ok) {
    return res.status(500).json({
      ok: false,
      error: result.message,
    });
  }

  return res.status(200).json({
    ok: true,
    message: result.message,
    details: result.details,
    config: {
      provider: emailProvider,
      from: defaultFromEmail,
      replyTo: defaultReplyTo,
      secure: smtpSecure,
    },
  });
});

// Send generic email
router.post('/send', validate(sendEmailSchema), async (req, res) => {
  const { to, subject, html, text, cc, bcc, template } = req.body;

  const result = await sendEmail({
    to,
    subject,
    html: html || text,
    text: text || html,
    cc,
    bcc,
    template: template || 'custom',
    metadata: { route: 'send' },
  });

  if (!result.ok) {
    return res.status(500).json({
      ok: false,
      error: result.message,
    });
  }

  return res.status(200).json({
    ok: true,
    message: result.message,
    messageId: result.messageId,
    envelope: result.envelope,
  });
});

// Send test email
router.post('/send-test', validate(sendEmailSchema), async (req, res) => {
  const { to, subject, html, text, cc, bcc, template } = req.body;

  const result = await sendEmail({
    to,
    subject,
    html: html || text,
    text: text || html,
    cc,
    bcc,
    template: template || 'manual-test',
    metadata: { route: 'send-test' },
  });

  if (!result.ok) {
    return res.status(500).json({
      ok: false,
      error: result.message,
    });
  }

  return res.status(200).json({
    ok: true,
    message: result.message,
    messageId: result.messageId,
    envelope: result.envelope,
  });
});

// Send OTP email
router.post('/send-otp', validate(sendOTPEmailSchema), async (req, res) => {
  const { to, otpCode, expiryMinutes } = req.body;

  const result = await sendOTPEmail({ to, otpCode, expiryMinutes });

  if (!result.ok) {
    return res.status(500).json({
      ok: false,
      error: result.message,
    });
  }

  return res.status(200).json({
    ok: true,
    message: result.message,
    messageId: result.messageId,
  });
});

// Send verification email
router.post('/send-verification', validate(sendVerificationEmailSchema), async (req, res) => {
  const { to, verificationUrl, userName } = req.body;

  const result = await sendVerificationEmail({ to, verificationUrl, userName });

  if (!result.ok) {
    return res.status(500).json({
      ok: false,
      error: result.message,
    });
  }

  return res.status(200).json({
    ok: true,
    message: result.message,
    messageId: result.messageId,
  });
});

// Send password reset email
router.post('/send-password-reset', validate(sendPasswordResetEmailSchema), async (req, res) => {
  const { to, resetUrl, userName } = req.body;

  const result = await sendPasswordResetEmail({ to, resetUrl, userName });

  if (!result.ok) {
    return res.status(500).json({
      ok: false,
      error: result.message,
    });
  }

  return res.status(200).json({
    ok: true,
    message: result.message,
    messageId: result.messageId,
  });
});

module.exports = router;
