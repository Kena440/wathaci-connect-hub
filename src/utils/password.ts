export const PASSWORD_MIN_LENGTH = 8;

const passwordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

/**
 * Validate that a password meets the minimum strength requirements.
 * - At least 8 characters
 * - Contains lowercase, uppercase, and numeric characters
 */
export const isStrongPassword = (value: string): boolean => {
  if (!value) return false;
  return passwordStrengthRegex.test(value);
};

export const passwordStrengthMessage =
  'Use at least 8 characters with uppercase, lowercase, and a number for a strong password.';
