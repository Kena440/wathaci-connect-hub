const crypto = require('crypto');
const { URL } = require('url');
const sanitizeHtml = require('sanitize-html');
const { getSupabaseClient } = require('./supabaseAdmin');

const OPENAI_MODEL = process.env.FUNDING_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const SEARCH_PROVIDER = (process.env.FUNDING_SEARCH_PROVIDER || '').toLowerCase();
const SERPAPI_KEY = process.env.SERPAPI_API_KEY;
const BING_KEY = process.env.BING_SEARCH_KEY || process.env.AZURE_BING_KEY;

const CURATED_SEEDS = [
  'https://www.un.org/africarenewal/tags/funding',
  'https://ec.europa.eu/info/funding-tenders/opportunities/portal/',
  'https://www.undp.org/funding',
  'https://www.afdb.org/en/projects-and-operations/procurement',
  'https://vc4a.com/ventures/',
];

const ZAMBIA_QUERIES = [
  'grant Zambia deadline apply',
  'funding opportunity Zambia SMEs',
  'innovation challenge Zambia apply',
  'impact investment Zambia call',
];

const cleanText = (html = '') =>
  sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, ' ')
    .trim();

const sha256 = value => crypto.createHash('sha256').update(value || '').digest('hex');

const buildHash = ({ title, funder_name, deadline, source_domain }) =>
  sha256([title?.toLowerCase()?.trim(), funder_name?.toLowerCase()?.trim(), deadline || '', source_domain || ''].join('|'));

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed ${response.status}: ${text}`);
  }
  return response.json();
};

const discoverWithSerpApi = async query => {
  if (!SERPAPI_KEY) return [];
  const endpoint = new URL('https://serpapi.com/search.json');
  endpoint.searchParams.set('engine', 'google');
  endpoint.searchParams.set('q', query);
  endpoint.searchParams.set('num', '10');
  endpoint.searchParams.set('api_key', SERPAPI_KEY);
  try {
    const json = await fetchJson(endpoint.toString());
    return (json.organic_results || []).map(r => ({ url: r.link, title: r.title, snippet: r.snippet }));
  } catch (error) {
    console.warn('[FundingCrawler] SerpAPI search failed', error.message);
    return [];
  }
};

const discoverWithBing = async query => {
  if (!BING_KEY) return [];
  const endpoint = new URL('https://api.bing.microsoft.com/v7.0/search');
  endpoint.searchParams.set('q', query);
  endpoint.searchParams.set('mkt', 'en-ZM');
  try {
    const json = await fetchJson(endpoint.toString(), {
      headers: { 'Ocp-Apim-Subscription-Key': BING_KEY },
    });
    return (json.webPages?.value || []).map(r => ({ url: r.url, title: r.name, snippet: r.snippet }));
  } catch (error) {
    console.warn('[FundingCrawler] Bing search failed', error.message);
    return [];
  }
};

const discoverLinks = async () => {
  const supabase = getSupabaseClient();
  let sources = CURATED_SEEDS;
  if (supabase) {
    const { data } = await supabase.from('funding_sources').select('base_url').eq('enabled', true);
    const dbSources = (data || []).map(row => row.base_url).filter(Boolean);
    sources = Array.from(new Set([...sources, ...dbSources]));
  }

  const searchResults = await Promise.all(
    ZAMBIA_QUERIES.map(query => {
      if (SEARCH_PROVIDER === 'bing') return discoverWithBing(query);
      if (SEARCH_PROVIDER === 'serpapi') return discoverWithSerpApi(query);
      return Promise.resolve([]);
    })
  );

  const discovered = searchResults.flat().map(r => r.url).filter(Boolean);
  return Array.from(new Set([...sources, ...discovered]));
};

const fetchPage = async url => {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'WathaciFundingBot/1.0 (+https://wathaci.com)' },
    });
    if (!response.ok) return null;
    const text = await response.text();
    return text;
  } catch (error) {
    console.warn('[FundingCrawler] fetch failed', url, error.message);
    return null;
  }
};

const extractWithOpenAI = async ({ url, pageText }) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY for extraction');
  }

  const today = new Date().toISOString().split('T')[0];
  const schema = {
    title: '',
    funding_type: '',
    funder_name: '',
    eligible_countries: [],
    target_sectors: [],
    eligible_applicants: [],
    funding_amount_min: null,
    funding_amount_max: null,
    currency: null,
    deadline: null,
    status: 'open',
    description: '',
    source_url: url,
    tags: [],
    zambia_eligible: false,
    verification_level: 'strict',
    relevance_score: 0,
  };
  const rules = [
    'Return JSON only matching the provided schema keys.',
    'zambia_eligible must only be true if Zambia is explicitly eligible.',
    'If the deadline is before today, set status to "closed".',
    'If eligibility is unclear set verification_level to "partial" and zambia_eligible=false.',
    'Use funding_type values: grant, equity, debt, blended, accelerator, other.',
    'Always include the input source_url.',
  ].join('\n');

  const prompt = {
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: rules },
      {
        role: 'user',
        content: JSON.stringify({
          instruction: 'Extract a single funding opportunity into the exact schema keys.',
          schema,
          today_date: today,
          url,
          page_text: pageText?.slice(0, 12000) || '',
        }),
      },
    ],
    temperature: 0,
    response_format: { type: 'json_object' },
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(prompt),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI extraction failed ${response.status}: ${text}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  return JSON.parse(content);
};

const normalizeOpportunity = (raw, sourceUrl) => {
  const url = new URL(sourceUrl);
  const normalized = {
    title: raw.title?.trim() || '',
    funding_type: raw.funding_type || 'other',
    funder_name: raw.funder_name?.trim() || null,
    eligible_countries: Array.isArray(raw.eligible_countries) ? raw.eligible_countries : [],
    target_sectors: Array.isArray(raw.target_sectors) ? raw.target_sectors : [],
    eligible_applicants: Array.isArray(raw.eligible_applicants) ? raw.eligible_applicants : [],
    funding_amount_min: raw.funding_amount_min ?? null,
    funding_amount_max: raw.funding_amount_max ?? null,
    currency: raw.currency || null,
    deadline: raw.deadline || null,
    status: raw.status || 'open',
    description: raw.description || '',
    source_url: sourceUrl,
    source_domain: url.hostname,
    source_title: raw.source_title || null,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    relevance_score: raw.relevance_score ?? 0,
    zambia_eligible: Boolean(raw.zambia_eligible),
    verification_level: raw.verification_level || 'strict',
    last_verified_at: new Date().toISOString(),
  };

  normalized.hash = buildHash({
    title: normalized.title,
    funder_name: normalized.funder_name,
    deadline: normalized.deadline,
    source_domain: normalized.source_domain,
  });

  return normalized;
};

const validateOpportunity = opp => {
  if (!opp.title || !opp.source_url) return false;
  if (!opp.zambia_eligible) return false;
  if (opp.status === 'closed') return false;
  if (opp.deadline && new Date(opp.deadline) < new Date()) return false;
  if (!opp.eligible_countries?.some(c => c.toLowerCase() === 'zambia')) return false;
  return true;
};

const upsertOpportunity = async opp => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { data: existing } = await supabase
    .from('funding_opportunities')
    .select('id')
    .eq('hash', opp.hash)
    .maybeSingle();

  const { error } = await supabase
    .from('funding_opportunities')
    .upsert(opp, { onConflict: 'hash' });

  if (error) throw error;
  return existing ? 'updated' : 'inserted';
};

const runFundingRefresh = async ({ limit = 30 } = {}) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data: runRow, error: runError } = await supabase
    .from('funding_runs')
    .insert({ status: 'running' })
    .select('id')
    .single();

  if (runError) throw runError;

  const summary = {
    discovered_count: 0,
    inserted_count: 0,
    updated_count: 0,
    skipped_count: 0,
    run_id: runRow.id,
    errors: [],
  };

  try {
    const links = await discoverLinks();
    summary.discovered_count = links.length;

    const slice = links.slice(0, limit);
    for (const link of slice) {
      const html = await fetchPage(link);
      if (!html) {
        summary.skipped_count += 1;
        continue;
      }

      const pageText = cleanText(html);
      let extracted;
      try {
        extracted = await extractWithOpenAI({ url: link, pageText });
      } catch (error) {
        summary.errors.push({ url: link, message: error.message });
        summary.skipped_count += 1;
        continue;
      }

      const normalized = normalizeOpportunity(extracted, link);
      if (!validateOpportunity(normalized)) {
        summary.skipped_count += 1;
        continue;
      }

      try {
        const action = await upsertOpportunity(normalized);
        if (action === 'updated') {
          summary.updated_count += 1;
        } else {
          summary.inserted_count += 1;
        }
      } catch (error) {
        summary.errors.push({ url: link, message: error.message });
        summary.skipped_count += 1;
      }
    }

    await supabase
      .from('funding_runs')
      .update({
        status: 'success',
        discovered_count: summary.discovered_count,
        inserted_count: summary.inserted_count,
        updated_count: summary.updated_count,
        skipped_count: summary.skipped_count,
        finished_at: new Date().toISOString(),
        error: summary.errors.length ? JSON.stringify(summary.errors.slice(0, 5)) : null,
      })
      .eq('id', runRow.id);
  } catch (error) {
    summary.errors.push({ message: error.message });
    await supabase
      .from('funding_runs')
      .update({ status: 'fail', error: error.message, finished_at: new Date().toISOString() })
      .eq('id', runRow.id);
    throw error;
  }

  return summary;
};

module.exports = {
  runFundingRefresh,
};
