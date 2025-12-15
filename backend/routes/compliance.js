const express = require('express');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const { getSupabaseClient } = require('../lib/supabaseAdmin');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

const aiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false });

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

router.get('/areas', async (req, res) => {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('compliance_areas')
      .select('id,slug,title,description,priority')
      .eq('is_active', true)
      .order('priority', { ascending: true, nullsFirst: false })
      .order('title', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('[compliance] areas error', error.message);
    res.status(500).json({ error: 'Unable to load compliance areas' });
  }
});

router.get('/requirements', async (req, res) => {
  try {
    const schema = Joi.object({
      areaSlug: Joi.string(),
      areaId: Joi.string().uuid(),
      smeType: Joi.string(),
      country: Joi.string().default('Zambia'),
    }).oxor('areaSlug', 'areaId');

    const { value, error: validationError } = schema.validate(req.query, { abortEarly: false });
    if (validationError) return res.status(400).json({ error: validationError.message });

    const supabase = getClient();
    let query = supabase
      .from('compliance_requirements')
      .select('*, compliance_areas!inner(id,slug,title)')
      .eq('is_active', true)
      .eq('country', value.country || 'Zambia');

    if (value.areaSlug) {
      query = query.eq('compliance_areas.slug', value.areaSlug);
    }
    if (value.areaId) {
      query = query.eq('area_id', value.areaId);
    }

    if (value.smeType) {
      query = query.or(
        [
          'required_for.is.null',
          `required_for.cs.{${value.smeType}}`,
          `required_for.cs.{general}`,
        ].join(',')
      );
    }

    const { data, error } = await query.order('priority', { ascending: true, nullsFirst: true }).order('title', {
      ascending: true,
    });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('[compliance] requirements error', error.message);
    res.status(500).json({ error: 'Unable to load compliance requirements' });
  }
});

router.get('/status/:smeId', requireAuth, async (req, res) => {
  try {
    const { smeId } = req.params;
    if (req.userId !== smeId) {
      return res.status(403).json({ error: 'You can only view your own compliance status' });
    }

    const supabase = getClient();
    const { data, error } = await supabase
      .from('compliance_status')
      .select(
        'id,sme_id,area_id,requirement_id,status,evidence_url,notes,updated_at,compliance_requirements(*), compliance_areas!area_id(id,slug,title)'
      )
      .eq('sme_id', smeId);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('[compliance] status error', error.message);
    res.status(500).json({ error: 'Unable to fetch compliance status' });
  }
});

router.get('/risk/:smeId', requireAuth, async (req, res) => {
  try {
    const { smeId } = req.params;
    if (req.userId !== smeId) return res.status(403).json({ error: 'You can only view your own scores' });

    const supabase = getClient();
    const { data, error } = await supabase
      .from('compliance_risk_scores')
      .select('*')
      .eq('sme_id', smeId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    res.json(data || null);
  } catch (error) {
    console.error('[compliance] risk error', error.message);
    res.status(500).json({ error: 'Unable to load compliance readiness score' });
  }
});

router.post('/status/bulk-upsert', requireAuth, async (req, res) => {
  try {
    const schema = Joi.object({
      smeId: Joi.string().uuid().required(),
      items: Joi.array()
        .items(
          Joi.object({
            requirement_id: Joi.string().uuid().required(),
            area_id: Joi.string().uuid().allow(null),
            status: Joi.string().valid('not_started', 'in_progress', 'completed', 'not_applicable').required(),
            evidence_url: Joi.string().uri().allow(null, ''),
            notes: Joi.string().allow(null, ''),
          })
        )
        .min(1)
        .required(),
    });

    const { value, error: validationError } = schema.validate(req.body || {}, { abortEarly: false });
    if (validationError) return res.status(400).json({ error: validationError.message });

    if (req.userId !== value.smeId) {
      return res.status(403).json({ error: 'You can only update your own compliance status' });
    }

    const supabase = getClient();
    const payload = value.items.map(item => ({
      sme_id: value.smeId,
      area_id: item.area_id || null,
      requirement_id: item.requirement_id,
      status: item.status,
      evidence_url: item.evidence_url || null,
      notes: item.notes || null,
      last_updated_by: req.userId,
    }));

    const { data, error } = await supabase
      .from('compliance_status')
      .upsert(payload, { onConflict: 'sme_id,requirement_id' })
      .select();

    if (error) throw error;

    res.json({ items: data || [] });
  } catch (error) {
    console.error('[compliance] bulk upsert error', error.message);
    res.status(500).json({ error: 'Unable to save compliance updates' });
  }
});

router.post('/ai-assess', [requireAuth, aiLimiter], async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable' });
    }

    const schema = Joi.object({ smeId: Joi.string().uuid().required() });
    const { value, error: validationError } = schema.validate(req.body || {});
    if (validationError) return res.status(400).json({ error: validationError.message });

    if (req.userId !== value.smeId) {
      return res.status(403).json({ error: 'You can only assess your own business' });
    }

    const supabase = getClient();
    const [{ data: profile }, { data: smeProfile }, { data: statusRows }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id,account_type,company_name,full_name,phone')
        .eq('id', value.smeId)
        .maybeSingle(),
      supabase
        .from('sme_profiles')
        .select(
          'business_name,registration_type,sector,subsector,years_in_operation,employee_count,turnover_bracket,location_city,location_country'
        )
        .eq('user_id', value.smeId)
        .maybeSingle(),
      supabase
        .from('compliance_status')
        .select(
          'status,notes,requirement:compliance_requirements(title,authority,required_for,is_mandatory,area:area_id(title,slug))'
        )
        .eq('sme_id', value.smeId),
    ]);

    const requirements = Array.isArray(statusRows)
      ? statusRows.map(item => ({
          title: item.requirement?.title,
          authority: item.requirement?.authority,
          area: item.requirement?.area,
          status: item.status,
          notes: item.notes,
        }))
      : [];

    const prompt = [
      'You are a compliance readiness assessor for SMEs in Zambia.',
      'Return strict JSON with fields overall_score (0-100), risk_band (low|medium|high), summary, top_gaps, recommended_next_steps.',
      'Do not include any personal identifiers.',
      `Business profile: ${JSON.stringify({
        business_name: smeProfile?.business_name || profile?.company_name,
        registration_type: smeProfile?.registration_type,
        sector: smeProfile?.sector,
        subsector: smeProfile?.subsector,
        years_in_operation: smeProfile?.years_in_operation,
        employee_count: smeProfile?.employee_count,
        turnover_bracket: smeProfile?.turnover_bracket,
        location_city: smeProfile?.location_city,
        location_country: smeProfile?.location_country,
      })}`,
      `Compliance statuses: ${JSON.stringify(requirements)}`,
    ].join('\n');

    const completion = await callOpenAI({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: 'Respond using JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.25,
      response_format: { type: 'json_object' },
    });

    let parsed = {
      overall_score: null,
      risk_band: null,
      summary: 'No AI summary generated.',
      top_gaps: [],
      recommended_next_steps: [],
    };

    try {
      parsed = JSON.parse(completion.choices?.[0]?.message?.content || '{}');
    } catch (err) {
      console.error('[compliance] parse error', err.message);
    }

    const { data, error } = await supabase
      .from('compliance_risk_scores')
      .upsert(
        {
          sme_id: value.smeId,
          overall_score: parsed.overall_score,
          risk_band: parsed.risk_band,
          ai_summary: parsed.summary,
          details: {
            top_gaps: parsed.top_gaps,
            recommended_next_steps: parsed.recommended_next_steps,
          },
        },
        { onConflict: 'sme_id' }
      )
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('[compliance] ai assess error', error.message);
    res.status(503).json({ error: 'Unable to generate AI assessment right now' });
  }
});

router.post('/ai-roadmap', [requireAuth, aiLimiter], async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable' });
    }

    const schema = Joi.object({
      smeId: Joi.string().uuid().required(),
      gaps: Joi.array().items(Joi.string()).default([]),
      context: Joi.object().optional(),
    });

    const { value, error: validationError } = schema.validate(req.body || {});
    if (validationError) return res.status(400).json({ error: validationError.message });
    if (req.userId !== value.smeId) return res.status(403).json({ error: 'You can only request your roadmap' });

    const supabase = getClient();
    const { data: smeProfile } = await supabase
      .from('sme_profiles')
      .select(
        'business_name,registration_type,sector,subsector,years_in_operation,employee_count,turnover_bracket,location_city,location_country'
      )
      .eq('user_id', value.smeId)
      .maybeSingle();

    const prompt = [
      'Create a 30-90 day compliance roadmap tailored to a Zambian SME.',
      'Return JSON with fields steps (array of {title, description, priority, timeframe_days}).',
      `SME profile: ${JSON.stringify(smeProfile || {})}`,
      `Current gaps: ${JSON.stringify(value.gaps || [])}`,
    ].join('\n');

    const completion = await callOpenAI({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: 'Respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' },
    });

    let parsed = { steps: [] };
    try {
      parsed = JSON.parse(completion.choices?.[0]?.message?.content || '{}');
    } catch (err) {
      console.error('[compliance] roadmap parse error', err.message);
    }

    res.json(parsed);
  } catch (error) {
    console.error('[compliance] ai roadmap error', error.message);
    res.status(503).json({ error: 'Unable to build roadmap right now' });
  }
});

router.get('/recommend-professionals', requireAuth, async (req, res) => {
  try {
    const schema = Joi.object({
      smeId: Joi.string().uuid().required(),
      tags: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
    });
    const { value, error: validationError } = schema.validate(req.query || {});
    if (validationError) return res.status(400).json({ error: validationError.message });

    if (req.userId !== value.smeId) return res.status(403).json({ error: 'You can only request recommendations for yourself' });

    const supabase = getClient();
    const interestTags = normalizeArrayFilter(value.tags) || ['compliance', 'tax', 'legal', 'governance'];

    const { data, error } = await supabase
      .from('professional_profiles')
      .select('user_id,full_name,organisation_name,bio,primary_expertise,services_offered,top_sectors,tags,profile_photo_url,location_country,location_city,website_url,linkedin_url')
      .eq('is_active', true)
      .or(
        interestTags
          .flatMap(tag => [`primary_expertise.cs.{${tag}}`, `services_offered.cs.{${tag}}`, `tags.cs.{${tag}}`])
          .join(',')
      )
      .limit(12);

    if (error) throw error;

    const professionals = (data || []).map(pro => ({
      ...pro,
      relevance_tags: interestTags.filter(tag =>
        (pro.primary_expertise || []).includes(tag) || (pro.services_offered || []).includes(tag) || (pro.tags || []).includes(tag)
      ),
    }));

    res.json(professionals);
  } catch (error) {
    console.error('[compliance] recommend professionals error', error.message);
    res.status(500).json({ error: 'Unable to load professional recommendations' });
  }
});

router.post('/assistant', [requireAuth, aiLimiter], async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable' });
    }

    const schema = Joi.object({ question: Joi.string().required() });
    const { value, error: validationError } = schema.validate(req.body || {});
    if (validationError) return res.status(400).json({ error: validationError.message });

    const prompt = [
      'You are a helpful compliance assistant for Zambian SMEs.',
      'Provide general guidance only, not legal advice. Keep responses concise and actionable.',
      'If unsure, recommend consulting a qualified professional.',
      `Question: ${value.question}`,
    ].join('\n');

    const completion = await callOpenAI({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: 'Be concise, friendly, and avoid legal determinations.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.35,
    });

    const answer = completion.choices?.[0]?.message?.content || '';
    res.json({ answer });
  } catch (error) {
    console.error('[compliance] assistant error', error.message);
    res.status(503).json({ error: 'Unable to answer that right now' });
  }
});

router.post('/events', async (req, res) => {
  try {
    const schema = Joi.object({
      smeId: Joi.string().uuid().allow(null),
      eventType: Joi.string().required(),
      context: Joi.object().optional(),
    });

    const { value, error: validationError } = schema.validate(req.body || {});
    if (validationError) return res.status(400).json({ error: validationError.message });

    const supabase = getClient();
    await supabase.from('compliance_events').insert({
      sme_id: value.smeId || null,
      event_type: value.eventType,
      context: value.context || {},
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('[compliance] event error', error.message);
    res.status(500).json({ error: 'Unable to record event' });
  }
});

module.exports = router;
