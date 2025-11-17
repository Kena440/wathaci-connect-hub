import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SUPPORT_EMAIL = Deno.env.get('SUPPORT_EMAIL')?.trim() || 'support@wathaci.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface IndustryRequest {
  industry?: string;
  userType?: string;
  location?: string;
  requirements?: string;
}

interface IndustryMatchResponse {
  matches: {
    freelancers: string[];
    funding: string[];
    partnerships: string[];
  };
  recommendations: {
    priority: string;
    nextSteps: string;
    timeline: string;
  };
}

const industryProfiles: Record<string, IndustryMatchResponse> = {
  technology: {
    matches: {
      freelancers: [
        'Full-stack developer with SaaS scaling expertise',
        'Cloud solutions architect for resilient infrastructure',
        'UX researcher focused on digital product adoption'
      ],
      funding: [
        'Digital Innovation Fund – Seed Support',
        'Africa Tech Catalyst Grants',
        'Future of Work Accelerator Micro-Fund'
      ],
      partnerships: [
        'Regional innovation labs and tech hubs',
        'University research & commercialization offices',
        'Corporate open-innovation programs'
      ]
    },
    recommendations: {
      priority: 'Validate market fit and strengthen technical execution.',
      nextSteps: 'Shortlist product specialists, review investor readiness, and document compliance requirements.',
      timeline: 'Target first partner touchpoints within 4–6 weeks.'
    }
  },
  agriculture: {
    matches: {
      freelancers: [
        'Agri-tech product manager with precision farming background',
        'Supply chain analyst specialised in cold-chain logistics',
        'Sustainability consultant for regenerative practices'
      ],
      funding: [
        'Climate-Smart Agriculture Challenge Fund',
        'Smallholder Support Growth Facility',
        'Agricultural Productivity Innovation Grants'
      ],
      partnerships: [
        'Farmer cooperative alliances',
        'Regional agro-processing clusters',
        'Impact investors focused on food security'
      ]
    },
    recommendations: {
      priority: 'Stabilise production inputs and market access.',
      nextSteps: 'Engage with cooperatives, pilot traceability tools, and map cold-chain partners.',
      timeline: 'Establish pilot agreements within the next quarter.'
    }
  },
  healthcare: {
    matches: {
      freelancers: [
        'Health informatics specialist for EMR integration',
        'Regulatory affairs consultant for clinical compliance',
        'Telemedicine operations strategist'
      ],
      funding: [
        'Health Access Equity Grants',
        'Digital Health Innovation Facility',
        'Global Wellness Seed Capital Program'
      ],
      partnerships: [
        'Teaching hospitals and clinical labs',
        'Insurance & HMO ecosystem partners',
        'Public health NGOs with aligned programs'
      ]
    },
    recommendations: {
      priority: 'Build trust through compliance and patient outcomes.',
      nextSteps: 'Document regulatory path, align data governance, and formalise pilot care sites.',
      timeline: 'Plan phased roll-out across 3 months with ongoing compliance reviews.'
    }
  },
  manufacturing: {
    matches: {
      freelancers: [
        'Lean manufacturing engineer for process optimisation',
        'Automation specialist for production line upgrades',
        'Procurement strategist focused on resilient sourcing'
      ],
      funding: [
        'Industrial Efficiency Upgrade Scheme',
        'SME Modernisation Credit Line',
        'Green Manufacturing Transition Grants'
      ],
      partnerships: [
        'Industrial parks and export processing zones',
        'Equipment OEM technical alliances',
        'Vocational institutes for workforce upskilling'
      ]
    },
    recommendations: {
      priority: 'Improve throughput and sustainability metrics.',
      nextSteps: 'Benchmark production baselines, secure vendor MOUs, and plan workforce training.',
      timeline: 'Execute improvement sprints over the next 6–8 weeks.'
    }
  },
  finance: {
    matches: {
      freelancers: [
        'Fintech compliance specialist for regional licensing',
        'Payments infrastructure architect',
        'Risk analyst with credit-scoring expertise'
      ],
      funding: [
        'Inclusive Finance Catalyst Fund',
        'Digital Payments Expansion Grants',
        'Financial Inclusion Impact Investors Network'
      ],
      partnerships: [
        'Banking-as-a-service platforms',
        'Regulatory sandboxes and fintech associations',
        'Merchant acquirer collaborations'
      ]
    },
    recommendations: {
      priority: 'Secure regulatory coverage and payment reliability.',
      nextSteps: 'Align licensing roadmap, stress-test payment stack, and co-design merchant onboarding.',
      timeline: 'Reach regulatory checkpoints within 6 weeks.'
    }
  },
  general: {
    matches: {
      freelancers: [
        'Business strategist for go-to-market planning',
        'Operations consultant for workflow optimisation',
        'Financial modeller for fundraising materials'
      ],
      funding: [
        'SME Catalytic Support Program',
        'Growth Readiness Micro-Grants',
        'Local Chamber Enterprise Loans'
      ],
      partnerships: [
        'Regional business support organisations',
        'Chambers of commerce and trade groups',
        'Incubators and accelerator communities'
      ]
    },
    recommendations: {
      priority: 'Clarify strategic focus and validate opportunity pipeline.',
      nextSteps: 'Map ideal partners, prepare a concise pitch narrative, and document success metrics.',
      timeline: 'Complete discovery conversations within 30 days.'
    }
  }
};

const userTypeOverlays: Record<string, Partial<IndustryMatchResponse['recommendations']>> = {
  entrepreneur: {
    priority: 'Prioritise traction-building activities before scaling.',
    nextSteps: 'Convert two of the suggested matches into discovery calls and gather evidence of demand.'
  },
  investor: {
    priority: 'Build a diligence-ready pipeline of opportunities.',
    nextSteps: 'Schedule review sessions with top prospects and align investment committees on criteria.',
    timeline: 'Aim for initial deal screening within 2–3 weeks.'
  },
  freelancer: {
    nextSteps: 'Position services against the identified gaps and prepare tailored proposals.'
  },
  'partnership seeker': {
    priority: 'Sequence outreach to the most strategic collaborators.',
    nextSteps: 'Leverage warm introductions through ecosystem partners listed in the matches.'
  }
};

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    );
  }

  try {
    const rawBody = await req.text();
    const payload: IndustryRequest = rawBody ? JSON.parse(rawBody) : {};

    const industryKey = payload.industry?.toLowerCase() || 'general';
    const baseProfile = industryProfiles[industryKey] ?? industryProfiles.general;

    const matches = {
      freelancers: unique([...(baseProfile.matches.freelancers ?? [])]),
      funding: unique([...(baseProfile.matches.funding ?? [])]),
      partnerships: unique([...(baseProfile.matches.partnerships ?? [])])
    };

    if (payload.location) {
      const locationLabel = `Ecosystem partners and events in ${titleCase(payload.location)}`;
      matches.partnerships = unique([...matches.partnerships, locationLabel]);
    }

    if (payload.requirements) {
      const requirementLabel = `Special focus: ${payload.requirements.trim()}`;
      matches.freelancers = unique([...matches.freelancers, requirementLabel]);
    }

    const overlayKey = payload.userType?.toLowerCase() ?? '';
    const overlay = userTypeOverlays[overlayKey];

    const recommendations = {
      ...baseProfile.recommendations,
    };

    if (overlay?.priority) {
      recommendations.priority = overlay.priority;
    }
    if (overlay?.nextSteps) {
      recommendations.nextSteps = `${overlay.nextSteps} ${baseProfile.recommendations.nextSteps}`.trim();
    }
    if (overlay?.timeline) {
      recommendations.timeline = overlay.timeline;
    }

    if (payload.requirements) {
      recommendations.nextSteps = `${recommendations.nextSteps} Address the stated requirements: ${payload.requirements.trim()}.`.trim();
    }

    const response: IndustryMatchResponse = {
      matches,
      recommendations
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    console.error('Industry matcher error:', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(
      JSON.stringify({
        matches: { freelancers: [], funding: [], partnerships: [] },
        recommendations: {
          priority: 'Unable to generate recommendations at this time.',
          nextSteps: `Please retry the request or contact ${SUPPORT_EMAIL} if the issue persists.`,
          timeline: 'Pending resolution.'
        },
        error: message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
