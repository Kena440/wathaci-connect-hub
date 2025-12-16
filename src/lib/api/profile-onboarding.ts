import {
  SME_PROFILE_DB_COLUMNS,
  buildSmeProfileDbPayload,
  smeProfileSchema,
  type SmeProfileFormValues,
} from '@/lib/contracts/smeProfileContract';
import type { SmeProfileRow } from '@/@types/database';
import { supabaseClient } from '@/lib/supabaseClient';

export type EntityType = 'individual' | 'firm' | 'company';

export interface ProfessionalProfilePayload {
  entity_type: EntityType;
  full_name: string;
  organisation_name?: string | null;
  bio?: string | null;
  primary_expertise: string[];
  secondary_skills?: string[];
  years_of_experience: number;
  current_organisation?: string | null;
  qualifications?: string | null;
  top_sectors: string[];
  notable_projects?: string | null;
  services_offered: string[];
  expected_rates?: string | null;
  location_city: string;
  location_country: string;
  phone: string;
  email: string;
  linkedin_url?: string | null;
  website_url?: string | null;
  portfolio_url?: string | null;
  availability: 'part_time' | 'full_time' | 'occasional';
  notes?: string | null;
  profile_photo_url?: string | null;
  logo_url?: string | null;
}

export interface InvestorProfilePayload {
  organisation_name: string;
  investor_type?: string | null;
  ticket_size_min?: number | null;
  ticket_size_max?: number | null;
  preferred_sectors?: string[];
  country_focus?: string[];
  stage_preference?: string[];
  instruments?: string[];
  impact_focus?: string[];
  contact_person: string;
  contact_role?: string | null;
  website_url?: string | null;
  linkedin_url?: string | null;
  logo_url?: string | null;
}

const sanitizeText = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const BUCKET_ID = "profile-media";

async function requireUser() {
  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser();

  if (error || !user) {
    throw new Error("You need to be signed in to continue onboarding.");
  }

  return user;
}

export async function uploadProfileMedia(
  file: File,
  userId: string,
  pathPrefix: string,
  label: string
) {
  if (!userId) {
    throw new Error('User ID is required to upload profile media');
  }
  const extension = file.name.split(".").pop();
  const fileName = `${label}-${Date.now()}.${extension}`;
  const path = `${pathPrefix}/${fileName}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(BUCKET_ID)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Failed to upload file");
  }

  const { data: signedUrl, error: signedError } = await supabaseClient.storage
    .from(BUCKET_ID)
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  if (signedError) {
    throw new Error(signedError.message || "Failed to prepare uploaded file preview");
  }

  return {
    path: `${BUCKET_ID}/${path}`,
    signedUrl: signedUrl?.signedUrl,
  };
}

export async function getProfessionalProfile() {
  const user = await requireUser();
  const { data, error } = await supabaseClient
    .from("professional_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function upsertProfessionalProfile(payload: ProfessionalProfilePayload) {
  const user = await requireUser();
  const sanitizedPayload = {
    ...payload,
    organisation_name: payload.organisation_name || null,
    bio: payload.bio?.trim() || null,
    current_organisation: payload.current_organisation || null,
    qualifications: payload.qualifications?.trim() || null,
    notable_projects: payload.notable_projects?.trim() || null,
    expected_rates: payload.expected_rates?.trim() || null,
    linkedin_url: payload.linkedin_url?.trim() || null,
    website_url: payload.website_url?.trim() || null,
    portfolio_url: payload.portfolio_url?.trim() || null,
    notes: payload.notes?.trim() || null,
    profile_photo_url: payload.profile_photo_url || null,
    logo_url: payload.logo_url || null,
  };

  const { data, error } = await supabaseClient
    .from("professional_profiles")
    .upsert({
      ...sanitizedPayload,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[profile-onboarding] professional_profiles upsert failed", {
      table: "professional_profiles",
      error,
      payloadKeys: Object.keys(sanitizedPayload),
    });
    throw new Error(error.message || "Unable to save professional profile.");
  }

  return data;
}

export async function getSmeProfile(): Promise<SmeProfileRow | null> {
  const user = await requireUser();
  const { data, error } = await supabaseClient
    .from('sme_profiles')
    .select(SME_PROFILE_DB_COLUMNS.join(','))
    .eq('user_id', user.id)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }

  return (data as SmeProfileRow | null) ?? null;
}

const isSchemaMismatchError = (message?: string) =>
  message?.toLowerCase().includes('schema cache') || message?.toLowerCase().includes('column');

export async function upsertSmeProfile(payload: SmeProfileFormValues) {
  const user = await requireUser();
  const parsed = smeProfileSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error('SME profile payload failed validation.');
  }

  const sanitizedPayload = buildSmeProfileDbPayload(parsed.data, user.id);
  const { data, error } = await supabaseClient
    .from('sme_profiles')
    .upsert(sanitizedPayload)
    .select()
    .single();

  if (error) {
    if (import.meta.env.DEV) {
      console.error('[profile-onboarding] sme_profiles upsert failed', {
        table: 'sme_profiles',
        error,
        payloadKeys: Object.keys(sanitizedPayload),
      });
    }

    if (isSchemaMismatchError(error.message)) {
      throw new Error(
        'SME profile fields are out of sync with the database. Please refresh and try again; the team has been notified.'
      );
    }

    throw new Error(error.message || 'Unable to save SME profile');
  }

  return data as SmeProfileRow;
}

export async function getInvestorProfile() {
  const user = await requireUser();
  const { data, error } = await supabaseClient
    .from("investor_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function upsertInvestorProfile(payload: InvestorProfilePayload) {
  const user = await requireUser();
  const sanitizedPayload = {
    ...payload,
    investor_type: sanitizeText(payload.investor_type),
    contact_person: payload.contact_person.trim(),
    contact_role: sanitizeText(payload.contact_role),
    website_url: sanitizeText(payload.website_url),
    linkedin_url: sanitizeText(payload.linkedin_url),
    logo_url: sanitizeText(payload.logo_url),
  };
  const { data, error } = await supabaseClient
    .from("investor_profiles")
    .upsert({
      ...sanitizedPayload,
      preferred_sectors: payload.preferred_sectors ?? [],
      country_focus: payload.country_focus ?? [],
      stage_preference: payload.stage_preference ?? [],
      instruments: payload.instruments ?? [],
      impact_focus: payload.impact_focus ?? [],
      user_id: user.id,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[profile-onboarding] investor_profiles upsert failed", {
      table: "investor_profiles",
      error,
      payloadKeys: Object.keys(payload),
    });
    throw new Error(error.message || "Unable to save investor profile");
  }

  return data;
}
