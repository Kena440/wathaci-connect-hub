/**
 * OTP Authentication Routes
 * 
 * Provides endpoints for sending and verifying OTP codes via SMS and WhatsApp.
 * 
 * API Endpoints:
 * 
 * 1. POST /api/auth/otp/send
 *    Send an OTP code to a phone number
 *    Request Body:
 *    {
 *      "phone": "+260971234567",      // Phone number (E.164 format recommended)
 *      "channel": "sms",               // Channel: "sms" or "whatsapp"
 *      "userId": "uuid-optional"       // Optional: Associate OTP with authenticated user
 *    }
 *    Response (Success):
 *    {
 *      "ok": true,
 *      "message": "OTP sent successfully",
 *      "expiresAt": "2024-03-17T10:30:00Z"
 *    }
 * 
 * 2. POST /api/auth/otp/verify
 *    Verify an OTP code
 *    Request Body:
 *    {
 *      "phone": "+260971234567",      // Phone number (same as used in send)
 *      "channel": "sms",               // Channel: "sms" or "whatsapp"
 *      "code": "123456"                // 6-digit OTP code
 *    }
 *    Response (Success):
 *    {
 *      "ok": true,
 *      "message": "OTP verified successfully",
 *      "phoneVerified": true
 *    }
 * 
 * Error Responses:
 * - 400: Invalid request (missing fields, invalid format)
 * - 429: Rate limit exceeded (handled by middleware)
 * - 500: Internal server error
 */

const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { sendOTP, verifyOTP } = require('../services/otp-service');

const router = express.Router();

// Validation schemas
const sendOTPSchema = Joi.object({
  phone: Joi.string().trim().min(10).required()
    .messages({
      'string.empty': 'Phone number is required',
      'string.min': 'Phone number must be at least 10 digits',
      'any.required': 'Phone number is required',
    }),
  channel: Joi.string().valid('sms', 'whatsapp').required()
    .messages({
      'any.only': 'Channel must be either "sms" or "whatsapp"',
      'any.required': 'Channel is required',
    }),
  userId: Joi.string().uuid().optional().allow(null)
    .messages({
      'string.guid': 'User ID must be a valid UUID',
    }),
});

const verifyOTPSchema = Joi.object({
  phone: Joi.string().trim().min(10).required()
    .messages({
      'string.empty': 'Phone number is required',
      'string.min': 'Phone number must be at least 10 digits',
      'any.required': 'Phone number is required',
    }),
  channel: Joi.string().valid('sms', 'whatsapp').required()
    .messages({
      'any.only': 'Channel must be either "sms" or "whatsapp"',
      'any.required': 'Channel is required',
    }),
  code: Joi.string().pattern(/^\d{6}$/).required()
    .messages({
      'string.pattern.base': 'Code must be exactly 6 digits',
      'any.required': 'Verification code is required',
    }),
});

/**
 * POST /api/auth/otp/send
 * Send OTP code via SMS or WhatsApp
 */
router.post('/send', validate(sendOTPSchema), async (req, res) => {
  const { phone, channel, userId } = req.body;

  try {
    const result = await sendOTP({ phone, channel, userId });

    if (!result.ok) {
      return res.status(400).json({
        ok: false,
        error: result.message,
      });
    }

    return res.status(200).json({
      ok: true,
      message: result.message,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error('[OTP Routes] Error in /send:', error);
    return res.status(500).json({
      ok: false,
      error: 'Failed to send OTP. Please try again later.',
    });
  }
});

/**
 * POST /api/auth/otp/verify
 * Verify OTP code
 */
router.post('/verify', validate(verifyOTPSchema), async (req, res) => {
  const { phone, channel, code } = req.body;

  try {
    const result = await verifyOTP({ phone, channel, code });

    if (!result.ok) {
      return res.status(400).json({
        ok: false,
        error: result.message,
      });
    }

    return res.status(200).json({
      ok: true,
      message: result.message,
      phoneVerified: result.phoneVerified,
    });
  } catch (error) {
    console.error('[OTP Routes] Error in /verify:', error);
    return res.status(500).json({
      ok: false,
      error: 'Verification failed. Please try again later.',
    });
  }
});

module.exports = router;
