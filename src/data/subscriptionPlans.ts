export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  lencoAmount: number;
  userTypes: string[];
  category: 'basic' | 'professional' | 'enterprise';
}

export const subscriptionPlans: SubscriptionPlan[] = [
  // Basic Plans
  {
    id: 'basic-monthly',
    name: 'Basic Monthly',
    price: 'ZMW 25',
    period: '/month',
    description: 'Perfect for getting started',
    features: ['Platform access', 'Basic matching', 'Email support', '5 connections/month'],
    popular: false,
    lencoAmount: 2500,
    userTypes: ['sole_proprietor', 'professional'],
    category: 'basic'
  },
  {
    id: 'basic-quarterly',
    name: 'Basic Quarterly',
    price: 'ZMW 60',
    period: '/3 months',
    description: 'Save 20% with quarterly billing',
    features: ['Everything in Basic Monthly', '15 connections/month', 'Priority support'],
    popular: true,
    lencoAmount: 6000,
    userTypes: ['sole_proprietor', 'professional'],
    category: 'basic'
  },

  // Professional Plans
  {
    id: 'pro-monthly',
    name: 'Professional Monthly',
    price: 'ZMW 75',
    period: '/month',
    description: 'For growing businesses',
    features: ['AI-powered matching', 'Unlimited connections', 'Advanced analytics', 'Phone support'],
    popular: false,
    lencoAmount: 7500,
    userTypes: ['sme', 'professional'],
    category: 'professional'
  },
  {
    id: 'pro-quarterly',
    name: 'Professional Quarterly',
    price: 'ZMW 180',
    period: '/3 months',
    description: 'Best value for professionals',
    features: ['Everything in Pro Monthly', 'Custom integrations', 'Dedicated support'],
    popular: true,
    lencoAmount: 18000,
    userTypes: ['sme', 'professional'],
    category: 'professional'
  },

  // Enterprise Plans
  {
    id: 'enterprise-monthly',
    name: 'Enterprise Monthly',
    price: 'ZMW 200',
    period: '/month',
    description: 'For large organizations',
    features: ['White-label solution', 'API access', 'Custom features', 'Account manager'],
    popular: false,
    lencoAmount: 20000,
    userTypes: ['investor', 'donor', 'government'],
    category: 'enterprise'
  },
  {
    id: 'enterprise-annual',
    name: 'Enterprise Annual',
    price: 'ZMW 2000',
    period: '/year',
    description: 'Maximum value for enterprises',
    features: ['Everything in Enterprise Monthly', 'Priority development', 'SLA guarantee'],
    popular: true,
    lencoAmount: 200000,
    userTypes: ['investor', 'donor', 'government'],
    category: 'enterprise'
  }
];

export const getPlansForUserType = (userType: string): SubscriptionPlan[] => {
  return subscriptionPlans.filter(plan => plan.userTypes.includes(userType));
};

export const getUserTypeLabel = (userType: string): string => {
  const labels: Record<string, string> = {
    sole_proprietor: 'Sole Proprietor',
    professional: 'Professional',
    sme: 'Small & Medium Enterprise',
    investor: 'Investor',
    donor: 'Donor',
    government: 'Government Institution'
  };
  return labels[userType] || userType;
};