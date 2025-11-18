/**
 * Compliance Reminders Edge Function
 * 
 * Scheduled function to send compliance task reminders via email, SMS, and WhatsApp.
 * Should be triggered daily via Supabase cron or external scheduler.
 * 
 * Environment Variables Required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD (for email)
 * - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER (for SMS)
 * - TWILIO_WHATSAPP_FROM (for WhatsApp)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Configuration
const REMINDER_COOLDOWN_HOURS = 24;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ComplianceTask {
  id: string;
  user_id: string;
  title: string;
  authority: string;
  due_date: string;
  status: string;
  remind_via_email: boolean;
  remind_via_sms: boolean;
  remind_via_whatsapp: boolean;
  last_reminder_sent_at: string | null;
}

interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  phone?: string;
  business_name?: string;
}

/**
 * Format date to a human-readable string
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

/**
 * Send email reminder using SMTP configuration
 */
async function sendEmailReminder(
  profile: UserProfile,
  task: ComplianceTask
): Promise<boolean> {
  const smtpHost = Deno.env.get('SMTP_HOST');
  const smtpPort = Deno.env.get('SMTP_PORT');
  const smtpUser = Deno.env.get('SMTP_USER');
  const smtpPassword = Deno.env.get('SMTP_PASSWORD');
  const smtpFromEmail = Deno.env.get('SMTP_FROM_EMAIL') || 'support@wathaci.com';
  const smtpFromName = Deno.env.get('SMTP_FROM_NAME') || 'Wathaci Connect';

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
    console.warn('Email configuration missing. Skipping email reminder.');
    return false;
  }

  try {
    const displayName = profile.first_name || profile.business_name || 'there';
    const subject = `Wathaci Compliance Reminder: ${task.title} due ${formatDate(task.due_date)}`;
    const body = `
Hi ${displayName},

This is a friendly reminder from Wathaci Connect about your compliance task:

Task: ${task.title}
Authority: ${task.authority}
Due date: ${formatDate(task.due_date)}

Please log into Wathaci to update the status or mark it as completed.

Staying compliant helps you qualify for funding, tenders and growth opportunities.

— Wathaci Connect
support@wathaci.com

https://wathaci.com
    `.trim();

    // Use Supabase Auth email service (piggyback on existing SMTP)
    // For now, log the email that would be sent
    console.log(`[EMAIL] Would send to ${profile.email}:`, { subject, body: body.substring(0, 100) });
    
    // TODO: Integrate with actual email sending service
    // This could use Supabase Auth's email service or a direct SMTP library
    
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${profile.email}:`, error);
    return false;
  }
}

/**
 * Send SMS reminder using Twilio
 */
async function sendSmsReminder(
  profile: UserProfile,
  task: ComplianceTask
): Promise<boolean> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const phoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !phoneNumber) {
    console.warn('Twilio SMS configuration missing. Skipping SMS reminder.');
    return false;
  }

  if (!profile.phone) {
    console.warn(`User ${profile.id} has no phone number. Skipping SMS.`);
    return false;
  }

  try {
    const message = `Wathaci: Reminder - ${task.authority} task '${task.title}' due on ${formatDate(task.due_date)}. Log into Wathaci to update. Reply STOP to opt-out of SMS reminders.`;

    const auth = btoa(`${accountSid}:${authToken}`);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: profile.phone,
          From: phoneNumber,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`Twilio SMS error: ${error}`);
      return false;
    }

    const result = await response.json();
    console.log(`[SMS] Sent to ${profile.phone}:`, result.sid);
    return true;
  } catch (error) {
    console.error(`Failed to send SMS to ${profile.phone}:`, error);
    return false;
  }
}

/**
 * Send WhatsApp reminder using Twilio
 */
async function sendWhatsAppReminder(
  profile: UserProfile,
  task: ComplianceTask
): Promise<boolean> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const whatsappFrom = Deno.env.get('TWILIO_WHATSAPP_FROM');

  if (!accountSid || !authToken || !whatsappFrom) {
    console.warn('Twilio WhatsApp configuration missing. Skipping WhatsApp reminder.');
    return false;
  }

  if (!profile.phone) {
    console.warn(`User ${profile.id} has no phone number. Skipping WhatsApp.`);
    return false;
  }

  try {
    const message = `Hello from Wathaci 👋

This is a reminder about your ${task.authority} compliance task:
${task.title}
Due: ${formatDate(task.due_date)}

Please log into Wathaci Connect to update or mark as completed.

Staying compliant keeps you ready for funding and tenders.`;

    const whatsappTo = profile.phone.startsWith('whatsapp:') 
      ? profile.phone 
      : `whatsapp:${profile.phone}`;

    const auth = btoa(`${accountSid}:${authToken}`);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: whatsappTo,
          From: whatsappFrom,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`Twilio WhatsApp error: ${error}`);
      return false;
    }

    const result = await response.json();
    console.log(`[WhatsApp] Sent to ${profile.phone}:`, result.sid);
    return true;
  } catch (error) {
    console.error(`Failed to send WhatsApp to ${profile.phone}:`, error);
    return false;
  }
}

/**
 * Process a single compliance task reminder
 */
async function processTaskReminder(
  supabase: any,
  task: ComplianceTask,
  profile: UserProfile
): Promise<void> {
  let successCount = 0;
  let failureCount = 0;

  // Send email reminder
  if (task.remind_via_email) {
    const sent = await sendEmailReminder(profile, task);
    if (sent) successCount++;
    else failureCount++;
  }

  // Send SMS reminder
  if (task.remind_via_sms) {
    const sent = await sendSmsReminder(profile, task);
    if (sent) successCount++;
    else failureCount++;
  }

  // Send WhatsApp reminder
  if (task.remind_via_whatsapp) {
    const sent = await sendWhatsAppReminder(profile, task);
    if (sent) successCount++;
    else failureCount++;
  }

  // Update last_reminder_sent_at if at least one channel succeeded
  if (successCount > 0) {
    const { error } = await supabase
      .from('compliance_tasks')
      .update({ last_reminder_sent_at: new Date().toISOString() })
      .eq('id', task.id);

    if (error) {
      console.error(`Failed to update last_reminder_sent_at for task ${task.id}:`, error);
    } else {
      console.log(`[SUCCESS] Processed task ${task.id}: ${successCount} sent, ${failureCount} failed`);
    }
  } else {
    console.warn(`[FAILURE] All reminders failed for task ${task.id}`);
  }
}

/**
 * Main handler
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate cutoff time for cooldown
    const cooldownCutoff = new Date();
    cooldownCutoff.setHours(cooldownCutoff.getHours() - REMINDER_COOLDOWN_HOURS);

    // Fetch tasks that need reminders
    const { data: tasks, error: tasksError } = await supabase
      .from('compliance_tasks')
      .select('*')
      .in('status', ['PENDING', 'OVERDUE'])
      .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lt.${cooldownCutoff.toISOString()}`);

    if (tasksError) {
      throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
    }

    console.log(`Found ${tasks?.length || 0} tasks to process`);

    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No tasks to process',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unique user IDs
    const userIds = [...new Set(tasks.map(t => t.user_id))];

    // Fetch user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, first_name, phone, business_name')
      .in('id', userIds);

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    // Create profile lookup map
    const profileMap = new Map<string, UserProfile>();
    profiles?.forEach(p => profileMap.set(p.id, p));

    // Process each task
    let processed = 0;
    for (const task of tasks) {
      const profile = profileMap.get(task.user_id);
      if (!profile) {
        console.warn(`No profile found for user ${task.user_id}`);
        continue;
      }

      // Check if task should receive reminder based on due date
      const dueDate = new Date(task.due_date);
      const today = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Send reminder if task is overdue or due soon
      // For now, we'll send if it's within 30 days or overdue
      if (daysUntilDue <= 30) {
        await processTaskReminder(supabase, task, profile);
        processed++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${processed} task reminders`,
        processed,
        total: tasks.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing compliance reminders:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
