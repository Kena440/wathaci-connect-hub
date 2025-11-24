const express = require('express');
const { fetchSignupAuditEntries, AuditEntriesError } = require('../services/audit-entries');

const router = express.Router();

const parseLimit = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 200;
  return Math.max(1, Math.min(parsed, 500));
};

router.get('/signups', async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const entries = await fetchSignupAuditEntries({ limit });
    res.json({ entries });
  } catch (error) {
    console.error('[routes/audit] Failed to fetch signup audit entries:', error);
    if (error instanceof AuditEntriesError) {
      const status = error.status || 500;
      const message =
        status === 503
          ? 'Supabase configuration is required to fetch audit entries.'
          : error.message;
      return res.status(status).json({ error: message });
    }

    res.status(500).json({ error: 'Failed to fetch audit entries' });
  }
});

module.exports = router;
