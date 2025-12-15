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

router.get('/', requireAuth, async (req, res) => {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('service_request_invites')
      .select('*, request:sme_service_requests(title, category, budget_min, budget_max, currency, location_city, status)')
      .eq('professional_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({ invites: data || [] });
  } catch (error) {
    console.error('[invites] list error', error.message);
    return res.status(500).json({ error: 'Unable to load invites' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const schema = Joi.object({ status: Joi.string().valid('accepted', 'declined', 'sent').required() });
  try {
    const { error: validationError, value } = schema.validate(req.body || {});
    if (validationError) return res.status(400).json({ error: validationError.message });

    const supabase = getClient();
    const { data, error } = await supabase
      .from('service_request_invites')
      .update({ status: value.status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('professional_id', req.userId)
      .select()
      .single();

    if (error) throw error;

    return res.json({ invite: data });
  } catch (error) {
    console.error('[invites] update error', error.message);
    return res.status(500).json({ error: 'Unable to update invite status' });
  }
});

module.exports = router;
