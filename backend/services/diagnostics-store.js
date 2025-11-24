const { MODEL_VERSION } = require('./diagnostics-engine');

const runs = [];

const logRun = ({ companyId, inputHash, output }) => {
  const record = {
    id: output.id,
    company_id: companyId || null,
    input_hash: inputHash || null,
    scores: output.scores,
    model_version: MODEL_VERSION,
    created_at: new Date().toISOString(),
    meta: output.meta,
    summary: output.overall_summary,
  };
  runs.push(record);
  return record;
};

const getLatestByCompany = companyId => runs
  .filter(item => item.company_id === companyId)
  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

const getHistoryByCompany = companyId => runs
  .filter(item => item.company_id === companyId)
  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

module.exports = {
  logRun,
  getLatestByCompany,
  getHistoryByCompany,
};
