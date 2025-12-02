const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { createTicket } = require('../services/support-ticket-service');

const router = express.Router();

const contactSchema = Joi.object({
  email: Joi.string().email().required(),
  subject: Joi.string().min(3).max(200).required(),
  message: Joi.string().min(3).required(),
  category: Joi.string().optional(),
  userId: Joi.string().uuid().optional(),
});

router.post('/contact', validate(contactSchema), async (req, res) => {
  try {
    const ticket = await createTicket({
      email: req.body.email,
      subject: req.body.subject,
      description: req.body.message,
      category: req.body.category,
      userId: req.body.userId,
      source: 'in_app',
    });

    return res.status(201).json({
      ok: true,
      ticket: {
        id: ticket.id,
        category: ticket.category,
        status: ticket.status,
        slaDueAt: ticket.sla_due_at,
      },
      message: 'Support ticket created and acknowledged.',
    });
  } catch (error) {
    console.error('[SupportRoutes] Failed to create ticket', error.message);
    return res.status(500).json({
      ok: false,
      error: 'Unable to create support ticket at this time.',
    });
  }
});

module.exports = router;
