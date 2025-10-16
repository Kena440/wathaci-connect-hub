import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type MatcherRequestBody = {
  projectRequirements?: string;
  skills?: string[];
  budget?: number | null;
  location?: string | null;
};

type FreelancerRecord = {
  id: string;
  name?: string;
  title?: string;
  bio?: string;
  skills?: string[] | string | null;
  hourly_rate?: number | null;
  currency?: string | null;
  location?: string | null;
  country?: string | null;
  rating?: number | null;
  reviews_count?: number | null;
  profile_image_url?: string | null;
  availability_status?: string | null;
  linkedin_url?: string | null;
};

type MatchResult = {
  avatar?: string | null;
  name?: string;
  title?: string;
  match_score: number;
  bio?: string;
  skills: string[];
  location?: string | null;
  hourly_rate?: number | null;
  rating?: number | null;
  reviews_count?: number | null;
  linkedin_url?: string | null;
};

const normalizeSkills = (value: FreelancerRecord['skills']): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((skill) => String(skill).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);
};

const extractKeywords = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9+]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !['the', 'and', 'for', 'with', 'that', 'from'].includes(token));

const calculateMatchScore = (
  freelancer: FreelancerRecord,
  request: Required<Pick<MatcherRequestBody, 'projectRequirements' | 'skills'>> &
    Pick<MatcherRequestBody, 'budget' | 'location'>,
): MatchResult => {
  const freelancerSkills = normalizeSkills(freelancer.skills).map((skill) => skill.toLowerCase());
  const requestedSkills = request.skills.map((skill) => skill.toLowerCase());
  const skillMatches = requestedSkills.filter((skill) => freelancerSkills.includes(skill));

  const skillScore = requestedSkills.length
    ? Math.min(60, Math.round((skillMatches.length / requestedSkills.length) * 60))
    : 0;

  let budgetScore = 0;
  if (typeof request.budget === 'number' && request.budget >= 0 && typeof freelancer.hourly_rate === 'number') {
    if (freelancer.hourly_rate <= request.budget) {
      budgetScore = 20;
    } else if (freelancer.hourly_rate <= request.budget * 1.25) {
      budgetScore = 10;
    }
  }

  let locationScore = 0;
  if (request.location) {
    const desired = request.location.toLowerCase();
    const locationsToCompare = [freelancer.location, freelancer.country]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());

    if (locationsToCompare.some((value) => value === desired)) {
      locationScore = 15;
    } else if (locationsToCompare.some((value) => value.includes(desired))) {
      locationScore = 8;
    }
  }

  let requirementScore = 0;
  if (request.projectRequirements) {
    const requirementKeywords = extractKeywords(request.projectRequirements);
    if (requirementKeywords.length > 0) {
      const haystacks = [freelancer.bio, freelancer.title]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      const requirementMatches = requirementKeywords.filter((keyword) =>
        haystacks.some((content) => content.includes(keyword)),
      );

      requirementScore = Math.min(25, Math.round((requirementMatches.length / requirementKeywords.length) * 25));
    }
  }

  const totalScore = Math.min(100, skillScore + budgetScore + locationScore + requirementScore);

  return {
    avatar: freelancer.profile_image_url ?? null,
    name: freelancer.name,
    title: freelancer.title,
    match_score: totalScore,
    bio: freelancer.bio ?? undefined,
    skills: normalizeSkills(freelancer.skills).slice(0, 10),
    location: freelancer.location ?? freelancer.country ?? null,
    hourly_rate: freelancer.hourly_rate ?? null,
    rating: freelancer.rating ?? null,
    reviews_count: freelancer.reviews_count ?? null,
    linkedin_url: freelancer.linkedin_url ?? null,
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ matches: [], error: 'Method not allowed. Use POST.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 },
    );
  }

  try {
    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({ matches: [], error: 'Invalid content type. Expected application/json.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 415 },
      );
    }

    const body: MatcherRequestBody = await req.json();

    const validationErrors: string[] = [];

    if (!body.projectRequirements || typeof body.projectRequirements !== 'string') {
      validationErrors.push('Project requirements are required.');
    }

    if (!Array.isArray(body.skills) || body.skills.length === 0) {
      validationErrors.push('At least one skill is required.');
    }

    if (body.budget !== null && body.budget !== undefined && typeof body.budget !== 'number') {
      validationErrors.push('Budget must be a number if provided.');
    }

    if (body.location !== null && body.location !== undefined && typeof body.location !== 'string') {
      validationErrors.push('Location must be a string if provided.');
    }

    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify({ matches: [], error: 'Validation failed', details: validationErrors }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('Freelancer matcher error: Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ matches: [], error: 'Supabase client not configured.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabaseClient
      .from<FreelancerRecord>('freelancers')
      .select(
        'id, name, title, bio, skills, hourly_rate, currency, location, country, rating, reviews_count, profile_image_url, availability_status, linkedin_url',
      )
      .eq('availability_status', 'available');

    if (error) {
      console.error('Freelancer matcher database error:', error);
      return new Response(
        JSON.stringify({ matches: [], error: 'Unable to fetch freelancers at the moment.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
      );
    }

    const requestPayload = {
      projectRequirements: body.projectRequirements.trim(),
      skills: body.skills.map((skill) => skill.trim()).filter(Boolean),
      budget: body.budget ?? undefined,
      location: body.location ? body.location.trim() : undefined,
    };

    const matches = (data ?? [])
      .map((freelancer) => calculateMatchScore(freelancer, requestPayload))
      .filter((match) => match.match_score > 0)
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 10);

    return new Response(
      JSON.stringify({ matches }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error) {
    console.error('Freelancer matcher unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unexpected error occurred.';

    return new Response(
      JSON.stringify({ matches: [], error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
