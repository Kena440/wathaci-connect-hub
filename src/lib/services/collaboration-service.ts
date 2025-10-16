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
const normalizeProfileSkills = (skills: unknown): string[] => {
  if (Array.isArray(skills)) {
    return skills.map((skill) => String(skill).trim()).filter(Boolean);
  }

  if (typeof skills === 'string') {
    return skills
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);
  }

  return [];
};

const buildFallbackSuggestions = (userProfile: any): CollaborationSuggestion[] => {
  const skills = normalizeProfileSkills(userProfile?.skills);
  const primarySkill = skills[0] ?? 'digital services';
  const secondarySkill = skills[1] ?? 'business development';
  const industry = userProfile?.industry ?? 'technology';
  const location = userProfile?.location ?? 'Zambia';

  return [
    {
      id: `fallback-project-${Date.now()}`,
      type: 'project',
      title: `Join a ${primarySkill} innovation pilot`,
      description:
        `Collaborate with a local startup accelerator in ${location} to deliver a high-impact ${primarySkill} solution ` +
        `for SMEs seeking digital transformation support.`,
      matchScore: 86,
      participants: [
        'Lusaka Innovation Hub',
        'Growth SMEs Collective',
        `${primarySkill} Specialists`,
      ],
      tags: [primarySkill, industry, 'Innovation', location],
      potentialValue: 'K40,000+ in project revenue',
    },
    {
      id: `fallback-partnership-${Date.now()}`,
      type: 'partnership',
      title: `Partner with a ${industry} venture studio`,
      description:
        `Co-create scalable solutions with an established venture studio that is actively onboarding ${primarySkill} and ` +
        `${secondarySkill} professionals for regional expansion.`,
      matchScore: 79,
      participants: ['Venture Studio Zambia', 'Regional Angel Network'],
      tags: [industry, 'Partnership', 'Scaling'],
      potentialValue: 'Equity + monthly retainer',
    },
    {
      id: `fallback-mentorship-${Date.now()}`,
      type: 'mentorship',
      title: 'Mentor emerging freelancers cohort',
      description:
        `Support a cohort of emerging freelancers by sharing your ${primarySkill} expertise and building a reliable ` +
        `collaboration pipeline for future client engagements.`,
      matchScore: 74,
      participants: ['Freelancer Guild Zambia', 'Women in Tech Collective'],
      tags: ['Mentorship', primarySkill, 'Community'],
      potentialValue: 'Expanded network & speaking opportunities',
    },
  ];
};

const resolveRuntimeConfig = (key: string): string | undefined => {
  const importMeta = (() => {
    try {
      return (0, eval)('import.meta');
    } catch {
      return undefined;
    }
  })();

  const fromVite = importMeta?.env?.[key];
  if (fromVite) {
    return fromVite as string;
  }

  if (typeof globalThis !== 'undefined') {
    const runtimeValue = (globalThis as any).__APP_CONFIG__?.[key];
    if (runtimeValue) {
      return runtimeValue as string;
    }
  }

  if (typeof process !== 'undefined' && process.env) {
    const processValue = process.env[key];
    if (processValue) {
      return processValue;
    }
  }

  return undefined;
};

export async function getCollaborationSuggestions(
  userProfile: any
): Promise<CollaborationSuggestion[]> {
  const apiUrl = resolveRuntimeConfig('VITE_COLLABORATION_API_URL');

  if (!apiUrl) {
    console.warn('COLLABORATION_API_URL is not configured. Using fallback suggestions.');
    return buildFallbackSuggestions(userProfile);
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: userProfile }),
    });

    if (!response.ok) {
      console.warn(`Collaboration suggestions request failed with status ${response.status}. Using fallback data.`);
      return buildFallbackSuggestions(userProfile);
    }

    const data = await response.json();
    const suggestions = (data?.suggestions ?? []) as CollaborationSuggestion[];

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      console.warn('Collaboration suggestions response was empty. Using fallback data.');
      return buildFallbackSuggestions(userProfile);
    }

    return suggestions;
  } catch (error) {
    console.error('Error fetching collaboration suggestions. Using fallback data.', error);
    return buildFallbackSuggestions(userProfile);
  }
}

export default {
  getCollaborationSuggestions,
};
