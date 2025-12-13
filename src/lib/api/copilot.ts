import { apiGet, apiPost } from './api/client';
import { supabaseClient } from '@/lib/supabaseClient';

const authHeaders = async () => {
  try {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch (error) {
    console.warn('[copilot api] failed to resolve session', error);
    return {};
  }
};

export type CopilotSession = {
  id: string;
  owner_user_id: string;
  profile_id: string;
  profile_type: string;
  status: string;
};

export async function createCopilotSession(profileId: string, profileType: string) {
  return apiPost<{ session: CopilotSession }>('/api/copilot/session', { profileId, profileType }, { headers: await authHeaders() });
}

export async function getCopilotState(sessionId: string) {
  return apiGet(`/api/copilot/session/${sessionId}/state`, { headers: await authHeaders() });
}

export async function runDiagnose(sessionId: string) {
  return apiPost(`/api/copilot/session/${sessionId}/diagnose`, undefined, { headers: await authHeaders() });
}

export async function runDecide(sessionId: string) {
  return apiPost(`/api/copilot/session/${sessionId}/decide`, undefined, { headers: await authHeaders() });
}

export async function buildPlan(sessionId: string, selectedPathKey: string) {
  return apiPost(`/api/copilot/session/${sessionId}/plan`, { selectedPathKey }, { headers: await authHeaders() });
}

export async function executeTask(taskId: string, confirmed?: boolean) {
  return apiPost(`/api/copilot/task/${taskId}/execute`, { confirmed }, { headers: await authHeaders() });
}

export async function generateBrief(sessionId: string) {
  return apiPost(`/api/copilot/session/${sessionId}/brief`, undefined, { headers: await authHeaders() });
}

export async function submitFeedback(sessionId: string, rating?: number, comment?: string, runId?: string) {
  return apiPost(`/api/copilot/session/${sessionId}/feedback`, { rating, comment, runId }, { headers: await authHeaders() });
}
