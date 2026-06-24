/** Shared welcome copy for email and WhatsApp. */

function getAppLoginUrl() {
  return (process.env.FRONTEND_URL || process.env.CLIENT_URL || '').trim();
}

function getWelcomeMessage(userName) {
  const custom = (process.env.EMAIL_WELCOME_MESSAGE || process.env.WHATSAPP_WELCOME_MESSAGE || '').trim();
  if (custom) return custom.replace(/\{name\}/gi, userName || 'there');
  const appName = process.env.APP_NAME || 'the application';
  return `Your account is ready. Use the login details below to access ${appName}. We recommend changing your password after your first sign-in.`;
}

function buildWelcomeCredentials(user) {
  const appName = process.env.APP_NAME || 'Inventory Management';
  const loginUrl = getAppLoginUrl();
  const displayName = user.name || 'there';
  const loginEmail = user.email || '';
  const password =
    user.plain_password || '(Contact your administrator for a new password)';
  const welcomeText = getWelcomeMessage(displayName);

  const whatsappText = [
    `*Welcome to ${appName}*`,
    '',
    `Hello ${displayName},`,
    '',
    welcomeText,
    '',
    `*Login email:* ${loginEmail}`,
    `*Password:* ${password}`,
    loginUrl ? `*App link:* ${loginUrl}` : '',
    '',
    '_Keep this message private. Do not share your password._',
  ]
    .filter((line) => line !== undefined)
    .join('\n');

  return {
    appName,
    loginUrl,
    displayName,
    loginEmail,
    password,
    welcomeText,
    whatsappText,
    subject: `Welcome to ${appName} — your login details`,
  };
}

module.exports = {
  getAppLoginUrl,
  getWelcomeMessage,
  buildWelcomeCredentials,
};
