const { buildWelcomeCredentials, getAppLoginUrl } = require('../utils/userWelcomeContent');

function escapeHtml(value) {
  return String(value ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildEmailContent(user, options = {}) {
  const credentials = buildWelcomeCredentials(user);
  const {
    appName,
    loginUrl,
    displayName,
    loginEmail,
    password,
    welcomeText,
  } = credentials;

  const subject = options.subject || credentials.subject;

  const appButtonBlock = loginUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="margin:0 0 16px;">
        <tr><td align="center" style="border-radius:8px;background:#EF8354;">
          <a href="${escapeHtml(loginUrl)}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Open application</a>
        </td></tr>
      </table>
      <p style="margin:0;text-align:center;font-size:12px;word-break:break-all;"><a href="${escapeHtml(loginUrl)}" style="color:#EF8354;text-decoration:none;">${escapeHtml(loginUrl)}</a></p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#2D3142 0%,#4F5D75 100%);padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.75);">Welcome</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">${escapeHtml(appName)}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#0f172a;">Hello ${escapeHtml(displayName)},</p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">${escapeHtml(welcomeText)}</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;">Login email</p>
                  <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;word-break:break-all;">${escapeHtml(loginEmail)}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;">Password</p>
                  <p style="margin:0;font-size:15px;font-weight:600;font-family:ui-monospace,Consolas,monospace;color:#0f172a;">${escapeHtml(password)}</p>
                </td>
              </tr>
            </table>
            ${appButtonBlock}
            <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
              Keep this email private. Do not share your password.<br/>
              If you did not expect this message, contact your administrator.
            </p>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;text-align:center;">&copy; ${new Date().getFullYear()} ${escapeHtml(appName)}</p>
    </td></tr>
  </table>
</body>
</html>`;

  const text =
    options.text ||
    [
      `Hello ${displayName},`,
      '',
      welcomeText,
      '',
      `Login email: ${loginEmail}`,
      `Password: ${password}`,
      '',
      loginUrl ? `Open app: ${loginUrl}` : '',
      '',
      'Keep this email private. Do not share your password.',
    ]
      .filter(Boolean)
      .join('\n');

  return { appName, subject, html, text, loginUrl, loginEmail, password, welcomeText };
}

function buildEmailPreview(user, options = {}) {
  const content = buildEmailContent(user, options);
  return {
    name: user.name,
    email: user.email,
    password: user.plain_password || '',
    appName: content.appName,
    appUrl: content.loginUrl,
    subject: content.subject,
    welcomeMessage: content.welcomeText,
  };
}

module.exports = {
  buildEmailContent,
  buildEmailPreview,
  getAppLoginUrl,
};
