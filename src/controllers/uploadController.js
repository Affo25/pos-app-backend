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
        error: 'Cloudflare R2 is not configured',
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
      message: 'File uploaded successfully',
      url: data.url,
      data,
    });
  } catch (err) {
    console.error('uploadMedia', err);
    return res.status(500).json({ error: 'Upload failed', detail: err.message });
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
