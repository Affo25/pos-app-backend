const { uploadMediaToDrive, listDriveMedia } = require('../services/googleDriveService');
const {
  isGoogleDriveConfigured,
  getMissingGoogleDriveEnv,
  getServiceAccountEmail,
  getConfiguredFolderName,
  getConfiguredFolderId,
  getSharedDriveId,
  getAuthMode,
} = require('../config/googleDrive');

function notConfigured(res) {
  return res.status(503).json({
    error: 'Google Drive is not configured',
    code: 'GOOGLE_DRIVE_NOT_CONFIGURED',
    missing: getMissingGoogleDriveEnv(),
    hint:
      'Personal My Drive: set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN (npm run drive:oauth). Service accounts have no storage quota on My Drive.',
  });
}

function extractGoogleError(err) {
  const googleMsg =
    err?.response?.data?.error?.message ||
    err?.errors?.[0]?.message ||
    err?.message ||
    'Unknown error';
  const googleReason =
    err?.response?.data?.error?.errors?.[0]?.reason ||
    err?.errors?.[0]?.reason ||
    undefined;
  const status =
    err.code === 'EMPTY_FILE' ||
    err.code === 'FOLDER_NOT_FOUND' ||
    err.code === 'INVALID_GOOGLE_CREDENTIALS' ||
    err.code === 'STORAGE_QUOTA'
      ? 400
      : err.code === 'GOOGLE_DRIVE_NOT_CONFIGURED'
        ? 503
        : err?.response?.status === 403 || err?.code === 403
          ? 403
          : 500;

  return {
    status,
    detail: googleMsg,
    reason: googleReason,
    code: err.code || googleReason || undefined,
  };
}

/**
 * GET /api/drive/status — quick config check (no secrets)
 */
exports.getStatus = async (req, res) => {
  return res.status(200).json({
    configured: isGoogleDriveConfigured(),
    authMode: getAuthMode(),
    serviceAccount: getServiceAccountEmail(),
    folderName: getConfiguredFolderName(),
    folderIdSet: Boolean(getConfiguredFolderId()),
    sharedDriveIdSet: Boolean(getSharedDriveId()),
    missing: getMissingGoogleDriveEnv(),
    note:
      getAuthMode() === 'service_account' && !getSharedDriveId()
        ? 'Service account + personal My Drive will fail with storage quota. Switch to OAuth or a Shared Drive.'
        : undefined,
  });
};

/**
 * POST /api/drive/upload
 * multipart field: file
 */
exports.uploadFile = async (req, res) => {
  try {
    if (!isGoogleDriveConfigured()) return notConfigured(res);

    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded. Use multipart field "file".',
        code: 'NO_FILE',
      });
    }

    const data = await uploadMediaToDrive({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
    });

    return res.status(201).json({
      success: true,
      message: 'File uploaded to Google Drive',
      url: data.url,
      data,
    });
  } catch (err) {
    console.error('drive uploadFile', err);
    const info = extractGoogleError(err);
    return res.status(info.status).json({
      error: 'Upload failed',
      detail: info.detail,
      reason: info.reason,
      code: info.code,
      hint:
        info.code === 'STORAGE_QUOTA' || /storage quota/i.test(info.detail || '')
          ? 'Use OAuth for personal Drive: set GOOGLE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN (npm run drive:oauth), add them on Vercel, redeploy. Or use a Workspace Shared Drive + GOOGLE_SHARED_DRIVE_ID.'
          : 'Check Drive auth env vars and that videoRecorder folder is accessible.',
    });
  }
};

/**
 * GET /api/drive/files
 */
exports.listFiles = async (req, res) => {
  try {
    if (!isGoogleDriveConfigured()) return notConfigured(res);

    const data = await listDriveMedia({
      pageSize: req.query.pageSize,
      pageToken: req.query.pageToken,
    });

    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (err) {
    console.error('drive listFiles', err);
    const info = extractGoogleError(err);
    return res.status(info.status).json({
      error: 'List failed',
      detail: info.detail,
      reason: info.reason,
      code: info.code,
    });
  }
};
