const path = require('path');
const crypto = require('crypto');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getR2Client, getR2Config } = require('../config/cloudflareR2');

const DEFAULT_FOLDER = 'products';

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

async function uploadBufferToR2(file, { publicBaseUrl } = {}) {
  const { buffer, originalname, mimetype, folder } = file;
  if (!buffer?.length) {
    const err = new Error('Empty file');
    err.code = 'EMPTY_FILE';
    throw err;
  }

  const client = getR2Client();
  const { bucket, publicUrl } = getR2Config();
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

  const url = publicUrl
    ? `${publicUrl}/${key}`
    : publicBaseUrl
      ? `${publicBaseUrl}/api/uploads/object?key=${encodeURIComponent(key)}`
      : `/api/uploads/object?key=${encodeURIComponent(key)}`;

  return {
    key,
    url,
    bucket,
    contentType,
    size: buffer.length,
    originalname: originalname || null,
  };
}

async function getObjectStream(key) {
  const client = getR2Client();
  const { bucket } = getR2Config();
  const result = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
  return result;
}

module.exports = {
  uploadBufferToR2,
  getObjectStream,
  buildObjectKey,
  DEFAULT_FOLDER,
};
