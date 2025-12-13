const { v4: uuidv4 } = require('uuid');
const { getSupabaseClient, isSupabaseConfigured } = require('../../lib/supabaseAdmin');

function buildHtml({ snapshot, risks, opportunities, path, plan }) {
  const riskList = risks.map(r => `<li><strong>${r.risk}</strong> - ${r.severity}/${r.impact}</li>`).join('');
  const oppList = opportunities.map(o => `<li><strong>${o.opportunity}</strong> (${o.effort})</li>`).join('');
  const stepList = (plan?.steps || [])
    .map(s => `<li>${s.order}. [${s.task_type}] ${s.title}</li>`)
    .join('');
  const snapList = snapshot.map(s => `<li>${s.title}: ${s.detail} (${s.severity})</li>`).join('');

  return `<!doctype html><html><body><h1>Business Health Brief</h1><h2>Snapshot</h2><ul>${snapList}</ul><h2>Risks</h2><ul>${riskList}</ul><h2>Opportunities</h2><ul>${oppList}</ul><h2>Decision Path</h2><p>${path?.title || ''}</p><h2>Action Plan</h2><ol>${stepList}</ol></body></html>`;
}

async function storeArtifact(sessionId, html) {
  const supabase = isSupabaseConfigured() ? getSupabaseClient() : null;
  const path = `copilot-artifacts/${sessionId}/${uuidv4()}.html`;
  if (supabase) {
    await supabase.storage.from('copilot-artifacts').upload(path, html, {
      contentType: 'text/html',
      upsert: true,
    });
  }
  return { path, url: supabase ? supabase.storage.from('copilot-artifacts').getPublicUrl(path).data.publicUrl : path };
}

module.exports = { buildHtml, storeArtifact };
