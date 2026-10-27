const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/drive'];

function resolveCredentialsPath() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  // Default: key file placed in src/config/
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
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (rawJson && rawJson.trim()) {
    try {
      return JSON.parse(rawJson);
    } catch (err) {
      const wrapped = new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON');
      wrapped.code = 'INVALID_GOOGLE_CREDENTIALS';
      throw wrapped;
    }
  }

  const credPath = resolveCredentialsPath();
  if (credPath && fs.existsSync(credPath)) {
    return JSON.parse(fs.readFileSync(credPath, 'utf8'));
  }

  return null;
}

function isGoogleDriveConfigured() {
  try {
    return Boolean(loadServiceAccountCredentials());
  } catch {
    return false;
  }
}

function getMissingGoogleDriveEnv() {
  const missing = [];
  if (!isGoogleDriveConfigured()) {
    missing.push(
      'GOOGLE_SERVICE_ACCOUNT_JSON or src/config/videorecorder-*.json service account key',
    );
  }
  return missing;
}

let cachedAuth = null;
let cachedDrive = null;

function getDriveClient() {
  if (cachedDrive) return cachedDrive;

  const credentials = loadServiceAccountCredentials();
  if (!credentials) {
    const err = new Error(
      'Google Drive is not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON or place credentials/google-drive.json',
    );
    err.code = 'GOOGLE_DRIVE_NOT_CONFIGURED';
    throw err;
  }

  cachedAuth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });
  cachedDrive = google.drive({ version: 'v3', auth: cachedAuth });
  return cachedDrive;
}

function getConfiguredFolderName() {
  return (process.env.GOOGLE_DRIVE_FOLDER_NAME || 'videoRecorder').trim();
}

function getConfiguredFolderId() {
  return (process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim() || null;
}

module.exports = {
  getDriveClient,
  isGoogleDriveConfigured,
  getMissingGoogleDriveEnv,
  getConfiguredFolderName,
  getConfiguredFolderId,
  loadServiceAccountCredentials,
};
