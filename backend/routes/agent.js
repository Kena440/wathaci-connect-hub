const express = require('express');
const { WathaciOnboardingAgent, AgentError } = require('../services/wathaci-agent');

const router = express.Router();
const agent = new WathaciOnboardingAgent();

const asyncHandler = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error('[AgentRouteError]', error);
    if (error instanceof AgentError) {
      res.status(error.status || 400).json({ code: error.code, error: error.message, details: error.details });
      return;
    }
    res.status(500).json({ code: 'INTERNAL_ERROR', error: 'Unexpected error occurred', details: error?.message });
  }
};

router.post('/signup', asyncHandler(async (req, res) => {
  const result = await agent.signup(req.body || {});
  res.status(201).json(result);
}));

router.post('/signin', asyncHandler(async (req, res) => {
  const result = await agent.signin(req.body || {});
  res.status(200).json(result);
}));

router.get('/profile', asyncHandler(async (req, res) => {
  const userId = req.query.userId || req.header('x-user-id');
  const profile = await agent.getProfile(userId);
  res.status(200).json(profile);
}));

router.put('/profile', asyncHandler(async (req, res) => {
  const { userId, updates } = req.body || {};
  const profile = await agent.updateProfile(userId, updates || {});
  res.status(200).json(profile);
}));

router.post('/payments/checkout', asyncHandler(async (req, res) => {
  const { userId, ...payload } = req.body || {};
  const checkout = await agent.initiateCheckout(userId, payload);
  res.status(200).json(checkout);
}));

router.post('/payments/webhook', asyncHandler(async (req, res) => {
  await agent.handleWebhook(req.body || {});
  res.status(200).json({ received: true });
}));

router.get('/health', (req, res) => {
  const health = agent.getHealth();
  res.status(health.status === 'ok' ? 200 : 503).json(health);
});

module.exports = router;
