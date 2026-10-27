const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/drive'];

function normalizeCredentials(credentials) {
  if (!credentials || typeof credentials !== 'object') return credentials;
  const next = { ...credentials };
  if (typeof next.private_key === 'string') {
    next.private_key = next.private_key.replace(/\\n/g, '\n');
  }
  return next;
}

function parseCredentialsJson(raw) {
  let text = String(raw || '').trim();
  if (!text) return null;

  if (!text.startsWith('{')) {
    try {
      text = Buffer.from(text, 'base64').toString('utf8').trim();
    } catch {
      // keep original
    }
  }

  return normalizeCredentials(JSON.parse(text));
}

function resolveCredentialsPath() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  const configDir = __dirname;
  const preferred = path.join(configDir, 'videorecorder-512911-f6577c3b84d6.json');
  if (fs.existsSync(preferred)) return preferred;

  try {
    const match = fs
      .readdirSync(configDir)
      .find((name) => /^videorecorder-.*\.json$/i.test(name));
    if (match) return path.join(configDir, match);
  } catch {
    // ignore
  }

  const fallback = path.join(__dirname, '..', '..', 'credentials', 'google-drive.json');
  if (fs.existsSync(fallback)) return fallback;

  return null;
}

function loadServiceAccountCredentials() {
  const fromEnv =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;

  if (fromEnv && fromEnv.trim()) {
    try {
      return parseCredentialsJson(fromEnv);
    } catch (err) {
      const wrapped = new Error(
        `GOOGLE_SERVICE_ACCOUNT_JSON is invalid: ${err.message}`,
      );
      wrapped.code = 'INVALID_GOOGLE_CREDENTIALS';
      throw wrapped;
    }
  }

  const credPath = resolveCredentialsPath();
  if (credPath && fs.existsSync(credPath)) {
    return normalizeCredentials(JSON.parse(fs.readFileSync(credPath, 'utf8')));
  }

  return null;
}

function loadOAuthClientFromFile() {
  const configDir = __dirname;
  const preferred = path.join(
    configDir,
    'client_secret_39678544752-in3v5tfrnli4dksstn435nd3e0b7nbpb.apps.googleusercontent.com.json',
  );

  const candidates = [];
  if (fs.existsSync(preferred)) candidates.push(preferred);

  try {
    for (const name of fs.readdirSync(configDir)) {
      if (/^client_secret_.*\.json$/i.test(name)) {
        candidates.push(path.join(configDir, name));
      }
    }
  } catch {
    // ignore
  }

  for (const file of candidates) {
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      const installed = raw.installed || raw.web || raw;
      if (installed.client_id && installed.client_secret) {
        return {
          clientId: installed.client_id,
          clientSecret: installed.client_secret,
          redirectUris: installed.redirect_uris || [],
          source: file,
        };
      }
    } catch {
      // try next
    }
  }
  return null;
}

function cleanEnvSecret(value) {
  let v = String(value || '').trim();
  // Strip wrapping quotes from Vercel / .env pastes
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

function decodePossibleBase64(value) {
  const v = cleanEnvSecret(value);
  if (!v) return '';
  // Refresh tokens normally start with "1/" — if not, try base64
  if (v.startsWith('1/') || v.startsWith('1//')) return v;
  try {
    const decoded = Buffer.from(v, 'base64').toString('utf8').trim();
    if (decoded.startsWith('1/')) return decoded;
  } catch {
    // ignore
  }
  return v;
}

function getOAuthConfig() {
  const fromFile = loadOAuthClientFromFile();
  const clientId = cleanEnvSecret(
    process.env.GOOGLE_OAUTH_CLIENT_ID || fromFile?.clientId || '',
  );
  const clientSecret = cleanEnvSecret(
    process.env.GOOGLE_OAUTH_CLIENT_SECRET || fromFile?.clientSecret || '',
  );
  const refreshToken = decodePossibleBase64(
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN ||
      process.env.GOOGLE_OAUTH_REFRESH_TOKEN_BASE64 ||
      '',
  );
  if (!clientId || !clientSecret || !refreshToken) return null;
  return { clientId, clientSecret, refreshToken };
}

function getOAuthClientCredentials() {
  const fromFile = loadOAuthClientFromFile();
  const clientId = (process.env.GOOGLE_OAUTH_CLIENT_ID || fromFile?.clientId || '').trim();
  const clientSecret = (process.env.GOOGLE_OAUTH_CLIENT_SECRET || fromFile?.clientSecret || '').trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, source: fromFile?.source || 'env' };
}

function isOAuthConfigured() {
  // Fully configured only when refresh token exists (needed for uploads)
  return Boolean(getOAuthConfig());
}

function hasOAuthClient() {
  return Boolean(getOAuthClientCredentials());
}

function isServiceAccountConfigured() {
  try {
    const creds = loadServiceAccountCredentials();
    return Boolean(creds && creds.client_email && creds.private_key);
  } catch {
    return false;
  }
}

function isGoogleDriveConfigured() {
  return isOAuthConfigured() || isServiceAccountConfigured();
}

function getAuthMode() {
  if (isOAuthConfigured()) return 'oauth';
  if (isServiceAccountConfigured()) return 'service_account';
  return null;
}

function getMissingGoogleDriveEnv() {
  if (isGoogleDriveConfigured()) return [];
  return [
    'For personal Gmail My Drive use OAuth: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN (run npm run drive:oauth)',
    'OR Workspace Shared Drive + service account: GOOGLE_SERVICE_ACCOUNT_JSON + GOOGLE_SHARED_DRIVE_ID',
  ];
}

let cachedDrive = null;
let cachedMode = null;

function getDriveClient() {
  const mode = getAuthMode();
  if (cachedDrive && cachedMode === mode) return cachedDrive;

  if (mode === 'oauth') {
    const { clientId, clientSecret, refreshToken } = getOAuthConfig();
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refreshToken });
    cachedMode = 'oauth';
    cachedDrive = google.drive({ version: 'v3', auth: oauth2 });
    return cachedDrive;
  }

  if (mode === 'service_account') {
    const credentials = loadServiceAccountCredentials();
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });
    cachedMode = 'service_account';
    cachedDrive = google.drive({ version: 'v3', auth });
    return cachedDrive;
  }

  const err = new Error(
    'Google Drive is not configured. Personal My Drive requires OAuth (service accounts have no storage quota).',
  );
  err.code = 'GOOGLE_DRIVE_NOT_CONFIGURED';
  throw err;
}

function getConfiguredFolderName() {
  return (process.env.GOOGLE_DRIVE_FOLDER_NAME || 'videoRecorder').trim();
}

function getConfiguredFolderId() {
  return (process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim() || null;
}

function getSharedDriveId() {
  return (process.env.GOOGLE_SHARED_DRIVE_ID || '').trim() || null;
}

function getServiceAccountEmail() {
  try {
    return loadServiceAccountCredentials()?.client_email || null;
  } catch {
    return null;
  }
}

module.exports = {
  SCOPES,
  getDriveClient,
  isGoogleDriveConfigured,
  isOAuthConfigured,
  hasOAuthClient,
  isServiceAccountConfigured,
  getMissingGoogleDriveEnv,
  getConfiguredFolderName,
  getConfiguredFolderId,
  getSharedDriveId,
  getAuthMode,
  loadServiceAccountCredentials,
  getServiceAccountEmail,
  getOAuthConfig,
  getOAuthClientCredentials,
  loadOAuthClientFromFile,
};
