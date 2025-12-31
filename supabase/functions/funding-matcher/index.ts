import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { businessProfile, fundingNeeds } = await req.json();
    console.log('Funding matcher - business:', businessProfile?.businessType, 'amount:', fundingNeeds?.amount);

    // Fetch available opportunities
    const { data: opportunities } = await supabase
      .from('funding_opportunities')
      .select('*')
      .eq('is_active', true)
      .order('is_featured', { ascending: false });

    if (!opportunities || opportunities.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        matches: [],
        message: 'No funding opportunities currently available. Check back soon!' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Use AI to match and rank opportunities
    const prompt = `You are a funding opportunity matcher for African businesses. Match the business profile to the available funding opportunities and rank them by relevance.

BUSINESS PROFILE:
- Type: ${businessProfile.businessType}
- Sector: ${businessProfile.sector}
- Stage: ${businessProfile.stage}
- Location: ${businessProfile.location}
- Employees: ${businessProfile.employees}

FUNDING NEEDS:
- Amount: ${fundingNeeds.amount}
- Purpose: ${fundingNeeds.purpose}
- Timeline: ${fundingNeeds.timeline}

AVAILABLE OPPORTUNITIES:
${opportunities.map((o, i) => `
${i + 1}. ${o.title}
   - Organization: ${o.organization}
   - Amount: ${o.amount_display || `$${o.amount_min} - $${o.amount_max}`}
   - Category: ${o.category}
   - Type: ${o.funding_type}
   - Sectors: ${o.sectors?.join(', ') || 'All'}
   - Eligibility: ${o.eligibility_criteria?.join(', ') || 'Various'}
`).join('\n')}

Return a JSON array of matched opportunities (top 5), each with:
- id: the opportunity ID from the list (index + 1)
- title: opportunity title
- provider: organization name
- match_score: 0-100 score
- description: why this is a good match
- max_amount: funding amount available
- funding_type: type of funding
- application_deadline: deadline if known
- reasoning: detailed explanation of match

Return ONLY valid JSON array, no markdown.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5
      })
    });

    if (!aiResponse.ok) {
      throw new Error('AI matching failed');
    }

    const aiData = await aiResponse.json();
    const matchText = aiData.choices[0]?.message?.content || '';

    let matches;
    try {
      const cleanedText = matchText.replace(/```json\n?|\n?```/g, '').trim();
      matches = JSON.parse(cleanedText);
    } catch (e) {
      console.error('Failed to parse AI matches:', matchText);
      // Return top opportunities as fallback
      matches = opportunities.slice(0, 5).map((opp, i) => ({
        id: opp.id,
        title: opp.title,
        provider: opp.organization,
        match_score: 90 - i * 5,
        description: opp.description,
        max_amount: opp.amount_display,
        funding_type: opp.funding_type,
        application_deadline: opp.deadline,
        reasoning: 'Based on your business profile and funding needs'
      }));
    }

    // Map AI matches to actual opportunity data
    const enrichedMatches = matches.map((match: any) => {
      const opp = opportunities.find(o => o.id === match.id || o.title === match.title);
      return {
        ...match,
        id: opp?.id || match.id,
        application_deadline: opp?.deadline || match.application_deadline
      };
    });

    return new Response(JSON.stringify({ success: true, matches: enrichedMatches }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    console.error('Funding matcher error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
