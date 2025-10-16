const express = require('express');
const { getPaymentReadiness } = require('../lib/payment-readiness');

const router = express.Router();

router.get('/readiness', (req, res) => {
  const readiness = getPaymentReadiness();
  const hasErrors = readiness.errors.length > 0;
  res.status(hasErrors ? 503 : 200).json(readiness);
});

module.exports = router;
