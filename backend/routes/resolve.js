const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { resolveLencoMoneyWallet } = require('../services/lenco-money-resolver');

const router = express.Router();

const resolveSchema = Joi.object({
  walletNumber: Joi.string().trim().min(1).required(),
});

router.post('/lenco-money', validate(resolveSchema), async (req, res) => {
  const { walletNumber } = req.body;

  try {
    const result = await resolveLencoMoneyWallet(walletNumber);
    return res.status(200).json(result);
  } catch (error) {
    const status = error.status || 500;

    if (status >= 500) {
      console.error('[routes/resolve] Failed to resolve Lenco Money wallet', error);
    }

    const responseBody =
      (error.details && typeof error.details === 'object' ? error.details : null) || {
        status: false,
        message: error.message || 'Unable to resolve Lenco Money wallet',
      };

    return res.status(status).json(responseBody);
  }
});

module.exports = router;
