import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { fetchProfessionals } from './funding-data.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Helper to work in both Deno (Supabase Edge Functions) and Node (tests)
function getEnv(key: string): string | undefined {
  // @ts-ignore - Deno may not exist in Node environment
  if (typeof Deno !== 'undefined' && Deno?.env) {
    // @ts-ignore
    return Deno.env.get(key);
  }
  return process.env[key];
}

const OPENAI_API_KEY = getEnv('OPENAI_API_KEY') ?? '';

interface AssessmentRequest {
  assessmentId: string;
  gaps: string[];
  supportAreas: string[];
  budget: number;
}

interface Professional {
  id: string;
  name: string;
  expertise: string[];
  experience: string;
  successRate: number;
  rating: number;
  hourlyRate: string;
  availability: string;
  bio?: string;
  qualifications?: Array<{
    name: string;
    institution: string;
    year: number;
  }>;
}

interface ProfessionalRecommendation {
  professional: Professional;
  matchScore: number;
  recommendedFor: string[];
  aiReasoning: string;
}

// Enhanced professional matching with AI reasoning
async function generateRecommendations(
  gaps: string[],
  supportAreas: string[],
  budget: number,
  professionals: Professional[]
): Promise<ProfessionalRecommendation[]> {
  try {
    // Filter professionals within budget range first
    const affordableProfessionals = professionals.filter(prof => {
      const hourlyRate = parseFloat(prof.hourlyRate.replace(/[^0-9.]/g, ''));
      return hourlyRate <= (budget / 20); // Assuming ~20 hours per month
    });

    if (affordableProfessionals.length === 0) {
      return []; // No professionals within budget
    }

    // Calculate base match scores
    const professionalMatches = affordableProfessionals.map(prof => {
      let matchScore = 0;
      const matchedAreas: string[] = [];

      // Check expertise alignment with gaps and support areas
      const allNeeds = [...gaps, ...supportAreas];
      
      allNeeds.forEach(need => {
        prof.expertise.forEach(expertise => {
          if (expertise.toLowerCase().includes(need.toLowerCase()) || 
              need.toLowerCase().includes(expertise.toLowerCase())) {
            matchScore += 10;
            if (!matchedAreas.includes(need)) {
              matchedAreas.push(need);
            }
          }
        });
      });

      // Bonus for high success rate and rating
      matchScore += prof.successRate * 20; // Up to 20 points
      matchScore += prof.rating * 10; // Up to 50 points

      // Bonus for availability
      if (prof.availability === 'Available') {
        matchScore += 15;
      } else if (prof.availability === 'Limited') {
        matchScore += 5;
      }

      return {
        professional: prof,
        matchScore: Math.min(matchScore, 100), // Cap at 100%
        recommendedFor: matchedAreas,
        aiReasoning: ''
      };
    }).filter(match => match.matchScore > 30) // Only include reasonable matches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5); // Top 5 matches

    // Generate AI reasoning for top matches
    if (OPENAI_API_KEY && professionalMatches.length > 0) {
      for (const match of professionalMatches) {
        try {
          const prompt = `
As a business consultant AI, explain why ${match.professional.name} is a good match for an SME with these needs:

Business Gaps: ${gaps.join(', ')}
Support Areas Needed: ${supportAreas.join(', ')}
Budget: ZMW ${budget}/month

Professional Profile:
- Name: ${match.professional.name}
- Expertise: ${match.professional.expertise.join(', ')}
- Experience: ${match.professional.experience}
- Success Rate: ${(match.professional.successRate * 100).toFixed(0)}%
- Rating: ${match.professional.rating}/5
- Hourly Rate: ${match.professional.hourlyRate}

Provide a concise 2-3 sentence explanation of why this professional can help address the specific business needs. Focus on the expertise alignment and value proposition.
          `;

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              temperature: 0.7,
              max_tokens: 150,
              messages: [
                {
                  role: 'user',
                  content: prompt
                }
              ]
            })
          });

          if (response.ok) {
            const aiResult = await response.json();
            match.aiReasoning = aiResult.choices?.[0]?.message?.content?.trim() || 
              `${match.professional.name} has expertise in ${match.recommendedFor.join(', ')} which directly addresses your business needs.`;
          } else {
            match.aiReasoning = `${match.professional.name} has expertise in ${match.recommendedFor.join(', ')} which directly addresses your business needs.`;
          }
        } catch (error) {
          console.error('AI reasoning generation failed for professional:', match.professional.name, error);
          match.aiReasoning = `${match.professional.name} has expertise in ${match.recommendedFor.join(', ')} which directly addresses your business needs.`;
        }
      }
    } else {
      // Fallback reasoning without AI
      professionalMatches.forEach(match => {
        match.aiReasoning = `${match.professional.name} has expertise in ${match.recommendedFor.join(', ')} with a ${(match.professional.successRate * 100).toFixed(0)}% success rate, making them well-suited to help address your business challenges.`;
      });
    }

    return professionalMatches;

  } catch (error) {
    console.error('Error generating recommendations:', error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { assessmentId, gaps, supportAreas, budget }: AssessmentRequest = await req.json();

    if (!assessmentId || !gaps || !supportAreas) {
      throw new Error('Missing required parameters');
    }

    // Fetch available professionals
    const professionals = await fetchProfessionals();
    
    if (professionals.length === 0) {
      return new Response(
        JSON.stringify({ 
          recommendations: [],
          message: 'No professionals available at this time'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Generate AI-powered recommendations
    const recommendations = await generateRecommendations(
      gaps,
      supportAreas,
      budget,
      professionals
    );

    return new Response(
      JSON.stringify({ 
        recommendations,
        message: recommendations.length > 0 
          ? `Found ${recommendations.length} recommended professional${recommendations.length > 1 ? 's' : ''}`
          : 'No professionals found matching your criteria. Consider adjusting your budget or requirements.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('SME assessment recommendations error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        recommendations: []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});