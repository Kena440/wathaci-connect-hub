const { processIncomingEmail, startSlaMonitor } = require('./support-ticket-service');

const loadDependencies = () =>
  Promise.all([import('imapflow'), import('mailparser')]).then(([imapflow, mailparser]) => ({
    ImapFlow: imapflow.ImapFlow,
    simpleParser: mailparser.simpleParser,
  }));

const getInboxConfig = () => {
  const enabled = process.env.ENABLE_SUPPORT_INBOX === 'true' || process.env.SUPPORT_INBOX_ENABLED === 'true';

  return {
    enabled,
    host: process.env.SUPPORT_INBOX_HOST || process.env.IMAP_HOST || '',
    port: parseInt(process.env.SUPPORT_INBOX_PORT || process.env.IMAP_PORT || '993', 10),
    secure: (process.env.SUPPORT_INBOX_SECURE || process.env.IMAP_SECURE || 'true') === 'true',
    username: process.env.SUPPORT_INBOX_USERNAME || process.env.IMAP_USERNAME || '',
    password: process.env.SUPPORT_INBOX_PASSWORD || process.env.IMAP_PASSWORD || '',
    pollIntervalMs: parseInt(process.env.SUPPORT_INBOX_POLL_MS || String(2 * 60 * 1000), 10),
    mailbox: process.env.SUPPORT_INBOX_FOLDER || 'INBOX',
  };
};

let pollHandle = null;
let polling = false;

const fetchUnreadEmails = async ({ ImapFlow, simpleParser }, config) => {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.username,
      pass: config.password,
    },
    logger: false,
  });

  try {
    await client.connect();
    await client.selectMailbox(config.mailbox);
    const messages = await client.search({ seen: false });

    for await (const message of client.fetch(messages, { source: true, envelope: true, uid: true, internalDate: true })) {
      const parsed = await simpleParser(message.source);
      const messageId = parsed.messageId || String(message.uid);
      const from = parsed.from?.text || parsed.envelope?.from?.map(a => a.address).join(',') || '';
      const subject = parsed.subject || '';
      const body = parsed.text || parsed.html || '';
      const date = parsed.date?.toISOString?.() || message.internalDate?.toISOString?.() || new Date().toISOString();

      await processIncomingEmail({
        messageId,
        from,
        subject,
        body,
        date,
      });

      await client.messageFlagsAdd(message.uid, ['\\Seen']);
    }
  } finally {
    await client.logout().catch(() => {});
  }
};

const startInboxMonitor = async () => {
  const config = getInboxConfig();
  if (!config.enabled) {
    console.log('[InboxMonitor] Disabled via environment flag');
    return null;
  }

  if (!config.host || !config.username || !config.password) {
    console.warn('[InboxMonitor] Missing IMAP configuration. Provide SUPPORT_INBOX_HOST/USERNAME/PASSWORD.');
    return null;
  }

  const dependencies = await loadDependencies().catch(error => {
    console.warn('[InboxMonitor] Failed to load IMAP dependencies. Install imapflow and mailparser to enable inbox polling.', error.message);
    return null;
  });

  if (!dependencies) return null;

  const intervalMs = config.pollIntervalMs;

  const poll = async () => {
    if (polling) return;
    polling = true;
    try {
      await fetchUnreadEmails(dependencies, config);
    } catch (error) {
      console.error('[InboxMonitor] Polling error', error.message);
    } finally {
      polling = false;
    }
  };

  pollHandle = setInterval(poll, intervalMs);
  await poll();
  startSlaMonitor();
  console.log(`[InboxMonitor] Started. Polling every ${intervalMs / 1000}s.`);
  return pollHandle;
};

module.exports = { startInboxMonitor };
