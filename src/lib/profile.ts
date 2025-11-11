/**
 * Profile Management Helper
 * 
 * Provides robust profile creation and update functionality with proper
 * error handling, validation, and authentication checks.
 */

import { supabaseClient as supabase } from "./supabaseClient";

export type ProfilePayload = {
  account_type: "sme" | "donor" | "admin" | "sole_proprietor" | "professional" | "investor" | "government";
  full_name?: string;
  first_name?: string;
  last_name?: string;
  msisdn?: string;
  phone?: string;
  business_name?: string;
  [key: string]: any;
};

/**
 * Robust profile upsert function that ensures:
 * - User is authenticated before attempting profile creation
 * - All string values are properly trimmed
 * - Proper error handling and logging
 * - Uses upsert to handle both create and update scenarios
 */
export async function upsertProfile(profile: ProfilePayload) {
  // Step 1: Ensure user is authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Profile upsert failed - authentication error:", userError);
    throw new Error(`Authentication error: ${userError.message}`);
  }

  if (!user) {
    console.error("Profile upsert failed - no authenticated user");
    throw new Error("User not authenticated; cannot create profile.");
  }

  console.log("Creating/updating profile for user:", user.id);

  // Step 2: Sanitize and validate the profile data
  const sanitizeValue = (value: any): any => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed || null;
    }
    return value;
  };

  // Build the payload with sanitized values
  const payload: any = {
    id: user.id,
    account_type: profile.account_type,
  };

  // Handle name fields
  if (profile.full_name) {
    const fullName = sanitizeValue(profile.full_name);
    if (!fullName) {
      throw new Error("Full name cannot be empty or whitespace only.");
    }
    payload.full_name = fullName;
    
    // Split full_name into first_name and last_name if they're not provided
    if (!profile.first_name && !profile.last_name) {
      const nameParts = fullName.split(/\s+/);
      payload.first_name = nameParts[0];
      payload.last_name = nameParts.slice(1).join(" ") || nameParts[0];
    }
  }

  if (profile.first_name) {
    const firstName = sanitizeValue(profile.first_name);
    if (!firstName) {
      throw new Error("First name cannot be empty or whitespace only.");
    }
    payload.first_name = firstName;
  }

  if (profile.last_name) {
    const lastName = sanitizeValue(profile.last_name);
    if (lastName) {
      payload.last_name = lastName;
    }
  }

  // Handle phone/msisdn
  const phone = sanitizeValue(profile.msisdn || profile.phone);
  if (phone) {
    payload.phone = phone;
    payload.msisdn = phone; // Store in both fields for compatibility
  }

  // Handle business name
  if (profile.business_name !== undefined) {
    payload.business_name = sanitizeValue(profile.business_name);
  }

  // Add all other fields from the profile, sanitizing strings
  for (const [key, value] of Object.entries(profile)) {
    if (!["account_type", "full_name", "first_name", "last_name", "msisdn", "phone", "business_name"].includes(key)) {
      payload[key] = sanitizeValue(value);
    }
  }

  // Log the payload being sent (excluding sensitive data)
  console.log("Profile upsert payload:", {
    id: payload.id,
    account_type: payload.account_type,
    has_name: !!(payload.full_name || payload.first_name),
    has_phone: !!payload.phone,
    has_business_name: !!payload.business_name,
  });

  // Step 3: Attempt to upsert the profile
  try {
    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.error("Profile upsert failed - Supabase error:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      
      // Provide user-friendly error messages based on error type
      if (error.code === "23505") {
        throw new Error("A profile with this information already exists.");
      } else if (error.code === "42501" || error.message?.includes("permission") || error.message?.includes("policy")) {
        throw new Error("Permission denied. Please ensure you're properly authenticated and try again.");
      } else if (error.message?.includes("column") && error.message?.includes("does not exist")) {
        throw new Error("Database schema mismatch. Please contact support.");
      } else {
        throw new Error(`Failed to save profile: ${error.message}`);
      }
    }

    console.log("Profile upsert successful:", data?.id);
    return data;
  } catch (error: any) {
    // Re-throw our custom errors
    if (error.message?.startsWith("Failed to save profile") || 
        error.message?.includes("Permission denied") ||
        error.message?.includes("already exists") ||
        error.message?.includes("schema mismatch")) {
      throw error;
    }
    
    // Handle unexpected errors
    console.error("Profile upsert failed - unexpected error:", error);
    throw new Error(`An unexpected error occurred: ${error.message || "Unknown error"}`);
  }
}

/**
 * Get the current user's profile
 */
export async function getCurrentProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { data: null, error: userError || new Error("Not authenticated") };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { data, error };
}

/**
 * Check if a profile exists for the current user
 */
export async function profileExists(): Promise<boolean> {
  const { data } = await getCurrentProfile();
  return !!data;
}
