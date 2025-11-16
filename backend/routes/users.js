const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const {
  registerUser,
  DuplicateRegistrationError,
  RegistrationStoreError,
} = require('../services/registration-store');

const router = express.Router();

const ACCOUNT_TYPES = [
  'sole_proprietor',
  'professional',
  'sme',
  'investor',
  'donor',
  'government',
];

const userSchema = Joi.object({
  firstName: Joi.string().trim().min(1).required(),
  lastName: Joi.string().trim().min(1).required(),
  email: Joi.string().email().required(),
  accountType: Joi.string()
    .valid(...ACCOUNT_TYPES)
    .required(),
  company: Joi.string().trim().allow('', null).optional(),
  mobileNumber: Joi.string().trim().allow('', null).optional(),
});

router.post('/', validate(userSchema), async (req, res) => {
  try {
    const user = await registerUser(req.body);
    return res.status(201).json({ user });
  } catch (error) {
    if (error instanceof DuplicateRegistrationError) {
      return res.status(409).json({ error: 'User already registered' });
    }

    if (error instanceof RegistrationStoreError) {
      console.error('[routes/users] Registration store error:', error);
      const status = error.status ?? 500;
      const message =
        status === 503
          ? 'Registrations are temporarily unavailable. Please contact support@wathaci.com.'
          : 'Unable to save registration. Please try again later.';
      return res.status(status).json({ error: message });
    }

    console.error('[routes/users] Unexpected error:', error);
    return res.status(500).json({ error: 'Failed to register user' });
  }
});

module.exports = router;
