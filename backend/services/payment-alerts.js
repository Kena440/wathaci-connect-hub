const { URL } = require('url');

const readEnvValue = (key) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return undefined;
};

const isHttpsUrl = (value) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch (error) {
    return false;
  }
};

const notifyPaymentAlert = async (logEntry) => {
  const webhookUrl = readEnvValue('PAYMENT_ALERT_WEBHOOK_URL');

  if (typeof fetch !== 'function') {
    return;
  }

  if (!webhookUrl || !isHttpsUrl(webhookUrl)) {
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'express-log-router',
        timestamp: new Date().toISOString(),
        level: logEntry.level || 'info',
        message: logEntry.message,
        context: {
          paymentReference: logEntry.paymentReference,
          userId: logEntry.userId || logEntry.user_id,
          tags: logEntry.tags,
        },
      }),
    });
  } catch (error) {
    console.error('[payment-alerts] Failed to notify webhook', error);
  }
};

module.exports = {
  notifyPaymentAlert,
};
