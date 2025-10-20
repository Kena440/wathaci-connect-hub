const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const {
  resolveLencoMerchant,
  LencoMerchantResolverError,
} = require('../services/lenco-merchant-resolver');

const router = express.Router();

const resolveSchema = Joi.object({
  tillNumber: Joi.string().trim().min(1).max(64).required(),
});

router.post('/lenco-merchant', validate(resolveSchema), async (req, res) => {
  const { tillNumber } = req.body;
  try {
    const result = await resolveLencoMerchant(tillNumber);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof LencoMerchantResolverError) {
      const status = error.status ?? 500;
      return res.status(status).json({
        status: false,
        message: error.message,
        data: null,
      });
    }

    console.error('[routes/resolve] Unexpected error while resolving Lenco merchant:', error);
    return res.status(500).json({
      status: false,
      message: 'Unable to resolve Lenco merchant at this time.',
      data: null,
    });
  }
});

module.exports = router;
