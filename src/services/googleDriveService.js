const { Readable } = require('stream');
const {
  getDriveClient,
  getConfiguredFolderId,
  getConfiguredFolderName,
  getSharedDriveId,
  getAuthMode,
} = require('../config/googleDrive');

let resolvedFolderId = null;

function driveListOptions(extra = {}) {
  return {
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    ...extra,
  };
}

async function findFolderIdByName(folderName) {
  const drive = getDriveClient();
  const sharedDriveId = getSharedDriveId();
  const q = [
    `name = '${folderName.replace(/'/g, "\\'")}'`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    'trashed = false',
  ].join(' and ');

  const res = await drive.files.list(
    driveListOptions({
      q,
      fields: 'files(id, name)',
      pageSize: 10,
      corpora: sharedDriveId ? 'drive' : 'user',
      driveId: sharedDriveId || undefined,
    }),
  );

  const files = res.data.files || [];
  if (!files.length) {
    const err = new Error(
      `Google Drive folder "${folderName}" not found. Set GOOGLE_DRIVE_FOLDER_ID from the folder URL.`,
    );
    err.code = 'FOLDER_NOT_FOUND';
    throw err;
  }
  return files[0].id;
}

async function getTargetFolderId() {
  if (resolvedFolderId) return resolvedFolderId;

  const fromEnv = getConfiguredFolderId();
  if (fromEnv) {
    resolvedFolderId = fromEnv;
    return resolvedFolderId;
  }

  resolvedFolderId = await findFolderIdByName(getConfiguredFolderName());
  return resolvedFolderId;
}

function toReadable(buffer) {
  return Readable.from(buffer);
}

async function makeFilePublic(fileId) {
  const drive = getDriveClient();
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
    supportsAllDrives: true,
  });
}

function mapQuotaError(err) {
  const msg = err?.response?.data?.error?.message || err?.message || '';
  if (/storage quota|Service Accounts do not have storage quota/i.test(msg)) {
    const wrapped = new Error(
      'Service accounts cannot upload to personal My Drive (0 quota). Fix: use OAuth (GOOGLE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN) — run npm run drive:oauth — OR use a Google Workspace Shared Drive with GOOGLE_SHARED_DRIVE_ID.',
    );
    wrapped.code = 'STORAGE_QUOTA';
    wrapped.cause = err;
    return wrapped;
  }
  return err;
}

/**
 * Upload image/video buffer into the videoRecorder folder.
 */
async function uploadMediaToDrive({ buffer, originalname, mimetype }) {
  if (!buffer || !buffer.length) {
    const err = new Error('Empty file');
    err.code = 'EMPTY_FILE';
    throw err;
  }

  if (getAuthMode() === 'service_account' && !getSharedDriveId()) {
    // Fail fast with a clear message — personal My Drive + SA will always 403
    console.warn(
      'Using service account without GOOGLE_SHARED_DRIVE_ID — uploads to personal My Drive usually fail with storage quota 403. Prefer OAuth.',
    );
  }

  const drive = getDriveClient();
  const folderId = await getTargetFolderId();
  const name = originalname || `upload-${Date.now()}`;

  let created;
  try {
    created = await drive.files.create({
      requestBody: {
        name,
        parents: [folderId],
      },
      media: {
        mimeType: mimetype || 'application/octet-stream',
        body: toReadable(buffer),
      },
      fields: 'id, name, mimeType, size, createdTime, webViewLink, webContentLink',
      supportsAllDrives: true,
    });
  } catch (err) {
    throw mapQuotaError(err);
  }

  const file = created.data;
  try {
    await makeFilePublic(file.id);
  } catch (permErr) {
    console.warn('Could not set public permission:', permErr.message);
  }

  const refreshed = await drive.files.get({
    fileId: file.id,
    fields: 'id, name, mimeType, size, createdTime, webViewLink, webContentLink',
    supportsAllDrives: true,
  });

  const data = refreshed.data;
  const directUrl = data.id
    ? `https://drive.google.com/uc?export=view&id=${data.id}`
    : null;

  return {
    id: data.id,
    name: data.name,
    mimeType: data.mimeType,
    size: data.size ? Number(data.size) : buffer.length,
    createdTime: data.createdTime,
    webViewLink: data.webViewLink || null,
    webContentLink: data.webContentLink || null,
    url: directUrl || data.webViewLink || null,
    folder: getConfiguredFolderName(),
    authMode: getAuthMode(),
  };
}

async function listDriveMedia({ pageSize = 100, pageToken } = {}) {
  const drive = getDriveClient();
  const folderId = await getTargetFolderId();
  const sharedDriveId = getSharedDriveId();

  const q = [`'${folderId}' in parents`, 'trashed = false'].join(' and ');

  const res = await drive.files.list(
    driveListOptions({
      q,
      pageSize: Math.min(Number(pageSize) || 100, 200),
      pageToken: pageToken || undefined,
      orderBy: 'createdTime desc',
      fields:
        'nextPageToken, files(id, name, mimeType, size, createdTime, webViewLink, webContentLink, thumbnailLink)',
      corpora: sharedDriveId ? 'drive' : 'user',
      driveId: sharedDriveId || undefined,
    }),
  );

  const files = (res.data.files || []).map((f) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: f.size ? Number(f.size) : null,
    createdTime: f.createdTime,
    webViewLink: f.webViewLink || null,
    webContentLink: f.webContentLink || null,
    thumbnailLink: f.thumbnailLink || null,
    url: f.id ? `https://drive.google.com/uc?export=view&id=${f.id}` : f.webViewLink || null,
  }));

  return {
    folder: getConfiguredFolderName(),
    folderId,
    authMode: getAuthMode(),
    count: files.length,
    nextPageToken: res.data.nextPageToken || null,
    files,
  };
}

module.exports = {
  uploadMediaToDrive,
  listDriveMedia,
  getTargetFolderId,
};
