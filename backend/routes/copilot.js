const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const requireAuth = require('../middleware/requireAuth');
const { collect } = require('../services/copilot/data-collector');
const { redact } = require('../services/copilot/redaction');
const { runStructuredCompletion } = require('../services/copilot/llm');
const { diagnoseSchema, decideSchema, planSchema } = require('../services/copilot/prompts');
const { executeAction, SUPPORTED_ACTIONS } = require('../services/copilot/actions');
const { buildHtml, storeArtifact } = require('../services/copilot/brief');
const { getSupabaseClient, isSupabaseConfigured } = require('../lib/supabaseAdmin');

const router = express.Router();

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
router.use(limiter);
router.use(requireAuth);

const memory = {
  sessions: [],
  runs: [],
  plans: [],
  tasks: [],
  artifacts: [],
  feedback: [],
};

const getSupabase = () => (isSupabaseConfigured() ? getSupabaseClient() : null);

const ensureOwner = (session, userId) => {
  if (!session || session.owner_user_id !== userId) {
    const error = new Error('Not found');
    error.status = 404;
    throw error;
  }
};

const persistSession = async session => {
  const supabase = getSupabase();
  if (!supabase) {
    const existing = memory.sessions.find(
      s => s.owner_user_id === session.owner_user_id && s.profile_id === session.profile_id && s.status === 'active'
    );
    if (existing) return existing;
    memory.sessions.push(session);
    return session;
  }
  const { data } = await supabase
    .from('copilot_sessions')
    .upsert(session)
    .select('*')
    .maybeSingle();
  return data || session;
};

const fetchSession = async (sessionId, userId) => {
  const supabase = getSupabase();
  if (!supabase) {
    return memory.sessions.find(s => s.id === sessionId && s.owner_user_id === userId) || null;
  }
  const { data } = await supabase
    .from('copilot_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('owner_user_id', userId)
    .maybeSingle();
  return data;
};

const storeRun = async run => {
  const supabase = getSupabase();
  if (!supabase) {
    memory.runs.push(run);
    return run;
  }
  const { data } = await supabase.from('copilot_runs').insert(run).select('*').single();
  return data;
};

const fetchRuns = async (sessionId, runType) => {
  const supabase = getSupabase();
  if (!supabase) {
    return memory.runs
      .filter(r => r.session_id === sessionId && (!runType || r.run_type === runType))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  let query = supabase.from('copilot_runs').select('*').eq('session_id', sessionId).order('created_at', { ascending: false });
  if (runType) query = query.eq('run_type', runType);
  const { data } = await query;
  return data || [];
};

const storePlan = async plan => {
  const supabase = getSupabase();
  if (!supabase) {
    memory.plans.push(plan);
    return plan;
  }
  const { data } = await supabase.from('copilot_action_plans').insert(plan).select('*').single();
  return data;
};

const storeTasks = async tasks => {
  const supabase = getSupabase();
  if (!supabase) {
    memory.tasks.push(...tasks);
    return tasks;
  }
  const { data } = await supabase.from('copilot_tasks').insert(tasks).select();
  return data || tasks;
};

const fetchPlanWithTasks = async sessionId => {
  const supabase = getSupabase();
  if (!supabase) {
    const plan = memory.plans.find(p => p.session_id === sessionId && p.status === 'active');
    if (!plan) return null;
    const tasks = memory.tasks.filter(t => t.plan_id === plan.id);
    return { plan, tasks };
  }
  const { data: plan } = await supabase
    .from('copilot_action_plans')
    .select('*')
    .eq('session_id', sessionId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!plan) return null;
  const { data: tasks } = await supabase
    .from('copilot_tasks')
    .select('*')
    .eq('plan_id', plan.id)
    .order('task_order');
  return { plan, tasks: tasks || [] };
};

const updateTask = async (taskId, patch) => {
  const supabase = getSupabase();
  if (!supabase) {
    const idx = memory.tasks.findIndex(t => t.id === taskId);
    if (idx >= 0) {
      memory.tasks[idx] = { ...memory.tasks[idx], ...patch };
      return memory.tasks[idx];
    }
    return null;
  }
  const { data } = await supabase.from('copilot_tasks').update(patch).eq('id', taskId).select('*').single();
  return data;
};

const fetchTask = async (taskId, userId) => {
  const supabase = getSupabase();
  if (!supabase) {
    const task = memory.tasks.find(t => t.id === taskId);
    const plan = memory.plans.find(p => p.id === task?.plan_id);
    const session = memory.sessions.find(s => s.id === plan?.session_id);
    if (session?.owner_user_id !== userId) return null;
    return { ...task, session_owner: session.owner_user_id, session_id: session.id };
  }
  const { data } = await supabase
    .from('copilot_tasks')
    .select('*, copilot_action_plans!inner(session_id, copilot_sessions!inner(owner_user_id))')
    .eq('id', taskId)
    .maybeSingle();
  if (!data) return null;
  return { ...data, session_owner: data.copilot_action_plans.copilot_sessions.owner_user_id, session_id: data.copilot_action_plans.session_id };
};

router.post('/session', async (req, res) => {
  try {
    const { profileId, profileType } = req.body || {};
    if (!profileId) {
      return res.status(400).json({ error: 'profileId required' });
    }
    const session = await persistSession({
      id: crypto.randomUUID(),
      owner_user_id: req.userId,
      profile_id: profileId,
      profile_type: profileType || 'sme',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return res.json({ session });
  } catch (error) {
    console.error('[copilot/session] failed', error);
    return res.status(500).json({ error: 'Unable to create session' });
  }
});

router.get('/session/:sessionId/state', async (req, res) => {
  try {
    const session = await fetchSession(req.params.sessionId, req.userId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const [diagnoseRuns, decideRuns, planWithTasks, artifacts] = await Promise.all([
      fetchRuns(session.id, 'diagnose'),
      fetchRuns(session.id, 'decide'),
      fetchPlanWithTasks(session.id),
      (async () => {
        const supabase = getSupabase();
        if (!supabase) return memory.artifacts.filter(a => a.session_id === session.id);
        const { data } = await supabase
          .from('copilot_artifacts')
          .select('*')
          .eq('session_id', session.id)
          .order('created_at', { ascending: false });
        return data || [];
      })(),
    ]);
    res.json({
      session,
      diagnose: diagnoseRuns?.[0] || null,
      decide: decideRuns?.[0] || null,
      plan: planWithTasks?.plan || null,
      tasks: planWithTasks?.tasks || [],
      artifacts,
    });
  } catch (error) {
    console.error('[copilot/state] failed', error);
    res.status(500).json({ error: 'Failed to load session state' });
  }
});

router.post('/session/:sessionId/diagnose', async (req, res) => {
  try {
    const session = await fetchSession(req.params.sessionId, req.userId);
    ensureOwner(session, req.userId);
    const data = await collect(session.profile_id, session.profile_type);
    const { redacted, summary } = redact(data);
    const { output, model, inputHash, outputHash } = await runStructuredCompletion({
      type: 'diagnose',
      context: redacted,
      schema: diagnoseSchema,
    });
    const runRecord = {
      id: crypto.randomUUID(),
      session_id: session.id,
      run_type: 'diagnose',
      model,
      input_hash: inputHash,
      output_hash: outputHash,
      input_redaction_summary: summary,
      output,
      status: 'completed',
      created_at: new Date().toISOString(),
    };
    await storeRun(runRecord);
    res.json({ diagnosis: output, run: runRecord });
  } catch (error) {
    console.error('[copilot/diagnose] failed', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to diagnose' });
  }
});

router.post('/session/:sessionId/decide', async (req, res) => {
  try {
    const session = await fetchSession(req.params.sessionId, req.userId);
    ensureOwner(session, req.userId);
    const runs = await fetchRuns(session.id, 'diagnose');
    if (!runs.length) return res.status(400).json({ error: 'Run diagnose first' });
    const last = runs[0];
    const { output, model, inputHash, outputHash } = await runStructuredCompletion({
      type: 'decide',
      context: last.output,
      schema: decideSchema,
    });
    const runRecord = {
      id: crypto.randomUUID(),
      session_id: session.id,
      run_type: 'decide',
      model,
      input_hash: inputHash,
      output_hash: outputHash,
      input_redaction_summary: {},
      output,
      status: 'completed',
      created_at: new Date().toISOString(),
    };
    await storeRun(runRecord);
    res.json({ paths: output.paths, run: runRecord });
  } catch (error) {
    console.error('[copilot/decide] failed', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to decide' });
  }
});

router.post('/session/:sessionId/plan', async (req, res) => {
  try {
    const session = await fetchSession(req.params.sessionId, req.userId);
    ensureOwner(session, req.userId);
    const { selectedPathKey } = req.body || {};
    if (!selectedPathKey) return res.status(400).json({ error: 'selectedPathKey required' });
    const decideRuns = await fetchRuns(session.id, 'decide');
    if (!decideRuns.length) return res.status(400).json({ error: 'Run decide first' });
    const { output, model, inputHash, outputHash } = await runStructuredCompletion({
      type: 'plan',
      context: { selectedPathKey, decide: decideRuns[0].output },
      schema: planSchema,
    });

    output.steps = (output.steps || []).filter(step => SUPPORTED_ACTIONS.includes(step.action_key));
    const planId = crypto.randomUUID();
    const planRecord = {
      id: planId,
      session_id: session.id,
      selected_path: selectedPathKey,
      plan: output,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await storePlan(planRecord);
    const tasks = output.steps.map(step => ({
      id: crypto.randomUUID(),
      plan_id: planId,
      task_order: step.order,
      task_type: step.task_type,
      action_key: step.action_key,
      action_payload: step.action_payload || {},
      requires_confirmation: Boolean(step.requires_confirmation),
      status: 'pending',
      result: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    await storeTasks(tasks);

    const runRecord = {
      id: crypto.randomUUID(),
      session_id: session.id,
      run_type: 'plan',
      model,
      input_hash: inputHash,
      output_hash: outputHash,
      input_redaction_summary: {},
      output,
      status: 'completed',
      created_at: new Date().toISOString(),
    };
    await storeRun(runRecord);
    res.json({ plan: planRecord, tasks });
  } catch (error) {
    console.error('[copilot/plan] failed', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to create plan' });
  }
});

router.post('/task/:taskId/execute', async (req, res) => {
  try {
    const { confirmed } = req.body || {};
    const task = await fetchTask(req.params.taskId, req.userId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.requires_confirmation && confirmed !== true) {
      return res.status(400).json({ error: 'Confirmation required' });
    }

    await updateTask(task.id, { status: 'in_progress', updated_at: new Date().toISOString() });
    const result = await executeAction(task, req.userId);
    const updated = await updateTask(task.id, {
      status: 'done',
      result,
      updated_at: new Date().toISOString(),
    });
    res.json({ task: updated });
  } catch (error) {
    console.error('[copilot/execute] failed', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to execute task' });
  }
});

router.post('/session/:sessionId/brief', async (req, res) => {
  try {
    const session = await fetchSession(req.params.sessionId, req.userId);
    ensureOwner(session, req.userId);
    const diagnoseRuns = await fetchRuns(session.id, 'diagnose');
    const decideRuns = await fetchRuns(session.id, 'decide');
    const planWithTasks = await fetchPlanWithTasks(session.id);
    const html = buildHtml({
      snapshot: diagnoseRuns[0]?.output?.snapshot || [],
      risks: diagnoseRuns[0]?.output?.risks || [],
      opportunities: diagnoseRuns[0]?.output?.opportunities || [],
      path: decideRuns[0]?.output?.paths?.find(p => p.key === planWithTasks?.plan?.selected_path),
      plan: planWithTasks?.plan?.plan || planWithTasks?.plan,
    });
    const stored = await storeArtifact(session.id, html);
    const artifactRecord = {
      id: crypto.randomUUID(),
      session_id: session.id,
      artifact_type: 'health_brief_html',
      storage_path: stored.path,
      meta: { url: stored.url },
      created_at: new Date().toISOString(),
    };
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('copilot_artifacts').insert(artifactRecord);
    } else {
      memory.artifacts.push(artifactRecord);
    }
    res.json({ artifact: artifactRecord, url: stored.url });
  } catch (error) {
    console.error('[copilot/brief] failed', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to generate brief' });
  }
});

router.post('/session/:sessionId/feedback', async (req, res) => {
  try {
    const session = await fetchSession(req.params.sessionId, req.userId);
    ensureOwner(session, req.userId);
    const { rating, comment, runId } = req.body || {};
    const record = {
      id: crypto.randomUUID(),
      session_id: session.id,
      run_id: runId || null,
      rating: rating || null,
      comment: comment || null,
      created_at: new Date().toISOString(),
    };
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('copilot_feedback').insert(record);
    } else {
      memory.feedback.push(record);
    }
    res.json({ feedback: record });
  } catch (error) {
    console.error('[copilot/feedback] failed', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to submit feedback' });
  }
});

module.exports = router;
