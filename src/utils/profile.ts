interface PrepareProfileForUpsertParams {
  profileData: Record<string, any>;
  userId: string;
  userEmail: string;
  existingProfile?: Record<string, any> | null;
}

interface PrepareProfileForUpsertResult {
  upsertPayload: Record<string, unknown>;
}

const sanitizeValue = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed;
};

const extractCardDetails = (
  cardNumber: string,
  expiry: string,
  cardholderName: string | null,
) => {
  if (!cardholderName) {
    throw new Error('Please enter the name on the card.');
  }

  const normalizedNumber = cardNumber.replace(/\D/g, '');
  if (normalizedNumber.length < 12) {
    throw new Error('Please enter a valid card number.');
  }

  const expiryMatch = expiry.replace(/\s/g, '').match(/^(\d{2})\/(\d{2}|\d{4})$/);
  if (!expiryMatch) {
    throw new Error('Please enter the card expiry in MM/YY format.');
  }

  const month = Number(expiryMatch[1]);
  if (month < 1 || month > 12) {
    throw new Error('Please enter a valid expiry month.');
  }

  let year = expiryMatch[2];
  if (year.length === 2) {
    year = `20${year}`;
  }

  return {
    last4: normalizedNumber.slice(-4),
    expiry_month: month,
    expiry_year: Number(year),
    cardholder_name: cardholderName,
  };
};

const normalizeCoordinates = (coordinates: unknown) => {
  if (!coordinates || typeof coordinates !== 'object') {
    return null;
  }

  const coords = coordinates as Record<string, unknown>;
  const lat = typeof coords.lat === 'number' ? coords.lat : Number(coords.lat);
  const lng = typeof coords.lng === 'number' ? coords.lng : Number(coords.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
};

const normalizeQualifications = (qualifications: unknown) => {
  if (!Array.isArray(qualifications)) {
    return [];
  }

  return qualifications
    .map((qualification: Record<string, any>) => {
      if (!qualification || typeof qualification !== 'object') {
        return null;
      }

      const institution = sanitizeValue(qualification.institution);
      const degree = sanitizeValue(qualification.degree ?? qualification.name);
      const field = sanitizeValue(qualification.field);
      const year = sanitizeValue(qualification.year);

      const normalized: Record<string, string> = {};

      if (institution) normalized.institution = institution;
      if (degree) {
        normalized.degree = degree;
        normalized.name = degree;
      }
      if (field) normalized.field = field;
      if (year) normalized.year = year;

      return Object.keys(normalized).length > 0 ? normalized : null;
    })
    .filter((qualification): qualification is Record<string, string> => Boolean(qualification));
};

const sanitizeProfileFields = (
  profilePayload: Record<string, unknown>,
) => {
  const sanitizedProfile: Record<string, unknown> = {};
  const numericFields = new Set([
    'experience_years',
    'employees_count',
    'annual_revenue',
    'annual_funding_budget',
    'investment_ticket_min',
    'investment_ticket_max',
  ]);

  for (const [key, value] of Object.entries(profilePayload)) {
    if (Array.isArray(value)) {
      if (key === 'gaps_identified') {
        const sanitizedGaps = value
          .map((item) => (typeof item === 'string' ? sanitizeValue(item) : null))
          .filter((item): item is string => Boolean(item));

        sanitizedProfile[key] = sanitizedGaps;
      } else {
        sanitizedProfile[key] = value;
      }
    } else if (typeof value === 'string') {
      const sanitizedValue = sanitizeValue(value);
      if (sanitizedValue === null) {
        sanitizedProfile[key] = null;
      } else if (numericFields.has(key)) {
        const numeric = Number(sanitizedValue.replace(/,/g, ''));
        sanitizedProfile[key] = Number.isFinite(numeric) ? numeric : sanitizedValue;
      } else if (key === 'bio') {
        sanitizedProfile[key] = sanitizedValue.slice(0, 400);
      } else {
        sanitizedProfile[key] = sanitizedValue;
      }
    } else {
      sanitizedProfile[key] = value ?? null;
    }
  }

  return sanitizedProfile;
};

export const prepareProfileForUpsert = ({
  profileData,
  userId,
  userEmail,
  existingProfile,
}: PrepareProfileForUpsertParams): PrepareProfileForUpsertResult => {
  const {
    card_number,
    card_expiry,
    cardholder_name,
    card_details: _ignoredCardDetails,
    use_same_phone,
    payment_method,
    coordinates,
    qualifications,
    payment_phone,
    ...profilePayload
  } = profileData;

  let paymentData: Record<string, unknown> = {};

  if (use_same_phone) {
    const phone = sanitizeValue(profilePayload.phone as string | undefined);
    if (!phone) {
      throw new Error('Please provide a phone number for subscription payments.');
    }

    paymentData = {
      payment_phone: phone,
      payment_method: 'phone',
      use_same_phone: true,
    };
  } else if (payment_method === 'card') {
    let cardDetails = null;
    const normalizedCardholderName = sanitizeValue(cardholder_name);

    if (card_number && card_expiry) {
      cardDetails = extractCardDetails(card_number, card_expiry, normalizedCardholderName);
    } else if (existingProfile?.card_details) {
      const existingName = sanitizeValue(existingProfile.card_details.cardholder_name);
      const finalName = normalizedCardholderName ?? existingName;
      if (!finalName) {
        throw new Error('Please enter the name on the card.');
      }

      cardDetails = {
        ...existingProfile.card_details,
        cardholder_name: finalName,
      };
    }

    if (!cardDetails) {
      throw new Error('Card details are required to process subscription payments.');
    }

    paymentData = {
      payment_method: 'card',
      card_details: cardDetails,
      use_same_phone: false,
    };
  } else {
    const paymentPhone = sanitizeValue(payment_phone);
    if (!paymentPhone) {
      throw new Error('Please provide the mobile money number to charge.');
    }

    paymentData = {
      payment_method: 'phone',
      payment_phone: paymentPhone,
      use_same_phone: false,
    };
  }

  const upsertPayload = {
    id: userId,
    email: userEmail,
    ...sanitizeProfileFields(profilePayload),
    coordinates: normalizeCoordinates(coordinates),
    qualifications: normalizeQualifications(qualifications),
    ...paymentData,
    profile_completed: true,
    updated_at: new Date().toISOString(),
  } satisfies Record<string, unknown>;

  return { upsertPayload };
};

export type { PrepareProfileForUpsertParams, PrepareProfileForUpsertResult };
