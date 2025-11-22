const express = require('express');
const os = require('os');
const { isSupabaseConfigured } = require('../lib/supabaseAdmin');

const router = express.Router();

router.get('/', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    supabase: {
      configured: isSupabaseConfigured(),
    },
    system: {
      uptime: os.uptime(),
      memory: {
        free: os.freemem(),
        total: os.totalmem(),
      },
    },
  };

  res.status(200).json(health);
});

module.exports = router;
