const path = require('path');
const crypto = require('crypto');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { getR2Client, getR2Config } = require('../config/cloudflareR2');

const DEFAULT_FOLDER = 'testvideos';
const PRESIGN_EXPIRES_SECONDS = 60 * 15;

function sanitizeFilename(name) {
  const base = path.basename(name || 'file').replace(/[^\w.\-()+ ]+/g, '_');
  return base.slice(0, 180) || 'file';
}

function buildObjectKey(originalname, folder) {
  const safe = sanitizeFilename(originalname);
  const id = crypto.randomBytes(8).toString('hex');
  const stamp = Date.now();
  const prefix = (folder || DEFAULT_FOLDER).replace(/^\/+|\/+$/g, '');
  return `${prefix}/${stamp}-${id}-${safe}`;
}

function publicUrlForKey(key) {
  const { publicUrl } = getR2Config();
  return `${publicUrl}/${key}`;
}

/**
 * Upload a buffer to Cloudflare R2 (folder: testvideos by default).
 * On Vercel, request bodies over ~4.5MB fail — use createPresignedUpload for large videos.
 */
async function uploadBufferToR2(file) {
  const { buffer, originalname, mimetype, folder } = file;
  if (!buffer || !buffer.length) {
    const err = new Error('Empty file');
    err.code = 'EMPTY_FILE';
    throw err;
  }

  const client = getR2Client();
  const { bucket } = getR2Config();
  const key = buildObjectKey(originalname, folder || DEFAULT_FOLDER);
  const contentType = mimetype || 'application/octet-stream';

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return {
    key,
    url: publicUrlForKey(key),
    bucket,
    contentType,
    size: buffer.length,
    originalname: originalname || null,
  };
}

/**
 * Presigned PUT URL so clients upload large videos directly to R2 (bypasses Vercel body limit).
 */
async function createPresignedUpload({ filename, contentType, folder }) {
  const type = contentType || 'application/octet-stream';
  if (!/^image\//.test(type) && !/^video\//.test(type)) {
    const err = new Error('Only image and video content types are allowed');
    err.code = 'INVALID_CONTENT_TYPE';
    throw err;
  }

  const client = getR2Client();
  const { bucket } = getR2Config();
  const key = buildObjectKey(filename || 'file', folder || DEFAULT_FOLDER);

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: type,
    }),
    { expiresIn: PRESIGN_EXPIRES_SECONDS },
  );

  return {
    key,
    uploadUrl,
    url: publicUrlForKey(key),
    bucket,
    contentType: type,
    expiresIn: PRESIGN_EXPIRES_SECONDS,
    originalname: filename || null,
  };
}

module.exports = {
  uploadBufferToR2,
  createPresignedUpload,
  buildObjectKey,
  publicUrlForKey,
  DEFAULT_FOLDER,
};
