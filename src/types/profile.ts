export type AccountType = 'sme' | 'professional' | 'investor';

export interface Profile {
  id: string;
  email: string | null;
  account_type: AccountType | null;
  profile_completed: boolean;
}
