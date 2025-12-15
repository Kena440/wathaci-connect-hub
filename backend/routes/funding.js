const express = require('express');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const { getSupabaseClient } = require('../lib/supabaseAdmin');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

const aiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false });

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
    const stageFilters = normalizeArrayFilter(req.query.stage);
    const instrumentFilters = normalizeArrayFilter(req.query.instrument);
    const countryFilters = normalizeArrayFilter(req.query.country);
    const ticketMin = req.query.ticketMin ? Number(req.query.ticketMin) : undefined;
    const ticketMax = req.query.ticketMax ? Number(req.query.ticketMax) : undefined;
    const search = req.query.q ? String(req.query.q).trim() : '';

    let query = supabase
      .from('funding_opportunities')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('updated_at', { ascending: false });

    if (sectorFilters?.length) query = query.contains('sectors', sectorFilters);
    if (stageFilters?.length) query = query.contains('stage_focus', stageFilters);
    if (instrumentFilters?.length) query = query.contains('instrument_type', instrumentFilters);
    if (countryFilters?.length) query = query.contains('country_focus', countryFilters);
    if (ticketMin !== undefined) query = query.gte('ticket_size_max', ticketMin);
    if (ticketMax !== undefined) query = query.lte('ticket_size_min', ticketMax);
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,provider_name.ilike.%${search}%,tags.cs.{${search}}`);
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
    console.error('[funding] list error', error.message);
    res.status(500).json({ error: 'Failed to load funding opportunities' });
  }
});

router.get('/opportunities/:id', async (req, res) => {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('funding_opportunities')
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
    console.error('[funding] detail error', error.message);
    res.status(404).json({ error: 'Funding opportunity not found' });
  }
});

router.post('/match', aiLimiter, async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable' });
    }
    const schema = Joi.object({ smeId: Joi.string().uuid().required(), topN: Joi.number().min(1).max(25).default(10) });
    const { error: validationError, value } = schema.validate(req.body || {});
    if (validationError) return res.status(400).json({ error: validationError.message });

    const supabase = getClient();
    const [{ data: smeProfile }, { data: opportunities, error: oppError }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', value.smeId).single(),
      supabase
        .from('funding_opportunities')
        .select('id,title,provider_name,sectors,ticket_size_min,ticket_size_max,instrument_type,stage_focus,country_focus,tags,application_deadline')
        .eq('is_active', true),
    ]);

    if (oppError) throw oppError;

    const prompt = [
      'You are matching a small business to funding opportunities.',
      'Use only the anonymised business facts to rank matches.',
      'Respond in JSON array under key "matches" with fields funding_id, score (0-100), reason, summary.',
      'If information is missing, still return a sensible ordering.',
      `SME profile: ${JSON.stringify(smeProfile || {})}`,
      `Opportunities: ${JSON.stringify(opportunities || [])}`,
    ].join('\n');

    const completion = await callOpenAI({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: 'Return valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    let parsed = { matches: [] };
    try {
      parsed = JSON.parse(completion.choices?.[0]?.message?.content || '{}');
    } catch (err) {
      console.error('[funding] parse error', err.message);
    }

    const matches = Array.isArray(parsed.matches)
      ? parsed.matches.slice(0, value.topN)
      : [];

    await supabase.from('funding_events').insert({ event_type: 'ai_match_requested', context: { smeId: value.smeId, count: matches.length } });

    res.json({ matches });
  } catch (error) {
    console.error('[funding] match error', error.message);
    res.status(503).json({ error: 'Unable to generate AI recommendations at this time.' });
  }
});

router.post('/eligibility-explain', aiLimiter, async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable' });
    }

    const schema = Joi.object({ smeId: Joi.string().uuid().required(), fundingId: Joi.string().uuid().required() });
    const { value, error: validationError } = schema.validate(req.body || {});
    if (validationError) return res.status(400).json({ error: validationError.message });

    const supabase = getClient();
    const [{ data: smeProfile }, { data: opportunity }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', value.smeId).single(),
      supabase.from('funding_opportunities').select('*').eq('id', value.fundingId).single(),
    ]);

    const prompt = [
      'Explain eligibility for the SME vs the opportunity.',
      'Respond with JSON { summary: string, why_qualified: string, blockers: string, next_steps: string }',
      `SME: ${JSON.stringify(smeProfile || {})}`,
      `Opportunity: ${JSON.stringify(opportunity || {})}`,
    ].join('\n');

    const completion = await callOpenAI({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: 'Return concise JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices?.[0]?.message?.content || '{}');
    res.json(result);
  } catch (error) {
    console.error('[funding] eligibility error', error.message);
    res.status(503).json({ error: 'Unable to generate eligibility guidance.' });
  }
});

router.post('/applications', requireAuth, async (req, res) => {
  try {
    const schema = Joi.object({
      funding_id: Joi.string().uuid().required(),
      notes: Joi.string().allow('', null),
    });
    const { value, error: validationError } = schema.validate(req.body || {});
    if (validationError) return res.status(400).json({ error: validationError.message });

    const supabase = getClient();
    const { data, error } = await supabase
      .from('funding_applications')
      .insert({ funding_id: value.funding_id, notes: value.notes, sme_id: req.userId })
      .select('*')
      .single();

    if (error) throw error;

    await supabase.from('funding_events').insert({ event_type: 'application_created', context: { funding_id: value.funding_id, sme_id: req.userId } });

    res.status(201).json(data);
  } catch (error) {
    console.error('[funding] application error', error.message);
    res.status(500).json({ error: 'Unable to record application' });
  }
});

module.exports = router;
