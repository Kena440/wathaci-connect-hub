export const CAPABILITY_TAXONOMY = [
  'Business Advisory',
  'SME Compliance',
  'Company Registration',
  'Tax & Statutory',
  'Governance & Board Support',
  'Grants & Donor Compliance',
  'Proposal Writing',
  'Financial Modelling',
  'Business Plans',
  'Digital Transformation',
  'Product Design',
  'Marketing & Branding',
  'Operations & Process Design',
  'Partnership Development',
  'Investment Readiness'
] as const;

const keywordRules: Record<string, string[]> = {
  'Governance & Board Support': ['governance', 'board', 'company secretary', 'board support'],
  'Grants & Donor Compliance': ['grants', 'donor', 'grant', 'funded project', 'compliance'],
  'SME Compliance': ['compliance', 'audit', 'risk', 'regulatory', 'statutory', 'contracts'],
  'Business Advisory': ['sme growth', 'advisory', 'strategy', 'business growth', 'entrepreneur'],
  'Digital Transformation': ['digital', 'platform', 'tech', 'technology', 'systems', 'automation'],
  'Operations & Process Design': ['operations', 'process', 'workflow', 'project management'],
  'Partnership Development': ['partnership', 'stakeholder', 'relationships', 'alliances'],
  'Proposal Writing': ['proposal', 'tender', 'grant proposal'],
  'Investment Readiness': ['funding', 'investment', 'investors', 'capital'],
  'Business Plans': ['business plan', 'planning'],
};

const capabilityToMarketplaceCategory: Record<string, string> = {
  'Governance & Board Support': 'Legal',
  'Grants & Donor Compliance': 'Consulting',
  'SME Compliance': 'Legal',
  'Business Advisory': 'Consulting',
  'Digital Transformation': 'IT Services',
  'Operations & Process Design': 'Business Services',
  'Partnership Development': 'Consulting',
  'Proposal Writing': 'Consulting',
  'Investment Readiness': 'Consulting',
  'Business Plans': 'Business Services'
};

const capabilityToResourceCategory: Record<string, string> = {
  'Governance & Board Support': 'Governance',
  'Grants & Donor Compliance': 'Compliance',
  'SME Compliance': 'Compliance',
  'Business Advisory': 'Business Development',
  'Digital Transformation': 'Technology',
  'Operations & Process Design': 'Risk Management',
  'Partnership Development': 'Governance',
  'Proposal Writing': 'Business Development',
  'Investment Readiness': 'Business Development',
  'Business Plans': 'Business Development'
};

export const mapBioToCapabilities = (bio: string, manualCapabilities: string[] = []) => {
  const normalizedBio = bio.toLowerCase();
  const capabilities = new Set<string>();

  manualCapabilities.forEach((capability) => {
    if (CAPABILITY_TAXONOMY.includes(capability as typeof CAPABILITY_TAXONOMY[number])) {
      capabilities.add(capability);
    }
  });

  Object.entries(keywordRules).forEach(([capability, keywords]) => {
    if (keywords.some(keyword => normalizedBio.includes(keyword))) {
      capabilities.add(capability);
    }
  });

  return Array.from(capabilities);
};

const buildQueryFromCapabilities = (capabilities: string[]) =>
  capabilities.length > 0 ? capabilities.join(' ') : '';

const buildTagParams = (capabilities: string[]) =>
  capabilities.length > 0 ? capabilities.join(',') : '';

export const buildMarketplaceLink = (capabilities: string[]) => {
  const params = new URLSearchParams();
  const categories = capabilities
    .map(capability => capabilityToMarketplaceCategory[capability])
    .filter(Boolean);

  const tagParam = buildTagParams(capabilities);
  const searchQuery = buildQueryFromCapabilities(capabilities);

  if (categories.length) params.set('category', categories[0]);
  if (tagParam) params.set('tags', tagParam);
  if (searchQuery) params.set('q', searchQuery);

  const query = params.toString();
  return query ? `/marketplace?${params.toString()}` : '/marketplace';
};

export const buildResourcesLink = (capabilities: string[]) => {
  const params = new URLSearchParams();
  const categories = capabilities
    .map(capability => capabilityToResourceCategory[capability])
    .filter(Boolean);

  const tagParam = buildTagParams(capabilities);
  const searchQuery = buildQueryFromCapabilities(capabilities);

  if (categories.length) params.set('category', categories[0]);
  if (tagParam) params.set('tags', tagParam);
  if (searchQuery) params.set('q', searchQuery);

  const query = params.toString();
  return query ? `/resources?${query}` : '/resources';
};

export const buildRequestSupportLink = (capabilities: string[], memberId?: string) => {
  const params = new URLSearchParams();
  const tagParam = buildTagParams(capabilities);
  const searchQuery = buildQueryFromCapabilities(capabilities);

  if (tagParam) params.set('prefillTags', tagParam);
  if (searchQuery) params.set('q', searchQuery);
  if (memberId) params.set('prefillMemberId', memberId);

  const query = params.toString();
  return query ? `/marketplace/request?${query}` : '/marketplace/request';
};

export const deriveCtaLinks = (capabilities: string[], memberId?: string) => ({
  services: buildMarketplaceLink(capabilities),
  resources: buildResourcesLink(capabilities),
  request: buildRequestSupportLink(capabilities, memberId)
});
