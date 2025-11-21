const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { sendEmail, verifyEmailTransport, defaultFromEmail, defaultReplyTo, emailProvider, smtpSecure } = require('../services/email-service');

const router = express.Router();

const sendEmailSchema = Joi.object({
  to: Joi.string().email().required(),
  subject: Joi.string().min(3).required(),
  html: Joi.string().optional().allow('', null),
  text: Joi.string().optional().allow('', null),
  cc: Joi.string().email().optional(),
  bcc: Joi.string().email().optional(),
  template: Joi.string().optional(),
});

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

module.exports = router;
