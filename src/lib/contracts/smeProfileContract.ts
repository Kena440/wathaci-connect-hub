import { z } from 'zod';
import type { SmeProfileRow } from '@/@types/database';

const trimOrNull = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const trimRequired = (value: string) => value.trim();

const cleanStringArray = (values?: string[] | null) => values?.map((value) => value.trim()).filter(Boolean) ?? [];

const parseSocialLinks = (links?: string) =>
  links
    ?.split(',')
    .map((link) => link.trim())
    .filter(Boolean) ?? [];

const smeProfileFieldContract = {
  business_name: {
    dbColumn: 'business_name',
    required: true,
    type: 'text',
    schema: z.string().min(2, 'Business name is required'),
    defaultValue: '',
    toDb: trimRequired,
  },
  registration_number: {
    dbColumn: 'registration_number',
    required: false,
    type: 'text',
    schema: z.string().optional(),
    defaultValue: '',
    toDb: trimOrNull,
  },
  registration_type: {
    dbColumn: 'registration_type',
    required: false,
    type: 'text',
    schema: z.string().optional(),
    defaultValue: '',
    toDb: trimOrNull,
  },
  sector: {
    dbColumn: 'sector',
    required: false,
    type: 'text',
    schema: z.string().optional(),
    defaultValue: '',
    toDb: trimOrNull,
  },
  subsector: {
    dbColumn: 'subsector',
    required: false,
    type: 'text',
    schema: z.string().optional(),
    defaultValue: '',
    toDb: trimOrNull,
  },
  years_in_operation: {
    dbColumn: 'years_in_operation',
    required: false,
    type: 'integer',
    schema: z.number().int().min(0).optional(),
    defaultValue: undefined as number | undefined,
    toDb: (value?: number | null) => value ?? null,
  },
  employee_count: {
    dbColumn: 'employee_count',
    required: false,
    type: 'integer',
    schema: z.number().int().min(0).optional(),
    defaultValue: undefined as number | undefined,
    toDb: (value?: number | null) => value ?? null,
  },
  turnover_bracket: {
    dbColumn: 'turnover_bracket',
    required: false,
    type: 'text',
    schema: z.string().optional(),
    defaultValue: '',
    toDb: trimOrNull,
  },
  products_overview: {
    dbColumn: 'products_overview',
    required: false,
    type: 'text',
    schema: z.string().optional(),
    defaultValue: '',
    toDb: trimOrNull,
  },
  target_market: {
    dbColumn: 'target_market',
    required: false,
    type: 'text',
    schema: z.string().optional(),
    defaultValue: '',
    toDb: trimOrNull,
  },
  location_city: {
    dbColumn: 'location_city',
    required: true,
    type: 'text',
    schema: z.string().min(1, 'City is required'),
    defaultValue: '',
    toDb: trimRequired,
  },
  location_country: {
    dbColumn: 'location_country',
    required: true,
    type: 'text',
    schema: z.string().min(1, 'Country is required'),
    defaultValue: 'Zambia',
    toDb: trimRequired,
  },
  contact_name: {
    dbColumn: 'contact_name',
    required: true,
    type: 'text',
    schema: z.string().min(1, 'Contact person is required'),
    defaultValue: '',
    toDb: trimRequired,
  },
  contact_phone: {
    dbColumn: 'contact_phone',
    required: true,
    type: 'text',
    schema: z.string().min(4, 'Phone number is required'),
    defaultValue: '',
    toDb: trimRequired,
  },
  business_email: {
    dbColumn: 'business_email',
    required: true,
    type: 'text',
    schema: z.string().email('Enter a valid email'),
    defaultValue: '',
    toDb: trimRequired,
  },
  website_url: {
    dbColumn: 'website_url',
    required: false,
    type: 'text',
    schema: z.string().url('Enter a valid URL').optional().or(z.literal('')).transform((val) => val || undefined),
    defaultValue: '',
    toDb: trimOrNull,
  },
  social_links: {
    dbColumn: 'social_links',
    required: false,
    type: 'text[]',
    schema: z.string().optional(),
    defaultValue: '',
    toDb: parseSocialLinks,
  },
  main_challenges: {
    dbColumn: 'main_challenges',
    required: false,
    type: 'text[]',
    schema: z.array(z.string()).optional(),
    defaultValue: [] as string[],
    toDb: cleanStringArray,
  },
  support_needs: {
    dbColumn: 'support_needs',
    required: false,
    type: 'text[]',
    schema: z.array(z.string()).optional(),
    defaultValue: [] as string[],
    toDb: cleanStringArray,
  },
  logo_url: {
    dbColumn: 'logo_url',
    required: false,
    type: 'text',
    schema: z.string().optional(),
    defaultValue: '',
    toDb: trimOrNull,
  },
  photos: {
    dbColumn: 'photos',
    required: false,
    type: 'text[]',
    schema: z.array(z.string()).optional(),
    defaultValue: [] as string[],
    toDb: cleanStringArray,
  },
  account_type: {
    dbColumn: 'account_type',
    required: true,
    type: 'text',
    schema: z.literal('sme').default('sme'),
    defaultValue: 'sme',
    toDb: () => 'sme',
  },
  is_active: {
    dbColumn: 'is_active',
    required: true,
    type: 'boolean',
    schema: z.boolean().default(true),
    defaultValue: true,
    toDb: (value: boolean) => value,
  },
  is_profile_complete: {
    dbColumn: 'is_profile_complete',
    required: true,
    type: 'boolean',
    schema: z.boolean().default(false),
    defaultValue: false,
    toDb: (value: boolean) => value,
  },
  approval_status: {
    dbColumn: 'approval_status',
    required: true,
    type: 'text',
    schema: z.string().default('pending'),
    defaultValue: 'pending',
    toDb: (value?: string) => value ?? 'pending',
  },
} as const;

export const smeProfileSchema = z.object(
  Object.fromEntries(
    Object.entries(smeProfileFieldContract).map(([field, config]) => [field, config.schema])
  ) as Record<keyof typeof smeProfileFieldContract, z.ZodTypeAny>
);

export type SmeProfileFormValues = z.infer<typeof smeProfileSchema>;

export const smeProfileDefaultValues = Object.fromEntries(
  Object.entries(smeProfileFieldContract).map(([field, config]) => [field, config.defaultValue])
) as SmeProfileFormValues;

export const SME_PROFILE_DB_COLUMNS = Object.values(smeProfileFieldContract).map((config) => config.dbColumn);
export const SME_PROFILE_ALLOWED_DB_COLUMNS = [...SME_PROFILE_DB_COLUMNS, 'user_id', 'updated_at'];

export const SME_PROFILE_FIELD_CONTRACT = Object.entries(smeProfileFieldContract).map(([uiField, config]) => ({
  uiField,
  dbColumn: config.dbColumn,
  required: config.required,
  type: config.type,
}));

export function pickDbColumns<T extends Record<string, any>>(payload: T, allowedColumns: string[]) {
  const allowed = new Set(allowedColumns);
  return Object.fromEntries(
    Object.entries(payload).filter(([key, value]) => allowed.has(key) && value !== undefined)
  );
}

export function buildSmeProfileDbPayload(values: SmeProfileFormValues, userId: string) {
  const payloadEntries = Object.entries(smeProfileFieldContract).map(([uiField, config]) => {
    const rawValue = values[uiField as keyof SmeProfileFormValues];
    const sanitized = config.toDb ? config.toDb(rawValue as never) : rawValue;
    return [config.dbColumn, sanitized];
  });

  const preparedPayload = Object.fromEntries(payloadEntries);

  return {
    ...pickDbColumns(preparedPayload, SME_PROFILE_DB_COLUMNS),
    user_id: userId,
    updated_at: new Date().toISOString(),
  } satisfies Record<string, unknown>;
}

export function mapSmeProfileRowToForm(
  row: Partial<SmeProfileRow> | null,
  fallbackEmail?: string
): SmeProfileFormValues {
  return {
    ...smeProfileDefaultValues,
    business_name: row?.business_name ?? smeProfileDefaultValues.business_name,
    registration_number: row?.registration_number ?? smeProfileDefaultValues.registration_number,
    registration_type: row?.registration_type ?? smeProfileDefaultValues.registration_type,
    sector: row?.sector ?? smeProfileDefaultValues.sector,
    subsector: row?.subsector ?? smeProfileDefaultValues.subsector,
    years_in_operation: row?.years_in_operation ?? smeProfileDefaultValues.years_in_operation,
    employee_count: row?.employee_count ?? smeProfileDefaultValues.employee_count,
    turnover_bracket: row?.turnover_bracket ?? smeProfileDefaultValues.turnover_bracket,
    products_overview: row?.products_overview ?? smeProfileDefaultValues.products_overview,
    target_market: row?.target_market ?? smeProfileDefaultValues.target_market,
    location_city: row?.location_city ?? smeProfileDefaultValues.location_city,
    location_country: row?.location_country ?? smeProfileDefaultValues.location_country,
    contact_name: row?.contact_name ?? smeProfileDefaultValues.contact_name,
    contact_phone: row?.contact_phone ?? smeProfileDefaultValues.contact_phone,
    business_email: row?.business_email ?? fallbackEmail ?? smeProfileDefaultValues.business_email,
    website_url: row?.website_url ?? smeProfileDefaultValues.website_url,
    social_links: row?.social_links?.join(', ') ?? smeProfileDefaultValues.social_links,
    main_challenges: row?.main_challenges ?? smeProfileDefaultValues.main_challenges,
    support_needs: row?.support_needs ?? smeProfileDefaultValues.support_needs,
    logo_url: row?.logo_url ?? smeProfileDefaultValues.logo_url,
    photos: row?.photos ?? smeProfileDefaultValues.photos,
    account_type: row?.account_type ?? smeProfileDefaultValues.account_type,
    is_active: row?.is_active ?? smeProfileDefaultValues.is_active,
    is_profile_complete: row?.is_profile_complete ?? smeProfileDefaultValues.is_profile_complete,
    approval_status: row?.approval_status ?? smeProfileDefaultValues.approval_status,
  };
}
