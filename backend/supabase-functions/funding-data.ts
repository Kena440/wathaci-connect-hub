export interface FundingOpportunity {
  id: string;
  title: string;
  organization: string;
  description: string;
  amount: number;
  deadline: string; // ISO date string
  sectors: string[];
  countries: string[];
  type: string;
  requirements: string[];
}

export interface Professional {
  id: string;
  name: string;
  expertise: string[];
  experience: string;
  successRate: number; // 0-1
  rating: number; // 0-5
  hourlyRate: string;
  availability: string;
}

// Helper to work in both Deno (Supabase Edge Functions) and Node (tests)
function getEnv(key: string): string | undefined {
  // @ts-expect-error - Deno may not exist in Node environment
  if (typeof Deno !== 'undefined' && Deno?.env) {
    // @ts-expect-error - Deno global is not available in Node environment
    return Deno.env.get(key);
  }
  return process.env[key];
}

const SUPABASE_URL = getEnv('SUPABASE_URL') ?? '';
const SUPABASE_KEY = getEnv('SUPABASE_ANON_KEY') ?? '';

async function fetchFromTable<T>(table: string): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${table}`);
  }

  return res.json() as Promise<T[]>;
}

export function fetchFundingOpportunities(): Promise<FundingOpportunity[]> {
  return fetchFromTable<FundingOpportunity>('funding_opportunities');
}

export function fetchProfessionals(): Promise<Professional[]> {
  return fetchFromTable<Professional>('professionals');
}

