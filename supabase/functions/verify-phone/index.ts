import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Zambian phone number prefixes by provider
const ZAMBIA_PREFIXES: Record<string, { provider: string; providerCode: string; providerName: string }> = {
  '096': { provider: 'mtn', providerCode: 'MTN', providerName: 'MTN Mobile Money' },
  '076': { provider: 'mtn', providerCode: 'MTN', providerName: 'MTN Mobile Money' },
  '097': { provider: 'airtel', providerCode: 'AIRTEL', providerName: 'Airtel Money' },
  '077': { provider: 'airtel', providerCode: 'AIRTEL', providerName: 'Airtel Money' },
  '095': { provider: 'zamtel', providerCode: 'ZAMTEL', providerName: 'Zamtel Kwacha' },
  '075': { provider: 'zamtel', providerCode: 'ZAMTEL', providerName: 'Zamtel Kwacha' },
};

function detectProvider(phoneNumber: string) {
  const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
  let prefix = '';
  
  if (cleaned.startsWith('+260')) {
    prefix = '0' + cleaned.substring(4, 6);
  } else if (cleaned.startsWith('260')) {
    prefix = '0' + cleaned.substring(3, 5);
  } else if (cleaned.startsWith('0')) {
    prefix = cleaned.substring(0, 3);
  } else if (cleaned.length >= 2) {
    prefix = '0' + cleaned.substring(0, 2);
  }
  
  return ZAMBIA_PREFIXES[prefix] || null;
}

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = '260' + cleaned.substring(1);
  }
  
  if (!cleaned.startsWith('260')) {
    cleaned = '260' + cleaned;
  }
  
  return cleaned;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number } = await req.json();
    
    if (!phone_number) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verifying phone number: ${phone_number}`);

    // Detect provider from phone number
    const providerInfo = detectProvider(phone_number);
    
    if (!providerInfo) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unable to detect provider. Please use a valid Zambian mobile number.',
          phone_number 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formattedPhone = formatPhoneNumber(phone_number);
    const lencoApiToken = Deno.env.get('LENCO_API_TOKEN');
    const lencoBaseUrl = Deno.env.get('LENCO_BASE_URL') || 'https://api.lenco.co';
    const LENCO_API_URL = lencoBaseUrl.endsWith('/v2') ? lencoBaseUrl : `${lencoBaseUrl}/v2`;

    console.log(`Provider detected: ${providerInfo.providerName}, formatted phone: ${formattedPhone}`);

    // Try to get account name from Lenco if token is available
    let accountName: string | null = null;
    let verificationStatus = 'detected';
    
    if (lencoApiToken) {
      try {
        // Lenco name enquiry API
        console.log(`Calling Lenco name enquiry for ${formattedPhone} on ${providerInfo.providerCode}`);
        
        const lencoResponse = await fetch(`${LENCO_API_URL}/collections/mobile-money/name-enquiry`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lencoApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: formattedPhone,
            country: 'ZM',
            operator: providerInfo.providerCode
          })
        });

        const lencoData = await lencoResponse.json();
        console.log('Lenco name enquiry response:', JSON.stringify(lencoData));

        if (lencoResponse.ok && lencoData.data?.name) {
          accountName = lencoData.data.name;
          verificationStatus = 'verified';
          console.log(`Account name found: ${accountName}`);
        } else if (lencoData.data?.accountName) {
          accountName = lencoData.data.accountName;
          verificationStatus = 'verified';
          console.log(`Account name found (alt): ${accountName}`);
        } else {
          console.log('Name enquiry did not return account name:', lencoData);
          verificationStatus = 'provider_detected';
        }
      } catch (lencoError) {
        console.error('Lenco name enquiry error:', lencoError);
        // Continue without name - we still have provider detection
        verificationStatus = 'provider_detected';
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        phone_number: formattedPhone,
        display_phone: phone_number,
        provider: providerInfo.provider,
        provider_code: providerInfo.providerCode,
        provider_name: providerInfo.providerName,
        account_name: accountName,
        verification_status: verificationStatus,
        message: accountName 
          ? `Account registered to: ${accountName}`
          : `Provider: ${providerInfo.providerName}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Phone verification error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to verify phone number',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
