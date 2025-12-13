const diagnoseSchema = {
  snapshot: 'array',
  risks: 'array',
  opportunities: 'array',
  missing_data: 'array',
  assumptions: 'array',
};

const decideSchema = {
  paths: 'array',
};

const planSchema = {
  selected_path_key: 'string',
  goal: 'string',
  steps: 'array',
};

const systemPrompts = {
  diagnose:
    'You are the Wathaci SME Co-Pilot. Output ONLY JSON matching the schema without commentary. Use Zambian SME context. Unknown data should be marked unknown.',
  decide:
    'You are the Wathaci SME Co-Pilot planner. Given the diagnosis, propose exactly 3 decision paths as JSON only.',
  plan:
    'You are the Wathaci SME Co-Pilot execution planner. Produce an ordered JSON action plan using allowed action keys.',
};

module.exports = {
  diagnoseSchema,
  decideSchema,
  planSchema,
  systemPrompts,
};
