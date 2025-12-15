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

router.post('/', requireAuth, async (req, res) => {
  const schema = Joi.object({ professional_id: Joi.string().uuid().required(), save: Joi.boolean().default(true) });
  try {
    const { error: validationError, value } = schema.validate(req.body || {});
    if (validationError) return res.status(400).json({ error: validationError.message });

    const supabase = getClient();
    if (value.save) {
      const { data, error } = await supabase
        .from('saved_professionals')
        .upsert({ sme_id: req.userId, professional_id: value.professional_id }, { onConflict: 'sme_id,professional_id' })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json({ saved: true, record: data });
    }

    const { error } = await supabase
      .from('saved_professionals')
      .delete()
      .eq('sme_id', req.userId)
      .eq('professional_id', value.professional_id);

    if (error) throw error;
    return res.json({ saved: false });
  } catch (error) {
    console.error('[saved-professionals] toggle error', error.message);
    return res.status(500).json({ error: 'Unable to update saved professional' });
  }
});

module.exports = router;
