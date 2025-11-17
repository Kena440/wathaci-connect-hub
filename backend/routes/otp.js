const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { sendOtp, verifyOtp } = require('../services/otp-service');
const { MAX_ATTEMPTS } = require('../services/otp-store');

const router = express.Router();

const sendSchema = Joi.object({
  phone: Joi.string().trim().min(5).required(),
  channel: Joi.string().valid('sms', 'whatsapp').default('sms'),
});

const verifySchema = Joi.object({
  phone: Joi.string().trim().min(5).required(),
  channel: Joi.string().valid('sms', 'whatsapp').default('sms'),
  code: Joi.string()
    .trim()
    .pattern(/^\d{6}$/)
    .required()
    .messages({ 'string.pattern.base': 'Code must be a 6-digit number' }),
});

router.post('/send', validate(sendSchema), async (req, res) => {
  const { phone, channel } = req.body;

  try {
    await sendOtp({ phone, channel });
    return res.json({ ok: true, message: 'OTP sent successfully.' });
  } catch (error) {
    console.error('[routes/otp] Failed to send OTP', { message: error?.message, status: error?.status });
    return res.status(500).json({ ok: false, error: 'Failed to send verification code.' });
  }
});

router.post('/verify', validate(verifySchema), async (req, res) => {
  const { phone, channel, code } = req.body;

  try {
    const result = await verifyOtp({ phone, channel, code });

    if (!result.ok) {
      const status = result.reason === 'locked' ? 429 : 400;
      return res.status(status).json({ ok: false, error: 'Invalid or expired code.' });
    }

    return res.json({
      ok: true,
      message: 'OTP verified.',
      result: {
        phone_verified: Boolean(result.verification?.updated),
        reason: result.verification?.reason,
        max_attempts: MAX_ATTEMPTS,
      },
    });
  } catch (error) {
    console.error('[routes/otp] Verification error', { message: error?.message, status: error?.status });
    return res.status(500).json({ ok: false, error: 'Unable to verify code at this time.' });
  }
});

module.exports = router;
