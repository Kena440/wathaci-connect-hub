import { supabaseClient } from "@/lib/supabaseClient";

export type EntityType = "individual" | "firm" | "company";

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
  availability: "part_time" | "full_time" | "occasional";
  notes?: string | null;
  profile_photo_url?: string | null;
  logo_url?: string | null;
}

export interface SmeProfilePayload {
  business_name: string;
  registration_number?: string | null;
  registration_type?: string | null;
  sector?: string | null;
  subsector?: string | null;
  years_in_operation?: number | null;
  employee_count?: number | null;
  turnover_bracket?: string | null;
  products_overview?: string | null;
  target_market?: string | null;
  location_city?: string | null;
  location_country?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  business_email?: string | null;
  website_url?: string | null;
  social_links?: string[];
  main_challenges?: string[];
  support_needs?: string[];
  logo_url?: string | null;
  photos?: string[];
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
  contact_person?: string | null;
  contact_role?: string | null;
  website_url?: string | null;
  linkedin_url?: string | null;
  logo_url?: string | null;
}

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
    throw new Error(error.message || "Unable to save professional profile.");
  }

  return data;
}

export async function getSmeProfile() {
  const user = await requireUser();
  const { data, error } = await supabaseClient
    .from("sme_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function upsertSmeProfile(payload: SmeProfilePayload) {
  const user = await requireUser();
  const { data, error } = await supabaseClient
    .from("sme_profiles")
    .upsert({
      ...payload,
      social_links: payload.social_links ?? [],
      main_challenges: payload.main_challenges ?? [],
      support_needs: payload.support_needs ?? [],
      photos: payload.photos ?? [],
      user_id: user.id,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Unable to save SME profile");
  }

  return data;
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
  const { data, error } = await supabaseClient
    .from("investor_profiles")
    .upsert({
      ...payload,
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
    throw new Error(error.message || "Unable to save investor profile");
  }

  return data;
}
