const path = require('path');
const crypto = require('crypto');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getR2Client, getR2Config } = require('../config/cloudflareR2');

function sanitizeFilename(name) {
  const base = path.basename(name || 'file').replace(/[^\w.\-()+ ]+/g, '_');
  return base.slice(0, 180) || 'file';
}

function buildObjectKey(originalname, folder) {
  const safe = sanitizeFilename(originalname);
  const id = crypto.randomBytes(8).toString('hex');
  const stamp = Date.now();
  const prefix = (folder || 'tetsuplaods').replace(/^\/+|\/+$/g, '');
  return `${prefix}/${stamp}-${id}-${safe}`;
}

/**
 * Upload a buffer to Cloudflare R2 and return the public URL.
 * @param {{ buffer: Buffer, originalname: string, mimetype?: string, folder?: string }} file
 */
async function uploadBufferToR2(file) {
  const { buffer, originalname, mimetype, folder } = file;
  if (!buffer || !buffer.length) {
    const err = new Error('Empty file');
    err.code = 'EMPTY_FILE';
    throw err;
  }

  const client = getR2Client();
  const { bucket, publicUrl } = getR2Config();
  const key = buildObjectKey(originalname, folder);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimetype || 'application/octet-stream',
    }),
  );

  return {
    key,
    url: `${publicUrl}/${key}`,
    bucket,
    contentType: mimetype || 'application/octet-stream',
    size: buffer.length,
    originalname: originalname || null,
  };
}

module.exports = {
  uploadBufferToR2,
  buildObjectKey,
};
