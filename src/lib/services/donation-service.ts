/**
 * Donation Service
 * 
 * Handles donation creation and processing for supporting SMEs through
 * the Wathaci Connect platform. Each donation helps struggling SMEs cover
 * short-term gaps and become investment-ready.
 */

import { supabase } from "@/lib/supabase-enhanced";

export interface CreateDonationRequest {
  amount: number;
  currency?: string;
  campaignId?: string;
  donorName?: string;
  isAnonymous?: boolean;
  message?: string;
  source?: string;
}

export interface CreateDonationResponse {
  success: boolean;
  data?: {
    donationId: string;
    checkoutUrl: string;
    reference: string;
    amount: number;
    platformFee: number;
    netAmount: number;
  };
  error?: string;
}

export interface DonationBreakdown {
  grossAmount: number;
  platformFee: number;
  platformFeePercentage: number;
  netAmount: number;
  totalCharged: number;
}

/**
 * Calculate donation breakdown including platform fee
 */
export function calculateDonationBreakdown(
  amount: number,
  feePercentage: number
): DonationBreakdown {
  const platformFee = Math.floor((amount * feePercentage) / 100);
  const netAmount = amount - platformFee;

  return {
    grossAmount: amount,
    platformFee,
    platformFeePercentage: feePercentage,
    netAmount,
    totalCharged: amount,
  };
}

/**
 * Create a new donation
 */
export async function createDonation(
  request: CreateDonationRequest
): Promise<CreateDonationResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("create-donation", {
      body: request,
    });

    if (error) {
      console.error("Donation creation error:", error);
      return {
        success: false,
        error: error.message || "Failed to create donation",
      };
    }

    return data as CreateDonationResponse;
  } catch (error) {
    console.error("Donation service error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Get donation status by reference
 */
export async function getDonationStatus(reference: string) {
  try {
    const { data, error } = await supabase
      .from("donations")
      .select("*")
      .eq("lenco_reference", reference)
      .single();

    if (error) {
      console.error("Error fetching donation status:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getDonationStatus:", error);
    return null;
  }
}

/**
 * Get user's donation history
 */
export async function getUserDonations(userId: string) {
  try {
    const { data, error } = await supabase
      .from("donations")
      .select("*")
      .eq("donor_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user donations:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getUserDonations:", error);
    return [];
  }
}

export const donationService = {
  createDonation,
  calculateDonationBreakdown,
  getDonationStatus,
  getUserDonations,
};
