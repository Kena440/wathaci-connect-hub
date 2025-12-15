const express = require('express');
const Joi = require('joi');
const requireAuth = require('../middleware/requireAuth');
const { getSupabaseClient } = require('../lib/supabaseAdmin');

const router = express.Router();

const getClient = () => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  return supabase;
};

const normalizeArray = value => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
};

const profileSelect = [
  'id',
  'display_name',
  'headline',
  'bio',
  'location_city',
  'location_country',
  'years_experience',
  'languages',
  'service_categories',
  'skills',
  'industries',
  'rate_type',
  'rate_min',
  'rate_max',
  'currency',
  'availability_status',
  'verification_status',
  'is_public',
  'profile_photo_url',
  'portfolio_url',
  'linkedin_url',
  'website_url',
  'created_at',
  'updated_at',
].join(',');

router.get('/', async (req, res) => {
  try {
    const supabase = getClient();
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 12, 1), 50);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const categories = normalizeArray(req.query.category);
    const skills = normalizeArray(req.query.skills);
    const city = req.query.city ? String(req.query.city).trim() : '';
    const availability = req.query.availability ? String(req.query.availability).trim() : '';
    const search = req.query.q ? String(req.query.q).trim() : '';

    let query = supabase
      .from('professional_profiles')
      .select(
        `${profileSelect}, services:professional_services!professional_id (id,title,category,price_type,price_amount,currency,is_active,delivery_mode)`,
        { count: 'exact' }
      )
      .eq('is_public', true)
      .order('verification_status', { ascending: false })
      .order('updated_at', { ascending: false });

    if (categories.length) query = query.contains('service_categories', categories);
    if (skills.length) query = query.contains('skills', skills);
    if (city) query = query.ilike('location_city', `%${city}%`);
    if (availability) query = query.eq('availability_status', availability);
    if (search) {
      query = query.or(
        `display_name.ilike.%${search}%,headline.ilike.%${search}%,bio.ilike.%${search}%,skills.cs.{${search}}`
      );
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    return res.json({
      items: data || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: count ? Math.ceil(count / pageSize) : 0,
      },
    });
  } catch (error) {
    console.error('[freelancers] list error', error.message);
    return res.status(500).json({ error: 'Failed to load freelancers' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('professional_profiles')
      .select(
        `${profileSelect}, services:professional_services!professional_id (id,title,description,category,price_type,price_amount,currency,is_active,delivery_mode)`
      )
      .eq('id', req.params.id)
      .eq('is_public', true)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Professional not found' });
    }

    return res.json(data);
  } catch (error) {
    console.error('[freelancers] detail error', error.message);
    return res.status(500).json({ error: 'Failed to load professional profile' });
  }
});

const profileSchema = Joi.object({
  display_name: Joi.string().min(2).required(),
  headline: Joi.string().allow('', null),
  bio: Joi.string().allow('', null),
  location_city: Joi.string().allow('', null),
  location_country: Joi.string().allow('', null),
  years_experience: Joi.number().integer().min(0).allow(null),
  languages: Joi.array().items(Joi.string()),
  service_categories: Joi.array().items(Joi.string()),
  skills: Joi.array().items(Joi.string()),
  industries: Joi.array().items(Joi.string()),
  rate_type: Joi.string().allow(null, ''),
  rate_min: Joi.number().allow(null),
  rate_max: Joi.number().allow(null),
  currency: Joi.string().allow(null, ''),
  availability_status: Joi.string().allow(null, ''),
  is_public: Joi.boolean(),
  profile_photo_url: Joi.string().uri().allow(null, ''),
  portfolio_url: Joi.string().uri().allow(null, ''),
  linkedin_url: Joi.string().uri().allow(null, ''),
  website_url: Joi.string().uri().allow(null, ''),
});

router.post('/profile', requireAuth, async (req, res) => {
  try {
    const { error: validationError, value } = profileSchema.validate(req.body || {}, { stripUnknown: true });
    if (validationError) return res.status(400).json({ error: validationError.message });

    const supabase = getClient();
    const payload = {
      id: req.userId,
      profile_id: req.userId,
      ...value,
      email: req.user?.email,
    };

    const { data, error } = await supabase
      .from('professional_profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ profile: data });
  } catch (error) {
    console.error('[freelancers] create profile error', error.message);
    return res.status(500).json({ error: 'Unable to save professional profile' });
  }
});

router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { error: validationError, value } = profileSchema.validate(req.body || {}, { stripUnknown: true });
    if (validationError) return res.status(400).json({ error: validationError.message });

    const supabase = getClient();
    const { data, error } = await supabase
      .from('professional_profiles')
      .update({ ...value, updated_at: new Date().toISOString() })
      .eq('id', req.userId)
      .select()
      .single();

    if (error) throw error;

    return res.json({ profile: data });
  } catch (error) {
    console.error('[freelancers] update profile error', error.message);
    return res.status(500).json({ error: 'Unable to update professional profile' });
  }
});

const serviceSchema = Joi.object({
  title: Joi.string().min(3).required(),
  description: Joi.string().allow('', null),
  category: Joi.string().allow('', null),
  delivery_mode: Joi.array().items(Joi.string()),
  price_type: Joi.string().allow(null, ''),
  price_amount: Joi.number().allow(null),
  currency: Joi.string().allow(null, ''),
  is_active: Joi.boolean(),
});

router.post('/services', requireAuth, async (req, res) => {
  try {
    const { error: validationError, value } = serviceSchema.validate(req.body || {}, { stripUnknown: true });
    if (validationError) return res.status(400).json({ error: validationError.message });

    const supabase = getClient();
    const payload = {
      professional_id: req.userId,
      ...value,
    };

    const { data, error } = await supabase
      .from('professional_services')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ service: data });
  } catch (error) {
    console.error('[freelancers] create service error', error.message);
    return res.status(500).json({ error: 'Unable to create service' });
  }
});

router.put('/services/:serviceId', requireAuth, async (req, res) => {
  try {
    const { error: validationError, value } = serviceSchema.validate(req.body || {}, { stripUnknown: true });
    if (validationError) return res.status(400).json({ error: validationError.message });

    const supabase = getClient();
    const { data, error } = await supabase
      .from('professional_services')
      .update({ ...value, updated_at: new Date().toISOString() })
      .eq('id', req.params.serviceId)
      .eq('professional_id', req.userId)
      .select()
      .single();

    if (error) throw error;

    return res.json({ service: data });
  } catch (error) {
    console.error('[freelancers] update service error', error.message);
    return res.status(500).json({ error: 'Unable to update service' });
  }
});

router.delete('/services/:serviceId', requireAuth, async (req, res) => {
  try {
    const supabase = getClient();
    const { error } = await supabase
      .from('professional_services')
      .delete()
      .eq('id', req.params.serviceId)
      .eq('professional_id', req.userId);

    if (error) throw error;

    return res.status(204).send();
  } catch (error) {
    console.error('[freelancers] delete service error', error.message);
    return res.status(500).json({ error: 'Unable to delete service' });
  }
});

module.exports = router;
