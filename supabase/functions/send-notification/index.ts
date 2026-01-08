import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "order" | "message" | "funding";
  userId: string;
  title: string;
  message: string;
  relatedId?: string;
  data?: Record<string, any>;
}

const getEmailTemplate = (type: string, title: string, message: string, data?: Record<string, any>) => {
  const baseStyles = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
      .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
      .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 32px; text-align: center; }
      .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
      .content { padding: 32px; }
      .content h2 { color: #1e3a5f; margin-top: 0; }
      .content p { color: #333; line-height: 1.6; }
      .cta-button { display: inline-block; background-color: #f97316; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 16px; }
      .footer { background-color: #f4f4f4; padding: 24px; text-align: center; color: #666; font-size: 12px; }
      .highlight-box { background-color: #f0f9ff; border-left: 4px solid #1e3a5f; padding: 16px; margin: 16px 0; }
    </style>
  `;

  const header = `
    <div class="header">
      <h1>WATHACI Connect</h1>
    </div>
  `;

  const footer = `
    <div class="footer">
      <p>© ${new Date().getFullYear()} WATHACI Connect. All rights reserved.</p>
      <p>Connecting SMEs, Professionals, and Investors in Zambia</p>
      <p>Need help? Contact us at support@wathaci.com</p>
    </div>
  `;

  let content = "";

  switch (type) {
    case "order":
      content = `
        <div class="content">
          <h2>🎉 ${title}</h2>
          <p>${message}</p>
          ${data?.orderDetails ? `
            <div class="highlight-box">
              <p><strong>Service:</strong> ${data.orderDetails.service}</p>
              <p><strong>Amount:</strong> ${data.orderDetails.currency} ${data.orderDetails.amount}</p>
              <p><strong>Status:</strong> ${data.orderDetails.status}</p>
            </div>
          ` : ""}
          <a href="https://wathaci.com/wallet" class="cta-button">View Your Orders</a>
        </div>
      `;
      break;

    case "message":
      content = `
        <div class="content">
          <h2>💬 ${title}</h2>
          <p>${message}</p>
          ${data?.senderName ? `
            <div class="highlight-box">
              <p><strong>From:</strong> ${data.senderName}</p>
              ${data.preview ? `<p><em>"${data.preview}"</em></p>` : ""}
            </div>
          ` : ""}
          <a href="https://wathaci.com/messages" class="cta-button">View Message</a>
        </div>
      `;
      break;

    case "funding":
      content = `
        <div class="content">
          <h2>💰 ${title}</h2>
          <p>${message}</p>
          ${data?.opportunityDetails ? `
            <div class="highlight-box">
              <p><strong>Organization:</strong> ${data.opportunityDetails.organization}</p>
              <p><strong>Amount:</strong> ${data.opportunityDetails.amount}</p>
              <p><strong>Deadline:</strong> ${data.opportunityDetails.deadline}</p>
            </div>
          ` : ""}
          <a href="https://wathaci.com/funding-hub" class="cta-button">Explore Funding</a>
        </div>
      `;
      break;

    default:
      content = `
        <div class="content">
          <h2>${title}</h2>
          <p>${message}</p>
          <a href="https://wathaci.com" class="cta-button">Visit WATHACI Connect</a>
        </div>
      `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        ${header}
        ${content}
        ${footer}
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate JWT - require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { type, userId, title, message, relatedId, data }: NotificationRequest = await req.json();

    // Validate required fields
    if (!type || !userId || !title || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, userId, title, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate notification type
    if (!['order', 'message', 'funding'].includes(type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid notification type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${type} notification for user ${userId} by ${user.id}`);

    // Get user email from profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name, notification_preferences")
      .eq("id", userId)
      .single();

    if (profileError || !profile?.email) {
      console.error("Error fetching user profile:", profileError);
      return new Response(
        JSON.stringify({ error: "User email not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check notification preferences
    const preferences = profile.notification_preferences || { email: true };
    if (!preferences.email) {
      console.log("User has disabled email notifications");
      return new Response(
        JSON.stringify({ success: true, message: "User has disabled email notifications" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate email HTML
    const emailHtml = getEmailTemplate(type, title, message, data);

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "WATHACI Connect <notifications@wathaci.com>",
      to: [profile.email],
      subject: title,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log the notification
    await supabase.from("notification_logs").insert({
      user_id: userId,
      notification_type: type,
      title,
      message,
      email_sent: true,
      sent_at: new Date().toISOString(),
      related_id: relatedId || null,
    });

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
