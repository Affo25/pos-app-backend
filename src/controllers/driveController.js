const { uploadMediaToDrive, listDriveMedia } = require('../services/googleDriveService');
const {
  isGoogleDriveConfigured,
  getMissingGoogleDriveEnv,
} = require('../config/googleDrive');

function notConfigured(res) {
  return res.status(503).json({
    error: 'Google Drive is not configured',
    code: 'GOOGLE_DRIVE_NOT_CONFIGURED',
    missing: getMissingGoogleDriveEnv(),
    hint:
      'Add GOOGLE_SERVICE_ACCOUNT_JSON (service account key JSON) and share the videoRecorder folder with videoapp@videorecorder-512911.iam.gserviceaccount.com as Editor. Optionally set GOOGLE_DRIVE_FOLDER_ID.',
  });
}

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
    const status =
      err.code === 'EMPTY_FILE' || err.code === 'FOLDER_NOT_FOUND' ? 400 : 500;
    return res.status(status).json({
      error: 'Upload failed',
      detail: err.message,
      code: err.code || undefined,
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
    const status = err.code === 'FOLDER_NOT_FOUND' ? 400 : 500;
    return res.status(status).json({
      error: 'List failed',
      detail: err.message,
      code: err.code || undefined,
    });
  }
};
