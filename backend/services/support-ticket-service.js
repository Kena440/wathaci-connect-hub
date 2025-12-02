const { randomUUID } = require('crypto');
const sanitizeHtml = require('sanitize-html');
const { getSupabaseClient, isSupabaseConfigured } = require('../lib/supabaseAdmin');
const { sendEmail } = require('./email-service');
const { SUPPORT_EMAIL } = require('../lib/support-email');

const DEFAULT_SLA_MINUTES = parseInt(process.env.SUPPORT_SLA_MINUTES || '120', 10);
const ESCALATION_RECIPIENTS = (process.env.SUPPORT_ESCALATION_EMAILS || process.env.ADMIN_ALERT_EMAILS || SUPPORT_EMAIL)
  .split(',')
  .map(email => email.trim())
  .filter(Boolean);
const SLA_CHECK_INTERVAL_MS = parseInt(process.env.SUPPORT_SLA_CHECK_INTERVAL_MS || String(5 * 60 * 1000), 10);

const memoryTickets = [];
const memoryMessages = [];
const processedEmailIds = new Set();
let memoryTicketCounter = 1;
let slaIntervalHandle = null;

const sanitizeMessage = (value = '') => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();

const parseTicketIdFromSubject = (subject = '') => {
  const match = subject.match(/ticket\s*#(\d+)/i);
  return match ? Number(match[1]) : null;
};

const formatTicketSubject = (ticketId, subject = 'Support Request') => {
  const base = subject.replace(/\[?\s*WATHACI[^\]]*\]?/i, '').trim() || 'Support Request';
  return `[WATHACI Support – Ticket #${ticketId}] ${base}`.trim();
};

const detectCategory = (subject = '', body = '') => {
  const text = `${subject} ${body}`.toLowerCase();

  if (text.includes('reset') && text.includes('password')) return 'password_reset';
  if (text.includes('verification') || text.includes('verify') || text.includes('code expired')) return 'verification';
  if (text.includes('otp') || text.includes('code') || text.includes('mfa')) return 'otp_issue';
  if (text.includes('payment') || text.includes('subscription')) return 'payment_issue';
  if (text.includes('profile') || text.includes('update account')) return 'profile_issue';
  if (text.includes('login') || text.includes('sign in') || text.includes('signin')) return 'login_issue';

  return 'general';
};

const categoryResponses = {
  login_issue: {
    subject: 'We received your login issue',
    body: ({ ticketId }) => `We see you're having trouble signing in. We've reset your session caches and you can try again now.

If you still cannot sign in, please reply to this email with any error message you see. (Ticket #${ticketId})`,
  },
  password_reset: {
    subject: 'Password reset help',
    body: ({ ticketId }) => `We've issued a fresh password reset flow for your account.

If you do not receive the reset link within a few minutes, confirm that emails from support@wathaci.com are allowed and reply so we can assist further. (Ticket #${ticketId})`,
  },
  verification: {
    subject: 'Email verification assistance',
    body: ({ ticketId }) => `We've re-sent your verification link. Please check your inbox and spam folder.

If the link expires or you don't receive it, reply to this email and we'll escalate immediately. (Ticket #${ticketId})`,
  },
  otp_issue: {
    subject: 'One-time code support',
    body: ({ ticketId }) => `We refreshed your OTP request and cleared pending attempts. Please request a new code and try again.

If the new code fails, reply with your phone/email and we will investigate within the SLA. (Ticket #${ticketId})`,
  },
  payment_issue: {
    subject: 'Payment issue acknowledged',
    body: ({ ticketId }) => `We've logged your payment concern and notified the payments agent.

If you have a transaction reference, please share it in a reply so we can reconcile it faster. (Ticket #${ticketId})`,
  },
  profile_issue: {
    subject: 'Profile update assistance',
    body: ({ ticketId }) => `We've queued a profile sync for your account.

If specific fields are failing to save, reply with a screenshot so we can correct them quickly. (Ticket #${ticketId})`,
  },
};

const logCisoEvent = async (eventType, details = {}) => {
  const supabase = getSupabaseClient();
  const payload = {
    id: randomUUID(),
    event_type: eventType,
    details,
    created_at: new Date().toISOString(),
  };

  if (!supabase) {
    console.log('[CisoLog]', payload);
    return;
  }

  const { error } = await supabase.from('ciso_logs').insert(payload);
  if (error) {
    console.error('[CisoLog] Failed to persist event', error.message);
  }
};

const persistProcessedEmail = async (emailMeta) => {
  if (processedEmailIds.has(emailMeta.message_id)) return;

  const supabase = getSupabaseClient();
  if (!supabase) {
    processedEmailIds.add(emailMeta.message_id);
    return;
  }

  const { error } = await supabase.from('processed_emails').insert(emailMeta);
  if (error) {
    console.error('[SupportTickets] Failed to record processed email', error.message);
    return;
  }

  processedEmailIds.add(emailMeta.message_id);
};

const hasProcessedEmail = async (messageId) => {
  if (!messageId) return false;
  if (processedEmailIds.has(messageId)) return true;

  if (!isSupabaseConfigured()) return false;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('processed_emails')
    .select('message_id')
    .eq('message_id', messageId)
    .maybeSingle();

  if (error) {
    console.error('[SupportTickets] Failed to check processed email', error.message);
    return false;
  }

  if (data?.message_id) {
    processedEmailIds.add(messageId);
    return true;
  }

  return false;
};

const getUserIdByEmail = async (email) => {
  if (!email || !isSupabaseConfigured()) return null;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[SupportTickets] Unable to resolve user by email', error.message);
    return null;
  }

  return data?.id || null;
};

const persistTicket = async (ticket) => {
  const timestamp = new Date().toISOString();
  const payload = {
    ...ticket,
    created_at: timestamp,
    updated_at: timestamp,
  };

  const supabase = getSupabaseClient();
  if (!supabase) {
    const id = memoryTicketCounter++;
    const record = { ...payload, id };
    memoryTickets.push(record);
    return record;
  }

  const { data, error } = await supabase.from('support_tickets').insert(payload).select('*').maybeSingle();
  if (error) {
    throw new Error(`Failed to persist ticket: ${error.message}`);
  }
  return data;
};

const updateTicket = async (ticketId, updates) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    const index = memoryTickets.findIndex(t => t.id === ticketId);
    if (index >= 0) {
      memoryTickets[index] = {
        ...memoryTickets[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };
    }
    return;
  }

  const { error } = await supabase
    .from('support_tickets')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', ticketId);

  if (error) {
    console.error('[SupportTickets] Failed to update ticket', error.message);
  }
};

const persistMessage = async (message) => {
  const payload = {
    ...message,
    created_at: message.created_at || new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (!supabase) {
    const record = { ...payload, id: memoryMessages.length + 1 };
    memoryMessages.push(record);
    return record;
  }

  const { data, error } = await supabase.from('support_ticket_messages').insert(payload).select('*').maybeSingle();
  if (error) {
    console.error('[SupportTickets] Failed to persist ticket message', error.message);
    return null;
  }
  return data;
};

const getTicketById = async (ticketId) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return memoryTickets.find(t => t.id === ticketId) || null;
  }

  const { data, error } = await supabase.from('support_tickets').select('*').eq('id', ticketId).maybeSingle();
  if (error) {
    console.error('[SupportTickets] Failed to fetch ticket', error.message);
    return null;
  }
  return data;
};

const sendAcknowledgement = async (ticket, messageBody) => {
  const subject = formatTicketSubject(ticket.id, ticket.subject);
  const text = `Hi there,

We've received your message and opened Ticket #${ticket.id}. Our target is to respond within ${DEFAULT_SLA_MINUTES / 60} hours.

Summary:
${ticket.description || messageBody || 'No description provided'}

If you have more details, reply to this email and they'll be attached to your ticket automatically.

Thank you,
WATHACI Connect CISO Agent`;

  await sendEmail({
    to: ticket.email,
    subject,
    text,
    template: 'support_acknowledged',
    metadata: { ticketId: ticket.id, category: ticket.category },
  });
};

const sendAutomatedResponse = async (ticket, category) => {
  const responseTemplate = categoryResponses[category];
  if (!responseTemplate) return null;

  const subject = formatTicketSubject(ticket.id, responseTemplate.subject);
  const text = responseTemplate.body({ ticketId: ticket.id });

  await persistMessage({
    ticket_id: ticket.id,
    sender_type: 'agent',
    message_body: text,
    metadata: { automated: true, category },
  });

  await updateTicket(ticket.id, { last_response_at: new Date().toISOString() });

  const result = await sendEmail({
    to: ticket.email,
    subject,
    text,
    template: 'support_auto_response',
    metadata: { ticketId: ticket.id, category },
  });

  return result;
};

const createTicket = async ({ email, subject = 'Support Request', description = '', category, userId, source = 'in_app', messageId, messageBody }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const resolvedUserId = userId || await getUserIdByEmail(normalizedEmail);
  const detectedCategory = category || detectCategory(subject, description || messageBody);

  const ticket = await persistTicket({
    email: normalizedEmail,
    subject: subject.trim(),
    description: sanitizeMessage(description || messageBody || ''),
    category: detectedCategory,
    status: 'open',
    priority: 'standard',
    sla_due_at: new Date(Date.now() + DEFAULT_SLA_MINUTES * 60 * 1000).toISOString(),
    last_message_at: new Date().toISOString(),
    last_response_at: null,
    user_id: resolvedUserId,
    source,
    external_message_id: messageId || null,
  });

  await logCisoEvent('support_ticket_created', { ticketId: ticket.id, source, category: detectedCategory });

  if (messageBody || description) {
    await persistMessage({
      ticket_id: ticket.id,
      sender_type: 'user',
      message_body: sanitizeMessage(description || messageBody),
      message_id: messageId || null,
    });
  }

  await sendAcknowledgement(ticket, description || messageBody);
  await sendAutomatedResponse(ticket, detectedCategory);

  return ticket;
};

const appendMessageToTicket = async ({ ticket, senderType, body, messageId, metadata }) => {
  await persistMessage({
    ticket_id: ticket.id,
    sender_type: senderType,
    message_body: sanitizeMessage(body || ''),
    message_id: messageId || null,
    metadata: metadata || {},
  });

  await updateTicket(ticket.id, {
    status: senderType === 'user' && ticket.status === 'closed' ? 'open' : ticket.status,
    last_message_at: new Date().toISOString(),
  });
};

const processIncomingEmail = async ({ messageId, from, subject = '', body = '', date }) => {
  if (await hasProcessedEmail(messageId)) {
    return null;
  }

  const cleanBody = sanitizeMessage(body || '');
  const ticketId = parseTicketIdFromSubject(subject);
  const emailAddress = (from || '').split('<').pop().replace('>', '').trim() || from;
  const summary = cleanBody || subject || 'User email';

  if (ticketId) {
    const existingTicket = await getTicketById(ticketId);
    if (existingTicket) {
      await appendMessageToTicket({ ticket: existingTicket, senderType: 'user', body: cleanBody, messageId });
      await sendAutomatedResponse(existingTicket, existingTicket.category || detectCategory(subject, cleanBody));
      await persistProcessedEmail({
        message_id: messageId,
        ticket_id: existingTicket.id,
        sender_email: emailAddress,
        subject,
        received_at: date || new Date().toISOString(),
      });
      return existingTicket;
    }
  }

  const ticket = await createTicket({
    email: emailAddress,
    subject: subject || 'Support Request',
    description: summary,
    category: detectCategory(subject, cleanBody),
    source: 'email',
    messageId,
    messageBody: cleanBody,
  });

  await persistProcessedEmail({
    message_id: messageId,
    ticket_id: ticket.id,
    sender_email: emailAddress,
    subject,
    received_at: date || new Date().toISOString(),
  });

  return ticket;
};

const escalateTicket = async (ticket) => {
  if (!ESCALATION_RECIPIENTS.length) return;

  const subject = `[ESCALATION] Ticket #${ticket.id} pending > ${DEFAULT_SLA_MINUTES / 60} hours`;
  const text = `Ticket #${ticket.id} is open past the SLA.

User: ${ticket.email}
Category: ${ticket.category}
Summary: ${ticket.description || ticket.subject}

Please review and respond.`;

  for (const email of ESCALATION_RECIPIENTS) {
    await sendEmail({
      to: email,
      subject,
      text,
      template: 'support_escalation',
      metadata: { ticketId: ticket.id },
    });
  }

  await persistMessage({
    ticket_id: ticket.id,
    sender_type: 'system',
    message_body: 'Escalation email sent to admins due to SLA breach.',
    metadata: { escalated: true },
  });

  await updateTicket(ticket.id, { escalated_at: new Date().toISOString() });
  await logCisoEvent('support_ticket_escalated', { ticketId: ticket.id });
};

const findSlaBreaches = async () => {
  const nowIso = new Date().toISOString();
  const supabase = getSupabaseClient();

  if (!supabase) {
    return memoryTickets.filter(ticket => ticket.status === 'open' && ticket.sla_due_at && ticket.sla_due_at <= nowIso && !ticket.escalated_at);
  }

  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('status', 'open')
    .lte('sla_due_at', nowIso)
    .is('escalated_at', null);

  if (error) {
    console.error('[SupportTickets] Failed to query SLA breaches', error.message);
    return [];
  }

  return data || [];
};

const startSlaMonitor = () => {
  if (slaIntervalHandle) return slaIntervalHandle;

  const intervalMs = SLA_CHECK_INTERVAL_MS;
  slaIntervalHandle = setInterval(async () => {
    const breaches = await findSlaBreaches();
    for (const ticket of breaches) {
      await escalateTicket(ticket);
    }
  }, intervalMs);

  console.log(`[SupportTickets] SLA monitor active (every ${intervalMs / 1000}s)`);
  return slaIntervalHandle;
};

module.exports = {
  appendMessageToTicket,
  createTicket,
  formatTicketSubject,
  hasProcessedEmail,
  parseTicketIdFromSubject,
  processIncomingEmail,
  startSlaMonitor,
};
