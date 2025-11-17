const createAuthHeader = (accountSid, authToken) => {
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  return `Basic ${credentials}`;
};

const getTwilioCredentials = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
  const authToken = process.env.TWILIO_AUTH_TOKEN || '';

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials are missing. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
  }

  return { accountSid, authToken };
};

const sendTwilioMessage = async ({ to, body, messagingServiceSid, from }) => {
  const { accountSid, authToken } = getTwilioCredentials();
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const payload = new URLSearchParams();
  payload.append('To', to);
  payload.append('Body', body);

  if (messagingServiceSid) {
    payload.append('MessagingServiceSid', messagingServiceSid);
  } else if (from) {
    payload.append('From', from);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: createAuthHeader(accountSid, authToken),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error('Twilio message request failed');
    error.status = response.status;
    error.response = errorText;
    throw error;
  }

  return response.json();
};

const twilioConfig = {
  get messagingServiceSid() {
    return process.env.TWILIO_MESSAGE_SERVICE_SID || process.env.TWILIO_MESSAGING_SERVICE_SID || '';
  },
  get phoneNumber() {
    return process.env.TWILIO_PHONE_NUMBER || '';
  },
  get whatsappFrom() {
    return process.env.TWILIO_WHATSAPP_FROM || '';
  },
};

module.exports = {
  sendTwilioMessage,
  twilioConfig,
  getTwilioCredentials,
};
