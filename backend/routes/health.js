const express = require('express');
const os = require('os');
const { asyncHandler } = require('../middleware/errorHandler');
const { isSupabaseConfigured } = require('../lib/supabaseAdmin');

const router = express.Router();

// Track application start time
const startTime = Date.now();

router.get('/', asyncHandler(async (req, res) => {
  const now = Date.now();
  const uptimeSeconds = Math.floor(process.uptime());
  const uptimeMs = now - startTime;
  
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: uptimeSeconds,
    uptimeHuman: formatUptime(uptimeSeconds),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    services: {
      supabase: {
        configured: isSupabaseConfigured(),
        status: isSupabaseConfigured() ? 'ok' : 'not_configured',
      },
      email: {
        configured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
        status: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER) ? 'ok' : 'not_configured',
      },
      sms: {
        configured: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
        status: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) ? 'ok' : 'not_configured',
      },
      payment: {
        configured: Boolean(process.env.LENCO_PUBLIC_KEY && process.env.LENCO_WEBHOOK_SECRET),
        status: Boolean(process.env.LENCO_PUBLIC_KEY && process.env.LENCO_WEBHOOK_SECRET) ? 'ok' : 'not_configured',
      },
    },
    system: {
      platform: os.platform(),
      nodeVersion: process.version,
      uptime: os.uptime(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usagePercent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
      },
      cpus: os.cpus().length,
      loadAverage: os.loadavg(),
    },
    process: {
      pid: process.pid,
      memory: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    },
  };

  res.status(200).json(health);
}));

/**
 * Format uptime in human-readable format
 * @param {number} seconds - Uptime in seconds
 * @returns {string} Formatted uptime
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

module.exports = router;
