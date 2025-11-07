export interface MarketplaceService {
  id: string;
  title: string;
  description: string;
  provider: string;
  providerType: 'freelancer' | 'partnership' | 'resource';
  category: string;
  skills: string[];
  location: string;
  deliveryTime: string;
  rating: number;
  reviews: number;
  currency: string;
  price: number;
  image: string;
}

export interface MarketplaceProduct {
  id: number;
  name: string;
  price: number;
  image: string;
  seller: string;
  location: string;
  rating: number;
  reviews: number;
  category: string;
  description: string;
  inStock: boolean;
}

export interface MarketplaceRecommendation {
  id: string | number;
  type: 'product' | 'service' | 'professional';
  title: string;
  description: string;
  price: number;
  rating: number;
  image: string;
  reason: string;
  confidence: number;
}

export interface PricingSuggestionResult {
  pricing: {
    suggestedPrice: number;
    minPrice: number;
    maxPrice: number;
    marketAverage: number;
    confidence: number;
    factors: string[];
    reasoning: string;
  };
  marketData: {
    averagePrice: number;
    priceRange: { min: number; max: number };
    competitorCount: number;
  };
}

const toCurrency = (value: number) => Math.round(value);

const SERVICES: MarketplaceService[] = [
  {
    id: 'svc-branding-101',
    title: 'Brand Identity Accelerator',
    description: 'Complete visual identity package with logo suite, typography, and brand guidelines tailored to Zambian SMEs.',
    provider: 'Chipo Mwansa',
    providerType: 'freelancer',
    category: 'marketing',
    skills: ['Brand Strategy', 'Graphic Design', 'Market Research'],
    location: 'Lusaka',
    deliveryTime: '14 days',
    rating: 4.9,
    reviews: 42,
    currency: 'K',
    price: 4800,
    image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'svc-accounting-202',
    title: 'SME Accounting Compliance Pack',
    description: 'Monthly bookkeeping, payroll setup, and ZRA tax compliance for growing small businesses.',
    provider: 'Growth Ledger Partners',
    providerType: 'partnership',
    category: 'finance',
    skills: ['Bookkeeping', 'ZRA Compliance', 'Payroll'],
    location: 'Ndola',
    deliveryTime: '30 days',
    rating: 4.7,
    reviews: 31,
    currency: 'K',
    price: 6200,
    image: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'svc-web-303',
    title: 'Launch-Ready Ecommerce Website',
    description: 'Responsive ecommerce storefront with payment integration, analytics, and training for your staff.',
    provider: 'Digital Copper Studio',
    providerType: 'freelancer',
    category: 'technology',
    skills: ['React', 'UI/UX', 'Ecommerce'],
    location: 'Kitwe',
    deliveryTime: '21 days',
    rating: 4.8,
    reviews: 54,
    currency: 'K',
    price: 9500,
    image: 'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'svc-training-404',
    title: 'Workforce Upskilling Bootcamp',
    description: 'Custom training curriculum covering sales enablement, customer success, and digital tools adoption.',
    provider: 'ZedGrowth Institute',
    providerType: 'resource',
    category: 'education',
    skills: ['Training', 'Curriculum Design', 'Digital Adoption'],
    location: 'Online',
    deliveryTime: '10 days',
    rating: 4.6,
    reviews: 19,
    currency: 'K',
    price: 3500,
    image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'svc-legal-505',
    title: 'Investor-Ready Legal Pack',
    description: 'Legal advisory for term sheets, shareholder agreements, and governance policies tailored for Zambian investors.',
    provider: 'Mabvuto Legal Advisory',
    providerType: 'partnership',
    category: 'legal',
    skills: ['Corporate Law', 'Governance', 'Investor Relations'],
    location: 'Lusaka',
    deliveryTime: '18 days',
    rating: 4.9,
    reviews: 27,
    currency: 'K',
    price: 7800,
    image: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'svc-marketing-606',
    title: 'Go-To-Market Launch Sprint',
    description: 'Integrated marketing campaign with influencer outreach, paid ads, and conversion tracking for new product launches.',
    provider: 'Copperbelt Collective',
    providerType: 'freelancer',
    category: 'marketing',
    skills: ['Growth Marketing', 'Paid Ads', 'Analytics'],
    location: 'Livingstone',
    deliveryTime: '28 days',
    rating: 4.8,
    reviews: 36,
    currency: 'K',
    price: 5400,
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80'
  }
];

const PRODUCTS: MarketplaceProduct[] = [
  {
    id: 101,
    name: 'Point-of-Sale Starter Kit',
    price: 4200,
    image: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&w=1200&q=80',
    seller: 'RetailPro Zambia',
    location: 'Lusaka',
    rating: 4.7,
    reviews: 58,
    category: 'Equipment',
    description: 'Complete POS bundle with barcode scanner, cash drawer, and cloud-based inventory software license.',
    inStock: true
  },
  {
    id: 102,
    name: 'Digital Marketing Toolkit Subscription',
    price: 650,
    image: 'https://images.unsplash.com/photo-1517433456452-f9633a875f6f?auto=format&fit=crop&w=1200&q=80',
    seller: 'ZamSocial Labs',
    location: 'Online',
    rating: 4.8,
    reviews: 44,
    category: 'Software',
    description: 'Monthly subscription with social media scheduler, analytics dashboard, and campaign templates.',
    inStock: true
  },
  {
    id: 103,
    name: 'Co-working Flex Pass (10 Days)',
    price: 1200,
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    seller: 'Innovation Loft',
    location: 'Kitwe',
    rating: 4.6,
    reviews: 33,
    category: 'Workspace',
    description: 'Flexible workspace access with high-speed internet, meeting room credits, and networking events.',
    inStock: true
  },
  {
    id: 104,
    name: 'Agri-SME Soil Testing Kit',
    price: 980,
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    seller: 'GreenFields Labs',
    location: 'Ndola',
    rating: 4.5,
    reviews: 21,
    category: 'Agriculture',
    description: 'Portable soil testing kit with 25 test strips, training manual, and agronomist consultation voucher.',
    inStock: true
  },
  {
    id: 105,
    name: 'SME Cybersecurity Audit',
    price: 5600,
    image: 'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=1200&q=80',
    seller: 'SecureNet Africa',
    location: 'Lusaka',
    rating: 4.9,
    reviews: 29,
    category: 'Technology',
    description: 'Comprehensive security audit including vulnerability scan, remediation roadmap, and staff awareness session.',
    inStock: true
  },
  {
    id: 106,
    name: 'Export Readiness Coaching',
    price: 3100,
    image: 'https://images.unsplash.com/photo-1531498860502-7c67cf02f77b?auto=format&fit=crop&w=1200&q=80',
    seller: 'TradeCraft Advisory',
    location: 'Livingstone',
    rating: 4.7,
    reviews: 17,
    category: 'Consulting',
    description: 'Six-week coaching program covering export compliance, logistics planning, and market entry strategy.',
    inStock: true
  }
];

const PRICE_RANGES: Record<string, { min: number; max?: number }> = {
  'under-3000': { min: 0, max: 3000 },
  '3000-6000': { min: 3000, max: 6000 },
  '6000-plus': { min: 6000 }
};

const normalize = (value?: string) => (value || '').toLowerCase();

const matchesQuery = (text: string, query: string) =>
  normalize(text).includes(normalize(query));

export const marketplaceServices = SERVICES;
export const marketplaceProducts = PRODUCTS;

export const filterServicesByControls = (
  services: MarketplaceService[],
  filters: { category?: string; providerType?: string; location?: string; priceRange?: string }
) => {
  const { category, providerType, location, priceRange } = filters;
  const normalizedCategory = normalize(category);
  const normalizedProviderType = normalize(providerType);
  const normalizedLocation = normalize(location);

  return services.filter(service => {
    const categoryMatch =
      !normalizedCategory || normalizedCategory === 'all' || normalize(service.category) === normalizedCategory;
    const providerMatch =
      !normalizedProviderType || normalizedProviderType === 'all' || normalize(service.providerType) === normalizedProviderType;
    const locationMatch =
      !normalizedLocation || normalizedLocation === 'all' || normalize(service.location) === normalizedLocation;

    const priceRule = priceRange ? PRICE_RANGES[priceRange] : undefined;
    const priceMatch = !priceRule || (
      service.price >= priceRule.min && (priceRule.max === undefined || service.price <= priceRule.max)
    );

    return categoryMatch && providerMatch && locationMatch && priceMatch;
  });
};

export const runMarketplaceSearch = (query: string, activeFilters: string[] = []) => {
  if (!query.trim()) {
    return { recommendations: [] as MarketplaceRecommendation[], suggestions: [] as string[] };
  }

  const filters = new Set(activeFilters.map(normalize));
  const serviceMatches = SERVICES.filter(service => {
    const matchesFilters = filters.size === 0 || filters.has(normalize(service.category)) || service.skills.some(skill => filters.has(normalize(skill)));
    return matchesFilters && (
      matchesQuery(service.title, query) ||
      matchesQuery(service.description, query) ||
      matchesQuery(service.provider, query) ||
      service.skills.some(skill => matchesQuery(skill, query))
    );
  });

  const productMatches = PRODUCTS.filter(product => {
    const matchesFilters = filters.size === 0 || filters.has(normalize(product.category));
    return matchesFilters && (
      matchesQuery(product.name, query) ||
      matchesQuery(product.description, query) ||
      matchesQuery(product.seller, query)
    );
  });

  const toRecommendation = (service: MarketplaceService | MarketplaceProduct): MarketplaceRecommendation => {
    if ('provider' in service) {
      return {
        id: service.id,
        type: 'service',
        title: service.title,
        description: service.description,
        price: service.price,
        rating: service.rating,
        image: service.image,
        reason: `Provided by ${service.provider} in ${service.location}`,
        confidence: 0.82
      };
    }

    return {
      id: service.id,
      type: 'product',
      title: service.name,
      description: service.description,
      price: service.price,
      rating: service.rating,
      image: service.image,
      reason: `Offered by ${service.seller} (${service.location})`,
      confidence: 0.78
    };
  };

  const combined = [...serviceMatches, ...productMatches].slice(0, 8).map(toRecommendation);

  const suggestionPool = new Set<string>();
  serviceMatches.forEach(service => {
    service.skills.slice(0, 3).forEach(skill => suggestionPool.add(skill));
    suggestionPool.add(service.category);
  });
  productMatches.forEach(product => {
    suggestionPool.add(product.category);
    suggestionPool.add(product.seller);
  });

  return {
    recommendations: combined,
    suggestions: Array.from(suggestionPool).slice(0, 8)
  };
};

export const buildMarketplaceRecommendations = (
  mode: 'personalized' | 'trending' | 'similar'
): MarketplaceRecommendation[] => {
  const popularServices = [...SERVICES].sort((a, b) => b.rating - a.rating);
  const popularProducts = [...PRODUCTS].sort((a, b) => b.rating - a.rating);

  if (mode === 'trending') {
    return popularProducts.slice(0, 5).map(product => ({
      id: product.id,
      type: 'product',
      title: product.name,
      description: product.description,
      price: product.price,
      rating: product.rating,
      image: product.image,
      reason: 'Trending with SMEs this month',
      confidence: 0.74
    }));
  }

  if (mode === 'similar') {
    return popularServices.slice(0, 3).map(service => ({
      id: service.id,
      type: 'service',
      title: service.title,
      description: service.description,
      price: service.price,
      rating: service.rating,
      image: service.image,
      reason: 'Similar to services other SMEs booked',
      confidence: 0.69
    })).concat(
      popularProducts.slice(0, 2).map(product => ({
        id: product.id,
        type: 'product',
        title: product.name,
        description: product.description,
        price: product.price,
        rating: product.rating,
        image: product.image,
        reason: 'Pairs well with your recent searches',
        confidence: 0.65
      }))
    );
  }

  return popularServices.slice(0, 5).map(service => ({
    id: service.id,
    type: 'service',
    title: service.title,
    description: service.description,
    price: service.price,
    rating: service.rating,
    image: service.image,
    reason: 'Tailored to growth-focused SMEs',
    confidence: 0.81
  }));
};

export const generatePricingAnalysis = ({
  description,
  category,
  location
}: {
  description: string;
  category?: string;
  location?: string;
}): PricingSuggestionResult => {
  const normalizedCategory = normalize(category);
  const normalizedLocation = normalize(location);

  const relevantServices = SERVICES.filter(service => {
    const categoryMatch = !normalizedCategory || normalize(service.category) === normalizedCategory;
    const locationMatch = !normalizedLocation || normalize(service.location) === normalizedLocation || normalize(service.location) === 'online';
    return categoryMatch && locationMatch;
  });

  const relevantProducts = PRODUCTS.filter(product => {
    const categoryMatch = !normalizedCategory || normalize(product.category) === normalizedCategory;
    const locationMatch = !normalizedLocation || normalize(product.location) === normalizedLocation || normalize(product.location) === 'online';
    return categoryMatch && locationMatch;
  });

  const combinedPrices = [...relevantServices.map(service => service.price), ...relevantProducts.map(product => product.price)];

  const fallbackPrices = combinedPrices.length > 0 ? combinedPrices : [...SERVICES, ...PRODUCTS].map(item => ('price' in item ? item.price : 0));
  const prices = fallbackPrices.length > 0 ? fallbackPrices : [2500, 4200, 5300];

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const suggestedPrice = description.toLowerCase().includes('premium') ? maxPrice * 0.9 : averagePrice;

  const factors = [
    `Based on ${prices.length} similar offers in the marketplace`,
    normalizedLocation ? `Demand in ${location}` : 'National demand trends',
    description.length > 40 ? 'Detailed service description provided' : 'Limited service details provided'
  ];

  const reasoning = `We analysed comparable offers in ${normalizedLocation ? location : 'our network'} and recommend positioning your price around K${toCurrency(suggestedPrice)} to stay competitive.`;

  return {
    pricing: {
      suggestedPrice: toCurrency(suggestedPrice),
      minPrice: toCurrency(minPrice),
      maxPrice: toCurrency(maxPrice),
      marketAverage: toCurrency(averagePrice),
      confidence: 0.76,
      factors,
      reasoning
    },
    marketData: {
      averagePrice: toCurrency(averagePrice),
      priceRange: { min: toCurrency(minPrice), max: toCurrency(maxPrice) },
      competitorCount: prices.length
    }
  };
};

export const generateAssistantResponse = (
  message: string,
  context?: { page?: string; userQuery?: string }
) => {
  const normalizedMessage = message.toLowerCase();
  const recommendations: string[] = [];

  if (normalizedMessage.includes('freelancer')) {
    recommendations.push('Explore the Freelancer Hub for vetted professionals.');
  }
  if (normalizedMessage.includes('partner')) {
    recommendations.push('The Partnership Hub has onboarding steps and partner applications.');
  }
  if (normalizedMessage.includes('price') || normalizedMessage.includes('cost')) {
    recommendations.push('You can open the AI Pricing tab for tailored pricing guidance.');
  }
  if (normalizedMessage.includes('funding')) {
    recommendations.push('Visit the Funding Hub to match with lenders and grant providers.');
  }

  const defaultSuggestion =
    recommendations.length === 0
      ? 'Browse our integrated marketplace for curated SME services.'
      : recommendations[0];

  const suggestions = [
    'Open Freelancer Hub',
    'Compare marketplace pricing',
    'Talk to a partnership advisor',
    'Review subscription plans'
  ];

  const response = [
    defaultSuggestion,
    context?.userQuery ? `I also remembered your last search for "${context.userQuery}".` : null,
    'Would you like me to add any of these services to your cart or connect you with a specialist?'
  ]
    .filter(Boolean)
    .join(' ');

  return { response, suggestions };
};

export const generateProfessionalMatches = (gaps: string[]) => {
  const normalizedGaps = gaps.map(normalize).filter(Boolean);

  if (normalizedGaps.length === 0) {
    return SERVICES.slice(0, 3).map(service => ({
      id: service.id,
      full_name: service.provider,
      expertise_areas: service.skills,
      score: 0.6
    }));
  }

  return SERVICES.map(service => {
    const overlap = service.skills.filter(skill => normalizedGaps.includes(normalize(skill))).length;
    const baseScore = overlap / Math.max(service.skills.length, 1);
    return {
      id: service.id,
      full_name: service.provider,
      expertise_areas: service.skills,
      score: Math.min(0.9, 0.4 + baseScore)
    };
  })
    .filter(match => match.score > 0.45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
};

