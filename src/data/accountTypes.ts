import type { LucideIcon } from 'lucide-react';
import { Users, Building, TrendingUp, Heart, Landmark } from 'lucide-react';

export type AccountTypeValue =
  | 'sme'
  | 'professional'
  | 'investor'
  | 'donor'
  | 'government_institution';

export interface AccountTypeDefinition {
  value: AccountTypeValue;
  label: string;
  description: string;
  icon: LucideIcon;
  idealFor: string[];
  onboardingFocus: string[];
}

export const accountTypes: AccountTypeDefinition[] = [
  {
    value: 'professional',
    label: 'Professional',
    description: 'Ideal for specialists offering professional services and looking to showcase expertise.',
    icon: Users,
    idealFor: [
      'Consultants and subject matter experts',
      'Creative professionals and agencies',
      'Advisors and technical service providers'
    ],
    onboardingFocus: ['Portfolio & credentials', 'Client services', 'Skills directory']
  },
  {
    value: 'sme',
    label: 'SME (Small & Medium Enterprise)',
    description: 'Comprehensive tools for established businesses preparing to scale operations.',
    icon: Building,
    idealFor: [
      'Registered companies with growing teams',
      'Businesses expanding into new markets',
      'Firms seeking investment or partnerships'
    ],
    onboardingFocus: ['Company structure', 'Team & operations', 'Funding readiness']
  },
  {
    value: 'investor',
    label: 'Investor',
    description: 'Built for funds and angels sourcing quality deals and managing portfolios.',
    icon: TrendingUp,
    idealFor: [
      'Angel investors and syndicates',
      'Impact and venture funds',
      'Corporate innovation teams'
    ],
    onboardingFocus: ['Ticket sizes', 'Sector focus', 'Support services']
  },
  {
    value: 'donor',
    label: 'Donor',
    description: 'Purpose-built for grant makers and development partners tracking outcomes.',
    icon: Heart,
    idealFor: [
      'Foundations and philanthropic funds',
      'CSR and corporate giving teams',
      'International development partners'
    ],
    onboardingFocus: ['Program focus', 'Funding priorities', 'Impact metrics']
  },
  {
    value: 'government_institution',
    label: 'Government Institution',
    description: 'Enterprise workflows for public sector agencies supporting MSMEs.',
    icon: Landmark,
    idealFor: [
      'Ministries and public agencies',
      'State-owned enterprises',
      'Economic development programs'
    ],
    onboardingFocus: ['Institution profile', 'Key programs', 'Partnership needs']
  }
];

