const nodemailer = require('nodemailer');
const { buildEmailContent, buildEmailPreview } = require('./userWelcomeEmail');

/** Gmail app passwords are 16 chars; users often paste "abcd efgh ijkl mnop" */
function normalizeSmtpPassword(pass) {
  return String(pass || '').replace(/[\s_\-]/g, '');
}

function getEmailProvider() {
  const explicit = (process.env.EMAIL_PROVIDER || '').trim().toLowerCase();
  if (explicit) return explicit;
  if (process.env.RESEND_API_KEY) return 'resend';
  return 'smtp';
}

function isGmailHost(host) {
  return String(host || '').toLowerCase().includes('gmail.com');
}

function isAuthError(error) {
  const msg = String(error?.message || '');
  return (
    error?.code === 'EAUTH' ||
    error?.responseCode === 535 ||
    /535|BadCredentials|Username and Password not accepted/i.test(msg)
  );
}

function getSmtpConfig() {
  const provider = getEmailProvider();
  const user = (process.env.SMTP_USER || '').trim();
  const pass = normalizeSmtpPassword(process.env.SMTP_PASS);
  const port = Number(process.env.SMTP_PORT || 587);

  if (provider === 'brevo') {
    if (!user || !pass) return null;
    return {
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: { user, pass },
    };
  }

  if (provider === 'outlook' || provider === 'hotmail') {
    if (!user || !pass) return null;
    return {
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user, pass },
    };
  }

  const host = (process.env.SMTP_HOST || '').trim();
  if (!user || !pass) return null;

  if (isGmailHost(host) || process.env.SMTP_SERVICE === 'gmail') {
    return { service: 'gmail', auth: { user, pass } };
  }

  if (!host) return null;

  return {
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user, pass },
  };
}

function getTransporter() {
  const config = getSmtpConfig();
  if (!config) return null;
  return nodemailer.createTransport(config);
}

function formatEmailError(error) {
  const msg = String(error?.message || error || '');
  if (isAuthError(error)) {
    return (
      'SMTP login failed. Use a Google App Password (16 chars, no spaces), or switch to Resend: set EMAIL_PROVIDER=resend and RESEND_API_KEY in backend/.env (free at resend.com).'
    );
  }
  return msg || 'Failed to send email';
}

async function sendViaSmtp(user, content) {
  const transporter = getTransporter();
  if (!transporter) {
    const err = new Error('SMTP is not configured (SMTP_USER / SMTP_PASS missing).');
    err.code = 'SMTP_NOT_CONFIGURED';
    throw err;
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  return transporter.sendMail({
    from: `"${content.appName}" <${from}>`,
    to: user.email,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
}

async function sendViaResend(user, content) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    const err = new Error(
      'Resend is not configured. Add RESEND_API_KEY to backend/.env (free key at https://resend.com/api-keys).',
    );
    err.code = 'RESEND_NOT_CONFIGURED';
    throw err;
  }

  const from =
    (process.env.RESEND_FROM || '').trim() ||
    'onboarding@resend.dev';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${content.appName} <${from}>`,
      to: [user.email],
      subject: content.subject,
      html: content.html,
      text: content.text,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.message || data?.error || JSON.stringify(data);
    const err = new Error(`Resend: ${detail}`);
    err.code = 'RESEND_SEND_FAILED';
    throw err;
  }

  return { messageId: data.id, provider: 'resend' };
}

async function sendUserCredentialsEmail(user, options = {}) {
  const content = buildEmailContent(user, options);
  const provider = getEmailProvider();

  if (provider === 'resend') {
    return sendViaResend(user, content);
  }

  try {
    const result = await sendViaSmtp(user, content);
    return { ...result, provider: 'smtp' };
  } catch (smtpError) {
    const resendKey = (process.env.RESEND_API_KEY || '').trim();
    if (resendKey && provider !== 'resend') {
      try {
        const result = await sendViaResend(user, content);
        return { ...result, provider: 'resend', fallback: true };
      } catch (resendError) {
        const err = new Error(
          `SMTP failed (${formatEmailError(smtpError)}). Resend fallback also failed: ${resendError.message}`,
        );
        err.code = 'EMAIL_SEND_FAILED';
        throw err;
      }
    }
    const err = new Error(formatEmailError(smtpError));
    err.code = smtpError.code || 'SMTP_SEND_FAILED';
    throw err;
  }
}

function getEmailStatus() {
  const provider = getEmailProvider();
  return {
    provider,
    smtpConfigured: !!getSmtpConfig(),
    resendConfigured: !!(process.env.RESEND_API_KEY || '').trim(),
  };
}

module.exports = {
  sendUserCredentialsEmail,
  buildEmailPreview,
  getSmtpConfig,
  getEmailProvider,
  getEmailStatus,
  normalizeSmtpPassword,
  formatEmailError: formatEmailError,
};
