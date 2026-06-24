const { buildWelcomeCredentials } = require('../utils/userWelcomeContent');
const { toWhatsAppDigits } = require('../utils/phoneValidation');

function getWhatsAppConfig() {
  const token = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
  const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const apiVersion = (process.env.WHATSAPP_API_VERSION || 'v21.0').trim();

  if (!token || !phoneNumberId) {
    return null;
  }

  return { token, phoneNumberId, apiVersion };
}

function isWhatsAppConfigured() {
  return !!getWhatsAppConfig();
}

function getMessageMode() {
  const mode = (process.env.WHATSAPP_MESSAGE_MODE || 'template').trim().toLowerCase();
  return mode === 'text' ? 'text' : 'template';
}

function formatWhatsAppError(data, status) {
  const err = data?.error || data;
  const msg = err?.message || err?.error_user_msg || JSON.stringify(err || data);
  if (status === 401 || /access token/i.test(msg)) {
    return 'WhatsApp API: invalid access token. Check WHATSAPP_ACCESS_TOKEN in .env';
  }
  if (/template/i.test(msg)) {
    return `WhatsApp template error: ${msg}. Create an approved template in Meta Business Manager or set WHATSAPP_MESSAGE_MODE=text for testing.`;
  }
  return `WhatsApp API: ${msg}`;
}

async function graphPost(path, body) {
  const config = getWhatsAppConfig();
  if (!config) {
    const err = new Error(
      'WhatsApp is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in backend/.env',
    );
    err.code = 'WHATSAPP_NOT_CONFIGURED';
    throw err;
  }

  const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}${path}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(formatWhatsAppError(data, response.status));
    err.code = 'WHATSAPP_SEND_FAILED';
    err.details = data;
    throw err;
  }

  return data;
}

function buildTemplateComponents(credentials) {
  const params = [
    credentials.displayName,
    credentials.appName,
    credentials.loginEmail,
    credentials.password,
    credentials.loginUrl || '—',
  ].map((text) => ({
    type: 'text',
    text: String(text).slice(0, 1024),
  }));

  return [
    {
      type: 'body',
      parameters: params,
    },
  ];
}

async function sendTemplateMessage(toDigits, credentials) {
  const templateName = (process.env.WHATSAPP_TEMPLATE_NAME || 'account_welcome').trim();
  const language = (process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en').trim();

  return graphPost('/messages', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: toDigits,
    type: 'template',
    template: {
      name: templateName,
      language: { code: language },
      components: buildTemplateComponents(credentials),
    },
  });
}

async function sendTextMessage(toDigits, text) {
  return graphPost('/messages', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: toDigits,
    type: 'text',
    text: {
      preview_url: true,
      body: text,
    },
  });
}

function buildWhatsAppPreview(user) {
  const credentials = buildWelcomeCredentials(user);
  const phoneDigits = toWhatsAppDigits(user.phone);
  const e164 = user.phone || '';

  return {
    name: user.name,
    email: user.email,
    phone: e164,
    phoneDigits,
    password: user.plain_password || '',
    appName: credentials.appName,
    appUrl: credentials.loginUrl,
    welcomeMessage: credentials.welcomeText,
    messageText: credentials.whatsappText,
    templateName: process.env.WHATSAPP_TEMPLATE_NAME || 'account_welcome',
    messageMode: getMessageMode(),
    configured: isWhatsAppConfigured(),
  };
}

async function sendWelcomeWhatsApp(user) {
  const phoneDigits = toWhatsAppDigits(user.phone);
  if (!phoneDigits) {
    const err = new Error('User has no valid WhatsApp phone number. Use format +923247890891');
    err.status = 400;
    throw err;
  }

  if (!user.plain_password) {
    const err = new Error('User has no stored password. Edit the user and set a password before sending WhatsApp.');
    err.status = 400;
    throw err;
  }

  const credentials = buildWelcomeCredentials(user);
  const mode = getMessageMode();

  let data;
  if (mode === 'text') {
    data = await sendTextMessage(phoneDigits, credentials.whatsappText);
  } else {
    data = await sendTemplateMessage(phoneDigits, credentials);
  }

  const messageId = data?.messages?.[0]?.id || null;

  return {
    messageId,
    to: phoneDigits,
    mode,
    provider: 'whatsapp_cloud',
  };
}

module.exports = {
  sendWelcomeWhatsApp,
  buildWhatsAppPreview,
  isWhatsAppConfigured,
  getWhatsAppConfig,
  getMessageMode,
};
