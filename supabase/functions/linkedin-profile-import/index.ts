import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LINKEDIN_URL_RE = /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/(in|company|school)\/[^\s?#]+/i;

type AccountType = 'sme' | 'freelancer' | 'investor' | 'government';

const ROLE_SHAPES: Record<AccountType, string> = {
  freelancer: `"role": {
  "professional_title": string,
  "primary_skills": string[] (max 10),
  "services_offered": string (30-400 chars),
  "experience_level": "junior" | "mid" | "senior" | "expert" | null,
  "work_mode": "remote" | "hybrid" | "on-site" | null,
  "certifications": string[],
  "languages": string[],
  "preferred_industries": string[],
  "portfolio_url": string | null
}`,
  sme: `"role": {
  "business_name": string,
  "industry": string,
  "business_stage": "idea" | "early" | "growth" | "established" | null,
  "services_or_products": string (30-400 chars),
  "top_needs": string[],
  "areas_served": string[],
  "sectors_of_interest": string[]
}`,
  investor: `"role": {
  "investor_type": "angel" | "vc" | "fund" | "corporate" | "dfi" | "other" | null,
  "investment_stage_focus": string[],
  "sectors_of_interest": string[],
  "geo_focus": string[],
  "thesis": string | null
}`,
  government: `"role": {
  "institution_name": string,
  "department_or_unit": string,
  "institution_type": "ministry" | "agency" | "parastatal" | "local_authority" | "regulator" | "other" | null,
  "mandate_areas": string[],
  "services_or_programmes": string (30-400 chars),
  "collaboration_interests": string[],
  "contact_person_title": string | null
}`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Authorization required' }, 401);
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authError || !user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const linkedinUrl = typeof body.linkedin_url === 'string' ? body.linkedin_url.trim() : '';
    const pastedText = typeof body.pasted_text === 'string' ? body.pasted_text.trim().slice(0, 12000) : '';
    const accountType = (['sme', 'freelancer', 'investor', 'government'] as const).includes(body.account_type)
      ? body.account_type as AccountType
      : 'freelancer';

    if (linkedinUrl && !LINKEDIN_URL_RE.test(linkedinUrl)) {
      return json({ error: 'Please enter a valid LinkedIn profile or company URL.' }, 400);
    }
    if (pastedText.length < 60) {
      return json({
        error: 'Paste at least a short section of your LinkedIn profile (headline, About, and recent experience) so we can build your profile.',
      }, 400);
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return json({ error: 'AI is not configured for this project.' }, 500);
    }

    const prompt = `You are helping a user of WATHACI Connect (a Zambian business platform) turn their LinkedIn profile text into a structured platform profile.

LinkedIn URL: ${linkedinUrl || 'not provided'}
Account type: ${accountType}

LINKEDIN PROFILE TEXT (verbatim from the user):
"""
${pastedText}
"""

Extract only what is genuinely supported by the text. Never invent employers, credentials, or numbers. Use null or an empty array when unknown. Keep the bio in first person, warm and concise.

Return JSON with exactly this shape:
{
  "base": {
    "full_name": string | null,
    "display_name": string | null,
    "city": string | null,
    "country": string | null,
    "bio": string (20-280 chars) | null,
    "website_url": string | null
  },
  ${ROLE_SHAPES[accountType]},
  "notes": string (one short sentence about what could not be inferred)
}`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You extract structured profile data from LinkedIn text. Respond with JSON only.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text();
      console.error(`AI gateway error [${aiRes.status}]: ${detail}`);
      if (aiRes.status === 429) {
        return json({ error: 'AI is busy right now. Please try again in a moment.' }, 429);
      }
      if (aiRes.status === 402) {
        return json({ error: 'AI credits are exhausted. Please top up in workspace settings.' }, 402);
      }
      return json({ error: 'Could not read that LinkedIn text.', details: detail }, aiRes.status);
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? '{}';
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error('Unparseable AI content:', content);
      return json({ error: 'Could not structure that LinkedIn text. Try pasting a bit more.' }, 502);
    }

    // Persist the LinkedIn URL right away so it is never lost.
    if (linkedinUrl) {
      await supabase.from('profiles').update({ linkedin_url: linkedinUrl }).eq('id', user.id);
    }

    return json({
      success: true,
      account_type: accountType,
      linkedin_url: linkedinUrl || null,
      base: parsed.base ?? {},
      role: parsed.role ?? {},
      notes: parsed.notes ?? null,
    }, 200);
  } catch (err) {
    console.error('linkedin-profile-import failed:', err);
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
