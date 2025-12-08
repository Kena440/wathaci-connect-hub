export type AccountType =
  | 'sole_proprietor'
  | 'sme'
  | 'professional'
  | 'investor'
  | 'donor'
  | 'government'
  | 'government_institution';

export interface Profile {
  id: string;
  email: string | null;
  account_type: AccountType | null;
  profile_completed: boolean;
}
