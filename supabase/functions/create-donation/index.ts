// supabase/functions/create-donation/index.ts
/**
 * Supabase Edge Function for Creating Donations
 * 
 * This function handles donation creation for the Wathaci Connect platform.
 * Each donation helps struggling SMEs cover short-term gaps (working capital,
 * inventory, rent, operational costs) to become investment-ready and sustainable.
 * 
 * Flow:
 * 1. Validate donation request (amount, donor info)
 * 2. Calculate platform fee and net amount
 * 3. Generate unique Lenco payment reference
 * 4. Create pending donation record in database
 * 5. Initialize Lenco payment
 * 6. Return checkout URL to frontend
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface DonationRequest {
  amount: number;
  currency?: string;
  campaignId?: string;
  donorName?: string;
  isAnonymous?: boolean;
  message?: string;
  source?: string;
}

interface DonationResponse {
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

// Helper function to generate unique donation reference
function generateDonationReference(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `DON-${timestamp}-${random}`;
}

// Helper function to calculate platform fee
function calculateFees(amount: number, feePercentage: number) {
  const platformFee = Math.floor((amount * feePercentage) / 100);
  const netAmount = amount - platformFee;
  return { platformFee, netAmount };
}

// Helper function for JSON responses
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { success: false, error: "Method not allowed" },
      405
    );
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get configuration from environment
    const minPaymentAmount = parseFloat(
      Deno.env.get("MIN_PAYMENT_AMOUNT") || 
      Deno.env.get("VITE_MIN_PAYMENT_AMOUNT") || 
      "10"
    );
    const maxPaymentAmount = parseFloat(
      Deno.env.get("MAX_PAYMENT_AMOUNT") || 
      Deno.env.get("VITE_MAX_PAYMENT_AMOUNT") || 
      "50000"
    );
    const platformFeePercentage = parseFloat(
      Deno.env.get("PLATFORM_FEE_PERCENTAGE") || 
      Deno.env.get("VITE_PLATFORM_FEE_PERCENTAGE") || 
      "5"
    );
    const lencoApiSecret = Deno.env.get("LENCO_SECRET_KEY") || 
                           Deno.env.get("LENCO_API_SECRET");
    const lencoWebhookUrl = Deno.env.get("LENCO_WEBHOOK_URL");

    if (!lencoApiSecret) {
      throw new Error("Lenco API configuration missing");
    }

    // Parse request body
    const body: DonationRequest = await req.json();
    const {
      amount,
      currency = "ZMW",
      campaignId,
      donorName,
      isAnonymous = false,
      message,
      source = "web",
    } = body;

    // Validate amount
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return jsonResponse(
        { success: false, error: "Invalid donation amount" },
        400
      );
    }

    if (amount < minPaymentAmount) {
      return jsonResponse(
        {
          success: false,
          error: `Minimum donation is K${minPaymentAmount}`,
        },
        400
      );
    }

    if (amount > maxPaymentAmount) {
      return jsonResponse(
        {
          success: false,
          error: `Maximum donation per transaction is K${maxPaymentAmount}`,
        },
        400
      );
    }

    // Get authenticated user (if any)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Calculate fees
    const { platformFee, netAmount } = calculateFees(
      amount,
      platformFeePercentage
    );

    // Generate unique reference
    const lencoReference = generateDonationReference();

    // Insert donation record with pending status
    const { data: donation, error: dbError } = await supabase
      .from("donations")
      .insert({
        donor_user_id: !isAnonymous && userId ? userId : null,
        donor_name: !isAnonymous && donorName ? donorName : null,
        amount,
        currency,
        platform_fee_amount: platformFee,
        net_amount: netAmount,
        status: "pending",
        lenco_reference: lencoReference,
        campaign_id: campaignId || null,
        message: message || null,
        source,
        metadata: {
          platform_fee_percentage: platformFeePercentage,
          is_anonymous: isAnonymous,
        },
      })
      .select()
      .single();

    if (dbError || !donation) {
      console.error("Database error:", dbError);
      throw new Error("Failed to create donation record");
    }

    // Prepare Lenco payment request
    // Note: Lenco expects amount in smallest currency unit (ngwee for ZMW)
    // 1 ZMW = 100 ngwee
    const amountInSmallestUnit = Math.round(amount * 100);

    const lencoPayload = {
      amount: amountInSmallestUnit,
      currency: "ZMK", // Lenco uses ZMK for Zambia Kwacha
      email: donorName && donorName.includes("@") 
        ? donorName 
        : "donations@wathaci.com",
      name: !isAnonymous && donorName ? donorName : "Anonymous Donor",
      phone: "", // Optional for donations
      reference: lencoReference,
      callback_url: lencoWebhookUrl || `${req.headers.get("origin")}/api/donation-webhook`,
      metadata: {
        donation_id: donation.id,
        transaction_type: "donation",
        campaign_id: campaignId || null,
        platform: "WATHACI_CONNECT",
        net_amount: netAmount,
        platform_fee: platformFee,
      },
    };

    // Call Lenco API to initialize payment
    // NOTE: Replace with actual Lenco API endpoint when available
    const lencoResponse = await fetch(
      "https://api.lenco.co/access/v2/payments/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lencoApiSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(lencoPayload),
      }
    );

    if (!lencoResponse.ok) {
      const lencoError = await lencoResponse.json().catch(() => ({}));
      console.error("Lenco API error:", lencoError);

      // Mark donation as failed
      await supabase
        .from("donations")
        .update({ status: "failed" })
        .eq("id", donation.id);

      throw new Error(
        lencoError.message || "Payment gateway initialization failed"
      );
    }

    const lencoData = await lencoResponse.json();

    // Update donation with Lenco details
    await supabase
      .from("donations")
      .update({
        lenco_authorization_url: lencoData.data?.authorization_url,
        lenco_access_code: lencoData.data?.access_code,
        lenco_transaction_id: lencoData.data?.id,
      })
      .eq("id", donation.id);

    // Return success response with checkout URL
    const response: DonationResponse = {
      success: true,
      data: {
        donationId: donation.id,
        checkoutUrl: lencoData.data?.authorization_url || "",
        reference: lencoReference,
        amount,
        platformFee,
        netAmount,
      },
    };

    return jsonResponse(response, 200);
  } catch (error) {
    console.error("Create donation error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";

    const response: DonationResponse = {
      success: false,
      error: errorMessage,
    };

    return jsonResponse(response, 500);
  }
});
