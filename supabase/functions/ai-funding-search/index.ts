import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FundingOpportunity {
  title: string;
  organization: string;
  funding_type: string;
  summary: string;
  eligibility_criteria: string[];
  sectors: string[];
  target_stage: string[];
  amount_display: string;
  amount_min: number | null;
  amount_max: number | null;
  deadline: string | null;
  region_focus: string[];
  requirements: string;
  application_url: string;
  source_url: string;
  confidence_score: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, forceRefresh } = await req.json();
    console.log('AI Funding Search action:', action);

    switch (action) {
      case 'search_opportunities': {
        // Check last refresh time
        const { data: lastOpportunity } = await supabase
          .from('funding_opportunities')
          .select('last_checked_at')
          .order('last_checked_at', { ascending: false })
          .limit(1)
          .single();

        const lastChecked = lastOpportunity?.last_checked_at 
          ? new Date(lastOpportunity.last_checked_at) 
          : null;
        const hoursSinceCheck = lastChecked 
          ? (Date.now() - lastChecked.getTime()) / (1000 * 60 * 60) 
          : 24;

        // Only search if data is stale (>12 hours) or forced
        if (hoursSinceCheck < 12 && !forceRefresh) {
          const { data: cachedOpportunities } = await supabase
            .from('funding_opportunities')
            .select('*')
            .eq('is_active', true)
            .order('confidence_score', { ascending: false })
            .limit(15);

          return new Response(JSON.stringify({ 
            success: true, 
            opportunities: cachedOpportunities,
            cached: true,
            lastUpdated: lastChecked?.toISOString()
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Use AI to search and extract funding opportunities for Zambia
        const searchPrompt = `You are an expert researcher finding active funding opportunities for SMEs and startups in Zambia, Africa.

Search for and compile the TOP 15 most relevant, currently active funding opportunities that Zambian businesses can apply for. Include:
- Grants (government, NGO, international development)
- Loans (development finance, microfinance, commercial)
- Equity investments (angel, VC, impact investors)
- Competitions and accelerators
- Technical assistance programs

For each opportunity, provide:
1. title: Clear, descriptive title
2. organization: Funding provider/organization name
3. funding_type: One of [grant, loan, equity, competition, accelerator, technical_assistance]
4. summary: 2-3 sentence description (max 200 chars)
5. eligibility_criteria: Array of 3-5 key eligibility requirements
6. sectors: Array of target sectors (e.g., agriculture, technology, renewable_energy, manufacturing, healthcare, education, fintech, tourism)
7. target_stage: Array from [idea, early, growth, established]
8. amount_display: Human-readable amount (e.g., "USD 10,000 - USD 50,000")
9. amount_min: Minimum amount in USD (number or null)
10. amount_max: Maximum amount in USD (number or null)
11. deadline: ISO date string if known, null if rolling/ongoing
12. region_focus: Array of regions (should include "Zambia" or "Africa")
13. requirements: Brief requirements text
14. application_url: Official application link (use realistic placeholder if unknown: https://example.org/apply)
15. source_url: Source where this was found (use realistic placeholder if unknown)
16. confidence_score: 0.0-1.0 confidence this is accurate/current

Focus on opportunities that:
- Explicitly accept applications from Zambia or Africa
- Are currently active or accepting applications
- Have clear eligibility criteria
- Come from reputable organizations

Return ONLY a valid JSON array of 15 opportunities. No markdown, no explanation.`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: searchPrompt }],
            temperature: 0.7
          })
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error('AI search failed:', aiResponse.status, errorText);
          throw new Error('AI search failed');
        }

        const aiData = await aiResponse.json();
        const responseText = aiData.choices[0]?.message?.content || '';
        console.log('AI Response received, parsing...');

        let opportunities: FundingOpportunity[];
        try {
          const cleanedText = responseText.replace(/```json\n?|\n?```/g, '').trim();
          opportunities = JSON.parse(cleanedText);
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError);
          console.error('Response text:', responseText.substring(0, 500));
          throw new Error('Failed to parse funding opportunities');
        }

        // Validate and store opportunities
        const now = new Date().toISOString();
        const validOpportunities = opportunities
          .filter(opp => opp.title && opp.organization && opp.application_url)
          .slice(0, 15);

        // Deactivate old opportunities first
        await supabase
          .from('funding_opportunities')
          .update({ is_active: false })
          .lt('last_checked_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        // Upsert new opportunities
        for (const opp of validOpportunities) {
          const { error } = await supabase
            .from('funding_opportunities')
            .upsert({
              title: opp.title,
              organization: opp.organization,
              category: opp.funding_type || 'grant',
              funding_type: opp.funding_type,
              description: opp.summary,
              summary: opp.summary,
              eligibility_criteria: opp.eligibility_criteria || [],
              sectors: opp.sectors || [],
              target_stage: opp.target_stage || [],
              amount_display: opp.amount_display,
              amount_min: opp.amount_min,
              amount_max: opp.amount_max,
              deadline: opp.deadline,
              region_focus: opp.region_focus || ['Zambia', 'Africa'],
              requirements: opp.requirements,
              application_url: opp.application_url,
              source_url: opp.source_url,
              confidence_score: opp.confidence_score || 0.8,
              is_active: true,
              last_checked_at: now,
              updated_at: now
            }, {
              onConflict: 'title,organization',
              ignoreDuplicates: false
            });

          if (error) {
            console.error('Error upserting opportunity:', error);
          }
        }

        // Fetch the updated list
        const { data: finalOpportunities } = await supabase
          .from('funding_opportunities')
          .select('*')
          .eq('is_active', true)
          .order('confidence_score', { ascending: false })
          .limit(15);

        return new Response(JSON.stringify({ 
          success: true, 
          opportunities: finalOpportunities,
          cached: false,
          lastUpdated: now
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_top_opportunities': {
        const { data: opportunities, error } = await supabase
          .from('funding_opportunities')
          .select('*')
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .order('confidence_score', { ascending: false })
          .limit(15);

        if (error) throw error;

        // Get last update time
        const lastUpdated = opportunities?.[0]?.last_checked_at || null;

        return new Response(JSON.stringify({ 
          success: true, 
          opportunities,
          lastUpdated
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    console.error('AI Funding Search error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
