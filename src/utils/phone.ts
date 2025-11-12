const NON_DIGIT_REGEX = /\D+/g;

export const MSISDN_MIN_LENGTH = 9;
export const MSISDN_MAX_LENGTH = 15;
export const MSISDN_REGEX = /^\+?[0-9]{9,15}$/;

const hasText = (value: unknown): value is string => typeof value === "string";

export const stripToDigits = (value?: string | null): string => {
  if (!hasText(value)) {
    return "";
  }

  return value.replace(NON_DIGIT_REGEX, "");
};

export const normalizePhoneNumber = (value?: string | null): string | null => {
  if (!hasText(value)) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const digits = stripToDigits(trimmed);
  if (!digits) {
    return null;
  }

  return trimmed.startsWith("+") ? `+${digits}` : digits;
};

export const normalizeMsisdn = (value?: string | null): string | null => {
  const normalized = normalizePhoneNumber(value);
  if (!normalized) {
    return null;
  }

  const digits = stripToDigits(normalized);
  if (digits.length < MSISDN_MIN_LENGTH || digits.length > MSISDN_MAX_LENGTH) {
    return null;
  }

  return `+${digits}`;
};

export const isMsisdnValid = (value?: string | null): boolean => normalizeMsisdn(value) !== null;
