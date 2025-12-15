const express = require('express');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const { getSupabaseClient } = require('../lib/supabaseAdmin');
const { runFundingRefresh } = require('../lib/funding-crawler');

const router = express.Router();

const ADMIN_TOKEN = process.env.FUNDING_REFRESH_TOKEN || process.env.ADMIN_TOKEN;

const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

const ensureClient = () => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  return supabase;
};

const parseStatusList = statusParam => {
  if (!statusParam) return ['open', 'upcoming'];
  const list = String(statusParam)
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  return list.length ? list : ['open', 'upcoming'];
};

const parseDeadlineRange = window => {
  const days = Number(window);
  if (!days || Number.isNaN(days)) return null;
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + days);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
};

router.get('/opportunities', async (req, res) => {
  try {
    const supabase = ensureClient();
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const offset = (page - 1) * limit;
    const statuses = parseStatusList(req.query.status);

    let query = supabase
      .from('funding_opportunities')
      .select('*', { count: 'exact' })
      .eq('zambia_eligible', true)
      .eq('verification_level', 'strict')
      .in('status', statuses);

    if (req.query.funding_type) {
      query = query.eq('funding_type', req.query.funding_type);
    }
    if (req.query.sector) {
      query = query.contains('target_sectors', [req.query.sector]);
    }
    if (req.query.applicant) {
      query = query.contains('eligible_applicants', [req.query.applicant]);
    }
    const deadlineRange = parseDeadlineRange(req.query.deadline_days);
    if (deadlineRange) {
      query = query.gte('deadline', deadlineRange.start).lte('deadline', deadlineRange.end);
    }
    const search = req.query.query || req.query.q;
    if (search) {
      const term = search.toLowerCase();
      query = query.or(`title.ilike.%${term}%,funder_name.ilike.%${term}%,tags.ilike.%${term}%`);
    }

    const sort = req.query.sort === 'relevance' ? 'relevance' : 'deadline';
    if (sort === 'relevance') {
      query = query.order('relevance_score', { ascending: false }).order('deadline', { ascending: true, nullsLast: true });
    } else {
      query = query.order('deadline', { ascending: true, nullsLast: true }).order('relevance_score', { ascending: false });
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);
    if (error) throw error;

    res.json({
      items: data || [],
      pagination: {
        page,
        pageSize: limit,
        total: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
    });
  } catch (error) {
    console.error('[funding] list error', error.message);
    res.status(500).json({ error: 'Failed to load funding opportunities' });
  }
});

router.get('/opportunities/:id', async (req, res) => {
  try {
    const supabase = ensureClient();
    const { data, error } = await supabase
      .from('funding_opportunities')
      .select('*')
      .eq('id', req.params.id)
      .eq('zambia_eligible', true)
      .neq('status', 'closed')
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

router.post('/refresh', refreshLimiter, async (req, res) => {
  try {
    const schema = Joi.object({ limit: Joi.number().integer().min(1).max(100).default(30) });
    const { value, error: validationError } = schema.validate(req.body || {});
    if (validationError) return res.status(400).json({ error: validationError.message });

    if (!ADMIN_TOKEN || req.headers['x-admin-token'] !== ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const summary = await runFundingRefresh({ limit: value.limit });
    res.json({ message: 'Refresh started', summary });
  } catch (error) {
    console.error('[funding] refresh error', error.message);
    res.status(500).json({ error: 'Failed to refresh funding opportunities' });
  }
});

router.get('/health', async (req, res) => {
  try {
    const supabase = ensureClient();
    const [{ data: runData }, { count: openCount }] = await Promise.all([
      supabase
        .from('funding_runs')
        .select('id, started_at, finished_at, status, discovered_count, inserted_count, updated_count, skipped_count, error')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('funding_opportunities')
        .select('id', { count: 'exact', head: true })
        .eq('zambia_eligible', true)
        .eq('verification_level', 'strict')
        .in('status', ['open', 'upcoming']),
    ]);

    res.json({
      last_run: runData || null,
      open_count: openCount || 0,
    });
  } catch (error) {
    console.error('[funding] health error', error.message);
    res.status(500).json({ error: 'Unable to load funding health' });
  }
});

module.exports = router;
