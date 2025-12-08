import { logger } from '@/lib/logger';

export type OnboardingAccountType =
  | 'sme'
  | 'sole_proprietor'
  | 'professional'
  | 'investor'
  | 'donor'
  | 'government';

export const normalizeAccountType = (accountType?: string | null): OnboardingAccountType | null => {
  if (!accountType) return null;
  const normalized = accountType.toString().trim().toLowerCase();

  if (
    normalized === 'sme' ||
    normalized === 'sole_proprietor' ||
    normalized === 'professional' ||
    normalized === 'investor' ||
    normalized === 'donor' ||
    normalized === 'government'
  ) {
    return normalized;
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
    case 'sole_proprietor':
      return '/onboarding/sme';
    case 'professional':
      return '/onboarding/professional';
    case 'investor':
    case 'donor':
      return '/onboarding/investor';
    case 'government':
      return '/onboarding/government/needs-assessment';
    default:
      return '/onboarding/account-type';
  }
};

export const isOnboardingPath = (pathname: string): boolean => pathname.startsWith('/onboarding');
