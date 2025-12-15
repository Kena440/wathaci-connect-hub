const express = require('express');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const { getSupabaseClient } = require('../lib/supabaseAdmin');

const router = express.Router();

const aiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false });

const getClient = () => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');
  return supabase;
};

const callOpenAI = async payload => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OpenAI key');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${text}`);
  }

  return response.json();
};

const sanitizeProfessionals = professionals =>
  (professionals || []).map(p => ({
    id: p.id,
    display_name: p.display_name,
    headline: p.headline,
    location_city: p.location_city,
    location_country: p.location_country,
    service_categories: p.service_categories,
    skills: p.skills,
    industries: p.industries,
    years_experience: p.years_experience,
    availability_status: p.availability_status,
  }));

router.post('/match-freelancers', aiLimiter, async (req, res) => {
  const schema = Joi.object({
    smeProfile: Joi.object().default({}),
    request: Joi.object({
      category: Joi.string().allow('', null),
      description: Joi.string().allow('', null),
      budget: Joi.object({ min: Joi.number().allow(null), max: Joi.number().allow(null), currency: Joi.string().allow(null) }),
      timeline: Joi.string().allow('', null),
      location_city: Joi.string().allow('', null),
    }).required(),
    filters: Joi.object({ category: Joi.string().allow('', null), skills: Joi.array().items(Joi.string()), city: Joi.string().allow('', null) }).default({}),
    limit: Joi.number().min(1).max(50).default(15),
  });

  try {
    const { value, error: validationError } = schema.validate(req.body || {}, { stripUnknown: true });
    if (validationError) return res.status(400).json({ error: validationError.message });
    if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI service unavailable' });

    const supabase = getClient();
    let query = supabase
      .from('professional_profiles')
      .select('id,display_name,headline,location_city,location_country,service_categories,skills,industries,years_experience,availability_status')
      .eq('is_public', true)
      .eq('verification_status', 'verified')
      .limit(50);

    if (value.filters.category) query = query.contains('service_categories', [value.filters.category]);
    if (value.filters.skills?.length) query = query.contains('skills', value.filters.skills);
    if (value.filters.city) query = query.ilike('location_city', `%${value.filters.city}%`);

    const { data: professionals, error } = await query;
    if (error) throw error;

    const prompt = [
      'Rank the best professionals for the SME request.',
      'Never use personal details like email or phone; only use provided skills, categories, and experience.',
      'Return JSON { matches: [{ professional_id, score, reason }] } with score 0-100.',
      `SME profile: ${JSON.stringify(value.smeProfile || {})}`,
      `Request: ${JSON.stringify(value.request || {})}`,
      `Candidates: ${JSON.stringify(sanitizeProfessionals(professionals) || [])}`,
    ].join('\n');

    const completion = await callOpenAI({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: 'Return valid JSON only. Keep responses concise.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    let parsed = { matches: [] };
    try {
      parsed = JSON.parse(completion.choices?.[0]?.message?.content || '{}');
    } catch (err) {
      console.error('[ai match] parse error', err.message);
    }

    return res.json({ matches: Array.isArray(parsed.matches) ? parsed.matches.slice(0, value.limit) : [] });
  } catch (error) {
    console.error('[ai match] error', error.message);
    return res.status(503).json({ error: 'Unable to generate AI recommendations right now' });
  }
});

router.post('/improve-brief', aiLimiter, async (req, res) => {
  const schema = Joi.object({ brief: Joi.string().min(10).required() });
  try {
    const { value, error: validationError } = schema.validate(req.body || {});
    if (validationError) return res.status(400).json({ error: validationError.message });
    if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI service unavailable' });

    const completion = await callOpenAI({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: 'Rewrite the SME brief into JSON with scope, deliverables, clarifying_questions, timeline_suggestion.' },
        { role: 'user', content: `Brief: ${value.brief}` },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    let parsed = {};
    try {
      parsed = JSON.parse(completion.choices?.[0]?.message?.content || '{}');
    } catch (err) {
      console.error('[ai improve] parse error', err.message);
    }

    return res.json({ improved: parsed });
  } catch (error) {
    console.error('[ai improve] error', error.message);
    return res.status(503).json({ error: 'Unable to improve brief right now' });
  }
});

router.post('/suggest-scope', aiLimiter, async (req, res) => {
  const schema = Joi.object({
    category: Joi.string().allow('', null),
    description: Joi.string().allow('', null),
    budget: Joi.object({ min: Joi.number().allow(null), max: Joi.number().allow(null), currency: Joi.string().allow(null) }),
  });
  try {
    const { value, error: validationError } = schema.validate(req.body || {});
    if (validationError) return res.status(400).json({ error: validationError.message });
    if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI service unavailable' });

    const completion = await callOpenAI({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content:
            'Provide JSON guidance {deliverables:[], price_guidance:{low,high,currency}, notes:""}. Keep tone factual and mention this is guidance only.',
        },
        { role: 'user', content: `Category: ${value.category}, Description: ${value.description}, Budget: ${JSON.stringify(value.budget)}` },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    let parsed = {};
    try {
      parsed = JSON.parse(completion.choices?.[0]?.message?.content || '{}');
    } catch (err) {
      console.error('[ai scope] parse error', err.message);
    }

    return res.json({ guidance: parsed });
  } catch (error) {
    console.error('[ai scope] error', error.message);
    return res.status(503).json({ error: 'Unable to suggest scope right now' });
  }
});

module.exports = router;
