const express = require('express');
const { getSupabaseHealth } = require('../lib/supabaseAdmin');
const { getEmailHealth } = require('../services/email-service');
const { getTwilioHealth } = require('../lib/twilioClient');

const router = express.Router();

router.get('/', (req, res) => {
  const safeFetch = getter => {
    try {
      return getter?.();
    } catch (error) {
      return { configured: false, status: 'error', message: error.message };
    }
  };

  const supabase = safeFetch(getSupabaseHealth) || {
    configured: false,
    status: 'disabled',
    message: 'Supabase health unavailable',
  };

  const email = safeFetch(getEmailHealth) || {
    configured: false,
    status: 'disabled',
    message: 'Email health unavailable',
  };

  const twilio = safeFetch(getTwilioHealth) || {
    configured: false,
    status: 'disabled',
    message: 'Twilio health unavailable',
  };

  const overallStatus = [supabase, email, twilio].every(
    service => service?.configured && service?.status === 'ok'
  )
    ? 'ok'
    : 'degraded';

  res.status(200).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    supabase,
    email,
    twilio,
  });
});

module.exports = router;
