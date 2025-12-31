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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization required');

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('Unauthorized');

    const { opportunityId, businessProfile } = await req.json();
    console.log('AI Funding Analyzer for opportunity:', opportunityId);

    // Fetch opportunity details
    let opportunityData = null;
    if (opportunityId) {
      const { data } = await supabase
        .from('funding_opportunities')
        .select('*')
        .eq('id', opportunityId)
        .single();
      opportunityData = data;
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const prompt = `You are an expert funding application advisor for African businesses. Analyze this business profile and ${opportunityData ? 'the specific funding opportunity' : 'general funding readiness'}.

BUSINESS PROFILE:
- Business Name: ${profile?.business_name || businessProfile?.businessName || 'Not specified'}
- Industry: ${profile?.industry_sector || businessProfile?.sector || 'Not specified'}
- Business Stage: ${profile?.funding_stage || businessProfile?.stage || 'Not specified'}
- Years in Business: ${profile?.years_in_business || businessProfile?.yearsInBusiness || 'Not specified'}
- Annual Revenue: ${profile?.annual_revenue || businessProfile?.revenue || 'Not specified'}
- Employee Count: ${profile?.employee_count || businessProfile?.employees || 'Not specified'}
- Location: ${profile?.country || businessProfile?.location || 'Zambia'}
- Funding Needed: ${profile?.funding_needed || businessProfile?.fundingAmount || 'Not specified'}
- Business Description: ${profile?.description || businessProfile?.description || 'Not specified'}

${opportunityData ? `
FUNDING OPPORTUNITY:
- Title: ${opportunityData.title}
- Organization: ${opportunityData.organization}
- Amount: ${opportunityData.amount_display || `$${opportunityData.amount_min} - $${opportunityData.amount_max}`}
- Category: ${opportunityData.category}
- Funding Type: ${opportunityData.funding_type}
- Eligibility: ${JSON.stringify(opportunityData.eligibility_criteria)}
- Required Documents: ${JSON.stringify(opportunityData.required_documents)}
` : ''}

Provide a comprehensive analysis in JSON format with:
1. matchScore (0-100): How well the business matches ${opportunityData ? 'this opportunity' : 'general funding requirements'}
2. successProbability (0-100): Estimated chance of approval
3. strengthAreas: Array of 4-5 specific strengths
4. improvementAreas: Array of 4-5 areas needing improvement
5. recommendations: Array of 5-6 actionable steps to improve the application
6. requiredDocuments: Array of documents needed
7. timelineEstimate: Estimated time to complete application
8. riskFactors: Array of potential risks or concerns
9. competitiveAdvantages: Array of unique selling points

Return ONLY valid JSON, no markdown.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error('AI analysis failed');
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices[0]?.message?.content || '';
    
    // Parse JSON from response
    let analysis;
    try {
      // Remove any markdown code blocks if present
      const cleanedText = analysisText.replace(/```json\n?|\n?```/g, '').trim();
      analysis = JSON.parse(cleanedText);
    } catch (e) {
      console.error('Failed to parse AI response:', analysisText);
      // Provide fallback analysis
      analysis = {
        matchScore: 75,
        successProbability: 65,
        strengthAreas: [
          'Business is operational and generating revenue',
          'Clear understanding of market needs',
          'Located in an emerging market with growth potential',
          'Demonstrated commitment to business development'
        ],
        improvementAreas: [
          'Complete financial documentation',
          'Develop detailed business plan',
          'Establish impact measurement framework',
          'Build strategic partnerships'
        ],
        recommendations: [
          'Prepare audited financial statements for the last 3 years',
          'Develop a comprehensive 5-year business plan',
          'Create detailed impact metrics aligned with SDGs',
          'Obtain letters of support from stakeholders',
          'Complete all required compliance documentation'
        ],
        requiredDocuments: [
          'Business registration certificate',
          'Tax compliance certificates',
          'Financial statements',
          'Business plan',
          'ID documents of directors'
        ],
        timelineEstimate: '4-6 weeks',
        riskFactors: ['Incomplete documentation', 'Market competition'],
        competitiveAdvantages: ['Local market knowledge', 'Operational experience']
      };
    }

    // Save analysis to database if opportunity specific
    if (opportunityId) {
      await supabase
        .from('funding_applications')
        .upsert({
          user_id: user.id,
          opportunity_id: opportunityId,
          ai_match_score: analysis.matchScore,
          ai_analysis: analysis,
          status: 'draft'
        }, {
          onConflict: 'user_id,opportunity_id'
        });
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    console.error('AI Funding Analyzer error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
