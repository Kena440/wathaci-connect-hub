const express = require('express');
const Joi = require('joi');
const requireAuth = require('../middleware/requireAuth');
const { getSupabaseClient } = require('../lib/supabaseAdmin');

const router = express.Router();

const getClient = () => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');
  return supabase;
};

const requestSchema = Joi.object({
  title: Joi.string().min(4).required(),
  description: Joi.string().min(10).required(),
  category: Joi.string().allow('', null),
  budget_min: Joi.number().allow(null),
  budget_max: Joi.number().allow(null),
  currency: Joi.string().allow(null, ''),
  preferred_delivery_mode: Joi.array().items(Joi.string()),
  location_city: Joi.string().allow('', null),
  deadline: Joi.date().iso().allow(null),
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { error: validationError, value } = requestSchema.validate(req.body || {}, { stripUnknown: true });
    if (validationError) return res.status(400).json({ error: validationError.message });

    const supabase = getClient();
    const payload = { sme_id: req.userId, ...value };

    const { data, error } = await supabase
      .from('sme_service_requests')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ request: data });
  } catch (error) {
    console.error('[requests] create error', error.message);
    return res.status(500).json({ error: 'Unable to create request' });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('sme_service_requests')
      .select('*')
      .eq('sme_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({ requests: data || [] });
  } catch (error) {
    console.error('[requests] list error', error.message);
    return res.status(500).json({ error: 'Unable to load requests' });
  }
});

router.post('/:id/invite', requireAuth, async (req, res) => {
  const schema = Joi.object({ professional_id: Joi.string().uuid().required(), message: Joi.string().allow('', null) });
  try {
    const { error: validationError, value } = schema.validate(req.body || {}, { stripUnknown: true });
    if (validationError) return res.status(400).json({ error: validationError.message });

    const supabase = getClient();
    const { data: requestRow, error: requestError } = await supabase
      .from('sme_service_requests')
      .select('id, sme_id')
      .eq('id', req.params.id)
      .single();

    if (requestError || !requestRow || requestRow.sme_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to invite for this request' });
    }

    const { data, error } = await supabase
      .from('service_request_invites')
      .upsert(
        {
          request_id: req.params.id,
          professional_id: value.professional_id,
          message: value.message,
        },
        { onConflict: 'request_id,professional_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ invite: data });
  } catch (error) {
    console.error('[requests] invite error', error.message);
    return res.status(500).json({ error: 'Unable to send invite' });
  }
});

module.exports = router;
