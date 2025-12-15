import { apiGet, apiPost } from '@/lib/api/client';
import { supabaseClient } from '@/lib/supabaseClient';

export type PartnershipOpportunity = {
  id: string;
  title: string;
  description: string;
  partner_org_name: string;
  partner_org_type?: string | null;
  country_focus?: string[] | null;
  sectors?: string[] | null;
  partnership_type?: string[] | null;
  target_beneficiaries?: string[] | null;
  requirements_summary?: string | null;
  expected_value_for_partner?: string | null;
  expected_value_for_sme?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_ongoing?: boolean | null;
  link_to_more_info?: string | null;
  contact_email?: string | null;
  is_active?: boolean | null;
  is_featured?: boolean | null;
  tags?: string[] | null;
  created_by_profile_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type PartnershipInterest = {
  id: string;
  opportunity_id: string;
  initiator_profile_id: string;
  role?: string | null;
  status?: string | null;
  matching_score?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const authHeaders = async () => {
  try {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch (error) {
    console.warn('[partnership api] failed to resolve session', error);
    return {};
  }
};

export async function fetchPartnershipOpportunities(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    query.append(key, String(value));
  });
  const queryString = query.toString();
  const path = queryString ? `/api/partnerships/opportunities?${queryString}` : '/api/partnerships/opportunities';
  return apiGet<PaginatedResponse<PartnershipOpportunity>>(path);
}

export async function fetchPartnershipOpportunity(id: string) {
  return apiGet<PartnershipOpportunity>(`/api/partnerships/opportunities/${id}`);
}

export async function createPartnershipInterest(opportunityId: string, notes?: string, role?: string) {
  return apiPost<{ interest: PartnershipInterest }>(
    '/api/partnerships/interests',
    { opportunity_id: opportunityId, notes, role },
    { headers: await authHeaders() },
  );
}

export async function requestPartnershipMatches(profileId: string, topN = 5) {
  return apiPost<{ matches: { opportunity_id: string; score: number; reason?: string }[] }>(
    '/api/partnerships/match',
    { profileId, topN },
    { headers: await authHeaders() },
  );
}

export async function generateIntroEmail(smeBrief: string, opportunitySummary: string) {
  return apiPost<{ draft: string }>(
    '/api/partnerships/ai-intro-email',
    { sme_brief: smeBrief, opportunity_summary: opportunitySummary },
    { headers: await authHeaders() },
  );
}
