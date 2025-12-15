export type NavItem = {
  id: string;
  label: string;
  href: string;
};

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'home', href: '/' },
  { id: 'marketplace', label: 'marketplace', href: '/marketplace' },
  { id: 'freelancerHub', label: 'freelancerHub', href: '/freelancer-hub' },
  { id: 'resources', label: 'resources', href: '/resources' },
  { id: 'partnershipHub', label: 'partnershipHub', href: '/partnership-hub' },
  { id: 'fundingHub', label: 'fundingHub', href: '/funding-hub' },
  { id: 'complianceHub', label: 'complianceHub', href: '/compliance' },
  { id: 'creditPassport', label: 'creditPassport', href: '/credit-passport' },
  { id: 'aboutUs', label: 'aboutUs', href: '/about-us' },
];
