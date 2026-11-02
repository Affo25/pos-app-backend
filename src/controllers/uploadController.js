const { uploadBufferToR2, getObjectStream, DEFAULT_FOLDER } = require('../services/r2UploadService');
const { isR2Configured } = require('../config/cloudflareR2');

function requestPublicBase(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

exports.uploadMedia = async (req, res) => {
  try {
    if (!isR2Configured()) {
      return res.status(503).json({
        error:
          'Cloudflare R2 is not configured. Set CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and PUBLIC_CLOUDFLARE_URL in .env',
        code: 'R2_NOT_CONFIGURED',
      });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Use multipart field "file".' });
    }

    const folder = (req.body?.folder || req.query?.folder || DEFAULT_FOLDER).toString();
    const data = await uploadBufferToR2(
      {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        folder,
      },
      { publicBaseUrl: requestPublicBase(req) },
    );

    return res.status(201).json({
      success: true,
      message: 'File uploaded to Cloudflare R2',
      url: data.url,
      storage: 'r2',
      data,
    });
  } catch (err) {
    console.error('uploadMedia', err);
    const status = err?.$metadata?.httpStatusCode === 401 || err?.Code === 'Unauthorized' ? 401 : 500;
    return res.status(status).json({
      error:
        status === 401
          ? 'R2 Unauthorized — create a new R2 API token (Object Read & Write) and update R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY in .env, then restart the backend'
          : 'Upload to R2 failed',
      detail: err.message,
      code: err.Code || err.code || 'R2_UPLOAD_FAILED',
    });
  }
};

exports.getObject = async (req, res) => {
  try {
    if (!isR2Configured()) {
      return res.status(503).json({ error: 'Cloudflare R2 is not configured' });
    }
    const key = (req.query.key || '').toString();
    if (!key) return res.status(400).json({ error: 'key is required' });

    const obj = await getObjectStream(key);
    if (obj.ContentType) res.setHeader('Content-Type', obj.ContentType);
    if (obj.ContentLength) res.setHeader('Content-Length', obj.ContentLength);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    obj.Body.pipe(res);
  } catch (err) {
    console.error('getObject', err);
    return res.status(404).json({ error: 'File not found', detail: err.message });
  }
};
