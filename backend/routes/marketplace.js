const express = require('express');
const rateLimit = require('express-rate-limit');
const { getSupabaseClient } = require('../lib/supabaseAdmin');

const router = express.Router();

const aiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

const ensureSupabase = () => {
  const client = getSupabaseClient();
  if (!client) {
    const error = new Error('Supabase not configured');
    error.status = 503;
    throw error;
  }
  return client;
};

const parsePaging = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 12, 1), 50);
  return { page, pageSize };
};

const normalizeArrayFilter = (value) => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;
  return String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
};

router.get('/listings', async (req, res) => {
  try {
    const supabase = ensureSupabase();
    const { page, pageSize } = parsePaging(req);
    const { q = '', category, listing_type, delivery_mode, tags, sort, priceMin, priceMax } = req.query;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('marketplace_listings')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .eq('moderation_status', 'approved');

    if (category) query = query.eq('category', category);
    if (listing_type) query = query.eq('listing_type', listing_type);
    if (delivery_mode) query = query.contains('delivery_mode', normalizeArrayFilter(delivery_mode));
    if (tags) query = query.contains('tags', normalizeArrayFilter(tags));
    if (priceMin) query = query.gte('price_amount', Number(priceMin));
    if (priceMax) query = query.lte('price_amount', Number(priceMax));
    if (q) {
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    }

    switch (sort) {
      case 'featured':
        query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
        break;
      case 'price_asc':
        query = query.order('price_amount', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('price_amount', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    const { data, count, error } = await query.range(from, to);
    if (error) throw error;

    res.json({
      items: data ?? [],
      page,
      pageSize,
      total: count ?? 0,
      totalPages: count ? Math.ceil(count / pageSize) : 1,
    });
  } catch (err) {
    console.error('Marketplace listings error', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to load listings' });
  }
});

router.get('/listings/:slugOrId', async (req, res) => {
  try {
    const supabase = ensureSupabase();
    const identifier = req.params.slugOrId;
    const query = supabase
      .from('marketplace_listings')
      .select('*')
      .or(`id.eq.${identifier},slug.eq.${identifier}`)
      .maybeSingle();

    const { data, error } = await query;
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Listing not found' });

    res.json(data);
  } catch (err) {
    console.error('Marketplace listing detail error', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to load listing' });
  }
});

router.post('/listings', async (req, res) => {
  try {
    const supabase = ensureSupabase();
    const payload = req.body;
    if (!payload?.title || !payload?.listing_type) {
      return res.status(400).json({ error: 'Missing title or listing_type' });
    }

    const slug = payload.slug || payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const { data, error } = await supabase
      .from('marketplace_listings')
      .insert({ ...payload, slug })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Marketplace create listing error', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to create listing' });
  }
});

router.put('/listings/:id', async (req, res) => {
  try {
    const supabase = ensureSupabase();
    const { id } = req.params;
    const payload = req.body || {};
    const { data, error } = await supabase.from('marketplace_listings').update(payload).eq('id', id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Marketplace update listing error', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to update listing' });
  }
});

router.delete('/listings/:id', async (req, res) => {
  try {
    const supabase = ensureSupabase();
    const { id } = req.params;
    const { error } = await supabase
      .from('marketplace_listings')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Marketplace delete listing error', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to delete listing' });
  }
});

router.post('/orders', async (req, res) => {
  try {
    const supabase = ensureSupabase();
    const payload = req.body;
    if (!payload?.listing_id) {
      return res.status(400).json({ error: 'listing_id is required' });
    }

    const { data, error } = await supabase.from('marketplace_orders').insert(payload).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Marketplace create order error', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to create order' });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const supabase = ensureSupabase();
    const { buyer_profile_id } = req.query;
    let query = supabase.from('marketplace_orders').select('*');
    if (buyer_profile_id) query = query.eq('buyer_profile_id', buyer_profile_id);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ items: data ?? [] });
  } catch (err) {
    console.error('Marketplace orders error', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to load orders' });
  }
});

router.get('/seller/orders', async (req, res) => {
  try {
    const supabase = ensureSupabase();
    const { seller_profile_id } = req.query;
    if (!seller_profile_id) return res.status(400).json({ error: 'seller_profile_id required' });

    const { data, error } = await supabase
      .from('marketplace_orders')
      .select('*, listing:listing_id(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const filtered = (data || []).filter((order) => order?.listing?.seller_profile_id === seller_profile_id);
    res.json({ items: filtered });
  } catch (err) {
    console.error('Marketplace seller orders error', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to load seller orders' });
  }
});

router.post('/saved', async (req, res) => {
  try {
    const supabase = ensureSupabase();
    const payload = req.body;
    if (!payload?.buyer_profile_id || !payload?.listing_id) {
      return res.status(400).json({ error: 'buyer_profile_id and listing_id required' });
    }

    const { data, error } = await supabase
      .from('marketplace_saved')
      .upsert(payload, { onConflict: 'buyer_profile_id,listing_id' })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Marketplace save listing error', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to save listing' });
  }
});

router.delete('/saved/:buyerId/:listingId', async (req, res) => {
  try {
    const supabase = ensureSupabase();
    const { buyerId, listingId } = req.params;
    const { error } = await supabase
      .from('marketplace_saved')
      .delete()
      .eq('buyer_profile_id', buyerId)
      .eq('listing_id', listingId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Marketplace unsave listing error', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to unsave listing' });
  }
});

router.get('/saved', async (req, res) => {
  try {
    const supabase = ensureSupabase();
    const { buyer_profile_id } = req.query;
    if (!buyer_profile_id) return res.status(400).json({ error: 'buyer_profile_id required' });
    const { data, error } = await supabase
      .from('marketplace_saved')
      .select('*, listing:listing_id(*)')
      .eq('buyer_profile_id', buyer_profile_id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ items: data ?? [] });
  } catch (err) {
    console.error('Marketplace saved listings error', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to load saved listings' });
  }
});

const callOpenAI = async (payload) => {
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

router.post('/ai/recommend', aiLimiter, async (req, res) => {
  try {
    const { profile, intent, candidates = [] } = req.body || {};
    if (!candidates.length) {
      return res.json({ recommendations: [] });
    }

    const systemPrompt = `You are an AI marketplace recommender. Rank listings for an SME. Return JSON array with id, score, reason.`;
    const userPrompt = {
      profile,
      intent,
      candidates,
    };

    const payload = {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(userPrompt) },
      ],
      response_format: { type: 'json_object' },
    };

    const response = await callOpenAI(payload);
    const raw = response?.choices?.[0]?.message?.content;
    let recommendations = [];
    try {
      const parsed = raw ? JSON.parse(raw) : {};
      recommendations = parsed.recommendations || parsed;
    } catch (parseError) {
      console.error('Failed to parse AI response', parseError);
    }

    res.json({ recommendations: Array.isArray(recommendations) ? recommendations : [] });
  } catch (err) {
    console.error('Marketplace AI recommend error', err);
    res.status(200).json({ recommendations: [], fallback: true });
  }
});

router.post('/ai/package-builder', aiLimiter, async (req, res) => {
  try {
    const { need, listings = [] } = req.body || {};
    const systemPrompt = `You assemble bundles of marketplace listings. Return JSON {bundle: [{id, reason}], summary}`;
    const payload = {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify({ need, listings }) },
      ],
      response_format: { type: 'json_object' },
    };

    const response = await callOpenAI(payload);
    const raw = response?.choices?.[0]?.message?.content;
    let bundle = [];
    let summary = '';
    try {
      const parsed = raw ? JSON.parse(raw) : {};
      bundle = parsed.bundle || [];
      summary = parsed.summary || '';
    } catch (parseError) {
      console.error('Failed to parse bundle AI response', parseError);
    }

    res.json({ bundle, summary });
  } catch (err) {
    console.error('Marketplace package builder error', err);
    res.status(200).json({ bundle: [], summary: '', fallback: true });
  }
});

module.exports = router;
