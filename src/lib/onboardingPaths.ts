import { logger } from '@/lib/logger';

export type OnboardingAccountType =
  | 'sme'
  | 'professional'
  | 'investor'
  | 'donor'
  | 'government_institution';

export const normalizeAccountType = (accountType?: string | null): OnboardingAccountType | null => {
  if (!accountType) return null;
  const normalized = accountType.toString().trim().toLowerCase();

  if (normalized === 'sole_proprietor') {
    return 'sme';
  }

  if (normalized === 'government') {
    return 'government_institution';
  }

  if (
    normalized === 'sme' ||
    normalized === 'professional' ||
    normalized === 'investor' ||
    normalized === 'donor' ||
    normalized === 'government_institution'
  ) {
    return normalized as OnboardingAccountType;
  }

  logger.warn('Unknown account type encountered while normalizing', {
    event: 'onboarding:account-type:unknown',
    value: accountType,
  });

  return null;
};

export const getOnboardingStartPath = (accountType?: string | null): string => {
  const normalized = normalizeAccountType(accountType);

  switch (normalized) {
    case 'sme':
      return '/onboarding/sme';
    case 'professional':
      return '/onboarding/professional';
    case 'investor':
    case 'donor':
      return '/onboarding/investor';
    case 'government_institution':
      return '/onboarding/government/needs-assessment';
    default:
      return '/onboarding/account-type';
  }
};

export const isOnboardingPath = (pathname: string): boolean => pathname.startsWith('/onboarding');
