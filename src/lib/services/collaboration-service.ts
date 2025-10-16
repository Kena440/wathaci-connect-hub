export interface CollaborationSuggestion {
  id: string;
  type: 'partnership' | 'skill_exchange' | 'project' | 'mentorship';
  title: string;
  description: string;
  matchScore: number;
  participants: string[];
  tags: string[];
  potentialValue: string;
}

/**
 * Fetch collaboration suggestions from the AI service based on a user's profile.
 * The API endpoint is configured via the `VITE_COLLABORATION_API_URL` environment variable.
 */
export async function getCollaborationSuggestions(
  userProfile: any
): Promise<CollaborationSuggestion[]> {
  const apiUrl = (import.meta as any).env?.VITE_COLLABORATION_API_URL as
    | string
    | undefined;

  if (!apiUrl) {
    throw new Error('COLLABORATION_API_URL is not configured');
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile: userProfile }),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const data = await response.json();
  return (data.suggestions ?? []) as CollaborationSuggestion[];
}

export default {
  getCollaborationSuggestions,
};
