const express = require('express');
const crypto = require('crypto');
const { runDiagnosis } = require('../services/diagnostics-engine');
const { logRun, getLatestByCompany, getHistoryByCompany } = require('../services/diagnostics-store');

const router = express.Router();

const hashInput = input => crypto
  .createHash('sha256')
  .update(JSON.stringify(input || {}))
  .digest('hex');

router.post('/run', (req, res) => {
  try {
    const { companyId, input } = req.body || {};
    if (!input || typeof input !== 'object') {
      return res.status(400).json({ error: 'input is required' });
    }

    const diagnosis = runDiagnosis({ companyId, input });
    logRun({ companyId, inputHash: hashInput(input), output: diagnosis });

    return res.status(200).json({ diagnosis });
  } catch (error) {
    console.error('diagnostics run failed', error);
    return res.status(500).json({ error: 'Failed to run diagnosis' });
  }
});

router.get('/:companyId/latest', (req, res) => {
  const { companyId } = req.params;
  const latest = getLatestByCompany(companyId);
  if (!latest) return res.status(404).json({ error: 'No diagnosis found for company' });
  return res.status(200).json({ latest });
});

router.get('/:companyId/history', (req, res) => {
  const { companyId } = req.params;
  const history = getHistoryByCompany(companyId);
  return res.status(200).json({ history });
});

module.exports = router;
