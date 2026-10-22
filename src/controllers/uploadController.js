const { uploadBufferToR2 } = require('../services/r2UploadService');
const { isR2Configured } = require('../config/cloudflareR2');

function mapUploadedFile(file, folder) {
  return uploadBufferToR2({
    buffer: file.buffer,
    originalname: file.originalname,
    mimetype: file.mimetype,
    folder,
  });
}

/**
 * POST /api/uploads
 * multipart field: file (single) or files (multiple)
 * optional body/query: folder
 */
exports.uploadMedia = async (req, res) => {
  try {
    if (!isR2Configured()) {
      return res.status(503).json({
        error: 'Cloudflare R2 is not configured',
        code: 'R2_NOT_CONFIGURED',
      });
    }

    const folder = (req.body?.folder || req.query?.folder || 'tetsuplaods').toString();
    const files = [];

    if (req.file) files.push(req.file);
    if (Array.isArray(req.files) && req.files.length) files.push(...req.files);

    if (!files.length) {
      return res.status(400).json({
        error: 'No file uploaded. Use multipart field "file" or "files".',
      });
    }

    const results = [];
    for (const file of files) {
      results.push(await mapUploadedFile(file, folder));
    }

    if (results.length === 1) {
      const item = results[0];
      return res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        url: item.url,
        data: item,
      });
    }

    return res.status(201).json({
      success: true,
      message: `${results.length} files uploaded successfully`,
      urls: results.map((r) => r.url),
      data: results,
    });
  } catch (err) {
    console.error('uploadMedia', err);
    const status = err.code === 'EMPTY_FILE' ? 400 : 500;
    return res.status(status).json({
      error: 'Upload failed',
      detail: err.message,
      code: err.code || undefined,
    });
  }
};
