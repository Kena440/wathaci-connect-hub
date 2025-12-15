const express = require('express');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const { getSupabaseClient } = require('../lib/supabaseAdmin');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

const aiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

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

const getClient = () => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  return supabase;
};

const normalizeArrayFilter = value => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;
  return String(value)
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
};

router.get('/opportunities', async (req, res) => {
  try {
    const supabase = getClient();
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 12, 1), 50);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const sectorFilters = normalizeArrayFilter(req.query.sector);
    const partnershipTypeFilters = normalizeArrayFilter(req.query.partnershipType);
    const countryFilters = normalizeArrayFilter(req.query.country);
    const beneficiaryFilters = normalizeArrayFilter(req.query.beneficiary);
    const search = req.query.q ? String(req.query.q).trim() : '';

    let query = supabase
      .from('partnership_opportunities')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('updated_at', { ascending: false });

    if (sectorFilters?.length) query = query.contains('sectors', sectorFilters);
    if (partnershipTypeFilters?.length) query = query.contains('partnership_type', partnershipTypeFilters);
    if (countryFilters?.length) query = query.contains('country_focus', countryFilters);
    if (beneficiaryFilters?.length) query = query.contains('target_beneficiaries', beneficiaryFilters);
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%,partner_org_name.ilike.%${search}%,tags.cs.{${search}}`,
      );
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    res.json({
      items: data || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: count ? Math.ceil(count / pageSize) : 0,
      },
    });
  } catch (error) {
    console.error('[partnerships] list error', error.message);
    res.status(500).json({ error: 'Failed to load partnership opportunities' });
  }
});

router.get('/opportunities/:id', async (req, res) => {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('partnership_opportunities')
      .select('*')
      .eq('id', req.params.id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Not found' });
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('[partnerships] detail error', error.message);
    res.status(404).json({ error: 'Partnership opportunity not found' });
  }
});

router.post('/opportunities', requireAuth, async (req, res) => {
  try {
    const schema = Joi.object({
      title: Joi.string().required(),
      description: Joi.string().required(),
      partner_org_name: Joi.string().required(),
      partner_org_type: Joi.string().allow('', null),
      country_focus: Joi.alternatives(Joi.array().items(Joi.string()), Joi.string()),
      sectors: Joi.alternatives(Joi.array().items(Joi.string()), Joi.string()),
      partnership_type: Joi.alternatives(Joi.array().items(Joi.string()), Joi.string()),
      target_beneficiaries: Joi.alternatives(Joi.array().items(Joi.string()), Joi.string()),
      requirements_summary: Joi.string().allow('', null),
      expected_value_for_partner: Joi.string().allow('', null),
      expected_value_for_sme: Joi.string().allow('', null),
      start_date: Joi.date().optional(),
      end_date: Joi.date().optional(),
      is_ongoing: Joi.boolean().optional(),
      link_to_more_info: Joi.string().uri().allow('', null),
      contact_email: Joi.string().email().allow('', null),
      is_active: Joi.boolean().optional(),
      is_featured: Joi.boolean().optional(),
      tags: Joi.alternatives(Joi.array().items(Joi.string()), Joi.string()),
    });

    const { error: validationError, value } = schema.validate(req.body || {});
    if (validationError) return res.status(400).json({ error: validationError.message });

    const supabase = getClient();
    const normalizeArray = input => {
      if (!input) return [];
      if (Array.isArray(input)) return input;
      return String(input)
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);
    };

    const payload = {
      ...value,
      country_focus: normalizeArray(value.country_focus),
      sectors: normalizeArray(value.sectors),
      partnership_type: normalizeArray(value.partnership_type),
      target_beneficiaries: normalizeArray(value.target_beneficiaries),
      tags: normalizeArray(value.tags),
      created_by_profile_id: req.userId,
    };

    const { data, error } = await supabase
      .from('partnership_opportunities')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;

    res.status(201).json({ opportunity: data });
  } catch (error) {
    console.error('[partnerships] create error', error.message);
    res.status(500).json({ error: 'Unable to create partnership opportunity' });
  }
});

router.post('/interests', requireAuth, async (req, res) => {
  try {
    const schema = Joi.object({
      opportunity_id: Joi.string().uuid().required(),
      notes: Joi.string().allow('', null),
      role: Joi.string().allow('', null),
    });
    const { value, error: validationError } = schema.validate(req.body || {});
    if (validationError) return res.status(400).json({ error: validationError.message });

    const supabase = getClient();
    const { data, error } = await supabase
      .from('partnership_interests')
      .insert({
        opportunity_id: value.opportunity_id,
        initiator_profile_id: req.userId,
        role: value.role || 'sme',
        notes: value.notes,
      })
      .select('*')
      .single();

    if (error) throw error;

    res.status(201).json({ interest: data });
  } catch (error) {
    console.error('[partnerships] interest error', error.message);
    res.status(500).json({ error: 'Failed to record interest' });
  }
});

const runMatch = async (input, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable' });
    }

    const supabase = getClient();
    const profileId = input.profileId || input.profile_id;
    const topN = input.topN || input.top || 10;

    const [{ data: profile }, { data: opportunities, error: oppError }] = await Promise.all([
      supabase
        .from('profiles')
        .select(
          'id,company_name,industry_sector,country,region,employee_count,funding_stage,partnership_preferences,partnership_needs',
        )
        .eq('id', profileId)
        .single(),
      supabase
        .from('partnership_opportunities')
        .select(
          'id,title,partner_org_name,partner_org_type,sectors,country_focus,partnership_type,target_beneficiaries,expected_value_for_sme,expected_value_for_partner,tags',
        )
        .eq('is_active', true),
    ]);

    if (oppError) throw oppError;

    const prompt = [
      'You match SMEs, corporates, and partners to collaboration opportunities.',
      'Use only the business attributes provided; avoid names or personal details.',
      'Return JSON {"matches":[{"opportunity_id":"uuid","score":0-100,"reason":"string"}]}',
      `Profile facts: ${JSON.stringify(profile || {})}`,
      `Opportunities: ${JSON.stringify(opportunities || [])}`,
    ].join('\n');

    const completion = await callOpenAI({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: 'Return concise JSON only. Keep reasons under 50 words.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    let parsed = { matches: [] };
    try {
      parsed = JSON.parse(completion.choices?.[0]?.message?.content || '{}');
    } catch (err) {
      console.error('[partnerships] parse error', err.message);
    }

    const matches = Array.isArray(parsed.matches)
      ? parsed.matches
          .map(match => ({
            opportunity_id: match.opportunity_id,
            score: Number(match.score) || 0,
            reason: match.reason,
          }))
          .slice(0, topN)
      : [];

    await supabase.from('partnership_events').insert({
      event_type: 'ai_match_requested',
      context: { profileId, returned: matches.length },
    }).catch(() => {});

    res.json({ matches });
  } catch (error) {
    console.error('[partnerships] match error', error.message);
    res.status(503).json({ error: 'Unable to generate AI recommendations at this time.' });
  }
};

router.post('/match', aiLimiter, async (req, res) => {
  const schema = Joi.object({ profileId: Joi.string().uuid().required(), topN: Joi.number().min(1).max(25).default(10) });
  const { value, error } = schema.validate(req.body || {});
  if (error) return res.status(400).json({ error: error.message });
  return runMatch(value, res);
});

router.get('/match', aiLimiter, async (req, res) => {
  const schema = Joi.object({ profileId: Joi.string().uuid().required(), topN: Joi.number().min(1).max(25).default(10) });
  const { value, error } = schema.validate(req.query || {});
  if (error) return res.status(400).json({ error: error.message });
  return runMatch(value, res);
});

router.post('/ai-intro-email', aiLimiter, async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable' });
    }

    const schema = Joi.object({
      sme_brief: Joi.string().required(),
      opportunity_summary: Joi.string().required(),
    });

    const { value, error: validationError } = schema.validate(req.body || {});
    if (validationError) return res.status(400).json({ error: validationError.message });

    const prompt = [
      'Draft a concise introduction email for a partnership inquiry.',
      'Do not include personal phone numbers or emails. Keep it editable by the user.',
      `Business context: ${value.sme_brief}`,
      `Opportunity summary: ${value.opportunity_summary}`,
      'Return plain text with greeting, short value proposition, and suggested next step.',
    ].join('\n');

    const completion = await callOpenAI({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: 'You generate safe, concise business emails.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.35,
    });

    const text = completion.choices?.[0]?.message?.content || '';
    res.json({ draft: text });
  } catch (error) {
    console.error('[partnerships] intro email error', error.message);
    res.status(503).json({ error: 'Unable to generate a draft message right now.' });
  }
});

module.exports = router;
