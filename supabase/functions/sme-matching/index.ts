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

    const { action, smeId } = await req.json();
    console.log('SME Matching action:', action, 'for SME:', smeId);

    switch (action) {
      case 'match_funding': {
        // Get SME profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', smeId)
          .single();

        if (profileError || !profile) {
          throw new Error('SME profile not found');
        }

        // Get SME-specific profile data
        const { data: smeProfile } = await supabase
          .from('sme_profiles')
          .select('*')
          .eq('profile_id', smeId)
          .single();

        // Get active funding opportunities
        const { data: opportunities } = await supabase
          .from('funding_opportunities')
          .select('*')
          .eq('is_active', true)
          .order('confidence_score', { ascending: false });

        if (!opportunities || opportunities.length === 0) {
          return new Response(JSON.stringify({ 
            success: true, 
            matches: [],
            message: 'No active funding opportunities available'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Build SME context for matching
        const smeContext = {
          industry: smeProfile?.industry || profile.industry_sector,
          stage: smeProfile?.business_stage || profile.funding_stage || 'early',
          location: profile.city || 'Zambia',
          country: profile.country || 'Zambia',
          needs: smeProfile?.top_needs || profile.gaps_identified || [],
          sectors: smeProfile?.sectors_of_interest || profile.sectors || [],
          fundingNeeded: smeProfile?.funding_needed || profile.funding_needed,
          fundingRange: smeProfile?.funding_range,
          teamSize: smeProfile?.team_size_range,
          revenueRange: smeProfile?.monthly_revenue_range,
          services: smeProfile?.services_or_products || profile.description
        };

        // Use AI to match and score opportunities
        const matchPrompt = `You are a funding matching expert. Match this SME to available funding opportunities and score each match.

SME PROFILE:
- Industry: ${smeContext.industry}
- Business Stage: ${smeContext.stage}
- Location: ${smeContext.location}, ${smeContext.country}
- Key Needs: ${JSON.stringify(smeContext.needs)}
- Sectors: ${JSON.stringify(smeContext.sectors)}
- Funding Needed: ${smeContext.fundingNeeded ? 'Yes' : 'Unknown'}
- Funding Range: ${smeContext.fundingRange || 'Not specified'}
- Team Size: ${smeContext.teamSize || 'Not specified'}
- Revenue: ${smeContext.revenueRange || 'Not specified'}
- Products/Services: ${smeContext.services || 'Not specified'}

AVAILABLE FUNDING OPPORTUNITIES:
${opportunities.map((o, i) => `
${i + 1}. ID: ${o.id}
   Title: ${o.title}
   Organization: ${o.organization}
   Type: ${o.funding_type}
   Amount: ${o.amount_display}
   Sectors: ${o.sectors?.join(', ') || 'Various'}
   Target Stage: ${o.target_stage?.join(', ') || 'All stages'}
   Eligibility: ${o.eligibility_criteria?.join('; ') || 'See application'}
   Region: ${o.region_focus?.join(', ') || 'Africa'}
`).join('\n')}

For each opportunity, calculate a match score (0-100) and provide:
1. funding_id: The opportunity ID
2. match_score: 0-100 based on eligibility fit, sector alignment, stage match, location eligibility
3. reasons: Array of 3-5 specific reasons why this is a good match
4. action_plan: 2-3 specific next steps for the SME to apply

Return JSON array of TOP 10 matches, sorted by match_score descending. Only include opportunities with match_score >= 40.

Return ONLY valid JSON array. No markdown.`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: matchPrompt }],
            temperature: 0.4
          })
        });

        if (!aiResponse.ok) {
          throw new Error('AI matching failed');
        }

        const aiData = await aiResponse.json();
        const responseText = aiData.choices[0]?.message?.content || '';

        let matches;
        try {
          const cleanedText = responseText.replace(/```json\n?|\n?```/g, '').trim();
          matches = JSON.parse(cleanedText);
        } catch (e) {
          console.error('Failed to parse AI matches:', e);
          // Fallback: return top opportunities by confidence
          matches = opportunities.slice(0, 5).map((opp, i) => ({
            funding_id: opp.id,
            match_score: 85 - i * 5,
            reasons: ['Located in eligible region', 'Sector alignment', 'Stage match'],
            action_plan: 'Review eligibility criteria and prepare application documents.'
          }));
        }

        // Store matches in database
        const now = new Date().toISOString();
        for (const match of matches) {
          const { error } = await supabase
            .from('funding_matches')
            .upsert({
              funding_id: match.funding_id,
              sme_id: smeId,
              match_score: match.match_score,
              reasons: match.reasons || [],
              action_plan: match.action_plan || ''
            }, {
              onConflict: 'funding_id,sme_id'
            });

          if (error) {
            console.error('Error storing match:', error);
          }
        }

        // Enrich matches with opportunity details
        const enrichedMatches = matches.map((match: any) => {
          const opp = opportunities.find(o => o.id === match.funding_id);
          return {
            ...match,
            opportunity: opp ? {
              id: opp.id,
              title: opp.title,
              organization: opp.organization,
              funding_type: opp.funding_type,
              amount_display: opp.amount_display,
              deadline: opp.deadline,
              application_url: opp.application_url
            } : null
          };
        }).filter((m: any) => m.opportunity);

        return new Response(JSON.stringify({ 
          success: true, 
          matches: enrichedMatches 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'match_professionals': {
        // Get SME profile and needs
        const { data: smeProfile } = await supabase
          .from('sme_profiles')
          .select('*')
          .eq('profile_id', smeId)
          .single();

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', smeId)
          .single();

        // Get needs from SME profile
        const needs = smeProfile?.top_needs || profile?.gaps_identified || [];
        const preferredSupport = smeProfile?.preferred_support || [];

        // Define needs-to-skills mapping
        const needsToSkills: Record<string, string[]> = {
          'compliance': ['compliance', 'regulatory', 'legal', 'audit', 'governance'],
          'marketing': ['marketing', 'digital marketing', 'branding', 'content', 'social media', 'SEO'],
          'technology': ['software', 'web development', 'mobile', 'IT', 'tech', 'programming', 'digital'],
          'finance': ['accounting', 'financial', 'bookkeeping', 'tax', 'CFO', 'financial modeling'],
          'funding': ['grants', 'fundraising', 'investor relations', 'pitch', 'business plan'],
          'partnerships': ['business development', 'partnerships', 'networking', 'sales'],
          'export': ['export', 'trade', 'international', 'logistics', 'customs'],
          'operations': ['operations', 'supply chain', 'procurement', 'logistics'],
          'hr': ['HR', 'human resources', 'recruitment', 'training']
        };

        // Build skill requirements based on needs
        const requiredSkills: string[] = [];
        for (const need of [...needs, ...preferredSupport]) {
          const needLower = need.toLowerCase();
          for (const [key, skills] of Object.entries(needsToSkills)) {
            if (needLower.includes(key)) {
              requiredSkills.push(...skills);
            }
          }
        }

        // Get freelancer profiles
        const { data: freelancers } = await supabase
          .from('freelancer_profiles')
          .select(`
            *,
            profile:profiles(*)
          `)
          .limit(50);

        if (!freelancers || freelancers.length === 0) {
          return new Response(JSON.stringify({ 
            success: true, 
            matches: [],
            message: 'No professionals available for matching'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Use AI to match professionals to SME needs
        const matchPrompt = `You are an expert at matching SMEs with professionals who can help them become funding-ready.

SME NEEDS:
- Top Needs: ${needs.join(', ') || 'General business support'}
- Preferred Support: ${preferredSupport.join(', ') || 'Not specified'}
- Industry: ${smeProfile?.industry || 'General'}
- Business Stage: ${smeProfile?.business_stage || 'Early'}

AVAILABLE PROFESSIONALS:
${freelancers.map((f, i) => `
${i + 1}. ID: ${f.profile_id}
   Title: ${f.professional_title}
   Skills: ${f.primary_skills?.join(', ')}
   Services: ${f.services_offered}
   Experience: ${f.experience_level}
   Industries: ${f.preferred_industries?.join(', ') || 'Various'}
   Availability: ${f.availability}
   Rate: ${f.rate_type} - ${f.rate_range}
`).join('\n')}

Match professionals to the SME's needs. For each match provide:
1. professional_id: The professional's profile_id
2. match_score: 0-100 based on skill relevance, experience, availability
3. reasons: Array of 3 specific reasons why this professional can help
4. recommended_scope: Specific deliverables they could provide (1-2 sentences)

Return JSON array of TOP 8 matches with match_score >= 50, sorted descending.
Return ONLY valid JSON array. No markdown.`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: matchPrompt }],
            temperature: 0.4
          })
        });

        if (!aiResponse.ok) {
          throw new Error('AI professional matching failed');
        }

        const aiData = await aiResponse.json();
        const responseText = aiData.choices[0]?.message?.content || '';

        let matches;
        try {
          const cleanedText = responseText.replace(/```json\n?|\n?```/g, '').trim();
          matches = JSON.parse(cleanedText);
        } catch (e) {
          console.error('Failed to parse AI professional matches:', e);
          // Fallback
          matches = freelancers.slice(0, 5).map((f, i) => ({
            professional_id: f.profile_id,
            match_score: 80 - i * 5,
            reasons: ['Relevant skills', 'Available', 'Experience match'],
            recommended_scope: 'General consulting services'
          }));
        }

        // Store matches
        for (const match of matches) {
          await supabase
            .from('sme_professional_matches')
            .upsert({
              sme_id: smeId,
              professional_id: match.professional_id,
              match_score: match.match_score,
              reasons: match.reasons || [],
              recommended_scope: match.recommended_scope || ''
            }, {
              onConflict: 'sme_id,professional_id'
            });
        }

        // Enrich with profile details
        const enrichedMatches = matches.map((match: any) => {
          const freelancer = freelancers.find(f => f.profile_id === match.professional_id);
          return {
            ...match,
            professional: freelancer ? {
              id: freelancer.profile_id,
              title: freelancer.professional_title,
              skills: freelancer.primary_skills,
              services: freelancer.services_offered,
              experience: freelancer.experience_level,
              rate: `${freelancer.rate_type} - ${freelancer.rate_range}`,
              availability: freelancer.availability,
              name: freelancer.profile?.full_name || freelancer.profile?.display_name,
              avatar: freelancer.profile?.avatar_url
            } : null
          };
        }).filter((m: any) => m.professional);

        return new Response(JSON.stringify({ 
          success: true, 
          matches: enrichedMatches 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_my_matches': {
        // Get stored funding matches
        const { data: fundingMatches } = await supabase
          .from('funding_matches')
          .select(`
            *,
            funding:funding_opportunities(*)
          `)
          .eq('sme_id', smeId)
          .order('match_score', { ascending: false })
          .limit(10);

        // Get stored professional matches
        const { data: professionalMatches } = await supabase
          .from('sme_professional_matches')
          .select(`
            *,
            professional:profiles(id, full_name, display_name, avatar_url, title)
          `)
          .eq('sme_id', smeId)
          .order('match_score', { ascending: false })
          .limit(10);

        return new Response(JSON.stringify({ 
          success: true, 
          fundingMatches: fundingMatches || [],
          professionalMatches: professionalMatches || []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    console.error('SME Matching error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
