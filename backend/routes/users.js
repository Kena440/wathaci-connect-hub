const express = require('express');
const { randomUUID } = require('crypto');
const Joi = require('joi');
const validate = require('../middleware/validate');

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

const registeredUsers = new Map();

router.post('/', validate(userSchema), (req, res) => {
  const { firstName, lastName, email, accountType, company, mobileNumber } = req.body;
  const normalizedEmail = email.toLowerCase();

  if (registeredUsers.has(normalizedEmail)) {
    return res.status(409).json({ error: 'User already registered' });
  }

  const user = {
    id: randomUUID(),
    firstName,
    lastName,
    email: normalizedEmail,
    accountType,
    company: company ? company : null,
    mobileNumber: mobileNumber ? mobileNumber : null,
    registeredAt: new Date().toISOString(),
  };

  registeredUsers.set(normalizedEmail, user);

  return res.status(201).json({ user });
});

module.exports = router;
