const { Readable } = require('stream');
const {
  getDriveClient,
  getConfiguredFolderId,
  getConfiguredFolderName,
} = require('../config/googleDrive');

let resolvedFolderId = null;

async function findFolderIdByName(folderName) {
  const drive = getDriveClient();
  const q = [
    `name = '${folderName.replace(/'/g, "\\'")}'`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    'trashed = false',
  ].join(' and ');

  const res = await drive.files.list({
    q,
    fields: 'files(id, name)',
    pageSize: 10,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const files = res.data.files || [];
  if (!files.length) {
    const err = new Error(
      `Google Drive folder "${folderName}" not found. Share it with the service account and set GOOGLE_DRIVE_FOLDER_ID if needed.`,
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

/**
 * Upload image/video buffer into the videoRecorder folder.
 */
async function uploadMediaToDrive({ buffer, originalname, mimetype }) {
  if (!buffer || !buffer.length) {
    const err = new Error('Empty file');
    err.code = 'EMPTY_FILE';
    throw err;
  }

  const drive = getDriveClient();
  const folderId = await getTargetFolderId();
  const name = originalname || `upload-${Date.now()}`;

  const created = await drive.files.create({
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

  const file = created.data;
  try {
    await makeFilePublic(file.id);
  } catch (permErr) {
    console.warn('Could not set public permission:', permErr.message);
  }

  // Refresh links after permission change
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
  };
}

/**
 * List files in the videoRecorder folder.
 */
async function listDriveMedia({ pageSize = 100, pageToken } = {}) {
  const drive = getDriveClient();
  const folderId = await getTargetFolderId();

  const q = [`'${folderId}' in parents`, 'trashed = false'].join(' and ');

  const res = await drive.files.list({
    q,
    pageSize: Math.min(Number(pageSize) || 100, 200),
    pageToken: pageToken || undefined,
    orderBy: 'createdTime desc',
    fields:
      'nextPageToken, files(id, name, mimeType, size, createdTime, webViewLink, webContentLink, thumbnailLink)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

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
