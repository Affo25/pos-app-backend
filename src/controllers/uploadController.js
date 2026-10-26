const { uploadBufferToR2, createPresignedUpload, DEFAULT_FOLDER } = require('../services/r2UploadService');
const { isR2Configured } = require('../config/cloudflareR2');

/**
 * POST /api/uploads/presign
 * JSON: { filename, contentType }
 * Use for mp4 / large videos on Vercel (direct-to-R2).
 */
exports.presignUpload = async (req, res) => {
  try {
    if (!isR2Configured()) {
      return res.status(503).json({
        error: 'Cloudflare R2 is not configured',
        code: 'R2_NOT_CONFIGURED',
      });
    }

    const filename = (req.body?.filename || req.body?.originalname || '').toString();
    const contentType = (req.body?.contentType || req.body?.mimetype || '').toString();
    const folder = (req.body?.folder || DEFAULT_FOLDER).toString();

    if (!filename || !contentType) {
      return res.status(400).json({
        error: 'filename and contentType are required',
      });
    }

    const data = await createPresignedUpload({ filename, contentType, folder });

    return res.status(200).json({
      success: true,
      message: 'Presigned upload URL created',
      uploadUrl: data.uploadUrl,
      url: data.url,
      data,
    });
  } catch (err) {
    console.error('presignUpload', err);
    const status = err.code === 'INVALID_CONTENT_TYPE' ? 400 : 500;
    return res.status(status).json({
      error: 'Presign failed',
      detail: err.message,
      code: err.code || undefined,
    });
  }
};

/**
 * POST /api/uploads
 * multipart field: file (or files)
 * Saves into R2 folder testvideos and returns public url.
 */
exports.uploadMedia = async (req, res) => {
  try {
    if (!isR2Configured()) {
      return res.status(503).json({
        error: 'Cloudflare R2 is not configured',
        code: 'R2_NOT_CONFIGURED',
      });
    }

    const folder = (req.body?.folder || req.query?.folder || DEFAULT_FOLDER).toString();
    const files = [];

    if (req.file) files.push(req.file);
    if (Array.isArray(req.files) && req.files.length) files.push(...req.files);

    if (!files.length) {
      return res.status(400).json({
        error: 'No file uploaded. Use multipart field "file" or "files". For large videos use POST /api/uploads/presign.',
        code: 'NO_FILE',
      });
    }

    const results = [];
    for (const file of files) {
      results.push(
        await uploadBufferToR2({
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          folder,
        }),
      );
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
