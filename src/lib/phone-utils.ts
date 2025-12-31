// Zambian mobile money provider detection and phone utilities

export interface ProviderInfo {
  provider: string;
  providerCode: string;
  providerName: string;
  logo?: string;
}

// Zambian phone number prefixes by provider
const ZAMBIA_PREFIXES: Record<string, ProviderInfo> = {
  // MTN prefixes
  '096': { provider: 'mtn', providerCode: 'MTN', providerName: 'MTN Mobile Money' },
  '076': { provider: 'mtn', providerCode: 'MTN', providerName: 'MTN Mobile Money' },
  // Airtel prefixes
  '097': { provider: 'airtel', providerCode: 'AIRTEL', providerName: 'Airtel Money' },
  '077': { provider: 'airtel', providerCode: 'AIRTEL', providerName: 'Airtel Money' },
  // Zamtel prefixes
  '095': { provider: 'zamtel', providerCode: 'ZAMTEL', providerName: 'Zamtel Kwacha' },
  '075': { provider: 'zamtel', providerCode: 'ZAMTEL', providerName: 'Zamtel Kwacha' },
};

/**
 * Detect the mobile money provider from a Zambian phone number
 */
export function detectProvider(phoneNumber: string): ProviderInfo | null {
  // Clean the phone number - remove spaces, dashes, etc.
  const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  // Extract the prefix we need to check
  let prefix = '';
  
  if (cleaned.startsWith('+260')) {
    // International format with + sign: +260961234567
    prefix = '0' + cleaned.substring(4, 6);
  } else if (cleaned.startsWith('260')) {
    // International format without + sign: 260961234567
    prefix = '0' + cleaned.substring(3, 5);
  } else if (cleaned.startsWith('0')) {
    // Local format: 0961234567
    prefix = cleaned.substring(0, 3);
  } else if (cleaned.length >= 2) {
    // Just the number without prefix: 961234567
    prefix = '0' + cleaned.substring(0, 2);
  }
  
  return ZAMBIA_PREFIXES[prefix] || null;
}

/**
 * Format phone number to international format (260...)
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with 260
  if (cleaned.startsWith('0')) {
    cleaned = '260' + cleaned.substring(1);
  }
  
  // If doesn't start with 260, add it
  if (!cleaned.startsWith('260')) {
    cleaned = '260' + cleaned;
  }
  
  return cleaned;
}

/**
 * Validate Zambian phone number format
 */
export function isValidZambianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  
  // Should be 10 digits local (0XXXXXXXXX) or 12 digits international (260XXXXXXXXX)
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return detectProvider(cleaned) !== null;
  }
  
  if (cleaned.length === 12 && cleaned.startsWith('260')) {
    return detectProvider(cleaned) !== null;
  }
  
  if (cleaned.length === 9) {
    // Without leading 0
    return detectProvider('0' + cleaned) !== null;
  }
  
  return false;
}

/**
 * Format phone for display
 */
export function formatPhoneForDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length >= 10) {
    // Format as 0XX XXX XXXX
    const local = cleaned.startsWith('260') 
      ? '0' + cleaned.substring(3) 
      : cleaned.startsWith('0') 
        ? cleaned 
        : '0' + cleaned;
    
    if (local.length === 10) {
      return `${local.substring(0, 3)} ${local.substring(3, 6)} ${local.substring(6)}`;
    }
  }
  
  return phone;
}
