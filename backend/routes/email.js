/**
 * Email Routes
 * 
 * Provides endpoints for sending emails and testing email configuration.
 * 
 * API Endpoints:
 * 
 * 1. GET /api/email/test
 *    Test SMTP connection and verify configuration
 *    Response (Success):
 *    {
 *      "ok": true,
 *      "message": "SMTP connection verified successfully",
 *      "details": { host, port, secure, from }
 *    }
 * 
 * 2. GET /api/email/status
 *    Get email service configuration status
 *    Response:
 *    {
 *      "configured": true,
 *      "host": "mail.privateemail.com",
 *      "port": 465,
 *      "secure": true,
 *      "from": "support@wathaci.com"
 *    }
 * 
 * 3. POST /api/email/send
 *    Send a generic email
 *    Request Body:
 *    {
 *      "to": "user@example.com",
 *      "subject": "Email Subject",
 *      "text": "Plain text content",
 *      "html": "<p>HTML content</p>",  // optional
 *      "template": "custom"             // optional, for logging
 *    }
 * 
 * 4. POST /api/email/send-otp
 *    Send OTP verification email
 *    Request Body:
 *    {
 *      "to": "user@example.com",
 *      "otpCode": "123456",
 *      "expiryMinutes": 10  // optional, defaults to 10
 *    }
 * 
 * 5. POST /api/email/send-verification
 *    Send email verification email
 *    Request Body:
 *    {
 *      "to": "user@example.com",
 *      "verificationUrl": "https://...",
 *      "userName": "John Doe"  // optional
 *    }
 * 
 * 6. POST /api/email/send-password-reset
 *    Send password reset email
 *    Request Body:
 *    {
 *      "to": "user@example.com",
 *      "resetUrl": "https://...",
 *      "userName": "John Doe"  // optional
 *    }
 */

const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  sendEmail,
  sendOTPEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  verifyConnection,
  isEmailConfigured,
  getConfigStatus,
} = require('../services/email-service');

const router = express.Router();

// Validation schemas
const sendEmailSchema = Joi.object({
  to: Joi.string().email().required()
    .messages({
      'string.email': 'Valid email address is required',
      'any.required': 'Recipient email is required',
    }),
  subject: Joi.string().min(1).max(200).required()
    .messages({
      'string.empty': 'Email subject is required',
      'string.max': 'Subject must not exceed 200 characters',
      'any.required': 'Email subject is required',
    }),
  text: Joi.string().min(1).optional()
    .messages({
      'string.empty': 'Text content cannot be empty',
    }),
  html: Joi.string().min(1).optional()
    .messages({
      'string.empty': 'HTML content cannot be empty',
    }),
  template: Joi.string().optional(),
}).or('text', 'html')
  .messages({
    'object.missing': 'Either text or html content must be provided',
  });

const sendOTPEmailSchema = Joi.object({
  to: Joi.string().email().required()
    .messages({
      'string.email': 'Valid email address is required',
      'any.required': 'Recipient email is required',
    }),
  otpCode: Joi.string().pattern(/^\d{6}$/).required()
    .messages({
      'string.pattern.base': 'OTP code must be exactly 6 digits',
      'any.required': 'OTP code is required',
    }),
  expiryMinutes: Joi.number().integer().min(1).max(60).optional(),
});

const sendVerificationEmailSchema = Joi.object({
  to: Joi.string().email().required()
    .messages({
      'string.email': 'Valid email address is required',
      'any.required': 'Recipient email is required',
    }),
  verificationUrl: Joi.string().uri().required()
    .messages({
      'string.uri': 'Valid verification URL is required',
      'any.required': 'Verification URL is required',
    }),
  userName: Joi.string().optional(),
});

const sendPasswordResetEmailSchema = Joi.object({
  to: Joi.string().email().required()
    .messages({
      'string.email': 'Valid email address is required',
      'any.required': 'Recipient email is required',
    }),
  resetUrl: Joi.string().uri().required()
    .messages({
      'string.uri': 'Valid reset URL is required',
      'any.required': 'Reset URL is required',
    }),
  userName: Joi.string().optional(),
});

/**
 * GET /api/email/test
 * Test SMTP connection and verify configuration
 */
router.get('/test', asyncHandler(async (req, res) => {
  const result = await verifyConnection();
  
  if (!result.ok) {
    return res.status(500).json({
      success: false,
      error: result.message,
      details: result.details,
    });
  }
  
  return res.status(200).json({
    success: true,
    message: result.message,
    details: result.details,
  });
}));

/**
 * GET /api/email/status
 * Get email service configuration status
 */
router.get('/status', asyncHandler(async (req, res) => {
  const status = getConfigStatus();
  
  return res.status(200).json({
    success: true,
    ...status,
  });
}));

/**
 * POST /api/email/send
 * Send a generic email
 */
router.post('/send', validate(sendEmailSchema), asyncHandler(async (req, res) => {
  const { to, subject, text, html, template } = req.body;
  
  if (!isEmailConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'Email service is not configured',
    });
  }
  
  const result = await sendEmail({
    to,
    subject,
    text,
    html,
    template: template || 'generic',
  });
  
  if (!result.ok) {
    return res.status(500).json({
      success: false,
      error: result.message,
    });
  }
  
  return res.status(200).json({
    success: true,
    message: result.message,
    messageId: result.messageId,
  });
}));

/**
 * POST /api/email/send-otp
 * Send OTP verification email
 */
router.post('/send-otp', validate(sendOTPEmailSchema), asyncHandler(async (req, res) => {
  const { to, otpCode, expiryMinutes } = req.body;
  
  if (!isEmailConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'Email service is not configured',
    });
  }
  
  const result = await sendOTPEmail({
    to,
    otpCode,
    expiryMinutes,
  });
  
  if (!result.ok) {
    return res.status(500).json({
      success: false,
      error: result.message,
    });
  }
  
  return res.status(200).json({
    success: true,
    message: result.message,
    messageId: result.messageId,
  });
}));

/**
 * POST /api/email/send-verification
 * Send email verification email
 */
router.post('/send-verification', validate(sendVerificationEmailSchema), asyncHandler(async (req, res) => {
  const { to, verificationUrl, userName } = req.body;
  
  if (!isEmailConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'Email service is not configured',
    });
  }
  
  const result = await sendVerificationEmail({
    to,
    verificationUrl,
    userName,
  });
  
  if (!result.ok) {
    return res.status(500).json({
      success: false,
      error: result.message,
    });
  }
  
  return res.status(200).json({
    success: true,
    message: result.message,
    messageId: result.messageId,
  });
}));

/**
 * POST /api/email/send-password-reset
 * Send password reset email
 */
router.post('/send-password-reset', validate(sendPasswordResetEmailSchema), asyncHandler(async (req, res) => {
  const { to, resetUrl, userName } = req.body;
  
  if (!isEmailConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'Email service is not configured',
    });
  }
  
  const result = await sendPasswordResetEmail({
    to,
    resetUrl,
    userName,
  });
  
  if (!result.ok) {
    return res.status(500).json({
      success: false,
      error: result.message,
    });
  }
  
  return res.status(200).json({
    success: true,
    message: result.message,
    messageId: result.messageId,
  });
}));

module.exports = router;
